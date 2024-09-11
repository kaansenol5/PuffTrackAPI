const WebSocket = require("ws");
const db = require("./db"); // Import our database functions

class SocketManager {
  constructor() {
    this.userSocketMap = new Map(); // Maps user IDs to socket objects
    this.socketUserMap = new Map(); // Maps socket objects to user IDs
  }

  // Call this when a user connects
  async handleConnection(socket, userId) {
    // Verify the user exists in the database
    const user = await db.getUserById(userId);
    if (!user) {
      socket.close(1008, "User not found");
      return;
    }

    // Remove any existing connections for this user
    this.removeUserConnection(userId);

    // Add the new connection
    this.userSocketMap.set(userId, socket);
    this.socketUserMap.set(socket, userId);

    console.log(`User ${userId} connected`);

    // Set up disconnect handler
    socket.on("close", () => this.handleDisconnection(socket));
  }

  handleDisconnection(socket) {
    const userId = this.socketUserMap.get(socket);
    if (userId) {
      this.userSocketMap.delete(userId);
      this.socketUserMap.delete(socket);
      console.log(`User ${userId} disconnected`);
    }
  }

  removeUserConnection(userId) {
    const existingSocket = this.userSocketMap.get(userId);
    if (existingSocket) {
      this.socketUserMap.delete(existingSocket);
      this.userSocketMap.delete(userId);
      existingSocket.close(1000, "New connection established");
    }
  }

  getUserSocket(userId) {
    return this.userSocketMap.get(userId);
  }

  getUserId(socket) {
    return this.socketUserMap.get(socket);
  }

  // Example: Send a message to a specific user
  sendToUser(userId, message) {
    const socket = this.getUserSocket(userId);
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }

  // Example: Broadcast a message to all connected users
  broadcastMessage(message) {
    this.userSocketMap.forEach((socket, userId) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      }
    });
  }
}

module.exports = new SocketManager();
