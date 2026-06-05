// api/check-email.js
// Vercel Serverless Function (Node)
module.exports = async (req, res) => {
  // Simple CORS handling - change origin to your frontend domain for tighter security
  const ALLOWED_ORIGIN = process.env.FRONTEND_ORIGIN || '*';

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST,OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'missing_email' });
    }

    const normalized = email.trim().toLowerCase();

    // Basic validation: require smyrnaeagles.org domain and reasonable local-part
    const re = /^[a-zA-Z][a-zA-Z0-9._+-]*@smyrnaeagles\.org$/i;
    if (!re.test(normalized)) {
      res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
      return res.json({ allowed: false, reason: 'invalid_domain' });
    }

    // Load lists from environment variables (comma-separated)
    const allowCsv = process.env.ALLOW_LIST || '';
    const bannedCsv = process.env.BANNED_LIST || '';

    const allowSet = new Set(allowCsv.split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
    const bannedSet = new Set(bannedCsv.split(',').map(s => s.trim().toLowerCase()).filter(Boolean));

    // If an allowlist exists, require membership
    if (allowSet.size > 0) {
      if (!allowSet.has(normalized)) {
        res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
        return res.json({ allowed: false, reason: 'not_allowed' });
      }
    } else {
      // Otherwise, check banned list
      if (bannedSet.has(normalized)) {
        res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
        return res.json({ allowed: false, reason: 'banned' });
      }
    }

    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    return res.json({ allowed: true });
  } catch (err) {
    console.error('check-email error', err);
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    return res.status(500).json({ error: 'server_error' });
  }
};
