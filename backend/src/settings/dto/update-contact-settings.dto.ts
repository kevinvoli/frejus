import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateContactSettingsDto {
  @IsOptional() @IsString() studioName?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() openingHours?: string;
}
