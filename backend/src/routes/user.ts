import {prisma} from '../lib/prisma'
import {userExists} from '../lib/user'
import { Router } from 'express'

const router = Router()

// get all users    
router.get('/all_users', async (req, res)=>{
    try{
        const users = await prisma.user.findMany()
        return res.json(users)

    } catch (error){
        console.error('Error getting all users:', error)
        res.status(500).json({error: 'Internal server error'})
    }
}) 




export default router
