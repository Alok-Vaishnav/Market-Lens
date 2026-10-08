import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import mongoose from 'mongoose'

const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env')
dotenv.config({ path: envPath })

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI?.trim()
  if (!uri) throw new Error('MONGODB_URI is not configured in server/.env')
  if (uri.includes('example.')) throw new Error('MONGODB_URI contains a placeholder hostname. Replace it with the real MongoDB Atlas connection string.')
  await mongoose.connect(uri, { dbName: 'stockDB' })
  console.log('MongoDB connected successfully')
}
