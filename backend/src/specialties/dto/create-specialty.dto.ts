import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateSpecialtyDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
