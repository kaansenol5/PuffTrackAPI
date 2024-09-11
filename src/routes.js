const express = require("express");
const db = require("./db");
const router = express.Router();
const auth = require("./middleware");
const jwt = require("jsonwebtoken");

router.get("/", (req, res) => {
  res.send("PuffTrack API");
});

// Routes
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = await db.createUser(name, email, password);
    const token = jwt.sign({ id: user.id }, "secret", {
      expiresIn: "1d",
    }); // Expires in 1 minute for testing
    res.status(201).send({ user, token });
  } catch (error) {
    res.status(400).send(error);
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await db.login(email, password);
    if (user) {
      const token = jwt.sign({ id: user.id }, "secret", {
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

router.post("/ping", auth, async (req, res) => {
  res.status(200).send("pong");
});

module.exports = router;
