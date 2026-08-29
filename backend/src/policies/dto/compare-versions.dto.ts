import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CompareVersionsDto {
  @IsString()
  @IsNotEmpty()
  fromVersionId: string;

  @IsString()
  @IsNotEmpty()
  toVersionId: string;

  @IsString()
  @IsOptional()
  policyId?: string;
}
