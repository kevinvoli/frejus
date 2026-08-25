import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreatePortfolioItemDto {
  @IsString()
  title: string;

  @IsString()
  category: string;

  @IsString()
  imageUrl: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}
