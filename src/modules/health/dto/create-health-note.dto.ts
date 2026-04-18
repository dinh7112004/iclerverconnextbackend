import { IsString, IsEnum, IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { HealthNoteType } from '../entities/health-note.entity';

export class CreateHealthNoteDto {
  @IsUUID()
  studentId: string;

  @IsEnum(HealthNoteType)
  type: HealthNoteType;

  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsBoolean()
  isImportant?: boolean;
}
