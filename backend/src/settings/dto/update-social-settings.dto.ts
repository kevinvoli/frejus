import { IsOptional, IsUrl } from 'class-validator';

export class UpdateSocialSettingsDto {
  @IsOptional() @IsUrl() instagramUrl?: string;
  @IsOptional() @IsUrl() facebookUrl?: string;
  @IsOptional() @IsUrl() pinterestUrl?: string;
}
