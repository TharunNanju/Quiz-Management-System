import { randomBytes } from 'node:crypto';

import { z } from 'zod';

const ensureSecret = (value: string | undefined, envKey: 'JWT_SECRET' | 'JWT_REFRESH_SECRET') => {
  if (!value || value.length < 16) {
    const generated = randomBytes(32).toString('hex');
    // eslint-disable-next-line no-console
    console.warn(
      `Environment variable ${envKey} was missing or too short. Generated a temporary development secret.`
    );
    process.env[envKey] = generated;
    return generated;
  }
  return value;
};

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('4000'),
  APP_URL: z.string().url().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().default(3306),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  TEST_DB_HOST: z.string().optional(),
  TEST_DB_PORT: z.string().optional(),
  TEST_DB_NAME: z.string().optional(),
  TEST_DB_USER: z.string().optional(),
  TEST_DB_PASSWORD: z.string().optional()
});

const env = envSchema.parse({
  ...process.env,
  JWT_SECRET: ensureSecret(process.env.JWT_SECRET, 'JWT_SECRET'),
  JWT_REFRESH_SECRET: ensureSecret(process.env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET')
});

export default env;
