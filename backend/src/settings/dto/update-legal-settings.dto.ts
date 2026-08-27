import { IsOptional, IsString } from 'class-validator';

export class UpdateLegalSettingsDto {
  @IsOptional() @IsString() mentionsLegales?: string;
  @IsOptional() @IsString() politiqueConfidentialite?: string;
  @IsOptional() @IsString() conditionsGenerales?: string;
}
