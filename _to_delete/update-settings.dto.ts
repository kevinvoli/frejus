import { IsEmail, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional() @IsString() heroTitle?: string;
  @IsOptional() @IsString() heroSubtitle?: string;
  @IsOptional() @IsString() heroImageUrl?: string;
  @IsOptional() @IsString() aboutText?: string;
  @IsOptional() @IsString() aboutImageUrl?: string;
  @IsOptional() @IsString() studioName?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() openingHours?: string;
  @IsOptional() @IsUrl() instagramUrl?: string;
  @IsOptional() @IsUrl() facebookUrl?: string;
  @IsOptional() @IsUrl() pinterestUrl?: string;
}
