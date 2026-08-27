import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateSpecialtyTariffDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  detail?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
