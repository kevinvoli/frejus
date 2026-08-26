import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PortfolioCategoriesService } from './portfolio-categories.service';
import { CreatePortfolioCategoryDto } from './dto/create-portfolio-category.dto';
import { UpdatePortfolioCategoryDto } from './dto/update-portfolio-category.dto';

// Usage interne au panneau admin uniquement (alimente la liste déroulante de
// catégories à la création/modification d'un élément de portfolio) : toutes les
// routes sont protégées, contrairement à /portfolio qui a un GET public.
@UseGuards(JwtAuthGuard)
@Controller('portfolio-categories')
export class PortfolioCategoriesController {
  constructor(private readonly service: PortfolioCategoriesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() dto: CreatePortfolioCategoryDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePortfolioCategoryDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
