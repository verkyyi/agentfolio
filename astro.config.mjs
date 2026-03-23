import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: process.env.SITE_URL || 'https://verkyyi.github.io',
  base: process.env.BASE_PATH || '/tokenman',
  integrations: [
    tailwind(),
    sitemap(),
  ],
  output: 'static',
});
