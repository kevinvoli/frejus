import { PartialType } from '@nestjs/mapped-types';
import { CreatePortfolioCategoryDto } from './create-portfolio-category.dto';

export class UpdatePortfolioCategoryDto extends PartialType(
  CreatePortfolioCategoryDto,
) {}
