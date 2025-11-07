import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../lib/auth'

export interface AuthRequest extends Request {
    userId?: string
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction){
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')){
        return res.status(401).json({error: 'Invalid token'})
    }
    try {
        const token = authHeader.split(' ')[1]!
        const {userId} = await verifyToken(token)
        req.userId = userId
        next() // continue to the next middleware or route handler
    } catch {
        return res.status(401).json({error: 'Invalid token'})
    }
}