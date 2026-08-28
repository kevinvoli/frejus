import { IsOptional, IsString } from 'class-validator';

export class UpdateHeroSettingsDto {
  @IsOptional() @IsString() heroTitle?: string;
}
