import { prisma } from './prisma'

export async function userExists (email: string): Promise<boolean>{
    const existing = await prisma.user.findUnique({where: {email:email}})
    return !!existing // returns true if user exists, false otherwise
}	