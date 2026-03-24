// ============================================================
// MSME Vyapaar Monitor — AI Daily Brief Edge Function
// ============================================================

import type { AIBrief, AIBriefItem, NewsItem, ApiResponse, SeverityLevel, Sector } from '../src/types/index.js'
import {
  corsHeaders,
  withCors,
  errorResponse,
  getRedisClient,
  cacheGet,
  cacheSet,
  getEnv,
  simpleHash,
} from './_utils.js'

export const config = { runtime: 'edge' }

function getBaseUrl(req: Request): string {
  const url = new URL(req.url)
  return `${url.protocol}//${url.host}`
}

const MOCK_BRIEF: AIBrief = {
  id: simpleHash('mock-brief'),
  date: new Date().toISOString().slice(0, 10),
  title: "Today's Top 5 Things Every MSME Owner Should Know",
  summary:
    'Key updates on government schemes, market movements and compliance deadlines affecting Indian MSMEs today.',
  items: [
    {
      rank: 1,
      headline: 'MUDRA Loan Limit Increased to ₹20 Lakh for Tarun Category',
      whatHappened:
        'The government has revised MUDRA Tarun loan limits from ₹10 lakh to ₹20 lakh to support growing MSMEs.',
      whyItMatters:
        'MSMEs can now access larger unsecured loans for expansion without collateral.',
      actionToTake:
        'Apply via your bank or MUDRA portal (mudra.org.in) with Udyam certificate.',
      severity: 'high',
      sector: ['manufacturing', 'services'],
    },
    {
      rank: 2,
      headline: 'GeM Portal Crosses ₹4 Lakh Crore in Orders — MSME Share at 58%',
      whatHappened:
        'Government e-Marketplace has crossed a historic milestone with MSMEs contributing the majority of fulfilled orders.',
      whyItMatters:
        'GeM provides guaranteed government buyers — register now to access this ₹2.3 lakh crore MSME opportunity.',
      actionToTake:
        'Register at gem.gov.in with your Udyam number and GST certificate.',
      severity: 'medium',
      sector: ['manufacturing', 'trading'],
    },
    {
      rank: 3,
      headline: 'GSTR-1 Filing Deadline: Today is the Last Day for March',
      whatHappened:
        'GSTR-1 for March is due today for monthly filers.',
      whyItMatters:
        'Missing the deadline results in ₹50/day late fee and blocks input tax credit for your buyers.',
      actionToTake:
        'File immediately at gst.gov.in — even a NIL return avoids penalties.',
      severity: 'critical',
      sector: ['manufacturing', 'services', 'trading'],
    },
    {
      rank: 4,
      headline: 'Rupee Strengthens to 83.2 Against Dollar — Good News for Importers',
      whatHappened:
        'INR/USD rate improved by 0.3%, driven by FII inflows and positive macro data.',
      whyItMatters:
        'Businesses importing raw materials or machinery will see reduced costs this week.',
      actionToTake:
        'If you have pending import payments, consider booking forex now.',
      severity: 'low',
      sector: ['manufacturing', 'trading', 'export'],
    },
    {
      rank: 5,
      headline: 'New Cluster Development Scheme — ₹500 Crore for 50 MSME Clusters',
      whatHappened:
        'Ministry of MSME announced cluster development grants for 50 sectors including textiles, food processing and engineering.',
      whyItMatters:
        'Shared infrastructure, testing labs and marketing support can reduce per-unit costs by 20-30%.',
      actionToTake:
        'Check if your industry cluster is included at msme.gov.in/clusters and apply with your district DIC.',
      severity: 'medium',
      sector: ['manufacturing', 'textile', 'food'],
    },
  ],
  generatedAt: new Date().toISOString(),
  modelUsed: 'mock',
  language: 'en',
}

async function fetchTopNews(base: string): Promise<NewsItem[]> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15_000)
    const res = await fetch(`${base}/api/news-aggregator`, {
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!res.ok) return []
    const json = (await res.json()) as ApiResponse<NewsItem[]>
    return (json.data || []).slice(0, 20)
  } catch {
    return []
  }
}

