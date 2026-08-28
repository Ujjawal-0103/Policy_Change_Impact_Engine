import { Controller } from '@nestjs/common';
import { AuthService } from './auth.service.js';

// TODO: Implement JWT authentication endpoints:
// POST /auth/register
// POST /auth/login
// POST /auth/refresh
// POST /auth/logout
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
}
