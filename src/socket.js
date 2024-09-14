const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const socketmanager = require("./socketmanager");
const db = require("./db");

function setupAuthenticatedSocket(server, jwtSecret) {
  const io = socketIo(server);

  // Middleware to authenticate socket connections
  io.use((socket, next) => {
    if (socket.handshake.auth && socket.handshake.auth.token) {
      jwt.verify(socket.handshake.auth.token, jwtSecret, (err, decoded) => {
        if (err) return next(new Error("Authentication error"));

        // Store the entire decoded token
        socket.decoded = decoded;

        // Extract and store the user ID for easy access
        socket.userId = decoded.id; // Assuming the user ID is stored in the 'id' field of the JWT payload

        next();
      });
    } else {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    console.log("Authenticated user connected. User ID:", socket.userId);
    socketmanager.handleConnection(socket, socket.userId);
    // Your socket event handlers here
    socket.on("addFriend", (data) => {
      const userId = socketmanager.getUserId(socket);
      db.sendFriendRequest(userId, data.friendId);
      socket.emit("update", { update: db.getFullSync(userId) });
      let friendSocket = socketmanager.getUserSocket(data.friendId);
      if (friendSocket != undefined) {
        io.to(friendSocket).emit("update", {
          update: db.getFullSync(userId),
        });
      }
    });

    socket.on("acceptRequest", (data) => {
      db.acceptFriendRequest(socketmanager.getUserId(socket), data.requestId);
      const sender = db.getFriendRequestSender(data.requestId);
      const senderSocket = socketmanager.getUserSocket(sender.id);
      socket.emit("update", {
        update: db.getFullSync(socketmanager.getUserId(socket)),
      });
      if (senderSocket != undefined) {
        io.to(senderSocket).emit("update", {
          update: db.getFullSync(socketmanager.getUserId(socket)),
        });
      }
    });

    socket.on("addPuffs", (data) => {
      const puffs = data.puffs;
      const userId = socketmanager.getUserId(socket);
      for (let timestamp in puffs) {
        db.addPuff(userId, timestamp);
      }
      const userFriends = db.getFriends(userId);
      for (let user of userFriends) {
        const socketId = socketmanager.getUserSocket(user.id);
        if (socketId != undefined) {
          io.to(socketId).emit("update", { update: db.getFullSync(user.id) });
        }
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected. User ID:", socket.userId);
      socketmanager.handleDisconnection(socket);
    });
  });

  return io;
}

module.exports = setupAuthenticatedSocket;
