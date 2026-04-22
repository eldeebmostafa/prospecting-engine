import { Router } from 'express'
import { searchMaps } from '../services/mapsSearch.js'

const router = Router()

router.post('/', async (req, res) => {
  const { country, city, businessType, language, limit = 20 } = req.body

  if (!country || !city || !businessType) {
    return res.status(400).json({ error: 'country, city, and businessType are required' })
  }

  try {
    const results = await searchMaps({ country, city, businessType, limit })
    res.json({ count: results.length, results })
  } catch (err) {
    console.error('[maps] error:', err)
    res.status(500).json({ error: err.message })
  }
})

export default router
