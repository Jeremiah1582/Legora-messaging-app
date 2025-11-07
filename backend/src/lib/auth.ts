import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET!
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'


// USER EXISTS

// HASH PASSWORD
export async function hashPassword(password: string):Promise<string>{
    return bcrypt.hash(password,10) // 10 salt rounds
}

// VERIFY PASSWORD
export async function verifyPassword(hashedPassword: string, password: string): Promise<boolean>{
    return bcrypt.compare(password, hashedPassword)
}


// GENERATE TOKEN 
export async function generateToken(userId:string): Promise<string>{
    return jwt.sign(
        {userId}, 
        JWT_SECRET, 
        {expiresIn: '15min'}
    )
}

// GENERATE REFRESH TOKEN
export async function generateRefreshToken(userId:string, token: string): Promise<string>{
    
    return jwt.sign(    
        {userId}, 
        JWT_SECRET, 
        {expiresIn: JWT_EXPIRES_IN}
    )
   
}

// VERIFY TOKEN
export async function verifyToken(token: string): Promise<{userId: string}>{
    return jwt.verify(token, JWT_SECRET) as {userId: string}
    // return the user ID from the client token. then use id to fetch user data from DB
}
