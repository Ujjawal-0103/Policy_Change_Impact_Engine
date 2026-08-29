import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ActionStatus, Priority } from '@prisma/client';

export class FilterActionDto {
  @IsEnum(ActionStatus)
  @IsOptional()
  status?: ActionStatus;

  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @IsString()
  @IsOptional()
  department?: string;

  @IsString()
  @IsOptional()
  requirementId?: string;

  @IsString()
  @IsOptional()
  search?: string;
}
