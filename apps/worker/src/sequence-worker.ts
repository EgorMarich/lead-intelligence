import crypto from 'crypto';
import { Worker, Queue } from 'bullmq';
import IORedis from 'ioredis';
import { DataSource } from 'typeorm';
import { QUEUES, SequenceQueuePayload, OutreachQueuePayload } from '@lead/shared';
import { SalesSequenceEntity } from '../../api/src/database/entities/sales-sequence.entity';
import { SequenceEnrollmentEntity } from '../../api/src/database/entities/sequence-enrollment.entity';
import { LeadEntity } from '../../api/src/database/entities/lead.entity';
import { BusinessEntity } from '../../api/src/database/entities/business.entity';
import { ContactEntity } from '../../api/src/database/entities/contact.entity';
import { OutreachMessageEntity } from '../../api/src/database/entities/outreach-message.entity';
import { AiSalesDecisionEntity } from '../../api/src/database/entities/ai-sales-decision.entity';
import { AiInsightEntity } from '../../api/src/database/entities/ai-insight.entity';
import { CommunicationMessageEntity } from '../../api/src/database/entities/communication-message.entity';
import { AiSalesAutomationService } from '../../api/src/modules/sequences/ai-sales-automation.service';

export function createSequenceWorker(connection:IORedis,db:DataSource){
  const enrollments=db.getRepository(SequenceEnrollmentEntity), sequences=db.getRepository(SalesSequenceEntity), leads=db.getRepository(LeadEntity), businesses=db.getRepository(BusinessEntity), contacts=db.getRepository(ContactEntity), messages=db.getRepository(OutreachMessageEntity), decisions=db.getRepository(AiSalesDecisionEntity), aiInsights=db.getRepository(AiInsightEntity), comms=db.getRepository(CommunicationMessageEntity);
  const outreach=new Queue<OutreachQueuePayload>(QUEUES.OUTREACH,{connection});
  const ai=new AiSalesAutomationService(businesses,leads,contacts,comms,aiInsights);
  return new Worker<SequenceQueuePayload>(QUEUES.SEQUENCE,async job=>{
    const e=await enrollments.findOne({where:{id:job.data.enrollmentId,organizationId:job.data.organizationId}});
    if(!e||e.status!=='ACTIVE'||e.currentStep!==job.data.stepIndex)return {skipped:true};
    const seq=await sequences.findOne({where:{id:e.sequenceId,organizationId:e.organizationId}});
    const lead=await leads.findOne({where:{id:e.leadId,organizationId:e.organizationId}});
    const business=await businesses.findOne({where:{id:e.businessId,organizationId:e.organizationId}});
    if(!seq||!lead||!business){e.status='FAILED';e.stopReason='Missing sequence or lead';await enrollments.save(e);return {failed:true}}
    if(seq.stopOnStatuses.includes(lead.status)){return stop(enrollments,e,`Lead status ${lead.status}`)}
    const existingInbound=await db.query(`SELECT 1 FROM communication_messages WHERE "organizationId"=$1 AND "leadId"=$2 AND direction='INBOUND' LIMIT 1`,[e.organizationId,e.leadId]);
    if(seq.stopOnReply&&existingInbound.length){return stop(enrollments,e,'Lead replied')}
    const template=seq.steps[e.currentStep];
    if(!template){e.status='COMPLETED';e.completedAt=new Date();await enrollments.save(e);return {completed:true}}

    let channel=template.channel as any, subject=template.subject, body=render(template.body,{lead,business}), delayForNext=seq.steps[e.currentStep+1]?.delayMinutes??seq.aiDefaultDelayMinutes, decision:AiSalesDecisionEntity|undefined;
    if(seq.automationMode==='AI_ADAPTIVE'&&seq.aiEnabled){
      try{
        const aiDecision=await ai.decide(e.organizationId,e.businessId,e.leadId,seq,e.currentStep);
        decision=await decisions.save(decisions.create({id:crypto.randomUUID(),organizationId:e.organizationId,enrollmentId:e.id,businessId:e.businessId,leadId:e.leadId,stepIndex:e.currentStep,channel:aiDecision.channel,subject:aiDecision.subject,body:aiDecision.body,nextDelayMinutes:aiDecision.nextDelayMinutes,recommendedAction:aiDecision.recommendedAction,reason:aiDecision.reason,confidence:aiDecision.confidence,provider:process.env.AI_ENABLED==='true'?'openai-compatible':'heuristic',status:aiDecision.stopSequence?'STOPPED':'GENERATED',context:{stepIndex:e.currentStep,leadStatus:lead.status}}));
        if(aiDecision.stopSequence){e.status='STOPPED';e.stopReason=aiDecision.reason||'AI requested stop';e.updatedAt=new Date();await enrollments.save(e);return {stopped:true,decisionId:decision.id}}
        channel=aiDecision.channel;subject=aiDecision.subject;body=aiDecision.body;delayForNext=aiDecision.nextDelayMinutes;
      }catch{}
    }

    let contact=await contacts.findOne({where:{businessId:e.businessId,type:channel},order:{isPrimary:'DESC'}});
    if(!contact) contact=await contacts.findOne({where:{businessId:e.businessId,type:template.channel as any},order:{isPrimary:'DESC'}});
    if(!contact){e.status='FAILED';e.stopReason=`No ${channel} contact`;if(decision)decision.status='FAILED';await enrollments.save(e);if(decision)await decisions.save(decision);return {failed:true}}
    if(contact.metadata?.doNotContact===true){e.status='STOPPED';e.stopReason='Contact suppressed';if(decision)decision.status='STOPPED';await enrollments.save(e);if(decision)await decisions.save(decision);return {stopped:true}}

    const msg=await messages.save(messages.create({id:crypto.randomUUID(),organizationId:e.organizationId,businessId:e.businessId,leadId:e.leadId,channel,contactId:contact.id,recipient:contact.value,subject,body,status:'QUEUED',metadata:{sequenceId:seq.id,enrollmentId:e.id,sequenceStep:e.currentStep,aiAdaptive:seq.automationMode==='AI_ADAPTIVE',aiDecisionId:decision?.id}}));
    if(decision){decision.status='QUEUED';await decisions.save(decision)}
    await outreach.add('send-outreach',{messageId:msg.id,organizationId:e.organizationId},{jobId:`sequence:${seq.id}:${e.id}:${e.currentStep}`,attempts:3,backoff:{type:'exponential',delay:5000},removeOnComplete:{count:1000},removeOnFail:{count:5000}});
    const next=e.currentStep+1;
    if(next>=seq.steps.length){e.status='COMPLETED';e.completedAt=new Date();e.currentStep=next;e.nextRunAt=undefined}else{e.currentStep=next;e.nextRunAt=new Date(Date.now()+Math.max(0,delayForNext)*60000);await thisSchedule(connection,e.organizationId,e.id,next,delayForNext)}
    e.updatedAt=new Date();await enrollments.save(e);
    return {queued:true,messageId:msg.id,aiDecisionId:decision?.id};
  },{connection,concurrency:Number(process.env.SEQUENCE_CONCURRENCY??2)})
}
async function stop(repo:any,e:SequenceEnrollmentEntity,reason:string){e.status='STOPPED';e.stopReason=reason;e.updatedAt=new Date();await repo.save(e);return {stopped:true}}
async function thisSchedule(connection:IORedis,org:string,id:string,stepIndex:number,delay:number){const q=new Queue<SequenceQueuePayload>(QUEUES.SEQUENCE,{connection});await q.add('run-sequence-step',{enrollmentId:id,organizationId:org,stepIndex},{jobId:`${id}:${stepIndex}`,delay:Math.max(0,delay)*60000,attempts:3,backoff:{type:'exponential',delay:5000},removeOnComplete:{count:1000},removeOnFail:{count:5000}});await q.close()}
function render(text:string,ctx:any){return text.replace(/{{\s*([\w.]+)\s*}}/g,(_,path)=>path.split('.').reduce((v:any,k:string)=>v?.[k],ctx)??'')}
