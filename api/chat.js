// Vercel serverless function — proxies chat to Claude API
// Each request includes full lead context so the bot is dedicated to that lead

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })
  }

  const { messages, lead } = req.body
  if (!messages || !lead) {
    return res.status(400).json({ error: 'Missing messages or lead data' })
  }

  // Build lead context for the system prompt
  const gaps = (lead.gaps || [])
    .map(g => `- [${g.impact?.toUpperCase()}] ${g.gap}: ${g.explanation || ''}`)
    .join('\n')

  const reviews = (lead.reviewsData?.reviews || [])
    .slice(0, 5)
    .map(r => `- ${r.rating}/5 by ${r.author}: "${r.text}"`)
    .join('\n')

  const systemPrompt = `You are a research assistant for SiteScout CRM by Create & Source. You help the user (a web agency owner) review and refine their outreach strategy for a specific business lead BEFORE they reach out.

You have complete knowledge of this lead:

BUSINESS: ${lead.businessName || 'Unknown'}
TYPE: ${lead.businessType || lead.industry || 'Unknown'}
LOCATION: ${lead.contact?.address || lead.location || 'Unknown'}
PHONE: ${lead.contact?.phone || 'Unknown'}
WEBSITE: ${lead.contact?.website || 'None'}
SITE QUALITY: ${lead.currentSiteQuality || 'Unknown'}
GOOGLE RATING: ${lead.googleMapsData?.rating || 'N/A'}/5 (${lead.googleMapsData?.reviews || 0} reviews)
${lead.googleMapsData?.unclaimed ? 'NOTE: Google listing is UNCLAIMED' : ''}

OPPORTUNITY SUMMARY:
${lead.gapSummary || 'No summary available'}

ESTIMATED REVENUE IMPACT: ${lead.estimatedRevenueImpact || 'Not estimated'}

REVENUE GAPS:
${gaps || 'None identified'}

LOVABLE BUILD PROMPT:
${lead.lovablePrompt || 'Not generated yet'}

DRAFT OUTREACH EMAIL:
Subject: ${lead.emailSubject || 'None'}
Body: ${lead.emailBody || 'Not drafted yet'}

CUSTOMER REVIEWS:
${reviews || 'No reviews available'}
${lead.reviewsData?.topics?.length ? '\nREVIEW TOPICS: ' + lead.reviewsData.topics.map(t => `${t.keyword} (${t.mentions})`).join(', ') : ''}

Your job:
- Answer questions about this lead's data, gaps, and opportunity
- Help refine the Lovable prompt (suggest additions, removals, improvements)
- Help refine the outreach email (tone, personalization, accuracy)
- Flag anything that looks wrong or could be improved
- Be direct and concise — this is a working tool, not a chatbot demo
- If asked to rewrite something, output the full rewritten version`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: systemPrompt,
        messages: messages,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return res.status(response.status).json({ error: err })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || 'No response'
    return res.status(200).json({ text })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
