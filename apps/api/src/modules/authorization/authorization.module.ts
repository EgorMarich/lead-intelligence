import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { OrganizationMemberEntity } from '../../database/entities/organization-member.entity';
import { SubscriptionEntity } from '../../database/entities/subscription.entity';
import { AuthorizationService } from './authorization.service';
import { AuthorizationGuard } from './authorization.guard';
@Module({imports:[TypeOrmModule.forFeature([OrganizationMemberEntity,SubscriptionEntity])],providers:[AuthorizationService,{provide:APP_GUARD,useClass:AuthorizationGuard}],exports:[AuthorizationService]})
export class AuthorizationModule {}
