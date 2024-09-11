const { Sequelize, DataTypes } = require("sequelize");
const bcrypt = require("bcryptjs");

// Initialize Sequelize with your database connection details
const sequelize = new Sequelize("pufftrack", "kaansenol", null, {
  host: "localhost",
  dialect: "postgres",
});

// Define models
const User = sequelize.define("User", {
  id: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true,
  },
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

const Puff = sequelize.define("Puff", {
  id: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true,
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
  },
});

const FriendRequest = sequelize.define("FriendRequest", {
  id: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true,
  },
  status: {
    type: DataTypes.ENUM("pending", "accepted", "rejected"),
    defaultValue: "pending",
  },
  UserId: {
    type: DataTypes.UUID,
    references: {
      model: User,
      key: "id",
    },
  },
  FriendId: {
    type: DataTypes.UUID,
    references: {
      model: User,
      key: "id",
    },
  },
});

// Set up associations
User.hasMany(Puff);
Puff.belongsTo(User);

User.belongsToMany(User, { as: "Friends", through: FriendRequest });

// Database functions
const db = {
  // User functions
  async createUser(name, email, password) {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await User.create({ name, email, password: hashedPassword });
      return user;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  },

  async getUserById(userId) {
    try {
      const user = await User.findByPk(userId);
      return user;
    } catch (error) {
      console.error("Error getting user:", error);
      throw error;
    }
  },

  async updateUser(userId, updates) {
    try {
      const user = await User.findByPk(userId);
      if (user) {
        await user.update(updates);
        return user;
      }
      return null;
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  },

  async login(email, password) {
    try {
      const user = await User.findOne({
        where: { email },
      });

      if (!user) {
        return null; // User not found
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return null; // Password is incorrect
      }

      // If password is correct, return user object without password
      const { password: _, ...userWithoutPassword } = user.get({ plain: true });
      return userWithoutPassword;
    } catch (error) {
      console.error("Error during login:", error);
      throw error;
    }
  },

  // Puff functions
  async addPuff(userId, timestamp) {
    try {
      const puff = await Puff.create({ UserId: userId, timestamp });
      return puff;
    } catch (error) {
      console.error("Error adding puff:", error);
      throw error;
    }
  },

  async getPuffs(userId) {
    try {
      const puffs = await Puff.findAll({
        where: { UserId: userId },
        order: [["timestamp", "DESC"]],
      });
      return puffs;
    } catch (error) {
      console.error("Error getting puffs:", error);
      throw error;
    }
  },

  // Friend request functions
  async sendFriendRequest(senderId, receiverId) {
    try {
      const request = await FriendRequest.create({
        UserId: senderId,
        FriendId: receiverId,
      });
      return request;
    } catch (error) {
      console.error("Error sending friend request:", error);
      throw error;
    }
  },

  async getFriendRequests(userId) {
    try {
      const requests = await FriendRequest.findAll({
        where: {
          FriendId: userId,
          status: "pending",
        },
        include: [{ model: User, as: "User" }],
      });
      return requests;
    } catch (error) {
      console.error("Error getting friend requests:", error);
      throw error;
    }
  },

  async getSentFriendRequests(userId) {
    try {
      const requests = await FriendRequest.findAll({
        where: {
          UserId: userId,
          status: "pending",
        },
        include: [{ model: User, as: "Friend" }],
      });
      return requests;
    } catch (error) {
      console.error("Error getting sent friend requests:", error);
      throw error;
    }
  },

  async acceptFriendRequest(requestId) {
    try {
      const request = await FriendRequest.findByPk(requestId);
      if (request) {
        await request.update({ status: "accepted" });
        return request;
      }
      return null;
    } catch (error) {
      console.error("Error accepting friend request:", error);
      throw error;
    }
  },

  async getFriends(userId) {
    try {
      const user = await User.findByPk(userId, {
        include: [
          {
            model: User,
            as: "Friends",
            through: { where: { status: "accepted" } },
          },
        ],
      });
      return user ? user.Friends : [];
    } catch (error) {
      console.error("Error getting friends:", error);
      throw error;
    }
  },

  async removeFriend(userId, friendId) {
    try {
      const result = await FriendRequest.destroy({
        where: {
          [Sequelize.Op.or]: [
            { UserId: userId, FriendId: friendId },
            { UserId: friendId, FriendId: userId },
          ],
          status: "accepted",
        },
      });
      return result > 0; // Returns true if a friendship was removed, false otherwise
    } catch (error) {
      console.error("Error removing friend:", error);
      throw error;
    }
  },

  // Initialize database
  async init() {
    try {
      await sequelize.authenticate();
      console.log("Database connection established successfully.");
      await sequelize.sync({ force: true });
      console.log("Database synchronized successfully.");
    } catch (error) {
      console.error("Unable to connect to the database:", error);
    }
  },
};

module.exports = db;
