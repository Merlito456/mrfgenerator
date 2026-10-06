import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { exec } from 'node:child_process';

/**
 * Saves generated MRF workbooks straight to disk, bypassing browser download
 * mechanics (which are blocked/unreliable in some embedded browsers).
 * POST /api/save-mrf with the raw file bytes and an x-filename header.
 */
function mrfSaveHandler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end();
    return;
  }
  const chunks: Buffer[] = [];
  req.on('data', (c: Buffer) => chunks.push(c));
  req.on('end', () => {
    try {
      const buf = Buffer.concat(chunks);
      const rawName = decodeURIComponent(String(req.headers['x-filename'] ?? 'MRF.xlsx'));
      const safeName = path.basename(rawName).replace(/[\\/:*?"<>|]/g, '-') || 'MRF.xlsx';
      const dir = path.resolve(process.cwd(), 'generated');
      fs.mkdirSync(dir, { recursive: true });
      const filePath = path.join(dir, safeName);
      fs.writeFileSync(filePath, buf);

      // Best-effort copy into the user's Downloads folder (browser downloads are
      // unreliable in embedded browsers, so the server delivers instead)
      let downloadsPath: string | null = null;
      try {
        const downloadsDir = path.join(os.homedir(), 'Downloads');
        if (fs.existsSync(downloadsDir)) {
          downloadsPath = path.join(downloadsDir, safeName);
          fs.copyFileSync(filePath, downloadsPath);
        }
      } catch {
        // non-fatal
      }

      // Reveal the file in Explorer when requested
      if (req.headers['x-reveal'] === '1' && downloadsPath) {
        try {
          exec(`explorer.exe /select,"${downloadsPath}"`);
        } catch {
          // non-fatal
        }
      }

      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ ok: true, path: filePath, downloadsPath, size: buf.length }));
    } catch (e) {
      res.statusCode = 500;
      res.end(JSON.stringify({ ok: false, error: String(e) }));
    }
  });
}

const mrfSavePlugin = () => ({
  name: 'mrf-save',
  configureServer(server: any) {
    server.middlewares.use('/api/save-mrf', mrfSaveHandler);
  },
  configurePreviewServer(server: any) {
    server.middlewares.use('/api/save-mrf', mrfSaveHandler);
  },
});

export default defineConfig({
  plugins: [react(), mrfSavePlugin()],
  server: { port: 5175 },
});
