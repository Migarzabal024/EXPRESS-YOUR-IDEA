import { defineConfig } from 'drizzle-kit';

// Base de datos de cada proyecto: database/project.db
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/schema/project.ts',
  out: './drizzle/project',
});
