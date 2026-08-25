import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Specialty } from './entities/specialty.entity';
import { CreateSpecialtyDto } from './dto/create-specialty.dto';
import { UpdateSpecialtyDto } from './dto/update-specialty.dto';

@Injectable()
export class SpecialtiesService {
  constructor(
    @InjectRepository(Specialty)
    private readonly repo: Repository<Specialty>,
  ) {}

  findAll(): Promise<Specialty[]> {
    return this.repo.find({ order: { order: 'ASC', id: 'ASC' } });
  }

  async findOne(id: number): Promise<Specialty> {
    const specialty = await this.repo.findOne({ where: { id } });
    if (!specialty) {
      throw new NotFoundException(`Spécialité ${id} introuvable`);
    }
    return specialty;
  }

  create(dto: CreateSpecialtyDto): Promise<Specialty> {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: number, dto: UpdateSpecialtyDto): Promise<Specialty> {
    const specialty = await this.findOne(id);
    return this.repo.save(this.repo.merge(specialty, dto));
  }

  async remove(id: number): Promise<void> {
    const specialty = await this.findOne(id);
    await this.repo.remove(specialty);
  }
}
