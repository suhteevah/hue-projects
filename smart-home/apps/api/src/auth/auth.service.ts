import { Injectable, ConflictException, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  username: string;
  role: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(username: string, password: string) {
    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (existing) {
      throw new ConflictException('Username already exists');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // First user is always admin
    const userCount = await this.prisma.user.count();
    const role = userCount === 0 ? 'admin' : 'user';

    const user = await this.prisma.user.create({
      data: { username, passwordHash, role },
    });

    this.logger.log(`User registered: ${username} (${role})`);
    return this.generateTokens(user.id, user.username, user.role);
  }

  async validateUser(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return { id: user.id, username: user.username, role: user.role };
  }

  async login(username: string, password: string) {
    const user = await this.validateUser(username, password);
    return this.generateTokens(user.id, user.username, user.role);
  }

  private generateTokens(userId: string, username: string, role: string) {
    const payload: JwtPayload = { sub: userId, username, role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: { id: userId, username, role },
    };
  }

  async hasUsers(): Promise<boolean> {
    const count = await this.prisma.user.count();
    return count > 0;
  }
}
