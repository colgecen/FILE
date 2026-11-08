import { protocol } from 'electron';
import { createReadStream, statSync } from 'node:fs';
import { Readable } from 'node:stream';
import { mediaKindForPath, mimeForPath, decodeMediaPath } from './mediaKinds';
import { safePath } from './fsHandlers';

const SCHEME = 'file-media';

/** app.whenReady öncesinde çağrılmalı. */
export function registerMediaSchemePrivileges(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        corsEnabled: true,
      },
    },
  ]);
}

/** app.whenReady sonrasında çağrılmalı. */
export function registerMediaProtocol(): void {
  protocol.handle(SCHEME, (request) => {
    let pathname = '';
    try {
      const url = new URL(request.url);
      pathname = url.pathname;
    } catch {
      return new Response('Bad URL', { status: 400 });
    }
    const encoded = pathname.replace(/^\/+/, '');
    const raw = decodeMediaPath(encoded);
    if (raw === null) return new Response('Bad path', { status: 400 });

    const path = safePath(raw);
    if (path === null || mediaKindForPath(path) === null) {
      return new Response('Not found', { status: 404 });
    }

    let stat;
    try {
      stat = statSync(path);
    } catch {
      return new Response('Not found', { status: 404 });
    }
    if (!stat.isFile()) return new Response('Not found', { status: 404 });

    const size = stat.size;
    const mime = mimeForPath(path);
    const rangeHeader = request.headers.get('range');

    if (rangeHeader !== null) {
      const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
      if (match !== null) {
        const startStr = match[1] ?? '';
        const endStr = match[2] ?? '';
        let start = startStr === '' ? 0 : Number(startStr);
        let end = endStr === '' ? size - 1 : Number(endStr);
        if (Number.isNaN(start) || Number.isNaN(end)) {
          return new Response('Range Not Satisfiable', {
            status: 416,
            headers: { 'Content-Range': `bytes */${size}` },
          });
        }
        if (start < 0) start = 0;
        if (end >= size) end = size - 1;
        if (start > end || start >= size) {
          return new Response('Range Not Satisfiable', {
            status: 416,
            headers: { 'Content-Range': `bytes */${size}` },
          });
        }
        const chunkSize = end - start + 1;
        const stream = createReadStream(path, { start, end });
        const webStream = Readable.toWeb(stream) as ReadableStream<Uint8Array>;
        return new Response(webStream, {
          status: 206,
          headers: {
            'Content-Type': mime,
            'Content-Length': String(chunkSize),
            'Content-Range': `bytes ${start}-${end}/${size}`,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'no-cache',
          },
        });
      }
    }

    const stream = createReadStream(path);
    const webStream = Readable.toWeb(stream) as ReadableStream<Uint8Array>;
    return new Response(webStream, {
      status: 200,
      headers: {
        'Content-Type': mime,
        'Content-Length': String(size),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache',
      },
    });
  });
}