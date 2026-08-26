import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { PortfolioCategory } from './entities/portfolio-category.entity';
import { CreatePortfolioCategoryDto } from './dto/create-portfolio-category.dto';
import { UpdatePortfolioCategoryDto } from './dto/update-portfolio-category.dto';

@Injectable()
export class PortfolioCategoriesService {
  constructor(
    @InjectRepository(PortfolioCategory)
    private readonly repo: Repository<PortfolioCategory>,
  ) {}

  findAll(): Promise<PortfolioCategory[]> {
    return this.repo.find({ order: { order: 'ASC', id: 'ASC' } });
  }

  create(dto: CreatePortfolioCategoryDto): Promise<PortfolioCategory> {
    return this.saveOrThrowOnDuplicate(this.repo.create(dto));
  }

  async update(
    id: number,
    dto: UpdatePortfolioCategoryDto,
  ): Promise<PortfolioCategory> {
    const category = await this.findOne(id);
    return this.saveOrThrowOnDuplicate(this.repo.merge(category, dto));
  }

  async remove(id: number): Promise<void> {
    const category = await this.findOne(id);
    // Suppression indépendante des éléments de portfolio existants : une
    // catégorie n'est qu'une entrée de liste, pas une clé étrangère (voir
    // l'entité) — les éléments qui l'utilisaient déjà conservent simplement
    // leur texte de catégorie tel quel.
    await this.repo.remove(category);
  }

  private async findOne(id: number): Promise<PortfolioCategory> {
    const category = await this.repo.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Catégorie ${id} introuvable`);
    }
    return category;
  }

  private async saveOrThrowOnDuplicate(
    category: PortfolioCategory,
  ): Promise<PortfolioCategory> {
    try {
      return await this.repo.save(category);
    } catch (err) {
      const isDuplicateKey =
        err instanceof QueryFailedError &&
        (err as unknown as { code?: string }).code === 'ER_DUP_ENTRY';
      if (isDuplicateKey) {
        throw new BadRequestException('Cette catégorie existe déjà');
      }
      throw err;
    }
  }
}
