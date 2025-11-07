import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import {createServer} from 'http'
import {Server as SocketIOServer} from 'socket.io'
import authRoutes from './routes/auth'
import userRoutes from './routes/user'
import conversationRoutes from './routes/conversations'
import messageRoutes from './routes/messages'

dotenv.config()

const app= express()
const httpServer= createServer(app)


// cors configuration for socket.io
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
    }
})

// cors configuration for express
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}))

// Middleware for express
app.use(express.json()) //allows data being parsed to be available in req.body



// Health check
app.get('/health', (req, res)=>{res.json({status:'backend is running ok'})})

// Socket.IO connection handler
io.on('connection', (socket)=>{
    console.log('Client connected:', socket.id)

    socket.on('room:join', (conversationId: string)=>{
        socket.join(conversationId)
        console.log(`Socket ${socket.id} joined room ${conversationId}`)
    })

    socket.on('disconnect', ()=>{
        console.log('Client disconnected:', socket.id)
    })
})

// Export io for use in routes 
app.use('/api/auth', authRoutes)
app.use('/api/user', userRoutes)
app.use('/api/conversations', conversationRoutes)
app.use('/api/messages', messageRoutes)

const PORT = process.env.PORT || 5000
httpServer.listen(PORT, ()=>{
    console.log(`Backend server running on http://localhost:${PORT}`)
})


export {app, httpServer, io}