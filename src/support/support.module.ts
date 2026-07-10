import { Module } from '@nestjs/common';
import { LoggingModule } from './logging/logging.module';

const SUPPORT_MODULES = [LoggingModule];

@Module({
  imports: [...SUPPORT_MODULES],
  controllers: [],
  providers: [],
  exports: [...SUPPORT_MODULES],
})
export class SupportModule {}
