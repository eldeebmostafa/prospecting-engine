import { getSheetsClient } from './sheetsClient.js'

const HEADERS = [
  'Business Name', 'Phone', 'Address', 'Website', 'Source',
  'AI Score', 'AI Reason', 'WhatsApp Detected',
  'Facebook', 'Instagram', 'TikTok',
  'Duplicate Flag', 'Country', 'City', 'Business Type', 'Exported At',
]

function firstLink(arr) {
  if (!arr || !arr.length) return ''
  return arr[0]
}

function leadToRow(lead, meta, exportedAt) {
  return [
    lead.name ?? '',
    lead.phone ?? '',
    lead.address ?? '',
    lead.website ?? '',
    lead.source ?? '',
    lead.score ?? '',
    lead.reason ?? '',
    lead.whatsappDetected ? 'Yes' : 'No',
    firstLink(lead.socialLinks?.facebook),
    firstLink(lead.socialLinks?.instagram),
    firstLink(lead.socialLinks?.tiktok),
    lead.duplicate ? 'Yes' : 'No',
    meta.country ?? '',
    meta.city ?? '',
    meta.businessType ?? '',
    exportedAt,
  ]
}

export async function exportLeads(leads, meta) {
  const sheets = getSheetsClient()
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID
  if (!spreadsheetId) throw new Error('GOOGLE_SHEETS_ID not configured')

  // Check whether row 1 already has our header (not just any content)
  const checkRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'A1:A1',
  })
  const firstCell = (checkRes.data.values ?? [])[0]?.[0] ?? ''
  const hasHeader = firstCell === HEADERS[0]

  const exportedAt = new Date().toISOString().slice(0, 10)
  const dataRows = leads.map((lead) => leadToRow(lead, meta, exportedAt))

  const rowsToWrite = hasHeader ? dataRows : [HEADERS, ...dataRows]

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'A1',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rowsToWrite },
  })

  return dataRows.length
}
