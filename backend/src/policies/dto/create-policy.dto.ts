import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreatePolicyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  orgId?: string;

  @IsString()
  @IsOptional()
  documentId?: string; // Optional: directly associate an initial uploaded document as Version 1
}
