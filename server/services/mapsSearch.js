import fetch from 'node-fetch'

const BASE = 'https://maps.googleapis.com/maps/api'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function textSearch(query, apiKey, pageToken = null) {
  const params = new URLSearchParams({
    query,
    key: apiKey,
    ...(pageToken && { pagetoken: pageToken }),
  })
  const res = await fetch(`${BASE}/place/textsearch/json?${params}`)
  if (!res.ok) throw new Error(`Text Search HTTP ${res.status}`)
  return res.json()
}

async function placeDetails(placeId, apiKey) {
  const params = new URLSearchParams({
    place_id: placeId,
    fields: 'formatted_phone_number',
    key: apiKey,
  })
  const res = await fetch(`${BASE}/place/details/json?${params}`)
  if (!res.ok) throw new Error(`Place Details HTTP ${res.status}`)
  const data = await res.json()
  return data.result?.formatted_phone_number ?? null
}

function normalize(place, phone) {
  return {
    placeId: place.place_id,
    name: place.name,
    address: place.formatted_address ?? null,
    phone,
    website: place.website ?? null,
    rating: place.rating ?? null,
    reviewCount: place.user_ratings_total ?? null,
    source: 'maps',
  }
}

export async function searchMaps({ country, city, businessType, limit = 20 }) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) throw new Error('GOOGLE_PLACES_API_KEY not configured')

  const query = `${businessType} ${city} ${country}`
  const results = []
  let pageToken = null

  do {
    if (pageToken) await sleep(2000)

    const data = await textSearch(query, apiKey, pageToken)

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Places API error: ${data.status}${data.error_message ? ` — ${data.error_message}` : ''}`)
    }

    const places = data.results ?? []
    const phoneResults = await Promise.allSettled(places.map((p) => placeDetails(p.place_id, apiKey)))

    for (let i = 0; i < places.length; i++) {
      const phone = phoneResults[i].status === 'fulfilled' ? phoneResults[i].value : null
      results.push(normalize(places[i], phone))
      if (results.length >= limit) break
    }

    pageToken = results.length < limit ? (data.next_page_token ?? null) : null
  } while (pageToken && results.length < limit)

  return results
}
