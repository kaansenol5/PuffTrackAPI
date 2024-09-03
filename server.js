const express = require("express");
const { Sequelize, DataTypes } = require("sequelize");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const http = require("http");

const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());

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

// Sync models with database
sequelize
  .sync({ force: true }) // Note: Using force: true will drop existing tables. Remove in production.
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

app.get("/puffs", auth, async (req, res) => {
  try {
    const userId = req.query.userId || req.user.id;

    if (userId != req.user.id) {
      const friendship = await Friend.findOne({
        where: {
          userId: req.user.id,
          friendId: userId,
          status: "accepted",
        },
      });

      const reverseFriendship = await Friend.findOne({
        where: {
          userId: userId,
          friendId: req.user.id,
          status: "accepted",
        },
      });

      if (!friendship || !reverseFriendship) {
        return res
          .status(403)
          .send({ error: "Not authorized to view this user's puffs" });
      }
    }

    const puffs = await Puff.findAll({ where: { UserId: userId } });
    res.status(200).send(puffs);
  } catch (error) {
    res.status(500).send(error);
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

app.get("/friends", auth, async (req, res) => {
  try {
    const friends = await req.user.getFriends({
      attributes: ["id", "name", "email"],
      through: { attributes: ["status"] },
    });

    const formattedFriends = friends.map((friend) => ({
      id: friend.id,
      name: friend.name,
      email: friend.email,
      status: friend.Friend.status,
      isMutual: friend.Friend.status === "accepted",
    }));

    res.send(formattedFriends);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
