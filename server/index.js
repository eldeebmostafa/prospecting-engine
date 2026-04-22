import dotenv from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
// In production (Render), env vars are injected by the platform — skip the local file
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: resolve(__dirname, '../.env') })
}
import express from 'express'
import cors from 'cors'
import mapsRouter from './routes/maps.js'
import webRouter from './routes/web.js'
import qualifyRouter from './routes/qualify.js'
import sheetRouter from './routes/sheet.js'

const app = express()
const PORT = process.env.PORT || 3001

// In production, FRONTEND_URL should be set to the Vercel deployment URL
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : true // allow all in dev

app.use(cors({ origin: allowedOrigins }))
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/search/maps', mapsRouter)
app.use('/api/search/web', webRouter)
app.use('/api/qualify', qualifyRouter)
app.use('/api/sheet', sheetRouter)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
