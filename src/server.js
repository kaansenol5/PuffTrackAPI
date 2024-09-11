const express = require("express");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const http = require("http");
const db = require("./db");
const socketManager = require("./socketmanager");
const app = express();
var expressWs = require("express-ws")(app);
const server = http.createServer(app);
const routes = require("./routes");

// Middleware
app.use(express.json());
db.init();

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

app.use("/", routes);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
