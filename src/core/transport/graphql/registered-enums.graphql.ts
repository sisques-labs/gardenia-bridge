import { registerEnumType } from '@nestjs/graphql';
import { FilterOperator, SortDirection } from '@sisques-labs/nestjs-kit';

const registeredSharedEnums = [
  {
    enum: FilterOperator,
    name: 'FilterOperator',
    description: 'The operator to filter by',
  },
  {
    enum: SortDirection,
    name: 'SortDirection',
    description: 'The direction to sort by',
  },
];

for (const { enum: enumType, name, description } of registeredSharedEnums) {
  registerEnumType(enumType, { name, description });
}
