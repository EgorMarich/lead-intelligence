import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationMemberEntity } from '../../database/entities/organization-member.entity';
import { SubscriptionEntity } from '../../database/entities/subscription.entity';
import { Permission, ROLE_PERMISSIONS } from './permission';
@Injectable()
export class AuthorizationService {
  constructor(@InjectRepository(OrganizationMemberEntity) private readonly members: Repository<OrganizationMemberEntity>, @InjectRepository(SubscriptionEntity) private readonly subscriptions: Repository<SubscriptionEntity>) {}
  async requireMembership(userId:string, organizationId:string) {
    const member=await this.members.findOneBy({userId,organizationId});
    if(!member) throw new ForbiddenException('User is not a member of this organization');
    return member;
  }
  async requirePermission(userId:string, organizationId:string, permission:Permission) {
    const member=await this.requireMembership(userId,organizationId);
    if(!(ROLE_PERMISSIONS[member.role]??[]).includes(permission)) throw new ForbiddenException(`Permission denied: ${permission}`);
    return member;
  }
  async requireActiveSubscription(organizationId:string, allowFree=false) {
    const subscription=await this.subscriptions.findOne({where:{organizationId},relations:['plan'],order:{createdAt:'DESC'}});
    if(!subscription) throw new ForbiddenException('Organization has no subscription');
    if(subscription.status==='ACTIVE' || (allowFree && subscription.plan?.code==='FREE')) return subscription;
    throw new ForbiddenException('Subscription is not active');
  }
}
