import { defineConfig } from 'vite';
import path from 'path';
import fs from 'fs';

function copyRuntimeAssets() {
  const distDir = path.resolve(process.cwd(), 'dist');
  if (!fs.existsSync(distDir)) return;

  // 1. Copy manifests
  const manifestSrc = path.resolve(process.cwd(), 'assets/manifests');
  const manifestDst = path.resolve(distDir, 'assets/manifests');
  if (fs.existsSync(manifestSrc)) {
    fs.mkdirSync(manifestDst, { recursive: true });
    fs.cpSync(manifestSrc, manifestDst, { recursive: true });
  }

  const rootManifestSrc = path.resolve(process.cwd(), 'assets/assets.manifest.json');
  if (fs.existsSync(rootManifestSrc)) {
    fs.copyFileSync(rootManifestSrc, path.resolve(distDir, 'assets/assets.manifest.json'));
  }

  // 2. Copy derived runtime models (*.meshopt.glb)
  const derivedSrc = path.resolve(process.cwd(), 'assets/derived');
  if (fs.existsSync(derivedSrc)) {
    const assetFolders = fs.readdirSync(derivedSrc);
    for (const folder of assetFolders) {
      const runtimeSrc = path.join(derivedSrc, folder, 'runtime');
      if (fs.existsSync(runtimeSrc)) {
        const runtimeDst = path.join(distDir, 'assets/derived', folder, 'runtime');
        fs.mkdirSync(runtimeDst, { recursive: true });
        fs.cpSync(runtimeSrc, runtimeDst, { recursive: true });
      }
    }
  }

  // 3. Copy data directory
  const dataSrc = path.resolve(process.cwd(), 'data');
  const dataDst = path.resolve(distDir, 'data');
  if (fs.existsSync(dataSrc)) {
    fs.mkdirSync(dataDst, { recursive: true });
    fs.cpSync(dataSrc, dataDst, { recursive: true });
  }

  console.info('[Vite] Successfully copied neuro runtime 3D models, manifests, and data into dist/.');
}

// Phase 10: copy the PWA shell files (sw.js + webmanifest) into dist/ and
// stamp the worker's __NEURO_ATLAS_VERSION__ placeholder with the build
// (package.json) version, so cache names derive from the release and can
// never go stale. Nothing else is modified.
function stampPwaVersion() {
  const distDir = path.resolve(process.cwd(), 'dist');
  if (!fs.existsSync(distDir)) return;
  const pkgVersion = (JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8')) as { version: string }).version;

  const publicDir = path.resolve(process.cwd(), 'public');
  for (const file of ['sw.js', 'manifest.webmanifest']) {
    const src = path.join(publicDir, file);
    const dst = path.join(distDir, file);
    if (fs.existsSync(src) && !fs.existsSync(dst)) {
      fs.copyFileSync(src, dst);
    }
  }

  const swDst = path.join(distDir, 'sw.js');
  if (fs.existsSync(swDst)) {
    const stamped = fs.readFileSync(swDst, 'utf8').split('__NEURO_ATLAS_VERSION__').join(pkgVersion);
    fs.writeFileSync(swDst, stamped);
  }

  console.info(`[Vite] PWA stamped: sw.js + manifest.webmanifest at version ${pkgVersion}.`);
}

export default defineConfig({
  base: './',
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
    },
    {
      name: 'copy-neuro-runtime-assets',
      closeBundle() {
        copyRuntimeAssets();
        stampPwaVersion();
      }
    }
  ],
  build: {
    outDir: 'dist',
    target: 'esnext',
    assetsInlineLimit: 0
  }
});

