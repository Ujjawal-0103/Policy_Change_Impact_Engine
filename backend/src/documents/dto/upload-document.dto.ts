import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;
}
