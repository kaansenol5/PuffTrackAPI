const express = require("express");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const http = require("http");
const db = require("./db");
const socketManager = require("./socketmanager");
const app = express();
const server = http.createServer(app);

const setupAuthenticatedSocket = require("./socket");
require("dotenv").config();
app.set("trust proxy", 1); // Number represents the number of proxies to trust

const routes = require("./routes");
const socketIo = require("socket.io");
const rateLimit = require("express-rate-limit");

// Create a limiter middleware
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply rate limiting to all routes
app.use(apiLimiter);

// Middleware
app.use(express.json());
db.init();

const jwt_secret = process.env.JWT_SECRET;

const io = setupAuthenticatedSocket(server);

app.use("/", routes);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;

/*
app.use((req, res, next) => {
  // Log the incoming request
  console.log(`\n--- Incoming Request ---`);
  console.log(`${req.method} ${req.url}`);
  console.log("Headers:", req.headers);
  console.log("Query Parameters:", req.query);
  console.log("Body:", req.body);
  console.log("------------------------");

  // Capture the response
  const originalJson = res.json;
  res.json = function (body) {
    console.log(`\n--- Outgoing Response ---`);
    console.log(`${req.method} ${req.url}`);
    console.log(`Status Code: ${res.statusCode}`);
    console.log("Headers:", res.getHeaders());
    console.log("Body:", body);
    console.log("-------------------------");
    originalJson.call(this, body);
  };

  next();
});
*/
