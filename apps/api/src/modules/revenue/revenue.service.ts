import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentEntity, PaymentStatus } from '../../database/entities/payment.entity';
import { SubscriptionEntity, SubscriptionStatus } from '../../database/entities/subscription.entity';
import { SubscriptionPlanEntity } from '../../database/entities/subscription-plan.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { OutreachMessageEntity } from '../../database/entities/outreach-message.entity';

@Injectable()
export class RevenueService {
 constructor(@InjectRepository(PaymentEntity) private payments:Repository<PaymentEntity>,@InjectRepository(SubscriptionEntity) private subscriptions:Repository<SubscriptionEntity>,@InjectRepository(SubscriptionPlanEntity) private plans:Repository<SubscriptionPlanEntity>,@InjectRepository(LeadEntity) private leads:Repository<LeadEntity>,@InjectRepository(OutreachMessageEntity) private outreach:Repository<OutreachMessageEntity>) {}
 async overview(organizationId:string,months:number){
  const now=new Date(); const from=new Date(now.getFullYear(),now.getMonth()-months+1,1);
  const [sub,paymentRows,plan,leadCount,converted,paidOutreach]=await Promise.all([
   this.subscriptions.findOne({where:{organizationId},order:{createdAt:'DESC'}}),
   this.payments.find({where:{organizationId,status:PaymentStatus.SUCCEEDED},order:{createdAt:'ASC'}}),
   this.plans.createQueryBuilder('p').innerJoin(SubscriptionEntity,'s','s.planCode=p.code').where('s.organizationId=:organizationId',{organizationId}).andWhere('s.status IN (:...statuses)',{statuses:[SubscriptionStatus.ACTIVE,SubscriptionStatus.PAST_DUE]}).orderBy('s.createdAt','DESC').getOne(),
   this.leads.count({where:{organizationId}}),this.leads.count({where:{organizationId,status:'CONVERTED'}}),this.outreach.count({where:{organizationId,status:'SENT'}})
  ]);
  const mrr=Number(plan?.priceRub??0); const arr=mrr*12; const successful=paymentRows.filter(p=>p.createdAt>=from); const revenue=successful.reduce((s,p)=>s+Number(p.amountRub||0),0);
  const monthly=Array.from({length:months},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-months+1+i,1);const y=d.getFullYear(),mo=d.getMonth();const paid=paymentRows.filter(p=>{const x=p.createdAt;return x.getFullYear()===y&&x.getMonth()===mo});const amount=paid.reduce((s,p)=>s+Number(p.amountRub||0),0);return {month:d.toISOString().slice(0,7),revenue:amount,mrr:i===months-1?mrr:amount};});
  const active=sub?.status===SubscriptionStatus.ACTIVE||sub?.status===SubscriptionStatus.PAST_DUE; const churned=!!sub?.canceledAt||[SubscriptionStatus.CANCELED,SubscriptionStatus.EXPIRED].includes(sub?.status as SubscriptionStatus); const arpu=active?mrr:0;
  const conversion=leadCount?Number((converted/leadCount*100).toFixed(1)):0;
  return {period:{from:from.toISOString(),to:now.toISOString()},currency:plan?'RUB':'RUB',subscription:{planCode:sub?.planCode??'FREE',status:sub?.status??'NONE',active,mrr,arr,arpu,churned,canceledAt:sub?.canceledAt??null},metrics:{mrr,arr,arpu,churnRate:churned?100:0,leadToCustomerConversion:conversion,customers:active?1:0,paidOutreach,ltv:churned?arpu:arpu?Math.round(arpu/0.045):0,cac:null,paybackMonths:null},revenue:{periodRevenue:revenue,successfulPayments:successful.length,totalPayments:paymentRows.length},monthly,unitEconomics:{aiCostPerCustomerRub:220,paymentReserveRate:0.0427,marketingReserveRate:0.10,targetContributionMargin:0.711,cacNote:'CAC появится после добавления учёта расходов на acquisition.'}};
 }
}