async function generateBriefWithGroq(
  headlines: string[],
  apiKey: string,
): Promise<AIBrief | null> {
  const headlineText = headlines
    .slice(0, 20)
    .map((h, i) => `${i + 1}. ${h}`)
    .join('\n')

  const prompt = `You are an expert business advisor for Indian MSMEs. Given these headlines from today, write a crisp daily brief. Return ONLY valid JSON (no markdown):
{"title":"Today's Top 5 Things Every MSME Owner Should Know","summary":"One sentence overview","items":[{"rank":1,"headline":"...","whatHappened":"...","whyItMatters":"...","actionToTake":"...","severity":"high"}]}
Include top 5 most relevant items only.

Headlines:
${headlineText}`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30_000)

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    })
    clearTimeout(timeoutId)

    if (!res.ok) return null

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = data.choices?.[0]?.message?.content || ''

    // Extract JSON from response
    const jsonMatch = /\{[\s\S]*\}/.exec(content)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0]) as {
      title?: string
      summary?: string
      items?: Array<{
        rank?: number
        headline?: string
        whatHappened?: string
        whyItMatters?: string
        actionToTake?: string
        severity?: SeverityLevel
        sector?: Sector[]
      }>
    }

    const today = new Date().toISOString().slice(0, 10)
    const brief: AIBrief = {
      id: simpleHash(`brief-${today}`),
      date: today,
      title: parsed.title || "Today's Top 5 Things Every MSME Owner Should Know",
      summary: parsed.summary || '',
      items: (parsed.items || []).slice(0, 5).map((item, idx) => ({
        rank: item.rank ?? idx + 1,
        headline: item.headline || '',
        whatHappened: item.whatHappened || '',
        whyItMatters: item.whyItMatters || '',
        actionToTake: item.actionToTake || '',
        severity: item.severity || 'medium',
        sector: item.sector,
      })) as AIBriefItem[],
      generatedAt: new Date().toISOString(),
      modelUsed: 'llama-3.1-8b-instant',
      language: 'en',
    }

    return brief
  } catch {
    return null
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const today = new Date().toISOString().slice(0, 10)
    const cacheKey = `ai-brief:${today}`
    const redis = getRedisClient()

    const cached = await cacheGet(redis, cacheKey)
    if (cached) {
      const response: ApiResponse<unknown> = {
        data: cached,
        cached: true,
        cachedAt: new Date().toISOString(),
        source: 'ai-brief',
        fetchedAt: new Date().toISOString(),
      }
      return withCors(JSON.stringify(response))
    }

    const groqApiKey = getEnv('GROQ_API_KEY')

    if (!groqApiKey) {
      // Return mock brief
      const mockWithDate = {
        ...MOCK_BRIEF,
        date: today,
        id: simpleHash(`mock-brief-${today}`),
        generatedAt: new Date().toISOString(),
        cachedUntil: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
      }
      const response: ApiResponse<AIBrief> = {
        data: mockWithDate,
        cached: false,
        source: 'ai-brief (mock)',
        fetchedAt: new Date().toISOString(),
        error: 'GROQ_API_KEY not configured — returning demo brief',
      }
      return withCors(JSON.stringify(response))
    }

    // Fetch top news
    const base = getBaseUrl(req)
    const newsItems = await fetchTopNews(base)
    const headlines = newsItems.map(n => n.title)

    if (headlines.length === 0) {
      // Use mock headlines as fallback
      const response: ApiResponse<AIBrief> = {
        data: { ...MOCK_BRIEF, date: today, generatedAt: new Date().toISOString() },
        cached: false,
        source: 'ai-brief (no news)',
        fetchedAt: new Date().toISOString(),
      }
      return withCors(JSON.stringify(response))
    }

    const brief = await generateBriefWithGroq(headlines, groqApiKey)

    if (!brief) {
      const response: ApiResponse<AIBrief> = {
        data: { ...MOCK_BRIEF, date: today, generatedAt: new Date().toISOString() },
        cached: false,
        source: 'ai-brief (LLM fallback)',
        fetchedAt: new Date().toISOString(),
        error: 'Groq generation failed — returning template brief',
      }
      return withCors(JSON.stringify(response))
    }

    brief.cachedUntil = new Date(Date.now() + 6 * 3600 * 1000).toISOString()

    // Cache 6 hours
    await cacheSet(redis, cacheKey, brief, 21600)

    const response: ApiResponse<AIBrief> = {
      data: brief,
      cached: false,
      source: 'ai-brief (Groq llama-3.1-8b)',
      fetchedAt: new Date().toISOString(),
    }

    return withCors(JSON.stringify(response))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return errorResponse(msg, 500)
  }
}
