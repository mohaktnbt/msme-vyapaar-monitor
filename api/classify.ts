// ============================================================
// MSME Vyapaar Monitor — Classification Edge Function
// ============================================================

import keywordsJson from '../data/keywords-en.json' assert { type: 'json' }
import type { ClassifiedItem, NewsItem, Sector, SeverityLevel } from '../src/types/index.js'
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

interface KeywordCategory {
  category: string
  severity: SeverityLevel
  keywords: string[]
  keywordsHi?: string[]
  weight: number
}

const keywordCategories = keywordsJson as KeywordCategory[]

interface KeywordResult {
  category: string
  severity: SeverityLevel
  confidence: number
  matchedKeywords: string[]
}

function classifyByKeywords(text: string): KeywordResult {
  const lower = text.toLowerCase()
  const words = lower.split(/\s+/)
  const wordCount = Math.max(words.length, 1)

  let bestCategory = 'general'
  let bestSeverity: SeverityLevel = 'info'
  let bestScore = 0
  let bestMatches: string[] = []

  for (const cat of keywordCategories) {
    const allKeywords = [
      ...(cat.keywords || []),
      ...(cat.keywordsHi || []),
    ]
    const matched: string[] = []

    for (const kw of allKeywords) {
      if (lower.includes(kw.toLowerCase())) {
        matched.push(kw)
      }
    }

    if (matched.length > 0) {
      const score = matched.length * cat.weight
      if (score > bestScore) {
        bestScore = score
        bestCategory = cat.category
        bestSeverity = cat.severity
        bestMatches = matched
      }
    }
  }

  // Confidence based on keyword density
  const density = bestMatches.length / wordCount
  const confidence = Math.min(0.95, bestMatches.length * 0.15 + density * 10)

  return {
    category: bestCategory,
    severity: bestSeverity,
    confidence,
    matchedKeywords: bestMatches,
  }
}

const CATEGORY_TO_SECTORS: Record<string, Sector[]> = {
  funding: ['manufacturing', 'services', 'trading'],
  tender: ['manufacturing', 'construction', 'services'],
  policy: ['manufacturing', 'services', 'trading', 'export'],
  compliance: ['manufacturing', 'services', 'trading'],
  market: ['agriculture', 'trading', 'manufacturing'],
  technology: ['it', 'manufacturing', 'services'],
  export: ['export', 'manufacturing', 'textile'],
  infrastructure: ['construction', 'manufacturing'],
  startup: ['it', 'services', 'manufacturing'],
  finance: ['manufacturing', 'services', 'trading'],
  general: ['manufacturing', 'services'],
}

function getSectorsForCategory(category: string): Sector[] {
  return CATEGORY_TO_SECTORS[category] || ['manufacturing', 'services']
}

function getRelevanceScore(category: string, confidence: number): number {
  const baseScores: Record<string, number> = {
    funding: 85,
    tender: 80,
    compliance: 90,
    policy: 75,
    market: 70,
    export: 72,
    technology: 65,
    infrastructure: 68,
    finance: 78,
    startup: 60,
    critical: 95,
    general: 50,
  }
  const base = baseScores[category] ?? 50
  return Math.round(base * confidence + base * 0.3)
}

interface LLMClassification {
  category: string
  severity: SeverityLevel
  sectors: Sector[]
  confidence: number
  relevanceToMSME: number
}

async function classifyWithGroq(
  text: string,
  apiKey: string,
): Promise<LLMClassification | null> {
  const prompt = `Classify this Indian business news for MSMEs. Return ONLY valid JSON (no markdown): {"category":"funding|tender|policy|compliance|market|technology|export|infrastructure|startup|finance","severity":"critical|high|medium|low|info","sectors":["manufacturing"],"confidence":0.85,"relevanceToMSME":75}

Text: ${text.slice(0, 800)}`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20_000)

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
        temperature: 0,
        max_tokens: 200,
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

    return JSON.parse(jsonMatch[0]) as LLMClassification
  } catch {
    return null
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    let text = ''

    if (req.method === 'POST') {
      const body = (await req.json()) as { text?: string; url?: string }
      text = body.text || ''
    } else {
      const url = new URL(req.url)
      text = url.searchParams.get('text') || ''
    }

    if (!text.trim()) {
      return errorResponse('Missing text parameter', 400)
    }

    // Stage 1: Keyword classification
    const kwResult = classifyByKeywords(text)

    const partialItem: Partial<NewsItem> = {
      id: simpleHash(text.slice(0, 100)),
      title: text.slice(0, 150),
      category: kwResult.category,
      language: 'en',
      source: 'classifier',
      sourceTier: 3,
      url: '',
      publishedAt: new Date().toISOString(),
      fetchedAt: new Date().toISOString(),
      classifiedBy: 'keyword',
      classifierConfidence: kwResult.confidence,
    }

    const keywordClassified: ClassifiedItem = {
      item: partialItem as NewsItem,
      severity: kwResult.severity,
      category: kwResult.category,
      sectors: getSectorsForCategory(kwResult.category),
      confidence: kwResult.confidence,
      classifierType: 'keyword',
      relevanceToMSME: getRelevanceScore(kwResult.category, kwResult.confidence),
      classifiedAt: new Date().toISOString(),
    }

    // Return keyword result immediately if confidence is high enough
    if (kwResult.confidence >= 0.7) {
      return withCors(JSON.stringify(keywordClassified))
    }

    // Stage 2: LLM classification (async override)
    const groqApiKey = getEnv('GROQ_API_KEY')
    if (!groqApiKey) {
      return withCors(JSON.stringify(keywordClassified))
    }

    const redis = getRedisClient()
    const cacheKey = `classify:${simpleHash(text)}`

    // Check Redis cache for LLM result
    const cachedLlm = await cacheGet(redis, cacheKey)
    if (cachedLlm) {
      return withCors(JSON.stringify(cachedLlm))
    }

    // Call Groq
    const llmResult = await classifyWithGroq(text, groqApiKey)

    if (!llmResult) {
      return withCors(JSON.stringify(keywordClassified))
    }

    const llmClassified: ClassifiedItem = {
      item: {
        ...(partialItem as NewsItem),
        classifiedBy: 'llm',
        classifierConfidence: llmResult.confidence,
        relevanceToMSME: llmResult.relevanceToMSME,
        severity: llmResult.severity,
        category: llmResult.category,
        sector: llmResult.sectors,
      },
      severity: llmResult.severity,
      category: llmResult.category,
      sectors: llmResult.sectors,
      confidence: llmResult.confidence,
      classifierType: 'llm',
      relevanceToMSME: llmResult.relevanceToMSME,
      classifiedAt: new Date().toISOString(),
    }

    // Cache LLM result 24 hours
    await cacheSet(redis, cacheKey, llmClassified, 86400)

    return withCors(JSON.stringify(llmClassified))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return errorResponse(msg, 500)
  }
}
