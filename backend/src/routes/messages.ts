import { Router } from 'express'
import { object, z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'
import { io } from '../server'


const router = Router()

// All routes require authentication
router.use(authenticate)

// GET /api/messages?conversationId=... - List messages
router.get('/', async (req: AuthRequest, res) => {
   
    console.log('..........messages--req.body...........',req.body)
    const userId = req.userId!
    const conversationId = req.query.conversationId as string
  
    if (!conversationId) {
      return res.status(400).json({ error: 'Missing conversationId' })
    }
  
    // Verify user is participant
    const participant = await prisma.conversationParticipant.findFirst({
      where: { conversationId, userId }
    })
    if (!participant) {
      return res.status(403).json({ error: 'Not a participant' })
    }
  
    // Get messages
    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50

    })
  
    res.json(messages.reverse())  // Reverse to show oldest first
  })
  
  // POST /api/messages - Create message
  router.post('/', async (req: AuthRequest, res) => {
    console.log('..........messages--req...........',req)
    const userId = req.userId!
  
    const { conversationId, content } = z.object({
      conversationId: z.string(),
      content: z.string().min(1)
    }).parse(req.body)
  
    // Verify user is participant
    const participant = await prisma.conversationParticipant.findFirst({
      where: { conversationId, userId }
    })
    if (!participant) {
      return res.status(403).json({ error: 'Not a participant'})
    }
  
    // Create message
    const message = await prisma.message.create({
      data: { conversationId, senderId: userId, content },
      include: {
        sender: { select: { name: true, email: true } }
      }
    })
    // Emit real-time update via Socket.IO
    io.to(conversationId).emit('message:new', message)
  
    res.json(message)
  })


  //  update part message
 router.patch('/:msgId' , async (req: AuthRequest, res)=>{
  try {
    const {userId} = req// extract user id from Auth middleware
    const {msgId}= req.params  //  extract message id from request params 
    const updates = req.body //fields to update
    
    // request record
   const message = await prisma.message.update({
    where: {id: msgId, senderId: userId},
    data: updates  // prisma automatically update/patches provided fields in the req.body 
   }) //data automatically saved
    res.status(200).json({msg:"successful update", message})
  
  } catch (error) {
    console.error("update function failed",error)
    res.status(500).json({msg:"internal server error"})
  }
 })

  // delete message
 router.delete('/:msgId', async (req:AuthRequest, res)=>{
  // userID, msgID
  try {
     const userId= req.userId;
    const msgId = req.params.msgId;

    const deletedMsg = await prisma.message.delete({where: {
      id: msgId, 
      senderId: userId
    }}
)
  res.status(200).json({msg: "deleted successfully", deletedMsg})
  } catch (error) {
    console.error("delete function failed",error)
    res.status(500).json({msg:"internal server error"})
  }
})

export default router;