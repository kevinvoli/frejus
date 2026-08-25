import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateContactMessageDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  subject?: string;

  @IsString()
  @MinLength(1)
  message: string;

  // Champ "honeypot" anti-spam basique : invisible pour un humain (masqué en CSS côté
  // frontend), rempli automatiquement par la plupart des robots. S'il est renseigné,
  // le service ignore silencieusement la soumission (voir contact.service.ts).
  @IsOptional()
  @IsString()
  website?: string;
}
