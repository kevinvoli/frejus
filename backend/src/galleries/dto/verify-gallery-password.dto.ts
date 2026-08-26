import { IsOptional, IsString } from 'class-validator';

export class VerifyGalleryPasswordDto {
  @IsString()
  password: string;

  // Jeton "gallery-usage" déjà obtenu par ce navigateur pour cette galerie (voir
  // galleries.service.ts), transmis pour ne pas recompter une utilisation si ce
  // navigateur a déjà déverrouillé cette galerie dans les 30 derniers jours.
  @IsOptional()
  @IsString()
  usage?: string;
}
