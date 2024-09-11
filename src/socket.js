const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");

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

    // Your socket event handlers here
    socket.on("protected event", (data) => {
      // This event is only accessible to authenticated users
      console.log("Received protected event from user:", socket.userId);
      // Handle the event...
    });

    socket.on("disconnect", () => {
      console.log("User disconnected. User ID:", socket.userId);
    });
  });

  return io;
}

module.exports = setupAuthenticatedSocket;
