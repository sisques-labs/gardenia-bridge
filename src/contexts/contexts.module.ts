import { DynamicModule, Module, Type } from '@nestjs/common';

import { NodesModule } from './nodes/nodes.module';

const CONTEXT_MODULES: (DynamicModule | Type<unknown>)[] = [NodesModule];

@Module({
  imports: [...CONTEXT_MODULES],
})
export class ContextsModule {}
