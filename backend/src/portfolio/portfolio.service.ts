import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PortfolioItem } from './entities/portfolio-item.entity';
import { CreatePortfolioItemDto } from './dto/create-portfolio-item.dto';
import { UpdatePortfolioItemDto } from './dto/update-portfolio-item.dto';

@Injectable()
export class PortfolioService {
  constructor(
    @InjectRepository(PortfolioItem)
    private readonly repo: Repository<PortfolioItem>,
  ) {}

  // category optionnelle : reproduit le filtre "Tous / Portrait / Mariage / ..." du site actuel.
  findAll(category?: string): Promise<PortfolioItem[]> {
    return this.repo.find({
      where: category ? { category, published: true } : { published: true },
      order: { order: 'ASC', id: 'ASC' },
    });
  }

  // Utilisé par le panneau admin : voit aussi les éléments non publiés.
  findAllForAdmin(): Promise<PortfolioItem[]> {
    return this.repo.find({ order: { order: 'ASC', id: 'ASC' } });
  }

  async findOne(id: number): Promise<PortfolioItem> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Élément de portfolio ${id} introuvable`);
    }
    return item;
  }

  create(dto: CreatePortfolioItemDto): Promise<PortfolioItem> {
    return this.repo.save(this.repo.create(dto));
  }

  async update(
    id: number,
    dto: UpdatePortfolioItemDto,
  ): Promise<PortfolioItem> {
    const item = await this.findOne(id);
    return this.repo.save(this.repo.merge(item, dto));
  }

  async remove(id: number): Promise<void> {
    const item = await this.findOne(id);
    await this.repo.remove(item);
  }
}
