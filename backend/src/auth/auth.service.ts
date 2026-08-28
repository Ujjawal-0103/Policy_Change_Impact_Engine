import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

// TODO: Implement JWT authentication:
// - register(email, password, name): hash password, create User, return JWT
// - login(email, password): validate credentials, return JWT
// - validateToken(token): verify JWT, return User
@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}
}
