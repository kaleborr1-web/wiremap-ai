export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { system, messages, stream, useSalesforce, sfAccountName } = req.body;

    // ── SALESFORCE LOOKUP (non-streaming) ──────────────────────────────
    if (useSalesforce) {
      const sfBody = {
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        stream: false,
        system: `You are a Salesforce lookup assistant for Softchoice sales reps.
Use the available Salesforce CRM tools to search for the account: "${sfAccountName}".
Return a structured pre-call briefing:
## ACCOUNT
## PRODUCTS & SOLUTIONS
## OPEN OPPORTUNITIES
## RECENT ACTIVITY
## KEY CONTACTS
## RENEWAL DATES
## SIGNALS
If not found say: Account not found: ${sfAccountName}`,
        messages: [{ role: 'user', content: `Look up Salesforce account: ${sfAccountName}` }],
        mcp_servers: [{
          type: 'url',
          url: 'https://api.salesforce.com/platform/mcp/v1/sandbox/custom/sccrmmcptest',
          name: 'sc-crm'
        }]
      };

      const sfRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'mcp-client-2025-04-04',
          'x-api-key': process.env.ANTHROPIC_API_KEY
        },
        body: JSON.stringify(sfBody)
      });

      const sfData = await sfRes.json();
      let text = '';
      if (sfData.content) {
        sfData.content.forEach(block => {
          if (block.type === 'text') text += block.text + '\n';
          if (block.content) {
            const c = block.content;
            if (Array.isArray(c)) c.forEach(x => { if (x.text) text += x.text + '\n'; });
            else if (typeof c === 'string') text += c + '\n';
          }
        });
      }
      if (!text && sfData.error) text = 'Salesforce error: ' + (sfData.error.message || JSON.stringify(sfData.error));
      return res.status(200).json({ text: text.trim() });
    }

    // ── REGULAR AI COACHING (streaming) ────────────────────────────────
    const coachBody = {
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      stream: true,
      system: system || '',
      messages: messages || []
    };

    const coachRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': process.env.ANTHROPIC_API_KEY
      },
      body: JSON.stringify(coachBody)
    });

    if (!coachRes.ok) {
      const err = await coachRes.text();
      return res.status(coachRes.status).json({ error: err });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    const reader = coachRes.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value));
    }
    res.end();

  } catch (err) {
    console.error('WireMap API error:', err.message);
    if (!res.headersSent) {
      return res.status(500).json({ error: err.message });
    }
    res.end();
  }
}
