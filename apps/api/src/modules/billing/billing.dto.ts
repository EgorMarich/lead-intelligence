import { IsIn, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateCheckoutDto {
  @IsString()
  @IsIn(['STARTER','BUSINESS','PRO'])
  planCode!: 'STARTER' | 'BUSINESS' | 'PRO';

  @IsOptional()
  @IsUrl({ require_tld: false })
  returnUrl?: string;
}
