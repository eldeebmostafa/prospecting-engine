import { Router } from 'express'
import { getSheetLeads } from '../services/sheetCheck.js'
import { exportLeads } from '../services/sheetExport.js'

const router = Router()

router.get('/check', async (_req, res) => {
  try {
    const { names, phones } = await getSheetLeads()
    res.json({ phones, names })
  } catch (err) {
    console.error('[sheet] error:', err)
    res.status(500).json({ error: err.message })
  }
})

router.post('/export', async (req, res) => {
  const { leads, meta } = req.body

  if (!Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({ error: 'leads must be a non-empty array' })
  }
  if (!meta || !meta.country || !meta.city || !meta.businessType) {
    return res.status(400).json({ error: 'meta.country, meta.city, and meta.businessType are required' })
  }

  try {
    const rowsAdded = await exportLeads(leads, meta)
    res.json({ success: true, rowsAdded })
  } catch (err) {
    console.error('[sheet] export error:', err)
    res.status(500).json({ error: err.message })
  }
})

export default router
