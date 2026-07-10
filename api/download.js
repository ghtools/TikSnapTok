// Edge Runtime removes Vercel's Node.js serverless "cold start" delay,
// which was a real contributor to the 10+ second wait testers reported
// between pasting a link and the video actually starting to download.
// Edge functions run on always-warm V8 isolates instead of spinning up a
// fresh container per request, so this endpoint responds as soon as the
// upstream API responds, with minimal added platform overhead.

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url) {
    return new Response(JSON.stringify({ error: 'Missing "url" query parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
  const RAPIDAPI_HOST = 'tiktok-video-no-watermark2.p.rapidapi.com';

  if (!RAPIDAPI_KEY) {
    return new Response(JSON.stringify({ error: 'Server is missing API key configuration' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Guard against the upstream API hanging indefinitely on a slow response,
  // so the user gets a clear error instead of an endless spinner.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const apiUrl = `https://${RAPIDAPI_HOST}/?url=${encodeURIComponent(url)}&hd=1`;

    const apiRes = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!apiRes.ok) {
      return new Response(JSON.stringify({ error: `Upstream API returned ${apiRes.status}` }), {
        status: apiRes.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await apiRes.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Cache successful responses briefly so re-checking the same link
        // (e.g. a page refresh) doesn't re-hit the upstream API.
        'Cache-Control': 's-maxage=300, stale-while-revalidate',
      },
    });
  } catch (err) {
    clearTimeout(timeout);
    const timedOut = err.name === 'AbortError';
    return new Response(
      JSON.stringify({
        error: timedOut
          ? 'The video lookup took too long and timed out. Please try again.'
          : 'Failed to fetch video data',
      }),
      { status: timedOut ? 504 : 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
