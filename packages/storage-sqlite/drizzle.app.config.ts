import { defineConfig } from 'drizzle-kit';

// Base de datos global de la aplicación (preferencias y recientes), en la carpeta de usuario.
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/schema/app.ts',
  out: './drizzle/app',
});
