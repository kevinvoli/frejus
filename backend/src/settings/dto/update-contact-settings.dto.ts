import { IsArray, IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateContactSettingsDto {
  @IsOptional() @IsString() studioName?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) phones?: string[];
  @IsOptional() @IsArray() @IsEmail({}, { each: true }) emails?: string[];
  @IsOptional() @IsString() openingHours?: string;
}
