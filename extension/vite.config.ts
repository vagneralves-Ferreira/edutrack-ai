import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function copyExtensionAssets(supabaseUrl: string): Plugin {
  return {
    name: 'edutrack-copy-extension-assets',
    closeBundle() {
      const outDir = path.resolve(__dirname, 'dist');
      const manifestSrc = path.resolve(__dirname, 'manifest.json');
      const manifestDest = path.resolve(outDir, 'manifest.json');

      const manifest = JSON.parse(fs.readFileSync(manifestSrc, 'utf-8'));
      if (supabaseUrl) {
        try {
          const origin = new URL(supabaseUrl).origin;
          manifest.host_permissions = [`${origin}/*`];
        } catch {
          // Mantém o host_permissions padrão do manifest.json
        }
      }
      fs.writeFileSync(manifestDest, JSON.stringify(manifest, null, 2), 'utf-8');

      const iconsSrcDir = path.resolve(__dirname, 'icons');
      const iconsDestDir = path.resolve(outDir, 'icons');
      fs.mkdirSync(iconsDestDir, { recursive: true });
      for (const file of fs.readdirSync(iconsSrcDir)) {
        if (file.endsWith('.png')) {
          fs.copyFileSync(path.join(iconsSrcDir, file), path.join(iconsDestDir, file));
        }
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, 'VITE_');
  return {
    root: __dirname,
    envDir: projectRoot,
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      copyExtensionAssets(env.VITE_SUPABASE_URL || ''),
    ],
    build: {
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
      rollupOptions: {
        input: {
          popup: path.resolve(__dirname, 'popup.html'),
        },
      },
    },
  };
});
