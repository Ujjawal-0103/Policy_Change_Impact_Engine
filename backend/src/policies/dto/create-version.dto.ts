import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { PolicyVersionStatus } from '@prisma/client';

export class CreateVersionDto {
  @IsString()
  @IsNotEmpty()
  documentId: string;

  @IsEnum(PolicyVersionStatus)
  @IsOptional()
  status?: PolicyVersionStatus;

  @IsOptional()
  autoExtractRequirements?: boolean;
}
