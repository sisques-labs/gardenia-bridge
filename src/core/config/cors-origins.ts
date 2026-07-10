function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/$/, '');
}

export function resolveCorsOrigins(env: {
  CORS_ORIGINS?: string;
  FRONTEND_URL?: string;
  NODE_ENV?: string;
}): string[] {
  const fromEnv = env.CORS_ORIGINS?.split(',')
    .map(normalizeOrigin)
    .filter(Boolean);
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv;
  }

  const frontendUrl = env.FRONTEND_URL?.trim();
  if (frontendUrl) {
    return [normalizeOrigin(frontendUrl)];
  }

  if (env.NODE_ENV !== 'production') {
    return ['http://localhost:3001'];
  }

  return [];
}

export function validateProductionCorsOrigins(env: {
  CORS_ORIGINS?: string;
  FRONTEND_URL?: string;
}): string[] {
  const origins = resolveCorsOrigins({ ...env, NODE_ENV: 'production' });

  if (origins.length === 0) {
    return [
      '  - CORS_ORIGINS or FRONTEND_URL: at least one origin must be configured in production',
    ];
  }

  return [];
}
