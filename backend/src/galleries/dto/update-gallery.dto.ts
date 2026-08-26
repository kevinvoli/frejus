import { PartialType } from '@nestjs/mapped-types';
import { CreateGalleryDto } from './create-gallery.dto';

// Envoyer password: null (ou une chaîne vide, convertie en null côté panneau admin —
// voir nullifyEmptyStrings) retire la protection par mot de passe d'une galerie existante.
export class UpdateGalleryDto extends PartialType(CreateGalleryDto) {}
