import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/current-user.decorator';
import { CreateClassNoteDto, CreateWeaknessDto } from './notebook.dto';
import { recordWeakness } from './weakness';

@Controller('notebook')
@UseGuards(JwtAuthGuard)
export class NotebookController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getNotebook(@CurrentUser() current: AuthenticatedUser) {
    const [weaknesses, classNotes, recentSessions] = await Promise.all([
      this.prisma.weakness.findMany({
        where: { userId: current.userId },
        orderBy: [{ count: 'desc' }, { lastOccurredAt: 'desc' }],
      }),
      this.prisma.classNote.findMany({
        where: { userId: current.userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.session.findMany({
        where: { userId: current.userId, status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        take: 3,
        select: { id: true, type: true, summary: true, focusCategories: true, accuracy: true, completedAt: true },
      }),
    ]);
    return { weaknesses, classNotes, recentSessions };
  }

  @Post('weaknesses')
  async addWeakness(@CurrentUser() current: AuthenticatedUser, @Body() dto: CreateWeaknessDto) {
    return this.prisma.$transaction((tx) => recordWeakness(tx, current.userId, dto));
  }

  @Post('class-notes')
  async createClassNote(@CurrentUser() current: AuthenticatedUser, @Body() dto: CreateClassNoteDto) {
    return this.prisma.classNote.create({
      data: { userId: current.userId, title: dto.title, content: dto.content, topics: dto.topics ?? [] },
    });
  }
}
