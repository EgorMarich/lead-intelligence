import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { QUEUES, SequenceQueuePayload } from '@lead/shared';
import { SalesSequenceEntity, SequenceStep } from '../../database/entities/sales-sequence.entity';
import { SequenceEnrollmentEntity } from '../../database/entities/sequence-enrollment.entity';
import { LeadEntity } from '../../database/entities/lead.entity';

@Injectable()
export class SequencesService {
 private readonly connection=new IORedis(process.env.REDIS_URL??'redis://localhost:6379',{maxRetriesPerRequest:null});
 private readonly queue=new Queue<SequenceQueuePayload>(QUEUES.SEQUENCE,{connection:this.connection});
 constructor(@InjectRepository(SalesSequenceEntity) private readonly sequences:Repository<SalesSequenceEntity>,@InjectRepository(SequenceEnrollmentEntity) private readonly enrollments:Repository<SequenceEnrollmentEntity>,@InjectRepository(LeadEntity) private readonly leads:Repository<LeadEntity>){}
 async list(org:string){return this.sequences.find({where:{organizationId:org},order:{createdAt:'DESC'}})}
 async get(org:string,id:string){const x=await this.sequences.findOne({where:{id,organizationId:org}});if(!x)throw new NotFoundException('Sequence not found');return x}
 async create(org:string,input:any){this.validateSteps(input.steps);return this.sequences.save(this.sequences.create({id:randomUUID(),organizationId:org,name:input.name,description:input.description,status:'DRAFT',steps:input.steps,stopOnReply:input.stopOnReply!==false,stopOnStatuses:input.stopOnStatuses??['INTERESTED','NEGOTIATION','CONVERTED','LOST']}))}
 async update(org:string,id:string,input:any){const x=await this.get(org,id); if(input.steps)this.validateSteps(input.steps); Object.assign(x,input); x.updatedAt=new Date(); return this.sequences.save(x)}
 async enroll(org:string,sequenceId:string,businessId:string){const seq=await this.get(org,sequenceId);if(seq.status!=='ACTIVE')throw new BadRequestException('Sequence must be ACTIVE');const lead=await this.leads.findOne({where:{organizationId:org,businessId}});if(!lead)throw new NotFoundException('Lead not found');const existing=await this.enrollments.findOne({where:{organizationId:org,sequenceId,businessId,status:'ACTIVE'}});if(existing)return existing;const first=seq.steps[0];if(!first)throw new BadRequestException('Sequence has no steps');const e=await this.enrollments.save(this.enrollments.create({id:randomUUID(),organizationId:org,sequenceId,businessId,leadId:lead.id,status:'ACTIVE',currentStep:0,nextRunAt:new Date(Date.now()+Math.max(0,first.delayMinutes)*60000)}));await this.queue.add('run-sequence-step',{enrollmentId:e.id,organizationId:org,stepIndex:0},{jobId:`${e.id}:0`,delay:Math.max(0,first.delayMinutes)*60000,attempts:3,backoff:{type:'exponential',delay:5000},removeOnComplete:{count:1000},removeOnFail:{count:5000}});return e}
 async enrollMany(org:string,sequenceId:string,businessIds:string[]){const out=[];for(const id of businessIds)out.push(await this.enroll(org,sequenceId,id));return out}
 async pause(org:string,id:string){const e=await this.enrollments.findOne({where:{id,organizationId:org}});if(!e)throw new NotFoundException('Enrollment not found');e.status='PAUSED';e.updatedAt=new Date();return this.enrollments.save(e)}
 async resume(org:string,id:string){const e=await this.enrollments.findOne({where:{id,organizationId:org}});if(!e)throw new NotFoundException('Enrollment not found');const seq=await this.get(org,e.sequenceId);if(e.status!=='PAUSED')return e;e.status='ACTIVE';const step=seq.steps[e.currentStep];if(!step) {e.status='COMPLETED';e.completedAt=new Date();return this.enrollments.save(e)} e.nextRunAt=new Date();await this.enrollments.save(e);await this.queue.add('run-sequence-step',{enrollmentId:e.id,organizationId:org,stepIndex:e.currentStep},{jobId:`${e.id}:${e.currentStep}:resume`,removeOnComplete:{count:1000}});return e}
 async getLeadForAutomation(org:string,businessId:string){const lead=await this.leads.findOne({where:{organizationId:org,businessId}});if(!lead)throw new NotFoundException('Lead not found');return lead}
 async enrollmentsList(org:string){return this.enrollments.find({where:{organizationId:org},order:{createdAt:'DESC'},take:500})}
 private validateSteps(steps:SequenceStep[]){if(!Array.isArray(steps)||steps.length===0||steps.length>20)throw new BadRequestException('Sequence must contain 1-20 steps');for(const s of steps){if(!['EMAIL','TELEGRAM','VK','WHATSAPP'].includes(s.channel))throw new BadRequestException('Unsupported sequence channel');if(!Number.isFinite(s.delayMinutes)||s.delayMinutes<0||s.delayMinutes>43200)throw new BadRequestException('delayMinutes must be 0..43200');if(!s.body?.trim())throw new BadRequestException('Each step needs a body')}}
 async onApplicationShutdown(){await this.queue.close();await this.connection.quit()}
}
