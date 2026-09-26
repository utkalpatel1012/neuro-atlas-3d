import { defineConfig } from 'vite';
import path from 'path';
import fs from 'fs';

export default defineConfig({
  root: '.',
  server: {
    port: 3000,
    open: false,
    fs: {
      allow: ['.']
    }
  },
  plugins: [
    {
      name: 'serve-neuro-static-assets',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith('/assets/') || req.url?.startsWith('/data/')) {
            const cleanUrl = req.url.split('?')[0];
            const filePath = path.resolve(process.cwd(), '.' + cleanUrl);
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
              if (filePath.endsWith('.glb')) {
                res.setHeader('Content-Type', 'model/gltf-binary');
              } else if (filePath.endsWith('.json')) {
                res.setHeader('Content-Type', 'application/json');
              }
              const stream = fs.createReadStream(filePath);
              return stream.pipe(res);
            }
          }
          next();
        });
      }
    }
  ],
  build: {
    outDir: 'dist',
    target: 'esnext',
    assetsInlineLimit: 0
  }
});
