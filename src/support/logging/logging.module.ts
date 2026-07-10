import { Module } from '@nestjs/common';
import { createSharedWinstonLoggerOptions } from '@sisques-labs/nestjs-kit';
import { WinstonModule } from 'nest-winston';

@Module({
  imports: [
    WinstonModule.forRoot(
      createSharedWinstonLoggerOptions({ service: 'nestjs-template' }),
    ),
  ],
  exports: [WinstonModule],
})
export class LoggingModule {}
