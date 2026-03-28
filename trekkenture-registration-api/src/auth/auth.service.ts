import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from '../dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto) {
    // TODO: Replace with real user validation from database
    // For demonstration, using hardcoded admin credentials
    const validUsername = this.configService.get<string>(
      'ADMIN_USERNAME',
      'admin',
    );
    const validPassword = this.configService.get<string>(
      'ADMIN_PASSWORD',
      'admin123',
    );

    if (
      loginDto.username !== validUsername ||
      loginDto.password !== validPassword
    ) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { username: loginDto.username, sub: 'admin-id' };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async validateUser(payload: any) {
    // TODO: Add real user validation logic here
    return { userId: payload.sub, username: payload.username };
  }
}
