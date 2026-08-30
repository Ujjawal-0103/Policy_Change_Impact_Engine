import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ImpactSeverity, ImpactStatus } from '@prisma/client';

export class FilterImpactDto {
  @IsOptional()
  @IsString()
  policyId?: string;

  @IsOptional()
  @IsString()
  changeId?: string;

  @IsOptional()
  @IsEnum(ImpactSeverity)
  severity?: ImpactSeverity;

  @IsOptional()
  @IsEnum(ImpactStatus)
  status?: ImpactStatus;

  @IsOptional()
  @IsString()
  search?: string;
}
