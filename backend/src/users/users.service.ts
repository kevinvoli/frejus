import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AdminUser } from './entities/admin-user.entity';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(AdminUser)
    private readonly adminUsers: Repository<AdminUser>,
    private readonly config: ConfigService,
  ) {}

  findByEmail(email: string): Promise<AdminUser | null> {
    return this.adminUsers.findOne({ where: { email } });
  }

  // Au démarrage, si aucun compte admin n'existe, on en crée un à partir des
  // variables d'environnement ADMIN_EMAIL / ADMIN_PASSWORD. Pratique pour un
  // premier déploiement sur le VPS sans avoir à se connecter à la base à la main.
  async onModuleInit() {
    const count = await this.adminUsers.count();
    if (count > 0) {
      return;
    }

    const email = this.config.get<string>('ADMIN_EMAIL');
    const password = this.config.get<string>('ADMIN_PASSWORD');

    if (!email || !password) {
      this.logger.warn(
        'Aucun compte admin en base et ADMIN_EMAIL/ADMIN_PASSWORD absents : ' +
          'définissez-les dans le .env puis redémarrez pour créer le premier compte.',
      );
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await this.adminUsers.save(this.adminUsers.create({ email, passwordHash }));
    this.logger.log(`Compte admin initial créé pour ${email}`);
  }
}
