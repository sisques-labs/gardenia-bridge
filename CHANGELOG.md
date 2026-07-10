# Changelog

All notable changes to this project will be documented in this file.
## [0.1.1] - 2026-07-10

### Chore
- **deps-dev:** Bump jest and @types/jest (7023af8)
- **deps-dev:** Bump eslint-config-prettier from 9.1.2 to 10.1.8 (b94aa03)
- **deps-dev:** Bump @nestjs/schematics from 10.2.3 to 11.1.0 (0d880d6)
## [0.1.0] - 2026-07-10

### Chore
- First commit (19b9436)
- **deps-dev:** Bump @types/supertest from 6.0.3 to 7.2.0 (98f7a65)
- Rename package to sisqueslabs/nestjs-template (41f38b4)
- **deps:** Bump @sisques-labs/nestjs-kit to 1.2.1 (5d7cc08)
- Reset package.json version to 0.0.0 (cc5fcde)

### Documentation
- Add docker/README.md for the Docker Hub repository page (efffab5)

### Features
- Bootstrap NestJS service template from gardenia-api conventions (7f53cea)

### Refactor
- **mcp:** Consume @sisques-labs/nestjs-kit/mcp instead of a local copy (34388a4)
- **metrics,messaging:** Consume @sisques-labs/nestjs-kit instead of local copies (10287b5)
- Aggregate core/context wiring into CoreModule/ContextsModule (6885b77)

