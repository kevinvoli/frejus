import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioItem } from './entities/portfolio-item.entity';
import { PortfolioCategory } from './entities/portfolio-category.entity';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';
import { PortfolioCategoriesController } from './portfolio-categories.controller';
import { PortfolioCategoriesService } from './portfolio-categories.service';

@Module({
  imports: [TypeOrmModule.forFeature([PortfolioItem, PortfolioCategory])],
  controllers: [PortfolioController, PortfolioCategoriesController],
  providers: [PortfolioService, PortfolioCategoriesService],
})
export class PortfolioModule {}
