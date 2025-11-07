// create a DB connection singleton pattern

import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'
import path from 'path'

// Load .env from backend directory (where schema.prisma is)
const envPath = path.resolve(__dirname, '../../.env')
dotenv.config({ path: envPath }) 

declare global {
    var prisma: PrismaClient | undefined
}

export const prisma = global.prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') global.prisma = prisma

;
