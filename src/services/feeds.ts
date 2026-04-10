// ============================================================
// Feed Service Layer
// Provides filtered access to RSS/Atom feed configurations
// ============================================================

import type { FeedConfig, Language } from '../types/index.js'
import feedsData from '../../data/feeds.json'

const feeds: FeedConfig[] = feedsData as FeedConfig[]

/**
 * Get feeds filtered by category (e.g. "government", "business", "industry")
 */
export function getFeedsByCategory(category: string): FeedConfig[] {
  return feeds.filter(
    (f) => f.category.toLowerCase() === category.toLowerCase()
  )
}

/**
 * Get feeds filtered by tier (1=national flagship, 2=leading, 3=niche, 4=regional)
 */
export function getFeedsByTier(tier: 1 | 2 | 3 | 4): FeedConfig[] {
  return feeds.filter((f) => f.tier === tier)
}

/**
 * Get feeds filtered by language
 */
export function getFeedsByLanguage(lang: Language): FeedConfig[] {
  return feeds.filter((f) => f.language === lang)
}

/**
 * Get count of all active feeds
 */
export function getActiveFeedCount(): number {
  return feeds.filter((f) => f.active !== false).length
}

/**
 * Get all feed configs
 */
export function getAllFeeds(): FeedConfig[] {
  return feeds
}

/**
 * Get only active feeds
 */
export function getActiveFeeds(): FeedConfig[] {
  return feeds.filter((f) => f.active !== false)
}
