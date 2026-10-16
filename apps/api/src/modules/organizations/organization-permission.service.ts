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
