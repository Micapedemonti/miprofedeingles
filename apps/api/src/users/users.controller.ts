import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/current-user.decorator';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async me(@CurrentUser() current: AuthenticatedUser) {
    const user = await this.prisma.user.findUnique({
      where: { id: current.userId },
      select: {
        id: true, email: true, createdAt: true,
        profile: true, settings: true,
      },
    });
    return user;
  }
}
