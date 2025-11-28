import { io, Socket } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"; //identify the backend url

let socket: Socket | null = null; //create a socket instance

//function to get the socket instance if it doesn't exist, create it
export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      transports: ["websocket"], //use websocket transport
    });
  }
  return socket; //return the socket instance
}

//function to disconnect the socket
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

