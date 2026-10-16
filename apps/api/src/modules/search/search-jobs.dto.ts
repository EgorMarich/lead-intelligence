import { IsInt, IsObject, IsOptional, IsString, IsUUID, Max, Min, } from 'class-validator';
import { DiscoveryFilters } from '@lead/shared';

export class CreateSearchJobDto {
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() query?: string;
  @IsOptional() @IsUUID() cityId?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsObject() filters?: DiscoveryFilters | Record<string, unknown>;
  @IsOptional() @IsInt() @Min(1) @Max(100000) limit?: number;
}
