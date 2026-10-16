import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { BusinessEntity } from '../../database/entities/business.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { ContactEntity } from '../../database/entities/contact.entity';
import { CommunicationMessageEntity } from '../../database/entities/communication-message.entity';
import { AiInsightEntity } from '../../database/entities/ai-insight.entity';
import { SalesSequenceEntity, SequenceStepChannel } from '../../database/entities/sales-sequence.entity';

export interface AiSalesDecision {
  channel: SequenceStepChannel;
  subject?: string;
  body: string;
  nextDelayMinutes: number;
  recommendedAction: string;
  reason: string;
  confidence: number;
  stopSequence: boolean;
}

@Injectable()
export class AiSalesAutomationService {
  constructor(
    @InjectRepository(BusinessEntity) private readonly businesses: Repository<BusinessEntity>,
    @InjectRepository(LeadEntity) private readonly leads: Repository<LeadEntity>,
    @InjectRepository(ContactEntity) private readonly contacts: Repository<ContactEntity>,
    @InjectRepository(CommunicationMessageEntity) private readonly messages: Repository<CommunicationMessageEntity>,
    @InjectRepository(AiInsightEntity) private readonly insights: Repository<AiInsightEntity>,
  ) {}

  async decide(organizationId:string, businessId:string, leadId:string, sequence:SalesSequenceEntity, stepIndex:number):Promise<AiSalesDecision>{
    const business=await this.businesses.findOne({where:{id:businessId,organizationId}});
    const lead=await this.leads.findOne({where:{id:leadId,organizationId}});
    if(!business||!lead) throw new NotFoundException('Lead context not found');
    const [contacts,inbound,outbound,insight]=await Promise.all([
      this.contacts.find({where:{businessId},order:{isPrimary:'DESC'}}),
      this.messages.find({where:{organizationId,businessId,direction:'INBOUND'},order:{createdAt:'DESC'},take:5}),
      this.messages.find({where:{organizationId,businessId,direction:'OUTBOUND'},order:{createdAt:'DESC'},take:5}),
      this.insights.findOne({where:{organizationId,businessId}}),
    ]);
    const context={business:{name:business.name,city:business.city,categoryId:business.categoryId,website:business.website,rating:business.rating,reviewsCount:business.reviewsCount},lead:{status:lead.status,score:lead.score,grade:lead.grade,tags:lead.tags},contacts:contacts.map((x:any)=>({type:x.type,value:x.value})),inbound:inbound.map((x:any)=>({channel:x.channel,body:x.body,createdAt:x.createdAt})),outbound:outbound.map((x:any)=>({channel:x.channel,body:x.body,createdAt:x.createdAt})),insight:insight?.payload ?? null,step:{index:stepIndex,template:sequence.steps[stepIndex],allowedChannels:sequence.aiAllowedChannels}};
    const provider=await this.tryProvider(context,sequence);
    return provider ?? this.heuristic(context,sequence);
  }

