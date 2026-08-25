import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactMessage } from './entities/contact-message.entity';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';
import { UpdateContactMessageStatusDto } from './dto/update-contact-message-status.dto';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    @InjectRepository(ContactMessage)
    private readonly repo: Repository<ContactMessage>,
  ) {}

  async create(dto: CreateContactMessageDto): Promise<{ received: boolean }> {
    // Honeypot : un bot qui remplit ce champ caché est ignoré sans message d'erreur
    // (pour ne pas lui indiquer qu'il a été détecté).
    if (dto.website) {
      this.logger.warn('Soumission de contact ignorée (honeypot rempli)');
      return { received: true };
    }

    await this.repo.save(
      this.repo.create({
        name: dto.name,
        email: dto.email,
        subject: dto.subject,
        message: dto.message,
      }),
    );

    // MVP : le message est stocké en base et consultable dans l'admin.
    // Une notification email (Nodemailer/SMTP) pourra être ajoutée en phase 2
    // sans changer ce contrat d'API (voir docs/ANALYSE-PLAN-BACKEND.md).
    return { received: true };
  }

  findAll(): Promise<ContactMessage[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: number): Promise<ContactMessage> {
    const message = await this.repo.findOne({ where: { id } });
    if (!message) {
      throw new NotFoundException(`Message ${id} introuvable`);
    }
    return message;
  }

  async updateStatus(
    id: number,
    dto: UpdateContactMessageStatusDto,
  ): Promise<ContactMessage> {
    const message = await this.findOne(id);
    message.status = dto.status;
    return this.repo.save(message);
  }

  async remove(id: number): Promise<void> {
    const message = await this.findOne(id);
    await this.repo.remove(message);
  }
}
