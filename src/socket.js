const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const socketmanager = require("./socketmanager");
const db = require("./db");

function setupAuthenticatedSocket(server, jwtSecret) {
  const io = socketIo(server);

  // Middleware for logging
  io.use((socket, next) => {
    const originalEmit = socket.emit;

    socket.emit = function (eventName, ...args) {
      console.log(`[${new Date().toISOString()}] Emitting event: ${eventName}`);
      console.log("Event data:", JSON.stringify(args, null, 2));
      originalEmit.apply(this, [eventName, ...args]);
    };

    socket.onAny((eventName, ...args) => {
      console.log(`[${new Date().toISOString()}] Received event: ${eventName}`);
      console.log("Event data:", JSON.stringify(args, null, 2));
    });

    next();
  });

  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    const token = socket.handshake.query.token;
    if (token) {
      try {
        const decoded = await new Promise((resolve, reject) => {
          jwt.verify(token, jwtSecret, (err, decoded) => {
            if (err) reject(err);
            else resolve(decoded);
          });
        });

        socket.decoded = decoded;
        socket.userId = decoded.id;

        const userExists = await db.userExists(decoded.id);
        if (userExists) {
          next();
        } else {
          return next(new Error("User does not exist"));
        }
      } catch (err) {
        return next(new Error("Authentication error"));
      }
    } else {
      return next(new Error("Authentication error"));
    }
  });

  io.on("connection", async (socket) => {
    console.log("Authenticated user connected. User ID:", socket.userId);
    let sync = await db.getFullSync(socket.userId);
    socket.emit("update", { sync: sync });
    socketmanager.handleConnection(socket, socket.userId);

    socket.on("addFriend", async (data) => {
      const { error } = schemas.addFriend.validate(data);
      if (error) {
        return socket.emit("error", { message: error.details[0].message });
      }

      const userId = await socketmanager.getUserId(socket);
      await db.sendFriendRequest(userId, data.friendId);
      if (userId == data.friendId) {
        socket.emit("error", { message: "Cannot add yourself as a friend" });
        return;
      }
      socket.emit("update", { sync: await db.getFullSync(userId) });
      let friendSocket = await socketmanager.getUserSocket(data.friendId);
      if (friendSocket != undefined) {
        console.log("updating user");
        friendSocket.emit("update", {
          sync: await db.getFullSync(data.friendId),
        });
      }
    });

    socket.on("acceptRequest", async (data) => {
      const { error } = schemas.acceptRequest.validate(data);
      if (error) {
        return socket.emit("error", { message: error.details[0].message });
      }

      await db.acceptFriendRequest(data.requestId);
      const sender = await db.getFriendRequestSender(data.requestId);
      const senderSocket = await socketmanager.getUserSocket(sender.id);
      console.log("updating");
      socket.emit("update", {
        sync: await db.getFullSync(socketmanager.getUserId(socket)),
      });
      if (senderSocket != undefined) {
        senderSocket.emit("update", {
          sync: await db.getFullSync(socketmanager.getUserId(senderSocket)),
        });
      }
    });

    socket.on("addPuffs", async (data) => {
      const { error } = schemas.addPuffs.validate(data);
      if (error) {
        return socket.emit("error", { message: error.details[0].message });
      }

      console.log("adding puffs");
      const puffs = data.puffs;
      const userId = await socketmanager.getUserId(socket);
      for (let timestamp of puffs) {
        await db.addPuff(userId, new Date(timestamp * 1000));
      }
      const userFriends = await db.getFriends(userId);
      for (let user of userFriends) {
        const socketId = await socketmanager.getUserSocket(user.id);
        if (socketId != undefined) {
          socketId.emit("update", {
            sync: await db.getFullSync(user.id),
          });
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
