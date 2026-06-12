export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { system, messages, stream, useSalesforce, sfAccountName } = req.body;

  // Build MCP servers array - include SC CRM if Salesforce lookup requested
  const mcpServers = useSalesforce ? [{
    type: 'url',
    url: 'https://api.salesforce.com/platform/mcp/v1/sandbox/custom/sccrmmcptest',
    name: 'sc-crm'
  }] : undefined;

  // Build system prompt - augment with SF lookup instruction if needed
  let systemPrompt = system || '';
  if (useSalesforce && sfAccountName) {
    systemPrompt = `You are a Salesforce lookup assistant for Softchoice sales reps. 
Search for the account "${sfAccountName}" in Salesforce CRM.
Return a structured pre-call briefing with:
- Account name and industry
- Current products/solutions they have with Softchoice
- Open opportunities (name, stage, close date, value)
- Recent activity (last 3 interactions)
- Key contacts
- Renewal dates if visible
- Any signals or notes relevant to a sales call

Format as a clean briefing a rep can scan in 30 seconds before a call.
If the account is not found, say so clearly and suggest similar account names.`;
  }

  const body = {
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    stream: stream !== false,
    system: systemPrompt,
    messages: messages || [{ role: 'user', content: `Look up account: ${sfAccountName}` }]
  };

  if (mcpServers) body.mcp_servers = mcpServers;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'mcp-client-2025-04-04',
      'x-api-key': process.env.ANTHROPIC_API_KEY
    },
    body: JSON.stringify(body)
  });

  if (stream !== false) {
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
  } else {
    const data = await response.json();
    res.status(response.status).json(data);
  }
}
