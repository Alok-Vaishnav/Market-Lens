import cors from 'cors'
import express from 'express'
import mongoose from 'mongoose'
import { connectDatabase } from './config/db.js'
import companyRoutes from './routes/companyRoutes.js'

const app = express()
const frontendUrl = process.env.FRONTEND_URL ?? process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173'
app.use(cors({ origin: frontendUrl }))
app.use(express.json())
app.get('/api/health', (_req, res) => res.json({ success: true, status: 'ok', message: 'Server is running' }))
app.use('/api/companies', companyRoutes)
app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(error?.statusCode ?? 500).json({ success: false, message: error?.statusCode ? error.message : 'Internal server error' })
})

const port = Number.parseInt(process.env.PORT ?? '5000', 10)
let server

function startServer() {
  server = app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on port ${port}`)
    connectDatabase().catch((error) => {
      console.error('MongoDB connection failed:')
      console.error(error)
    })
  })
}

startServer()

process.on('SIGTERM', () => {
  if (!server) return
  server.close(() => mongoose.connection.close().finally(() => process.exit(0)))
})
