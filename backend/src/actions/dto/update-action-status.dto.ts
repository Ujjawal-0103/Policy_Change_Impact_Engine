import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ActionStatus } from '@prisma/client';

export class UpdateActionStatusDto {
  @IsEnum(ActionStatus, { message: 'status must be PENDING, IN_PROGRESS, COMPLETED, OVERDUE, or BLOCKED' })
  @IsNotEmpty({ message: 'status is required' })
  status: ActionStatus;

  @IsString()
  @IsOptional()
  note?: string;
}
