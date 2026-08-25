import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// A poser sur toutes les routes réservées à l'admin (CRUD contenu, messages de contact, upload).
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
