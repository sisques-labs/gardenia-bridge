import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { NodesModule } from '@contexts/nodes/nodes.module';

import { HealthController } from './transport/rest/controllers/health.controller';

// Importing a bounded context (NodesModule) here is a deliberate exception
// to "core never imports a context" — see src/contexts/nodes/README.md.
// Composing readiness across every subsystem is a composition-root concern.
@Module({
  imports: [TerminusModule, NodesModule],
  controllers: [HealthController],
})
export class HealthModule {}