  private async tryProvider(context:any,sequence:SalesSequenceEntity):Promise<AiSalesDecision|null>{
    const key=process.env.AI_API_KEY;
    if(!key||process.env.AI_ENABLED!=='true') return null;
    try{
      const base=(process.env.AI_API_URL??'https://api.openai.com/v1').replace(/\/$/,'');
      const r=await fetch(`${base}/chat/completions`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${key}`},body:JSON.stringify({model:process.env.AI_MODEL??'gpt-4.1-mini',temperature:0.35,response_format:{type:'json_object'},messages:[
        {role:'system',content:'You are an AI B2B sales automation agent. Decide the next best outbound action for an already enrolled lead. Use only provided facts. Never invent contact details, pricing, company facts, or prior conversations. Respect opt-outs and negative replies. If the lead clearly opted out, set stopSequence=true. Return JSON only: channel, subject, body, nextDelayMinutes, recommendedAction, reason, confidence, stopSequence.'},
        {role:'user',content:`SEQUENCE=${JSON.stringify({mode:sequence.automationMode,allowedChannels:sequence.aiAllowedChannels,minConfidence:sequence.aiMinConfidence,defaultDelay:sequence.aiDefaultDelayMinutes,maxDelay:sequence.aiMaxDelayMinutes})}\nCONTEXT=${JSON.stringify(context)}`}
      ]})});
      if(!r.ok)return null;
      const j:any=await r.json(); const x=JSON.parse(j?.choices?.[0]?.message?.content??'{}');
      const decision=this.normalize(x,sequence);
      if(decision.confidence<sequence.aiMinConfidence)return null;
      return decision;
    }catch{return null;}
  }

  private heuristic(context:any,sequence:SalesSequenceEntity):AiSalesDecision{
    const inbound=String(context.inbound?.[0]?.body??'').toLowerCase();
    if(/стоп|не пишите|не интересно|отпиш|unsubscribe|не звоните/.test(inbound)) return {channel:'EMAIL',body:'Понял, спасибо за ответ. Больше не буду вас беспокоить. Хорошего дня!',nextDelayMinutes:0,recommendedAction:'STOP_CONTACT',reason:'Detected explicit opt-out or negative contact request.',confidence:.98,stopSequence:true};
    const available=(context.contacts??[]).map((x:any)=>x.type).filter((x:string)=>sequence.aiAllowedChannels.includes(x as any));
    const channel=(available.includes('TELEGRAM')?'TELEGRAM':available.includes('WHATSAPP')?'WHATSAPP':available.includes('EMAIL')?'EMAIL':available.includes('VK')?'VK':sequence.aiAllowedChannels[0]) as SequenceStepChannel;
    const name=context.business?.name??'вашей компании';
    const positive=/давайте|интересно|интересует|подробнее|расскажите|можно|готов/.test(inbound);
    const pricing=/цена|стоимость|сколько/.test(inbound);
    const body=positive?`Отлично! Тогда предлагаю коротко обсудить задачу ${pricing?'и подобрать подходящий вариант':'и показать 2–3 наиболее релевантные идеи'} для ${name}. Когда удобно созвониться на 10–15 минут?`:render(String(context.step?.template?.body??''),{business:context.business,lead:context.lead});
    return {channel,subject:channel==='EMAIL'?`Идея для ${name}`:undefined,body:body||`Здравствуйте! Подскажите, актуально ли обсудить несколько идей для ${name}?`,nextDelayMinutes:Math.min(sequence.aiMaxDelayMinutes,Math.max(0,positive?0:sequence.aiDefaultDelayMinutes)),recommendedAction:positive?'BOOK_CALL':'FOLLOW_UP',reason:positive?'Lead shows buying interest; prioritize human conversation.':'No strong buying signal yet; continue a low-pressure personalized follow-up.',confidence:positive?.88:.72,stopSequence:false};
  }

  private normalize(x:any,sequence:SalesSequenceEntity):AiSalesDecision{
    const channel=(sequence.aiAllowedChannels.includes(x.channel)?x.channel:sequence.aiAllowedChannels[0]) as SequenceStepChannel;
    return {channel,subject:x.subject?String(x.subject).slice(0,200):undefined,body:String(x.body??'').trim(),nextDelayMinutes:Math.min(sequence.aiMaxDelayMinutes,Math.max(0,Number(x.nextDelayMinutes??sequence.aiDefaultDelayMinutes))),recommendedAction:String(x.recommendedAction??'FOLLOW_UP'),reason:String(x.reason??''),confidence:Math.max(0,Math.min(1,Number(x.confidence??.5))),stopSequence:Boolean(x.stopSequence)};
  }
}
function render(text:string,ctx:any){return text.replace(/{{\s*([\w.]+)\s*}}/g,(_,path)=>path.split('.').reduce((v:any,k:string)=>v?.[k],ctx)??'')}
