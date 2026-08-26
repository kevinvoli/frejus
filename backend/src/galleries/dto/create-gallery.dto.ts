import {
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateGalleryDto {
  @IsString()
  title: string;

  @IsString()
  clientName: string;

  @IsOptional()
  @IsEmail()
  clientEmail?: string;

  @IsOptional()
  @IsString()
  description?: string;

  // Mot de passe en clair reçu du panneau admin, hashé par le service avant stockage.
  // Absent ou vide = galerie sans mot de passe (accessible via le lien seul).
  @IsOptional()
  @IsString()
  @MinLength(4)
  password?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
