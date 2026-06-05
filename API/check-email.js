// api/check-email.js
// Vercel Serverless Function (Node)

module.exports = async (req, res) => {
  // Simple CORS handling - change origin to your frontend domain for tighter security
  const ALLOWED_ORIGIN = process.env.FRONTEND_ORIGIN || '*';

  // Always set CORS headers for every response
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
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
      return res.json({ allowed: false, reason: 'invalid_domain' });
    }

    // Load lists from environment variables (support comma, semicolon, or newline separators)
    const allowCsv = process.env.ALLOW_LIST || '';
    const bannedCsv = process.env.BANNED_LIST || '';

    function parseList(csv) {
      if (!csv) return new Set();
      // Split by comma, semicolon, or newline
      const parts = csv.split(/[;,\n]+/);
      return new Set(parts
        .map(s => s.trim().toLowerCase())
        .filter(Boolean)
        .map(entry => {
          // If the list contains local-parts (no @), normalize to full address
          return entry.includes('@') ? entry : `${entry}@smyrnaeagles.org`;
        }));
    }

    const allowSet = parseList(allowCsv);
    const bannedSet = parseList(bannedCsv);

    // Optional DEBUG logging (enable by setting DEBUG=1 in env)
    if (process.env.DEBUG) {
      console.log('check-email:', { normalized, allowList: Array.from(allowSet), bannedList: Array.from(bannedSet) });
    }

    // Prefer banned list: deny immediately if present in banned set
    if (bannedSet.size > 0 && bannedSet.has(normalized)) {
      return res.json({ allowed: false, reason: 'banned' });
    }

    // If allowlist exists, require membership (but banned list already overrides)
    if (allowSet.size > 0) {
      if (!allowSet.has(normalized)) {
        return res.json({ allowed: false, reason: 'not_allowed' });
      }
    }

    return res.json({ allowed: true });
  } catch (err) {
    console.error('check-email error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};
