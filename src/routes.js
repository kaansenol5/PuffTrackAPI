const express = require("express");
const db = require("./db");
const router = express.Router();
const { auth, validate } = require("./middleware");
const jwt = require("jsonwebtoken");
const schemas = require("./validation");

router.get("/", (req, res) => {
  res.send("PuffTrack API");
});

router.post("/register", validate(schemas.registration), async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = await db.createUser(name, email, password);
    const token = jwt.sign({ id: user.id }, "secret", { expiresIn: "1d" });
    res.status(201).send({ user, token });
  } catch (error) {
    res.status(400).send(error);
    console.log("emitted error");
  }
});

router.post("/login", validate(schemas.login), async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await db.login(email, password);
    if (user) {
      const token = jwt.sign({ id: user.id }, "secret", { expiresIn: "1d" });
      res.send({ user, token });
    } else {
      res.status(400).send("Invalid login");
    }
  } catch (error) {
    res.status(400).send(error);
  }
});

router.get("/debug", async (req, res) => {
  res.status(200).send({ db: await db.dumpDatabase() });
});
router.post("/ping", auth, async (req, res) => {
  res.status(200).send({ status: "pong" });
});

module.exports = router;
