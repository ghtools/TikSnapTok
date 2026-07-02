export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing "url" query parameter' });
  }

  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
  const RAPIDAPI_HOST = 'tiktok-video-no-watermark2.p.rapidapi.com';

  if (!RAPIDAPI_KEY) {
    return res.status(500).json({ error: 'Server is missing API key configuration' });
  }

  try {
    const apiUrl = `https://${RAPIDAPI_HOST}/?url=${encodeURIComponent(url)}&hd=1`;

    const apiRes = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
      }
    });

    if (!apiRes.ok) {
      return res.status(apiRes.status).json({ error: `Upstream API returned ${apiRes.status}` });
    }

    const data = await apiRes.json();

    // Cache successful responses for a short time to save bandwidth on repeat requests.
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch video data' });
  }
}
