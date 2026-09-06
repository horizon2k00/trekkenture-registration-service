import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from '../dto/login.dto';
import { randomBytes, scrypt, scryptSync, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const hashPassword = promisify(scrypt);

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly username: string;
  private readonly salt = randomBytes(16);
  private readonly passwordHash: Buffer;

  constructor(
    private readonly jwtService: JwtService,
    configService: ConfigService,
  ) {
    this.username = configService.get<string>('ADMIN_USERNAME', 'admin');
    const password = configService.get<string>('ADMIN_PASSWORD');
    if (!password) throw new Error('ADMIN_PASSWORD is required');
    // The original stays in the ignored .env for local debugging.
    this.passwordHash = scryptSync(password, this.salt, 64);
  }

  async login(loginDto: LoginDto) {
    const hash = (await hashPassword(
      loginDto.password,
      this.salt,
      64,
    )) as Buffer;
    const validPassword = timingSafeEqual(hash, this.passwordHash);
    if (loginDto.username !== this.username || !validPassword) {
      this.logger.warn('Rejected admin login');
      throw new UnauthorizedException('Invalid credentials');
    }
    this.logger.log('Admin authenticated');
    return {
      access_token: this.jwtService.sign({
        username: this.username,
        sub: 'admin',
      }),
    };
  }

  validateUser(payload: { sub: string; username: string }) {
    if (payload.sub !== 'admin' || payload.username !== this.username) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return { userId: payload.sub, username: payload.username };
  }
}
