// Lambda Function URL handler for SvelteKit (adapter-node output).
// Handles three response paths in order:
//   1. Static assets in build/client/ (JS, CSS, images, immutable chunks)
//   2. Prerendered HTML pages in build/prerendered/
//   3. SSR via SvelteKit's Server.respond

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from './server/index.js';
import { manifest, prerendered } from './server/manifest.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = path.join(__dirname, 'client');
const PRERENDERED_DIR = path.join(__dirname, 'prerendered');

const server = new Server(manifest);
await server.init({ env: process.env });

const TEXT_TYPES = /^(text\/|application\/(json|javascript|xml|graphql)|image\/svg\+xml)/;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

async function readFileIfExists(filePath, rootDir) {
  // Path traversal guard
  const resolved = path.resolve(filePath);
  if (
    !resolved.startsWith(path.resolve(rootDir) + path.sep) &&
    resolved !== path.resolve(rootDir)
  ) {
    return null;
  }
  try {
    const stat = await fs.stat(resolved);
    if (stat.isFile()) return await fs.readFile(resolved);
  } catch {}
  return null;
}

function fileResponse(content, contentType, cacheControl) {
  const isText = TEXT_TYPES.test(contentType);
  return {
    statusCode: 200,
    headers: {
      'content-type': contentType,
      'cache-control': cacheControl,
    },
    body: isText ? content.toString('utf8') : content.toString('base64'),
    isBase64Encoded: !isText,
  };
}

export const handler = async (event) => {
  const { requestContext, rawPath, rawQueryString, headers, body, isBase64Encoded, cookies } =
    event;
  const method = requestContext.http.method;
  const decodedPath = decodeURIComponent(rawPath);

  // 1. Static assets from client/
  if (method === 'GET' || method === 'HEAD') {
    const clientFile = path.join(CLIENT_DIR, decodedPath.startsWith('/') ? decodedPath.slice(1) : decodedPath);
    const content = await readFileIfExists(clientFile, CLIENT_DIR);
    if (content) {
      const ext = path.extname(clientFile).toLowerCase();
      const contentType = MIME[ext] || 'application/octet-stream';
      const cacheControl = decodedPath.startsWith(`/${manifest.appPath}/immutable/`)
        ? 'public, immutable, max-age=31536000'
        : 'public, max-age=0, must-revalidate';
      return fileResponse(content, contentType, cacheControl);
    }

    // 2. Prerendered pages
    if (prerendered.has(decodedPath)) {
      const candidates = [
        path.join(PRERENDERED_DIR, decodedPath, 'index.html'),
        path.join(PRERENDERED_DIR, `${decodedPath}.html`),
        path.join(PRERENDERED_DIR, decodedPath),
      ];
      for (const c of candidates) {
        const content = await readFileIfExists(c, PRERENDERED_DIR);
        if (content) {
          return fileResponse(
            content,
            'text/html; charset=utf-8',
            'public, max-age=0, must-revalidate'
          );
        }
      }
    }
  }

  // 3. SSR via SvelteKit
  // PUBLIC_ORIGIN (e.g. "https://spotlit.online") forces every request to
  // use the public domain when building url.origin — matters for OAuth
  // redirect_uri, since proxies in front of Lambda Function URLs may not
  // forward x-forwarded-host reliably.
  let host, proto;
  if (process.env.PUBLIC_ORIGIN) {
    const u = new URL(process.env.PUBLIC_ORIGIN);
    host = u.host;
    proto = u.protocol.replace(':', '');
  } else {
    host = headers['x-forwarded-host'] || headers.host || 'lambda';
    proto = headers['x-forwarded-proto'] || 'https';
  }
  const url = `${proto}://${host}${rawPath}${rawQueryString ? '?' + rawQueryString : ''}`;

  const reqHeaders = new Headers();
  for (const [k, v] of Object.entries(headers || {})) {
    if (v !== undefined) reqHeaders.set(k, v);
  }
  if (cookies?.length) reqHeaders.set('cookie', cookies.join('; '));

  const hasBody = body !== undefined && body !== null && method !== 'GET' && method !== 'HEAD';
  const reqBody = hasBody ? (isBase64Encoded ? Buffer.from(body, 'base64') : body) : undefined;

  const request = new Request(url, {
    method,
    headers: reqHeaders,
    body: reqBody,
  });

  const response = await server.respond(request, {
    getClientAddress: () => requestContext.http.sourceIp,
    platform: { event },
  });

  const respHeaders = {};
  const respCookies = [];
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      respCookies.push(...value.split(/,(?=\s*[^;,\s]+=)/));
    } else {
      respHeaders[key] = value;
    }
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') || '';
  const isText = TEXT_TYPES.test(contentType);

  return {
    statusCode: response.status,
    headers: respHeaders,
    cookies: respCookies.length ? respCookies : undefined,
    body: isText ? buffer.toString('utf8') : buffer.toString('base64'),
    isBase64Encoded: !isText,
  };
};
