import { io, Socket } from 'socket.io-client'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

let socket: Socket | null = null

export function getSocket(): Socket {
    if (!socket){
        // initialize the socket
socket= io(API_URL, { transports: ['websocket'],})
    }
        // return the existing socket
        return socket
}
export function disconnectSocket() {
    if (socket) {
        socket.disconnect()
        socket = null
    }
}



