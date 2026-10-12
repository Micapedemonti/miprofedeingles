import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/current-user.decorator';
import { UpdateSettingsDto } from './settings.dto';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async get(@CurrentUser() current: AuthenticatedUser) {
    return this.prisma.settings.findUnique({ where: { userId: current.userId } });
  }

  @Patch()
  async update(@CurrentUser() current: AuthenticatedUser, @Body() dto: UpdateSettingsDto) {
    return this.prisma.settings.upsert({
      where: { userId: current.userId },
      create: { userId: current.userId, ...dto },
      update: dto,
    });
  }
}
