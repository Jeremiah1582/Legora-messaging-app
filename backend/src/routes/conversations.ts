import {Router} from 'express'
import z from 'zod'
import {prisma} from '../lib/prisma'
import {authenticate, AuthRequest} from '../middleware/auth'

const router = Router()

// All routes require authentication
router.use(authenticate)

// GET /api/conversations - List user's conversations
router.get('/', async (req: AuthRequest, res) => {
    const userId = req.userId

    // Prisma Query
    const conversations = await prisma.conversation.findMany({
        where: {
            participants: {
                some: {
                    userId: userId
                }
            }
        },
        include: {
            participants: {
                include: {
                    user: {
                        select: {id: true, name: true, email: true}
                    }
                },
            },
            messages: {
                orderBy: {
                    createdAt: 'desc'
                }
            }
        },
        orderBy: {
                createdAt: 'desc'
        }

    })
    return res.status(200).json(conversations)
})



// POST /api/conversations - Create 1-1 conversation
router.post('/', async (req: AuthRequest, res) => {
    const userId = req.userId
console.log('..........convo--req.body...........',req.body)
    const { participantIds } = z.object({
        participantIds: z.array(z.string()).length(2) //limit participants to just 2 users   
    }).parse(req.body)
    if (!participantIds.includes(userId as string)) {
        return res.status(400).json({ error: 'Must include yourself' })
    }
    const existing = await prisma.conversation.findFirst({
        where: {
            participants: { 
                every: { userId: { in: participantIds } }
            }
        },
        include: {
            participants: {
                include: {
                    user: { select: { 
                        id: true, 
                        name: true, 
                        email: true } }
                }
            }
        }
    })
    // check if conversation already exists
    if (existing) {
        return res.status(200).json({message: 'Here is your existing conversation', conversation: existing})
    }

    // create conversation with participants
    const conversation = await prisma.conversation.create({
        data: {
            participants: { 
                create: participantIds.map(id => ({ 
                    userId: id })) }
        },
        include: {
            participants: {
                include: {
                    user: { 
                        select: { 
                            id: true, 
                            name: true, 
                            email: true 
                        } }
                }
            }
        }
    })
    return res.json(conversation)
})

export default router