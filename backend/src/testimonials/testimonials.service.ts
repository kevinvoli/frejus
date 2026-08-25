import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Testimonial } from './entities/testimonial.entity';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';

@Injectable()
export class TestimonialsService {
  constructor(
    @InjectRepository(Testimonial)
    private readonly repo: Repository<Testimonial>,
  ) {}

  findAll(): Promise<Testimonial[]> {
    return this.repo.find({
      where: { published: true },
      order: { createdAt: 'DESC' },
    });
  }

  findAllForAdmin(): Promise<Testimonial[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: number): Promise<Testimonial> {
    const testimonial = await this.repo.findOne({ where: { id } });
    if (!testimonial) {
      throw new NotFoundException(`Témoignage ${id} introuvable`);
    }
    return testimonial;
  }

  create(dto: CreateTestimonialDto): Promise<Testimonial> {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: number, dto: UpdateTestimonialDto): Promise<Testimonial> {
    const testimonial = await this.findOne(id);
    return this.repo.save(this.repo.merge(testimonial, dto));
  }

  async remove(id: number): Promise<void> {
    const testimonial = await this.findOne(id);
    await this.repo.remove(testimonial);
  }
}
