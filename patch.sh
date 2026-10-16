set -e
cd /mnt/data/v04
cat > apps/api/src/database/entities/organization-invitation.entity.ts <<'EOF'
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
export enum InvitationStatus { PENDING='PENDING', ACCEPTED='ACCEPTED', REVOKED='REVOKED', EXPIRED='EXPIRED' }
@Entity('organization_invitations')
@Index(['organizationId','email','status'])
@Index(['tokenHash'], { unique: true })
export class OrganizationInvitationEntity {
 @PrimaryGeneratedColumn('uuid') id!: string;
 @Column() organizationId!: string;
 @Column() email!: string;
 @Column({type:'enum',enum:InvitationStatus,default:InvitationStatus.PENDING}) status!: InvitationStatus;
 @Column() role!: string;
 @Column() tokenHash!: string;
 @Column({type:'timestamptz'}) expiresAt!: Date;
 @Column() invitedByUserId!: string;
 @Column({type:'timestamptz',nullable:true}) acceptedAt?: Date;
 @Column({type:'timestamptz',nullable:true}) revokedAt?: Date;
 @Column({type:'timestamptz',default:()=> 'now()'}) createdAt!: Date;
}
EOF
cat > apps/api/src/modules/organizations/organization.dto.ts <<'EOF'
import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { OrganizationRole } from '../../database/entities/organization-member.entity';
export class CreateInvitationDto { @IsEmail() email!: string; @IsEnum(OrganizationRole) role!: OrganizationRole; }
export class AcceptInvitationDto { @IsString() token!: string; }
export class ChangeMemberRoleDto { @IsEnum(OrganizationRole) role!: OrganizationRole; }
export class UpdateOrganizationDto { @IsOptional() @IsString() @Length(2,150) name?: string; @IsOptional() @IsString() @Length(2,20) countryCode?: string; }
EOF
cat > apps/api/src/modules/organizations/organization-permission.service.ts <<'EOF'
import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationMemberEntity, OrganizationRole } from '../../database/entities/organization-member.entity';
const rank: Record<OrganizationRole,number> = { VIEWER:10, ANALYST:20, MANAGER:30, ADMIN:40, OWNER:50 } as Record<OrganizationRole,number>;
@Injectable() export class OrganizationPermissionService {
 constructor(@InjectRepository(OrganizationMemberEntity) private readonly members: Repository<OrganizationMemberEntity>) {}
 async requireRole(userId:string, organizationId:string, minimumRole:OrganizationRole){ const m=await this.members.findOneBy({userId,organizationId}); if(!m || rank[m.role]<rank[minimumRole]) throw new ForbiddenException('Insufficient organization permissions'); return m; }
 async getMembership(userId:string,organizationId:string){ return this.members.findOneBy({userId,organizationId}); }
}
EOF
cat > apps/api/src/modules/organizations/invitations.service.ts <<'EOF'
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { InvitationStatus, OrganizationInvitationEntity } from '../../database/entities/organization-invitation.entity';
import { OrganizationMemberEntity, OrganizationRole } from '../../database/entities/organization-member.entity';
import { UserEntity } from '../../database/entities/user.entity';
@Injectable() export class InvitationsService {
 constructor(@InjectRepository(OrganizationInvitationEntity) private invitations:Repository<OrganizationInvitationEntity>, @InjectRepository(OrganizationMemberEntity) private members:Repository<OrganizationMemberEntity>, @InjectRepository(UserEntity) private users:Repository<UserEntity>) {}
 private hash(v:string){return createHash('sha256').update(v).digest('hex')}
 async create(organizationId:string,invitedByUserId:string,email:string,role:OrganizationRole){ email=email.trim().toLowerCase(); const u=await this.users.findOneBy({email}); if(u && await this.members.findOneBy({userId:u.id,organizationId})) throw new ConflictException('User is already a member'); const active=await this.invitations.findOne({where:{organizationId,email,status:InvitationStatus.PENDING}}); if(active&&active.expiresAt>new Date()) throw new ConflictException('An active invitation already exists'); const token=randomBytes(32).toString('base64url'); const i=await this.invitations.save(this.invitations.create({organizationId,invitedByUserId,email,role,tokenHash:this.hash(token),expiresAt:new Date(Date.now()+7*86400000)})); return {invitationId:i.id,email,role,expiresAt:i.expiresAt,invitationToken:token}; }
 list(organizationId:string){return this.invitations.find({where:{organizationId},order:{createdAt:'DESC'}})}
 async revoke(organizationId:string,id:string){const i=await this.invitations.findOneBy({id,organizationId});if(!i)throw new NotFoundException('Invitation not found');if(i.status!==InvitationStatus.PENDING)throw new BadRequestException('Invitation is not pending');i.status=InvitationStatus.REVOKED;i.revokedAt=new Date();await this.invitations.save(i);return {success:true};}
 async accept(userId:string,token:string){const i=await this.invitations.findOneBy({tokenHash:this.hash(token)});if(!i)throw new NotFoundException('Invitation not found');if(i.status!==InvitationStatus.PENDING||i.expiresAt<=new Date()){if(i.status===InvitationStatus.PENDING){i.status=InvitationStatus.EXPIRED;await this.invitations.save(i)}throw new BadRequestException('Invitation is expired or unavailable')}const u=await this.users.findOneBy({id:userId});if(!u||u.email.toLowerCase()!==i.email.toLowerCase())throw new BadRequestException('Invitation email does not match the authenticated user');const existing=await this.members.findOneBy({userId,organizationId:i.organizationId});if(!existing)await this.members.save(this.members.create({userId,organizationId:i.organizationId,role:i.role as OrganizationRole}));i.status=InvitationStatus.ACCEPTED;i.acceptedAt=new Date();await this.invitations.save(i);return {organizationId:i.organizationId,role:i.role,success:true};}
}
EOF
cat > apps/api/src/modules/organizations/organizations.controller.ts <<'EOF'
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
EOF
cat > apps/api/src/modules/organizations/organizations.module.ts <<'EOF'
import { Module } from '@nestjs/common'; import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationsController } from './organizations.controller'; import { CurrentOrganizationService } from './current-organization.service'; import { OrganizationPermissionService } from './organization-permission.service'; import { InvitationsService } from './invitations.service';
import { OrganizationEntity } from '../../database/entities/organization.entity'; import { OrganizationMemberEntity } from '../../database/entities/organization-member.entity'; import { OrganizationInvitationEntity } from '../../database/entities/organization-invitation.entity'; import { UserEntity } from '../../database/entities/user.entity';
@Module({imports:[TypeOrmModule.forFeature([OrganizationEntity,OrganizationMemberEntity,OrganizationInvitationEntity,UserEntity])],controllers:[OrganizationsController],providers:[CurrentOrganizationService,OrganizationPermissionService,InvitationsService],exports:[CurrentOrganizationService,OrganizationPermissionService]}) export class OrganizationsModule {}
EOF
cat > apps/api/src/database/migrations/1710000004000-OrganizationManagement.ts <<'EOF'
import { MigrationInterface, QueryRunner } from 'typeorm';
export class OrganizationManagement1710000004000 implements MigrationInterface { name='OrganizationManagement1710000004000'; async up(q:QueryRunner){await q.query(`DO $$ BEGIN CREATE TYPE "invitation_status_enum" AS ENUM ('PENDING','ACCEPTED','REVOKED','EXPIRED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);await q.query(`CREATE TABLE IF NOT EXISTS "organization_invitations" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),"organizationId" uuid NOT NULL,"email" varchar NOT NULL,"status" "invitation_status_enum" NOT NULL DEFAULT 'PENDING',"role" varchar NOT NULL,"tokenHash" varchar NOT NULL UNIQUE,"expiresAt" timestamptz NOT NULL,"invitedByUserId" uuid NOT NULL,"acceptedAt" timestamptz,"revokedAt" timestamptz,"createdAt" timestamptz NOT NULL DEFAULT now())`);await q.query(`CREATE INDEX IF NOT EXISTS "IDX_org_invitation_lookup" ON "organization_invitations" ("organizationId","email","status")`)} async down(q:QueryRunner){await q.query(`DROP TABLE IF EXISTS "organization_invitations"`);await q.query(`DROP TYPE IF EXISTS "invitation_status_enum"`)}}
EOF
python3 - <<'PY'
from pathlib import Path
p=Path('README.md'); s=p.read_text() if p.exists() else ''
if 'v0.4.0' not in s:
 s+='''\n\n## v0.4.0 — SaaS Organization Management\n\nAdds organization administration, role enforcement and seven-day member invitations.\n\nEndpoints: `GET /api/v1/organizations/mine`, organization details/update, members, invitations and invitation acceptance.\n\nRole hierarchy: `VIEWER < ANALYST < MANAGER < ADMIN < OWNER`.\n'''
p.write_text(s)
PY
zip -qr /mnt/data/lead-intelligence-backend-v0.4.0-saas-organization-management.zip . -x '*.git/*'
python3 - <<'PY'
import zipfile
p='/mnt/data/lead-intelligence-backend-v0.4.0-saas-organization-management.zip'
with zipfile.ZipFile(p) as z: print('zip ok',len(z.namelist()),'files')
PY
