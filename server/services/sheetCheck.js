import { getSheetsClient } from './sheetsClient.js'

export function normalizePhone(phone) {
  if (!phone) return null
  return phone.replace(/[\s\-+(). ]/g, '').replace(/^0+/, '')
}

export async function getSheetLeads() {
  const sheets = getSheetsClient()
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID
  if (!spreadsheetId) throw new Error('GOOGLE_SHEETS_ID not configured')

  // Read columns A (name) and C (phone) in one request, skip header (row 1)
  const res = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: ['A2:A', 'C2:C'],
  })

  const [nameRange, phoneRange] = res.data.valueRanges

  const names = (nameRange.values ?? []).map((row) => (row[0] ?? '').trim()).filter(Boolean)
  const phones = (phoneRange.values ?? []).map((row) => normalizePhone(row[0])).filter(Boolean)

  return { names, phones }
}
