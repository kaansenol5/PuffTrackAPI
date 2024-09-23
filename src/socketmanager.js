const db = require("./db"); // Import our database functions

class SocketManager {
  static userSocketMap = new Map(); // Maps user IDs to socket objects
  static socketUserMap = new Map(); // Maps socket objects to user IDs

  // Call this when a user connects
  static async handleConnection(socket, userId) {
    // Verify the user exists in the database
    const user = await db.getUserById(userId);
    if (!user) {
      socket.disconnect(true); // Disconnect the socket
      return;
    }

    // Remove any existing connections for this user
    SocketManager.removeUserConnection(userId);

    // Add the new connection
    SocketManager.userSocketMap.set(userId, socket);
    SocketManager.socketUserMap.set(socket, userId);

    console.log(`User ${userId} connected`);

    // Set up disconnect handler
    socket.on("disconnect", () => SocketManager.handleDisconnection(socket));
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
      existingSocket.disconnect(true); // Force disconnect
    }
  }

  static getUserSocket(userId) {
    return SocketManager.userSocketMap.get(userId);
  }

  static getUserId(socket) {
    return SocketManager.socketUserMap.get(socket);
  }

  // Send a message to a specific user
  static sendToUser(userId, event, data) {
    const socket = SocketManager.getUserSocket(userId);
    if (socket && socket.connected) {
      socket.emit(event, data);
    }
  }

  // Broadcast a message to all connected users
  static broadcastMessage(event, data) {
    SocketManager.userSocketMap.forEach((socket, userId) => {
      if (socket.connected) {
        socket.emit(event, data);
      }
    });
  }
}

module.exports = SocketManager;
