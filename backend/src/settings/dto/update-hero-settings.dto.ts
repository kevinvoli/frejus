import { IsOptional, IsString } from 'class-validator';

export class UpdateHeroSettingsDto {
  @IsOptional() @IsString() heroTitle?: string;
  @IsOptional() @IsString() heroSubtitle?: string;
  @IsOptional() @IsString() heroImageUrl?: string;
}
