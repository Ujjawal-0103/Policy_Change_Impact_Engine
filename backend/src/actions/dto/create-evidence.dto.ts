import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateEvidenceDto {
  @IsString()
  @IsNotEmpty({ message: 'title is required' })
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  fileUrl?: string;

  @IsString()
  @IsOptional()
  userId?: string;
}
