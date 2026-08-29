import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { Priority, ActionStatus } from '@prisma/client';

export class CreateActionDto {
  @IsString()
  @IsNotEmpty({ message: 'requirementId is required and must link to an existing Requirement' })
  requirementId: string;

  @IsString()
  @IsNotEmpty({ message: 'title is required' })
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(Priority, { message: 'priority must be LOW, MEDIUM, HIGH, or CRITICAL' })
  @IsOptional()
  priority?: Priority;

  @IsString()
  @IsOptional()
  department?: string;

  @IsString()
  @IsOptional()
  assignedToId?: string;

  @IsDateString({}, { message: 'deadline must be a valid ISO 8601 date string' })
  @IsOptional()
  deadline?: string;

  @IsEnum(ActionStatus, { message: 'status must be PENDING, IN_PROGRESS, COMPLETED, OVERDUE, or BLOCKED' })
  @IsOptional()
  status?: ActionStatus;

  @IsString()
  @IsOptional()
  note?: string;

  @IsString()
  @IsOptional()
  userId?: string;
}
