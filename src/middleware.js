const jwt = require("jsonwebtoken");
const db = require("./db");
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

module.exports = auth;
