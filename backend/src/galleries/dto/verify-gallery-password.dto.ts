import { IsString } from 'class-validator';

export class VerifyGalleryPasswordDto {
  @IsString()
  password: string;
}
