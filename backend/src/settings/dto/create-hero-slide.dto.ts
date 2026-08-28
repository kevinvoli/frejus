import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateHeroSlideDto {
  @IsString()
  imageUrl: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
