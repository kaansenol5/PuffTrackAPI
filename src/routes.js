const express = require("express");
const db = require("./db");
const router = express.Router();
const { auth, validate } = require("./middleware");
const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");

const schemas = require("./validation");

router.get("/", (req, res) => {
  res.send("PuffTrack API");
});

// Apple configuration
const appleKeysUrl = "https://appleid.apple.com/auth/keys";
const client = jwksClient({
  jwksUri: appleKeysUrl,
});

function getAppleKey(header, callback) {
  client.getSigningKey(header.kid, function (err, key) {
    if (err) {
      callback(err);
    } else {
      const signingKey = key.publicKey || key.rsaPublicKey;
      callback(null, signingKey);
    }
  });
}

router.post("/apple-signin", async (req, res) => {
  try {
    const { identityToken, userId, email, fullName } = req.body;
    console.log(fullName);
    if (!identityToken || !userId) {
      return res.status(400).send("Missing identity token or user ID");
    }

    // Verify the identity token
    jwt.verify(
      identityToken,
      getAppleKey,
      { algorithms: ["RS256"] },
      async (err, decoded) => {
        if (err) {
          console.error("Identity token verification failed:", err);
          return res.status(401).send("Invalid identity token");
        }

        // Extract user information from the decoded token
        const { sub, email: tokenEmail } = decoded;

        // Check if the user exists in your database
        let user = await db.getUserByAppleId(sub);

        if (!user) {
          // User does not exist, create a new user
          const userEmail = email || tokenEmail;
          if (!userEmail) {
            return res
              .status(400)
              .send("Email is required to create a new user");
          }

          user = await db.createUserWithAppleId({
            appleId: sub,
            email: userEmail,
            name: fullName || "Unknown",
          });
        }

        console.log(user);
        // Generate your own JWT token
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
          expiresIn: "2m",
        });
        console.log("issued token");
        res.send({ user, token });
      },
    );
  } catch (error) {
    console.error("Error in Apple Sign-in:", error);
    res.status(500).send("Internal server error");
  }
});

router.post("/register", validate(schemas.registration), async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = await db.createUser(name, email, password);
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });
    res.status(201).send({ user, token });
  } catch (error) {
    res.status(400).send(error);
    //   console.log("emitted error");
  }
});

router.get("/userData", auth, async (req, res) => {
  const userId = req.user.id; // Assuming you have middleware that sets req.user
  console.log("Aaaaaaaaaa");
  try {
    const userData = await db.getUserData(userId);
    res.json(userData);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve user data" });
  }
});
router.delete("/deleteUser", auth, async (req, res) => {
  console.log("bbbbbbbbb");
  const userId = req.user.id; // Assuming you have middleware that sets req.user

  try {
    const success = await db.deleteUserData(userId);
    if (success) {
      res.json({
        message: "Your account and data have been deleted successfully.",
      });
    } else {
      res.status(404).json({ error: "User not found." });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to delete user data" });
  }
});

router.post("/login", validate(schemas.login), async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await db.login(email, password);
    if (user) {
      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
        expiresIn: "30d",
      });
      res.send({ user, token });
    } else {
      res.status(400).send("Invalid login");
    }
  } catch (error) {
    res.status(400).send(error);
  }
});

router.post("/ping", auth, async (req, res) => {
  res.status(200).send({ status: "pong" });
});

module.exports = router;
