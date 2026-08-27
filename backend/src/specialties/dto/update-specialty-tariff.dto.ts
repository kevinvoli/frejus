import { PartialType } from '@nestjs/mapped-types';
import { CreateSpecialtyTariffDto } from './create-specialty-tariff.dto';

export class UpdateSpecialtyTariffDto extends PartialType(
  CreateSpecialtyTariffDto,
) {}
