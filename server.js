const express = require("express");
const { Sequelize, DataTypes } = require("sequelize");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const http = require("http");

const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());

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

// PostgreSQL connection
const sequelize = new Sequelize("pufftrack", "kaansenol", "", {
  host: "localhost",
  dialect: "postgres",
  port: 5432,
});

// Test the connection
sequelize
  .authenticate()
  .then(() => console.log("Connected to PostgreSQL"))
  .catch((err) => console.error("Error connecting to PostgreSQL", err));

// User model
const User = sequelize.define("User", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

// Puff model
const Puff = sequelize.define("Puff", {
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
  },
});

// Friend model (for many-to-many relationship)
const Friend = sequelize.define("Friend", {
  status: {
    type: DataTypes.ENUM("pending", "accepted"),
    defaultValue: "pending",
  },
});

// Relationships
User.hasMany(Puff);
Puff.belongsTo(User);
User.belongsToMany(User, {
  as: "Friends",
  through: Friend,
  foreignKey: "userId",
  otherKey: "friendId",
});
User.belongsToMany(User, {
  as: "FriendRequests",
  through: Friend,
  foreignKey: "friendId",
  otherKey: "userId",
});

// Sync models with database
sequelize
  .sync({}) // Note: Using force: true will drop existing tables. Remove in production.
  .then(() => console.log("Database synchronized"))
  .catch((err) => console.error("Error synchronizing database", err));

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
    const user = await User.findByPk(decoded.id);
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
    const hashedPassword = await bcrypt.hash(password, 8);
    const user = await User.create({ name, email, password: hashedPassword });
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
    const user = await User.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      console.log("invalid login");

      return res.status(401).send({ error: "Invalid login credentials" });
    }
    const token = jwt.sign({ id: user.id }, "your_jwt_secret", {
      expiresIn: "1m",
    }); // Expires in 1 minute for testing
    res.send({ user, token });
  } catch (error) {
    res.status(400).send(error);
  }
});

app.post("/puff", auth, async (req, res) => {
  try {
    const puff = await Puff.create({
      timestamp: new Date(),
      UserId: req.user.id,
    });
    res.status(201).send(puff);
  } catch (error) {
    res.status(400).send(error);
  }
});

app.post("/add-puffs", auth, async (req, res) => {
  try {
    const { timestamps } = req.body;

    if (!Array.isArray(timestamps) || timestamps.length === 0) {
      return res.status(400).send({ error: "Invalid timestamps array" });
    }

    const puffs = await Promise.all(
      timestamps.map(async (timestamp) => {
        return await Puff.create({
          timestamp: new Date(timestamp),
          UserId: req.user.id,
        });
      }),
    );

    res.status(201).send({ message: "Puffs added successfully", puffs });
  } catch (error) {
    console.error("Error in /add-puffs route:", error);
    res.status(400).send({ error: "Error adding puffs" });
  }
});

app.post("/friends/add", auth, async (req, res) => {
  try {
    const friend = await User.findByPk(req.body.friendId);
    if (!friend) {
      return res.status(404).send({ error: "Friend not found" });
    }
    if (friend.id === req.user.id) {
      return res.status(400).send({ error: "Cannot add yourself as a friend" });
    }

    const [friendship, created] = await Friend.findOrCreate({
      where: { userId: req.user.id, friendId: friend.id },
      defaults: { status: "pending" },
    });

    if (!created && friendship.status === "accepted") {
      return res.status(400).send({ error: "Already friends" });
    }

    // Check if the other user has already added this user
    const reverseFriendship = await Friend.findOne({
      where: { userId: friend.id, friendId: req.user.id },
    });

    if (reverseFriendship) {
      // If reverse friendship exists, set both to accepted
      await friendship.update({ status: "accepted" });
      await reverseFriendship.update({ status: "accepted" });
      res.send({ message: "Friendship accepted", status: "accepted" });
    } else {
      // If no reverse friendship, this is a new pending friendship
      if (created) {
        res
          .status(201)
          .send({ message: "Friend request sent", status: "pending" });
      } else {
        res.send({ message: "Friend request already sent", status: "pending" });
      }
    }
  } catch (error) {
    res.status(400).send(error);
  }
});

// New route to remove a friend
app.post("/friends/remove", auth, async (req, res) => {
  try {
    await Friend.destroy({
      where: {
        userId: req.user.id,
        friendId: req.body.friendId,
      },
    });
    res.send({ message: "Friend removed successfully" });
  } catch (error) {
    res.status(400).send(error);
  }
});

app.get("/debug", async (req, res) => {
  try {
    const users = await User.findAll({
      include: [
        {
          model: User,
          as: "Friends",
          through: { attributes: ["status"] },
        },
        {
          model: Puff,
        },
      ],
    });

    const friends = await Friend.findAll();
    const puffs = await Puff.findAll();

    res.json({
      users,
      friends,
      puffs,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error fetching debug data", details: error.message });
  }
});

app.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "name", "email"],
      include: [
        {
          model: User,
          as: "Friends",
          attributes: ["id", "name", "email"],
          through: { attributes: ["status"] },
        },
        {
          model: User,
          as: "FriendRequests",
          attributes: ["id", "name", "email"],
          through: { attributes: ["status"] },
        },
        {
          model: Puff,
          attributes: ["id", "timestamp"],
        },
      ],
    });

    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }

    const incomingRequests = user.FriendRequests.filter(
      (fr) => fr.Friend.status === "pending",
    ).map((fr) => ({ id: fr.id, name: fr.name }));

    const outgoingRequests = user.Friends.filter(
      (f) => f.Friend.status === "pending",
    ).map((f) => ({ id: f.id, name: f.name }));

    const formattedFriends = await Promise.all(
      user.Friends.filter((f) => f.Friend.status === "accepted").map(
        async (friend) => {
          const reverseFriendship = await Friend.findOne({
            where: { userId: friend.id, friendId: user.id, status: "accepted" },
          });

          if (reverseFriendship) {
            const friendData = {
              id: friend.id,
              name: friend.name,
              email: friend.email,
              status: "accepted",
              isMutual: true,
            };

            const friendPuffs = await Puff.findAll({
              where: { UserId: friend.id },
              attributes: ["timestamp"],
            });

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const puffSummary = {
              totalPuffs: friendPuffs.length,
              puffsToday: friendPuffs.filter((puff) => puff.timestamp >= today)
                .length,
              avgPuffsPerDay: 0,
            };

            if (friendPuffs.length > 0) {
              const firstPuffDate = new Date(
                Math.min(...friendPuffs.map((puff) => puff.timestamp)),
              );
              const daysSinceFirstPuff = Math.max(
                1,
                Math.ceil((today - firstPuffDate) / (1000 * 60 * 60 * 24)),
              );
              puffSummary.avgPuffsPerDay = parseFloat(
                (puffSummary.totalPuffs / daysSinceFirstPuff).toFixed(2),
              );
            }

            friendData.puffSummary = puffSummary;
            return friendData;
          }
          return null;
        },
      ),
    );

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      friends: formattedFriends.filter(Boolean),
      incomingRequests,
      outgoingRequests,
      puffs: user.Puffs,
    };

    res.send(userData);
  } catch (error) {
    console.error("Error in /me route:", error);
    res.status(500).send({ error: "Error retrieving user data" });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
