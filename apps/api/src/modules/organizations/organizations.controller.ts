import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationEntity } from '../../database/entities/organization.entity';
import { OrganizationMemberEntity, OrganizationRole } from '../../database/entities/organization-member.entity';
import { JwtAuthGuard } from '../auth/auth.guard'; import { AuthenticatedRequest } from '../auth/auth.types';
import { CurrentOrganizationService } from './current-organization.service'; import { OrganizationPermissionService } from './organization-permission.service'; import { InvitationsService } from './invitations.service';
import { AcceptInvitationDto, ChangeMemberRoleDto, CreateInvitationDto, UpdateOrganizationDto } from './organization.dto';
@Controller('organizations') @UseGuards(JwtAuthGuard)
export class OrganizationsController {
 constructor(@InjectRepository(OrganizationMemberEntity) private members:Repository<OrganizationMemberEntity>,@InjectRepository(OrganizationEntity) private organizations:Repository<OrganizationEntity>,private current:CurrentOrganizationService,private permissions:OrganizationPermissionService,private invitations:InvitationsService){}
 @Get('mine') async mine(@Req() r:AuthenticatedRequest){const ms=await this.members.findBy({userId:r.user.sub});const ids=ms.map(x=>x.organizationId);const os=ids.length?await this.organizations.createQueryBuilder('o').whereInIds(ids).getMany():[];return {data:os.map(o=>({organization:o,role:ms.find(m=>m.organizationId===o.id)?.role}))};}
 @Get(':organizationId') async get(@Req()r:AuthenticatedRequest,@Param('organizationId')id:string){await this.current.getForUser(r.user.sub,id);return {data:await this.organizations.findOneBy({id})};}
 @Patch(':organizationId') async update(@Req()r:AuthenticatedRequest,@Param('organizationId')id:string,@Body()dto:UpdateOrganizationDto){await this.permissions.requireRole(r.user.sub,id,OrganizationRole.ADMIN);const o=await this.organizations.findOneBy({id});if(!o)return {data:null};Object.assign(o,dto);return {data:await this.organizations.save(o)};}
 @Get(':organizationId/members') async list(@Req()r:AuthenticatedRequest,@Param('organizationId')id:string){await this.current.getForUser(r.user.sub,id);return {data:await this.members.find({where:{organizationId:id},order:{createdAt:'ASC'}})};}
 @Patch(':organizationId/members/:memberId') async role(@Req()r:AuthenticatedRequest,@Param('organizationId')oid:string,@Param('memberId')mid:string,@Body()dto:ChangeMemberRoleDto){await this.permissions.requireRole(r.user.sub,oid,OrganizationRole.ADMIN);const m=await this.members.findOneBy({id:mid,organizationId:oid});if(!m)return {data:null};if(m.role===OrganizationRole.OWNER)return {data:m};m.role=dto.role;return {data:await this.members.save(m)};}
 @Delete(':organizationId/members/:memberId') async remove(@Req()r:AuthenticatedRequest,@Param('organizationId')oid:string,@Param('memberId')mid:string){await this.permissions.requireRole(r.user.sub,oid,OrganizationRole.ADMIN);const m=await this.members.findOneBy({id:mid,organizationId:oid});if(!m)return {success:false};if(m.role===OrganizationRole.OWNER)return {success:false,reason:'OWNER_CANNOT_BE_REMOVED'};await this.members.remove(m);return {success:true};}
 @Post(':organizationId/invitations') async invite(@Req()r:AuthenticatedRequest,@Param('organizationId')oid:string,@Body()dto:CreateInvitationDto){await this.permissions.requireRole(r.user.sub,oid,OrganizationRole.ADMIN);return {data:await this.invitations.create(oid,r.user.sub,dto.email,dto.role)};}
 @Get(':organizationId/invitations') async invites(@Req()r:AuthenticatedRequest,@Param('organizationId')oid:string){await this.current.getForUser(r.user.sub,oid);return {data:await this.invitations.list(oid)};}
 @Delete(':organizationId/invitations/:invitationId') async revoke(@Req()r:AuthenticatedRequest,@Param('organizationId')oid:string,@Param('invitationId')id:string){await this.permissions.requireRole(r.user.sub,oid,OrganizationRole.ADMIN);return this.invitations.revoke(oid,id);}
 @Post('invitations/accept') async accept(@Req()r:AuthenticatedRequest,@Body()dto:AcceptInvitationDto){return {data:await this.invitations.accept(r.user.sub,dto.token)};}
}
