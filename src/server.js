const express = require("express");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const http = require("http");
const db = require("./db");
const socketManager = require("./socketmanager");
const app = express();
var expressWs = require("express-ws")(app);
const server = http.createServer(app);

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

// Authentication middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization").replace("Bearer ", "");
    let decoded;
    try {
      decoded = jwt.verify(token, "your_jwt_secret");
    } catch (e) {
      if (e instanceof jwt.TokenExpiredError) {
        return res.status(401).send({ error: "Token expired" });
      }
      throw e;
    }
    const user = await db.getUserById(decoded.id);
    if (!user) {
      throw new Error();
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(401).send({ error: "Please authenticate." });
  }
};
// Routes
app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = await db.createUser(name, email, password);
    const token = jwt.sign({ id: user.id }, "your_jwt_secret", {
      expiresIn: "1d",
    }); // Expires in 1 minute for testing
    res.status(201).send({ user, token });
  } catch (error) {
    res.status(400).send(error);
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await db.login(email, password);
    if (user) {
      const token = jwt.sign({ id: user.id }, "your_jwt_secret", {
        expiresIn: "1m",
      }); // Expires in 1 minute for testing
      res.send({ user, token });
    } else {
      res.status(400).send("Invalid log in");
    }
  } catch (error) {
    res.status(400).send(error);
  }
});

app.post("/ping", auth, async (req, res) => {
  res.status(200).send("pong");
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
