import { IsEnum, IsNotEmpty } from 'class-validator';
import { PolicyVersionStatus } from '@prisma/client';

export class UpdateVersionStatusDto {
  @IsEnum(PolicyVersionStatus)
  @IsNotEmpty()
  status: PolicyVersionStatus;
}
