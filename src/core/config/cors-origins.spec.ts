import {
  resolveCorsOrigins,
  validateProductionCorsOrigins,
} from './cors-origins';

describe('resolveCorsOrigins', () => {
  it('uses CORS_ORIGINS when set', () => {
    expect(
      resolveCorsOrigins({
        CORS_ORIGINS: 'https://app.example.com, https://admin.example.com/',
        FRONTEND_URL: 'https://ignored.example.com',
      }),
    ).toEqual(['https://app.example.com', 'https://admin.example.com']);
  });

  it('falls back to FRONTEND_URL when CORS_ORIGINS is empty', () => {
    expect(
      resolveCorsOrigins({
        CORS_ORIGINS: ' , ',
        FRONTEND_URL: 'https://frontend.example.com/',
      }),
    ).toEqual(['https://frontend.example.com']);
  });

  it('defaults to localhost in non-production when unset', () => {
    expect(resolveCorsOrigins({ NODE_ENV: 'development' })).toEqual([
      'http://localhost:3001',
    ]);
  });

  it('returns no origins in production when unset', () => {
    expect(resolveCorsOrigins({ NODE_ENV: 'production' })).toEqual([]);
  });
});

describe('validateProductionCorsOrigins', () => {
  it('accepts configured CORS_ORIGINS', () => {
    expect(
      validateProductionCorsOrigins({
        CORS_ORIGINS: 'https://app.example.com',
      }),
    ).toEqual([]);
  });

  it('accepts configured FRONTEND_URL', () => {
    expect(
      validateProductionCorsOrigins({
        FRONTEND_URL: 'https://frontend.example.com',
      }),
    ).toEqual([]);
  });

  it('rejects missing origins in production', () => {
    expect(validateProductionCorsOrigins({})).toEqual([
      '  - CORS_ORIGINS or FRONTEND_URL: at least one origin must be configured in production',
    ]);
  });
});
