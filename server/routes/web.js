import { Router } from 'express'
import { searchWeb } from '../services/webSearch.js'

const router = Router()

router.post('/', async (req, res) => {
  const { country, city, businessType, language, limit = 20 } = req.body

  if (!country || !city || !businessType) {
    return res.status(400).json({ error: 'country, city, and businessType are required' })
  }

  try {
    const { results, socialLinks } = await searchWeb({ country, city, businessType, limit })
    res.json({ count: results.length, socialLinks, results })
  } catch (err) {
    console.error('[web] error:', err)
    res.status(500).json({ error: err.message })
  }
})

export default router
