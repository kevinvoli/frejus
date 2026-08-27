import { IsOptional, IsString } from 'class-validator';

export class UpdateGeneralSettingsDto {
  @IsOptional() @IsString() faviconUrl?: string;
  @IsOptional() @IsString() logoUrl?: string;
}
