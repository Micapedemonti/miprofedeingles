import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/current-user.decorator';
import { UpdateProfileDto } from './profile.dto';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async get(@CurrentUser() current: AuthenticatedUser) {
    return this.prisma.profile.findUnique({ where: { userId: current.userId } });
  }

  @Patch()
  async update(@CurrentUser() current: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.prisma.profile.upsert({
      where: { userId: current.userId },
      create: { userId: current.userId, ...dto },
      update: dto,
    });
  }
}
