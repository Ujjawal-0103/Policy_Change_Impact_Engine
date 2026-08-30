import { IsEnum } from 'class-validator';
import { ImpactStatus } from '@prisma/client';

export class UpdateImpactStatusDto {
  @IsEnum(ImpactStatus, {
    message: 'status must be one of: IDENTIFIED, ASSESSED, MITIGATED, ACCEPTED',
  })
  status!: ImpactStatus;
}
