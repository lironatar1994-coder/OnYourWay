import { Router } from 'express';

export const analyticsRouter = Router();

const ALLOWED_FILTERS = ['service', 'city', 'source', 'from', 'to'];

function buildAnalyticsUrl(query) {
  const url = new URL(
    process.env.SOS_ANALYTICS_API_URL || 'https://sosbaderech.co.il/api/landing-analytics',
  );

  for (const key of ALLOWED_FILTERS) {
    const value = query[key];
    if (typeof value === 'string' && value.trim()) {
      url.searchParams.set(key, value.trim());
    }
  }

  return url;
}

analyticsRouter.get('/sos', async (req, res, next) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(buildAnalyticsUrl(req.query), {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      return res.status(502).json({
        error: 'SOS analytics source returned an error.',
        status: response.status,
      });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    if (error?.name === 'AbortError') {
      return res.status(504).json({ error: 'SOS analytics source timed out.' });
    }

    return next(error);
  } finally {
    clearTimeout(timeout);
  }
});
