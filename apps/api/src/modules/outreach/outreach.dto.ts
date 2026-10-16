import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { OutreachChannel } from '../../database/entities/outreach-message.entity';

export class CreateOutreachDto {
  @IsIn(['EMAIL','TELEGRAM','VK','WHATSAPP','INSTAGRAM','PHONE'])
  channel!: OutreachChannel;
  @IsOptional() @IsUUID() contactId?: string;
  @IsOptional() @IsString() @MaxLength(240) subject?: string;
  @IsString() @MinLength(3) @MaxLength(10000) body!: string;
}

export class CreateTemplateDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsIn(['EMAIL','TELEGRAM','VK','WHATSAPP','INSTAGRAM','PHONE']) channel!: OutreachChannel;
  @IsOptional() @IsString() @MaxLength(240) subject?: string;
  @IsString() @MinLength(3) @MaxLength(10000) body!: string;
}
