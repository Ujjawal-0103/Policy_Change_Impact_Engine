import { IsOptional, IsString } from 'class-validator';

export class AssignActionDto {
  @IsString()
  @IsOptional()
  assignedToId?: string | null;

  @IsString()
  @IsOptional()
  department?: string | null;

  @IsString()
  @IsOptional()
  note?: string;
}
