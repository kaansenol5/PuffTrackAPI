const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const socketmanager = require("./socketmanager");
const db = require("./db");
const schemas = require("./validation");

const SocketRateLimiter = require("./socketRateLimiter");

function setupAuthenticatedSocket(server, jwtSecret) {
  const io = socketIo(server);
  const socketRateLimiter = new SocketRateLimiter(15 * 60 * 1000, 100); // 100 events per 15 minutes

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
    const wrapWithRateLimit = (eventHandler) => {
      return async (...args) => {
        if (socketRateLimiter.allowRequest(socket.userId)) {
          await eventHandler(...args);
        } else {
          socket.emit("error", {
            message: "Rate limit exceeded. Please try again later.",
          });
        }
      };
    };

    console.log("Authenticated user connected. User ID:", socket.userId);
    let sync = await db.getFullSync(socket.userId);
    socket.emit("update", { sync: sync });
    socketmanager.handleConnection(socket, socket.userId);

    socket.on(
      "addFriend",
      wrapWithRateLimit(async (data) => {
        const { error } = schemas.addFriend.validate(data);
        if (error) {
          return socket.emit("error", { message: error.details[0].message });
        }

        const userId = await socketmanager.getUserId(socket);

        // Check if the friend ID exists
        const friendExists = await db.userExists(data.friendId);
        if (!friendExists) {
          return socket.emit("error", { message: "Friend ID does not exist" });
        }

        if (userId == data.friendId) {
          return socket.emit("error", {
            message: "Cannot add yourself as a friend",
          });
        }

        await db.sendFriendRequest(userId, data.friendId);

        socket.emit("update", { sync: await db.getFullSync(userId) });
        let friendSocket = await socketmanager.getUserSocket(data.friendId);
        if (friendSocket != undefined) {
          console.log("updating user");
          friendSocket.emit("update", {
            sync: await db.getFullSync(data.friendId),
          });
        }
      }),
    );

    socket.on(
      "acceptRequest",
      wrapWithRateLimit(async (data) => {
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
      }),
    );

    socket.on(
      "cancelRequest",
      wrapWithRateLimit(async (data) => {
        const { error } = schemas.cancelRequest.validate(data);
        if (error) {
          return socket.emit("error", { message: error.details[0].message });
        }

        try {
          const userId = await socketmanager.getUserId(socket);
          const request = await db.getFriendRequestById(data.requestId);

          if (!request) {
            return socket.emit("error", {
              message: "Friend request not found",
            });
          }

          if (request.UserId !== userId) {
            return socket.emit("error", {
              message: "Unauthorized to cancel this request",
            });
          }

          await db.deleteFriendRequest(data.requestId);

          // Update the current user (sender)
          socket.emit("update", { sync: await db.getFullSync(userId) });

          // Update the receiver of the request
          const receiverSocket = await socketmanager.getUserSocket(
            request.FriendId,
          );
          if (receiverSocket) {
            receiverSocket.emit("update", {
              sync: await db.getFullSync(request.FriendId),
            });
          }

          socket.emit("requestCancelled", { requestId: data.requestId });
        } catch (error) {
          console.error("Error cancelling friend request:", error);
          socket.emit("error", {
            message: "An error occurred while cancelling the friend request",
          });
        }
      }),
    );

    socket.on(
      "rejectRequest",
      wrapWithRateLimit(async (data) => {
        const { error } = schemas.rejectRequest.validate(data);
        if (error) {
          return socket.emit("error", { message: error.details[0].message });
        }

        try {
          const userId = await socketmanager.getUserId(socket);
          const request = await db.getFriendRequestById(data.requestId);

          if (!request) {
            return socket.emit("error", {
              message: "Friend request not found",
            });
          }

          if (request.FriendId !== userId) {
            return socket.emit("error", {
              message: "Unauthorized to reject this request",
            });
          }

          await db.deleteFriendRequest(data.requestId);

          // Update the current user
          socket.emit("update", { sync: await db.getFullSync(userId) });

          // Update the sender of the request
          const senderSocket = await socketmanager.getUserSocket(
            request.UserId,
          );
          if (senderSocket) {
            senderSocket.emit("update", {
              sync: await db.getFullSync(request.UserId),
            });
          }

          socket.emit("requestRejected", { requestId: data.requestId });
        } catch (error) {
          console.error("Error rejecting friend request:", error);
          socket.emit("error", {
            message: "An error occurred while rejecting the friend request",
          });
        }
      }),
    );

    socket.on(
      "addPuffs",
      wrapWithRateLimit(async (data) => {
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
      }),
    );

    socket.on("disconnect", () => {
      console.log("User disconnected. User ID:", socket.userId);
      socketmanager.handleDisconnection(socket);
    });
  });

  return io;
}

module.exports = setupAuthenticatedSocket;
