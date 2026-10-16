import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { OrganizationRole } from '../../database/entities/organization-member.entity';
export class CreateInvitationDto { @IsEmail() email!: string; @IsEnum(OrganizationRole) role!: OrganizationRole; }
export class AcceptInvitationDto { @IsString() token!: string; }
export class ChangeMemberRoleDto { @IsEnum(OrganizationRole) role!: OrganizationRole; }
export class UpdateOrganizationDto { @IsOptional() @IsString() @Length(2,150) name?: string; @IsOptional() @IsString() @Length(2,20) countryCode?: string; @IsOptional() @IsString() @Length(2,10) languageCode?: string; @IsOptional() @IsString() @Length(3,3) currencyCode?: string; @IsOptional() @IsString() @Length(2,64) timezone?: string; }
