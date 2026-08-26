import { IsOptional, IsString } from 'class-validator';

export class UpdateAboutSettingsDto {
  @IsOptional() @IsString() aboutText?: string;
  @IsOptional() @IsString() aboutImageUrl?: string;
}
