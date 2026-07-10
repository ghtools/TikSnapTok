// Edge Runtime streams the response directly instead of buffering the
// entire video into memory first. This fixes two real problems reported
// by testers:
//   1. On slow connections, the old serverless function buffered the
//      whole file server-side before sending anything back, so users saw
//      a long stall and sometimes a silent failure once the file exceeded
//      the platform's response-size/time limits.
//   2. Larger HD videos could exceed the default serverless payload limit
//      entirely, causing the download to fail with no useful error.
// Streaming avoids both: bytes start reaching the browser as soon as they
// arrive from the source, and there's no in-memory buffering ceiling.

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  const filename = searchParams.get('filename') || 'tiksnaptok-download';

  if (!url) {
    return new Response(JSON.stringify({ error: 'Missing "url" query parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const upstream = await fetch(url);

    if (!upstream.ok || !upstream.body) {
      return new Response(JSON.stringify({ error: `Upstream returned ${upstream.status}` }), {
        status: upstream.status || 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const contentLength = upstream.headers.get('content-length');
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

    const headers = {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${safeName}"`,
      'Cache-Control': 'no-store',
    };
    if (contentLength) headers['Content-Length'] = contentLength;

    // Pass the upstream body straight through — this is the streaming part.
    return new Response(upstream.body, { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to proxy media file' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
        }
