import { Router } from 'express'
import OpenAI from 'openai'
import { compareTwoStrings } from 'string-similarity'
import { searchMaps } from '../services/mapsSearch.js'
import { searchWeb } from '../services/webSearch.js'
import { getSheetLeads, normalizePhone as normalizeSheetPhone } from '../services/sheetCheck.js'

const router = Router()

// ── Deduplication ─────────────────────────────────────────────────────────────

// Use the same normalizer as sheetCheck so comparisons are consistent
const normalizePhone = normalizeSheetPhone

function mergeResults(mapsResults, webResults) {
  const merged = []
  const usedWebIndexes = new Set()

  // Index web results by normalized phone for O(1) lookup
  const webByPhone = new Map()
  webResults.forEach((r, i) => {
    const p = normalizePhone(r.phone)
    if (p) webByPhone.set(p, i)
  })

  for (const mapsItem of mapsResults) {
    const mapsPhone = normalizePhone(mapsItem.phone)
    let matchedWebIdx = null

    // 1. Phone-based dedup
    if (mapsPhone && webByPhone.has(mapsPhone)) {
      matchedWebIdx = webByPhone.get(mapsPhone)
    }

    // 2. Name-based fuzzy dedup (only when no phone match found)
    if (matchedWebIdx === null) {
      for (let i = 0; i < webResults.length; i++) {
        if (usedWebIndexes.has(i)) continue
        const sim = compareTwoStrings(
          (mapsItem.name ?? '').toLowerCase(),
          (webResults[i].name ?? '').toLowerCase()
        )
        if (sim > 0.85) { matchedWebIdx = i; break }
      }
    }

    if (matchedWebIdx !== null) {
      usedWebIndexes.add(matchedWebIdx)
      const web = webResults[matchedWebIdx]
      merged.push({
        name: mapsItem.name,
        phone: mapsItem.phone ?? web.phone,
        address: mapsItem.address,
        website: mapsItem.website ?? web.url,
        url: web.url ?? null,
        description: web.description ?? null,
        rating: mapsItem.rating,
        reviewCount: mapsItem.reviewCount,
        placeId: mapsItem.placeId,
        source: 'both',
      })
    } else {
      merged.push({ ...mapsItem })
    }
  }

  // Append unmatched web results
  webResults.forEach((r, i) => {
    if (!usedWebIndexes.has(i)) {
      merged.push({
        name: r.name,
        phone: r.phone ?? null,
        address: null,
        website: r.url ?? null,
        url: r.url ?? null,
        description: r.description ?? null,
        rating: null,
        reviewCount: null,
        placeId: null,
        source: 'web',
      })
    }
  })

  return merged
}

// ── AI Qualification ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a B2B lead qualification assistant.
You will receive a JSON array of business leads and a qualification criteria string.
Evaluate each lead and return ONLY a valid JSON array — no markdown, no preamble, no explanation.
Each element must correspond to the input lead at the same index and have exactly these fields:
- score: one of "High", "Medium", "Low", "Reject"
- reason: one concise sentence in English explaining the score
- isImporter: one of "Yes", "Maybe", "No"
- whatsappDetected: boolean — true if the lead has a phone number or any social media presence suggesting WhatsApp usage`

async function qualifyBatch(leads, criteria, openai, model) {
  const userContent = `Qualification criteria: ${criteria}\n\nLeads:\n${JSON.stringify(leads, null, 2)}`

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    temperature: 0.2,
    max_tokens: 2000,
  })

  const raw = response.choices[0].message.content.trim()

  // Strip markdown code fences if the model added them despite instructions
  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

  let parsed
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error(`AI returned invalid JSON: ${cleaned.slice(0, 200)}`)
  }

  if (!Array.isArray(parsed)) throw new Error('AI response is not a JSON array')
  return parsed
}

// ── Route ─────────────────────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  const { country, city, businessType, language, limit = 20, criteria } = req.body

  if (!country || !city || !businessType) {
    return res.status(400).json({ error: 'country, city, and businessType are required' })
  }
  if (!criteria) {
    return res.status(400).json({ error: 'criteria is required' })
  }

  const openaiKey = process.env.OPENAI_API_KEY
  const openaiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini'
  if (!openaiKey) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' })

  const openai = new OpenAI({ apiKey: openaiKey })

  try {
    // Run both searches and sheet check in parallel
    const [mapsResult, webResult, sheetResult] = await Promise.allSettled([
      searchMaps({ country, city, businessType, limit }),
      searchWeb({ country, city, businessType, limit }),
      getSheetLeads(),
    ])

    const mapsResults = mapsResult.status === 'fulfilled' ? mapsResult.value : []
    const webSearchResult = webResult.status === 'fulfilled' ? webResult.value : { results: [], socialLinks: {} }
    const sheetLeads = sheetResult.status === 'fulfilled' ? sheetResult.value : { phones: [], names: [] }

    if (mapsResult.status === 'rejected') console.error('[qualify] maps failed:', mapsResult.reason)
    if (webResult.status === 'rejected') console.error('[qualify] web failed:', webResult.reason)
    if (sheetResult.status === 'rejected') console.error('[qualify] sheet check failed:', sheetResult.reason)

    const sheetPhoneSet = new Set(sheetLeads.phones)

    const merged = mergeResults(mapsResults, webSearchResult.results)

    // Qualify in batches of 10 — gpt-4o-mini truncates output with larger batches
    const BATCH_SIZE = 10
    const qualified = []

    for (let i = 0; i < merged.length; i += BATCH_SIZE) {
      const batch = merged.slice(i, i + BATCH_SIZE)

      // Strip large fields before sending to AI to reduce token usage
      const leadsForAI = batch.map(({ name, phone, address, website, description, source, rating, reviewCount }) => ({
        name, phone, address, website, description, source, rating, reviewCount,
      }))

      const aiResults = await qualifyBatch(leadsForAI, criteria, openai, openaiModel)

      for (let j = 0; j < batch.length; j++) {
        qualified.push({
          ...batch[j],
          ...(aiResults[j] ?? { score: 'Low', reason: 'No AI result returned', isImporter: 'No', whatsappDetected: false }),
        })
      }
    }

    // ── Sheet duplicate detection ─────────────────────────────────────────────
    const finalResults = qualified.map((result) => {
      const phone = normalizePhone(result.phone)
      if (phone && sheetPhoneSet.has(phone)) {
        return { ...result, duplicate: true }
      }

      // Fall back to name fuzzy match when no phone
      const isDupByName = sheetLeads.names.some(
        (sheetName) => compareTwoStrings(
          (result.name ?? '').toLowerCase(),
          sheetName.toLowerCase()
        ) > 0.85
      )

      return { ...result, duplicate: isDupByName }
    })

    res.json({
      count: finalResults.length,
      socialLinks: webSearchResult.socialLinks,
      results: finalResults,
    })
  } catch (err) {
    console.error('[qualify] error:', err)
    res.status(500).json({ error: err.message })
  }
})

export default router
