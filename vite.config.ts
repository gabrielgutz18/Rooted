import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * The site's own address, for the link-preview tags in index.html: the apps that show a picture
 * for a shared link (Facebook, Messenger, X...) need that picture's full address. SITE_URL sets
 * it (e.g. SITE_URL=https://rooted.example.com, as a setting on the host or in .env.production);
 * on Vercel and Netlify the production address is found by itself. With none, it stays relative.
 */
function siteUrl(env: Record<string, string>): string {
  const url =
    env.SITE_URL ||
    (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
    (env.NETLIFY ? env.URL : '') ||
    '';
  return url.replace(/\/+$/, '');
}

/** Fills in __SITE_URL__ in index.html, and adds og:url when the address is known. */
function shareTags(url: string): Plugin {
  return {
    name: 'rooted-share-tags',
    transformIndexHtml: (html) => ({
      html: html.replaceAll('__SITE_URL__', url),
      tags: url ? [{ tag: 'meta', attrs: { property: 'og:url', content: `${url}/` }, injectTo: 'head' }] : [],
    }),
  };
}

export default defineConfig(({ mode }) => ({
  // (the '' prefix reads every setting, the host's own included, not only VITE_ ones)
  plugins: [react(), shareTags(siteUrl(loadEnv(mode, '.', '')))],
  server: { port: 5173 },
}));
