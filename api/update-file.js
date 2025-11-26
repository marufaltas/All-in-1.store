// Serverless function to update a file (products.json / users.json) in a GitHub repo.
// Usage (POST): { path: 'products.json', content: {...}, message: 'optional commit message' }
// Authorization: pass an admin token via header 'x-admin-token' or JSON field 'token'.
// Required environment variables:
// - GITHUB_TOKEN : a personal access token with repo contents permissions
// - GITHUB_REPO  : repo in format "owner/repo" where the file will be written
// - ADMIN_TOKEN   : a secret token that the client must provide to authorize updates

const fetch = require('node-fetch');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_REPO = process.env.GITHUB_REPO;
  const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

  if (!GITHUB_TOKEN || !GITHUB_REPO || !ADMIN_TOKEN) {
    return res.status(500).json({ error: 'Server misconfigured. Set GITHUB_TOKEN, GITHUB_REPO, ADMIN_TOKEN.' });
  }

  const body = req.body || {};
  const token = req.headers['x-admin-token'] || body.token;
  if (!token || token !== ADMIN_TOKEN) return res.status(401).json({ error: 'Unauthorized' });

  const { path, content, message } = body;
  if (!path || !content) return res.status(400).json({ error: 'path and content required' });

  const apiBase = `https://api.github.com/repos/${GITHUB_REPO}/contents/${encodeURIComponent(path)}`;

  try {
    // Check if file exists to get sha
    const getRes = await fetch(apiBase, { headers: { Authorization: `token ${GITHUB_TOKEN}`, 'User-Agent': 'site-serverless' } });
    let sha = null;
    if (getRes.status === 200) {
      const json = await getRes.json();
      sha = json.sha;
    }

    const contentStr = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    const base64 = Buffer.from(contentStr, 'utf8').toString('base64');

    const commitBody = {
      message: message || `Update ${path} via site serverless`,
      content: base64,
    };
    if (sha) commitBody.sha = sha;

    const putRes = await fetch(apiBase, {
      method: 'PUT',
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        'User-Agent': 'site-serverless',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(commitBody)
    });

    const putJson = await putRes.json();
    if (putRes.status >= 200 && putRes.status < 300) {
      return res.status(200).json({ ok: true, result: putJson });
    }

    return res.status(putRes.status).json({ error: 'GitHub error', detail: putJson });
  } catch (err) {
    console.error('update-file error', err);
    return res.status(500).json({ error: 'Server error', detail: String(err) });
  }
};
