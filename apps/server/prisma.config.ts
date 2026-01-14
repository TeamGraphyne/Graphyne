import { defineConfig, env } from '@prisma/config';

export default defineConfig({
  // Point to your schema
  schema: 'prisma/schema.prisma',
  // Configure the datasource here instead of in the schema
  datasource: {
    url: env('DATABASE_URL'),
  },
});