/**
 * PESO — Personal Expense & Spending Organizer
 * Full-Stack Application Server (SQLite REST API + React/PWA Static Host)
 *
 * Listens on 0.0.0.0:3000 so both local desktop and iOS/Android devices
 * on the network can install the PWA and sync with the SQLite database.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  getDatabaseStats,
  registerUserInDb,
  authenticateUserInDb,
  getUserLedgerFromDb,
  syncLedgerStateInDb
} from './db.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const PORT = Number(process.env.PORT) || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mobileconfig': 'application/x-apple-aspen-config',
  '.apk': 'application/vnd.android.package-archive',
  '.ipa': 'application/octet-stream'
};

function getLanAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 5 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      res.end();
      return;
    }

    const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = decodeURIComponent(urlObj.pathname);

    // =======================================================================
    // SQLITE DATABASE REST API ENDPOINTS
    // =======================================================================
    if (pathname === '/api/health' && req.method === 'GET') {
      const stats = getDatabaseStats();
      const lanIp = getLanAddress();
      sendJson(res, 200, {
        ...stats,
        network: {
          localUrl: `http://localhost:${PORT}`,
          lanUrl: `http://${lanIp}:${PORT}`,
          lanIp,
          port: PORT
        }
      });
      return;
    }

    if (pathname === '/api/auth/register' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const result = registerUserInDb(body);
      sendJson(res, result.ok ? 200 : 400, result);
      return;
    }

    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const result = authenticateUserInDb(body.identifier, body.password);
      sendJson(res, result.ok ? 200 : 401, result);
      return;
    }

    if (pathname === '/api/ledger' && req.method === 'GET') {
      const email = urlObj.searchParams.get('email') || '';
      const found = getUserLedgerFromDb(email);
      if (!found) {
        sendJson(res, 404, { ok: false, error: 'Ledger not found for email.' });
        return;
      }
      sendJson(res, 200, { ok: true, ...found });
      return;
    }

    if (pathname === '/api/ledger/sync' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const email = body.email || body.state?.student?.email;
      const result = syncLedgerStateInDb(email, body.state);
      sendJson(res, result.ok ? 200 : 400, result);
      return;
    }

    // =======================================================================
    // STATIC ASSETS & REACT PWA SERVING
    // =======================================================================
    let relPath = pathname === '/' ? '/index.html' : pathname;
    // Prevent path traversal
    relPath = path.normalize(relPath).replace(/^(\.\.(\/|\\|$))+/, '');

    // Check dist/ first (Vite production build), then public/, then root
    const candidates = [
      path.join(DIST_DIR, relPath),
      path.join(ROOT_DIR, 'public', relPath),
      path.join(ROOT_DIR, relPath)
    ];

    for (const filePath of candidates) {
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        });
        fs.createReadStream(filePath).pipe(res);
        return;
      }
    }

    // SPA fallback to index.html
    const fallbackHtml = fs.existsSync(path.join(DIST_DIR, 'index.html'))
      ? path.join(DIST_DIR, 'index.html')
      : path.join(ROOT_DIR, 'index.html');

    if (fs.existsSync(fallbackHtml)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(fallbackHtml).pipe(res);
      return;
    }

    sendJson(res, 404, { ok: false, error: 'Resource not found' });
  } catch (err) {
    console.error('Server error:', err);
    sendJson(res, 500, { ok: false, error: err.message || 'Internal server error' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const lanIp = getLanAddress();
  console.log(`============================================================`);
  console.log(`PESO Full-Stack App + SQLite Server Running`);
  console.log(`- Local Desktop:       http://localhost:${PORT}`);
  console.log(`- Mobile / Friends:    http://${lanIp}:${PORT}`);
  console.log(`- SQLite Database:     data/peso.sqlite`);
  console.log(`============================================================`);
});
