import fetch from 'node-fetch'

const BRAVE_URL = 'https://api.search.brave.com/res/v1/web/search'

const PHONE_RE = /(?:\+?[\d\s\-().]{7,20})/g

const SOCIAL_RE = {
  facebook: /https?:\/\/(?:www\.)?facebook\.com\/(?!search|sharer|share|dialog|plugins|pages\/create)[\w.%-]{3,}/i,
  instagram: /https?:\/\/(?:www\.)?instagram\.com\/[\w.%-]{2,}/i,
  tiktok: /https?:\/\/(?:www\.)?tiktok\.com\/@[\w.%-]{2,}/i,
}

async function braveSearch(query, apiKey) {
  const params = new URLSearchParams({ q: query, count: 20 })
  const res = await fetch(`${BRAVE_URL}?${params}`, {
    headers: { 'X-Subscription-Token': apiKey, 'Accept': 'application/json' },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Brave API ${res.status}: ${body}`)
  }
  return res.json()
}

function extractPhones(text) {
  if (!text) return []
  const matches = text.match(PHONE_RE) ?? []
  return [...new Set(matches.map((p) => p.trim()).filter((p) => p.replace(/\D/g, '').length >= 7))]
}

export function extractSocialLinks(results) {
  const groups = { facebook: [], instagram: [], tiktok: [] }

  for (const r of results) {
    const url = r.url ?? ''
    const snippet = r.description ?? ''

    for (const [platform, re] of Object.entries(SOCIAL_RE)) {
      if (re.test(url) && !groups[platform].includes(url)) groups[platform].push(url)
      const snippetMatches = snippet.match(new RegExp(re.source, 'gi')) ?? []
      for (const m of snippetMatches) {
        if (!groups[platform].includes(m)) groups[platform].push(m)
      }
    }
  }

  return {
    facebook: groups.facebook.length ? groups.facebook : null,
    instagram: groups.instagram.length ? groups.instagram : null,
    tiktok: groups.tiktok.length ? groups.tiktok : null,
  }
}

export async function searchWeb({ country, city, businessType, limit = 20 }) {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) throw new Error('BRAVE_SEARCH_API_KEY not configured')

  // Brave's Arabic index is too sparse for exact-phrase (quoted) queries
  const webQuery = `${businessType} ${city} ${country}`
  const socialQuery = `${businessType} ${country} site:facebook.com OR site:instagram.com OR site:tiktok.com`

  const [webData, socialData] = await Promise.allSettled([
    braveSearch(webQuery, apiKey),
    braveSearch(socialQuery, apiKey),
  ])

  if (webData.status === 'rejected') console.error('[web] web query failed:', webData.reason)
  if (socialData.status === 'rejected') console.error('[web] social query failed:', socialData.reason)

  const webResults = webData.status === 'fulfilled' ? (webData.value.web?.results ?? []) : []
  const socialResults = socialData.status === 'fulfilled' ? (socialData.value.web?.results ?? []) : []
  const socialLinks = extractSocialLinks(socialResults)

  const results = webResults.slice(0, limit).map((r) => {
    const snippet = r.description ?? null
    const phones = extractPhones(snippet)
    return {
      name: r.title ?? null,
      url: r.url ?? null,
      description: snippet,
      phone: phones.length ? phones[0] : null,
      allPhones: phones.length > 1 ? phones : undefined,
      source: 'web',
    }
  })

  return { results, socialLinks }
}
