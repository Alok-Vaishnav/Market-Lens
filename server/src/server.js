import cors from 'cors'
import express from 'express'
import mongoose from 'mongoose'
import { connectDatabase } from './config/db.js'
import companyRoutes from './routes/companyRoutes.js'

const app = express()
app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173' }))
app.use(express.json())
app.get('/api/health', (_req, res) => res.json({ success: true, status: 'ok', message: 'Server is running' }))
app.use('/api/companies', companyRoutes)
app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(error?.statusCode ?? 500).json({ success: false, message: error?.statusCode ? error.message : 'Internal server error' })
})

const port = Number(process.env.PORT ?? 5000)
let server

async function startServer() {
  try {
    await connectDatabase()
    server = app.listen(port, () => console.log(`Server listening on port ${port}`))
  } catch (error) {
    console.error('MongoDB connection failed:')
    console.error(error)
    process.exitCode = 1
  }
}

startServer()

process.on('SIGTERM', () => {
  if (!server) return
  server.close(() => mongoose.connection.close().finally(() => process.exit(0)))
})
