import { Module } from '@nestjs/common';
import { NotebookController } from './notebook.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({ imports: [AuthModule], controllers: [NotebookController] })
export class NotebookModule {}
