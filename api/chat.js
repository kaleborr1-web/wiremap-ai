export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const body = req.body;
    const { useSalesforce, sfAccountName } = body;

    // Build request to Anthropic
    const anthropicBody = {
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      stream: !useSalesforce && body.stream !== false
    };

    // System prompt
    if (useSalesforce && sfAccountName) {
      anthropicBody.system = `You are a Salesforce lookup assistant for Softchoice sales reps.
Use the available Salesforce CRM tools to search for the account named "${sfAccountName}".
Search by account name. If exact match fails try partial.
Return a structured pre-call briefing with:
## ACCOUNT
Name, industry, location, account owner

## PRODUCTS & SOLUTIONS
What they currently have with Softchoice

## OPEN OPPORTUNITIES
Name, stage, close date, value

## RECENT ACTIVITY
Last 3 interactions

## KEY CONTACTS
Name and title

## RENEWAL DATES
Any upcoming renewals

## SIGNALS
Anything relevant for a sales call

Keep it scannable. If not found say: Account not found: ${sfAccountName}`;
      anthropicBody.messages = [{ role: 'user', content: `Look up Salesforce account: ${sfAccountName}` }];
      anthropicBody.stream = false;
    } else {
      anthropicBody.system = body.system || '';
      anthropicBody.messages = body.messages || [];
    }

    // Add MCP for Salesforce
    if (useSalesforce) {
      anthropicBody.mcp_servers = [{
        type: 'url',
        url: 'https://api.salesforce.com/platform/mcp/v1/sandbox/custom/sccrmmcptest',
        name: 'sc-crm'
      }];
    }

    const headers = {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': process.env.ANTHROPIC_API_KEY
    };
    if (useSalesforce) {
      headers['anthropic-beta'] = 'mcp-client-2025-04-04';
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify(anthropicBody)
    });

    // Salesforce: return full JSON so frontend can parse
    if (useSalesforce) {
      const data = await response.json();

      // Extract all text content
      let text = '';
      if (data.content && Array.isArray(data.content)) {
        data.content.forEach(block => {
          if (block.type === 'text') text += block.text + '\n';
          if (block.type === 'tool_result' || block.type === 'mcp_tool_result') {
            const c = block.content;
            if (Array.isArray(c)) c.forEach(x => { if (x.text) text += x.text + '\n'; });
            else if (typeof c === 'string') text += c + '\n';
          }
        });
      }

      // If still no text, stringify content for debugging
      if (!text && data.content) {
        text = 'DEBUG - Raw response: ' + JSON.stringify(data.content).slice(0, 500);
      }
      if (!text && data.error) {
        text = 'Salesforce error: ' + (data.error.message || JSON.stringify(data.error));
      }

      return res.status(200).json({ text: text.trim(), stop_reason: data.stop_reason });
    }

    // Regular streaming coaching calls
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value));
    }
    res.end();

  } catch (err) {
    console.error('WireMap API error:', err);
    return res.status(500).json({ 
      text: 'Server error: ' + err.message,
      error: err.message 
    });
  }
}
