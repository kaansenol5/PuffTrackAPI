const WebSocket = require("ws");
const db = require("./db"); // Import our database functions

class SocketManager {
  static userSocketMap = new Map(); // Maps user IDs to socket objects
  static socketUserMap = new Map(); // Maps socket objects to user IDs

  // Call this when a user connects
  static async handleConnection(socket, userId) {
    // Verify the user exists in the database
    const user = await db.getUserById(userId);
    if (!user) {
      socket.close(1008, "User not found");
      return;
    }

    // Remove any existing connections for this user
    SocketManager.removeUserConnection(userId);

    // Add the new connection
    SocketManager.userSocketMap.set(userId, socket);
    SocketManager.socketUserMap.set(socket, userId);

    console.log(`User ${userId} connected`);

    // Set up disconnect handler
    socket.on("close", () => SocketManager.handleDisconnection(socket));
  }

  static handleDisconnection(socket) {
    const userId = SocketManager.socketUserMap.get(socket);
    if (userId) {
      SocketManager.userSocketMap.delete(userId);
      SocketManager.socketUserMap.delete(socket);
      console.log(`User ${userId} disconnected`);
    }
  }

  static removeUserConnection(userId) {
    const existingSocket = SocketManager.userSocketMap.get(userId);
    if (existingSocket) {
      SocketManager.socketUserMap.delete(existingSocket);
      SocketManager.userSocketMap.delete(userId);
      existingSocket.close(1000, "New connection established");
    }
  }

  static getUserSocket(userId) {
    return SocketManager.userSocketMap.get(userId);
  }

  static getUserId(socket) {
    return SocketManager.socketUserMap.get(socket);
  }

  // Send a message to a specific user
  static sendToUser(userId, message) {
    const socket = SocketManager.getUserSocket(userId);
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }

  // Broadcast a message to all connected users
  static broadcastMessage(message) {
    SocketManager.userSocketMap.forEach((socket, userId) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      }
    });
  }
}

module.exports = SocketManager;
