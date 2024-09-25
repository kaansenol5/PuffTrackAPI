const { Sequelize, DataTypes, Op } = require("sequelize");
const bcrypt = require("bcryptjs");
const { customAlphabet } = require("nanoid");

const nanoid = customAlphabet("1234567890abcdefhjkmnpqrstuvwxyz", 6);

const sequelize = new Sequelize("pufftrack", "kaansenol", null, {
  host: "localhost",
  dialect: "postgres",
});

const User = sequelize.define("User", {
  id: {
    type: DataTypes.STRING(6),
    primaryKey: true,
  },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
});

const Puff = sequelize.define("Puff", {
  id: {
    type: DataTypes.STRING(6),
    primaryKey: true,
  },
  timestamp: { type: DataTypes.DATE, allowNull: false },
  UserId: { type: DataTypes.STRING(6), allowNull: false },
});

const FriendRequest = sequelize.define("FriendRequest", {
  id: {
    type: DataTypes.STRING(6),
    primaryKey: true,
  },
  status: {
    type: DataTypes.ENUM("pending", "accepted", "rejected"),
    defaultValue: "pending",
  },
  UserId: { type: DataTypes.STRING(6), allowNull: false },
  FriendId: { type: DataTypes.STRING(6), allowNull: false },
});

// Set up associations
User.hasMany(Puff, { foreignKey: "UserId" });
Puff.belongsTo(User, { foreignKey: "UserId" });

User.hasMany(FriendRequest, { as: "SentFriendRequests", foreignKey: "UserId" });
User.hasMany(FriendRequest, {
  as: "ReceivedFriendRequests",
  foreignKey: "FriendId",
});

FriendRequest.belongsTo(User, { as: "Sender", foreignKey: "UserId" });
FriendRequest.belongsTo(User, { as: "Receiver", foreignKey: "FriendId" });

// Utility function to generate unique IDs
async function generateUniqueId(model) {
  let id;
  let exists = true;
  while (exists) {
    id = nanoid();
    exists = await model.findByPk(id);
  }
  return id;
}

// Database functions
const db = {
  // User functions
  async createUser(name, email, password) {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = await generateUniqueId(User);
      const user = await User.create({
        id: userId,
        name,
        email,
        password: hashedPassword,
      });
      return user;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  },
  async userExists(userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        console.log(userId + " does not exist");
      }
      return !!user; // Returns true if user exists, false otherwise
    } catch (error) {
      console.error("Error checking if user exists:", error);
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
      const user = await User.findOne({ where: { email } });
      if (!user) return null;

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) return null;

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
      const puffId = await generateUniqueId(Puff);
      const puff = await Puff.create({
        id: puffId,
        UserId: userId,
        timestamp,
      });

      // After adding a new puff, clean up old puffs
      await this.cleanupOldPuffs(userId);

      return puff;
    } catch (error) {
      console.error("Error adding puff:", error);
      throw error;
    }
  },

  async cleanupOldPuffs(userId) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      await Puff.destroy({
        where: {
          UserId: userId,
          timestamp: {
            [Op.lt]: thirtyDaysAgo,
          },
        },
      });
    } catch (error) {
      console.error("Error cleaning up old puffs:", error);
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

  async getFriendRequestById(requestId) {
    try {
      const request = await FriendRequest.findByPk(requestId);
      return request;
    } catch (error) {
      console.error("Error getting friend request:", error);
      throw error;
    }
  },

  async deleteFriendRequest(requestId) {
    try {
      const result = await FriendRequest.destroy({
        where: { id: requestId },
      });
      return result > 0;
    } catch (error) {
      console.error("Error deleting friend request:", error);
      throw error;
    }
  },

  async getFriendsPuffSummaries(userId) {
    try {
      const friends = await this.getFriends(userId);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const friendSummaries = await Promise.all(
        friends.map(async (friend) => {
          const puffs = await Puff.findAll({
            where: { UserId: friend.id },
            order: [["timestamp", "DESC"]],
          });
          const totalPuffs = puffs.length;
          const firstPuffDate =
            puffs.length > 0 ? puffs[puffs.length - 1].timestamp : null;
          const puffsToday = puffs.filter(
            (puff) => puff.timestamp >= today,
          ).length;
          const puffsYesterday = puffs.filter(
            (puff) => puff.timestamp >= yesterday && puff.timestamp < today,
          ).length;

          const daysSinceFirstPuff = Math.max(
            1,
            Math.ceil((today - firstPuffDate) / (1000 * 60 * 60 * 24)),
          );
          const averagePuffsPerDay = totalPuffs / daysSinceFirstPuff;

          const changePercentage =
            puffsYesterday === 0
              ? puffsToday === 0
                ? 0
                : 100
              : ((puffsToday - puffsYesterday) / puffsYesterday) * 100;

          let pufflessDayStreak = 0;
          if (puffsToday === 0 && firstPuffDate) {
            let dayCounter = 1;
            while (dayCounter <= 30) {
              // Example limit
              const dateToCheck = new Date(today);
              dateToCheck.setDate(dateToCheck.getDate() - dayCounter);
              const puffsOnDate = puffs.filter(
                (puff) =>
                  puff.timestamp >= dateToCheck &&
                  puff.timestamp <
                    new Date(dateToCheck.getTime() + 24 * 60 * 60 * 1000),
              ).length;
              if (puffsOnDate === 0) {
                pufflessDayStreak++;
                dayCounter++;
              } else {
                break;
              }
            }
          } else if (puffsToday === 0 && !firstPuffDate) {
            // User has no puffs at all
            pufflessDayStreak = 0; // Or set to a default value
          }

          return {
            id: friend.id,
            name: friend.name,
            email: friend.email,
            puffSummaries: {
              puffsToday,
              averagePuffsPerDay: averagePuffsPerDay.toFixed(2),
              changePercentage: changePercentage.toFixed(2),
              pufflessDayStreak,
            },
          };
        }),
      );

      return friendSummaries;
    } catch (error) {
      console.error("Error getting friends' puff summaries:", error);
      throw error;
    }
  },

  // Friend request functions
  async sendFriendRequest(senderId, receiverId) {
    try {
      const requestId = await generateUniqueId(FriendRequest);
      const request = await FriendRequest.create({
        id: requestId,
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
        include: [{ model: User, as: "Sender" }],
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
        include: [{ model: User, as: "Receiver" }],
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
        console.log("accepted request");
        return request;
      }
      return null;
    } catch (error) {
      console.error("Error accepting friend request:", error);
      throw error;
    }
  },

  async getFriendRequestSender(requestId) {
    try {
      const request = await FriendRequest.findByPk(requestId, {
        include: [
          { model: User, as: "Sender", attributes: ["id", "name", "email"] },
        ],
      });

      if (!request) {
        return null;
      }

      return request.Sender;
    } catch (error) {
      console.error("Error getting friend request sender:", error);
      throw error;
    }
  },

  async getFriendRequestReceiver(requestId) {
    try {
      const request = await FriendRequest.findByPk(requestId, {
        include: [
          { model: User, as: "Receiver", attributes: ["id", "name", "email"] },
        ],
      });

      if (!request) {
        return null;
      }

      return request.Receiver;
    } catch (error) {
      console.error("Error getting friend request receiver:", error);
      throw error;
    }
  },

  async removeFriend(userId, friendId) {
    try {
      const result = await FriendRequest.destroy({
        where: {
          status: "accepted",
          [Op.or]: [
            { UserId: userId, FriendId: friendId },
            { UserId: friendId, FriendId: userId },
          ],
        },
      });
      return result > 0;
    } catch (error) {
      console.error("Error removing friend:", error);
      throw error;
    }
  },

  async getFriends(userId) {
    try {
      const acceptedRequests = await FriendRequest.findAll({
        where: {
          status: "accepted",
          [Op.or]: [{ UserId: userId }, { FriendId: userId }],
        },
      });

      const friendIds = acceptedRequests.map((req) =>
        req.UserId === userId ? req.FriendId : req.UserId,
      );

      const friends = await User.findAll({
        where: { id: friendIds },
      });

      return friends;
    } catch (error) {
      console.error("Error getting friends:", error);
      throw error;
    }
  },

  async getFullSync(userId) {
    try {
      // Get user information
      const user = await this.getUserById(userId);
      // Get friends with puff summaries
      const friendsPuffSummaries = await this.getFriendsPuffSummaries(userId);
      // Get friend requests with Sender and Receiver details
      const receivedFriendRequests = await FriendRequest.findAll({
        where: {
          FriendId: userId,
          status: "pending",
        },
        include: [
          {
            model: User,
            as: "Sender",
            attributes: ["id", "name", "email"],
          },
          {
            model: User,
            as: "Receiver",
            attributes: ["id", "name", "email"],
          },
        ],
      });
      const sentFriendRequests = await FriendRequest.findAll({
        where: {
          UserId: userId,
          status: "pending",
        },
        include: [
          {
            model: User,
            as: "Sender",
            attributes: ["id", "name", "email"],
          },
          {
            model: User,
            as: "Receiver",
            attributes: ["id", "name", "email"],
          },
        ],
      });
      // Format the friend requests to include Sender and Receiver
      const formattedReceivedRequests = receivedFriendRequests.map(
        (request) => ({
          id: request.id,
          status: request.status,
          sender: request.Sender
            ? {
                id: request.Sender.id,
                name: request.Sender.name,
                email: request.Sender.email,
              }
            : null,
          receiver: request.Receiver
            ? {
                id: request.Receiver.id,
                name: request.Receiver.name,
                email: request.Receiver.email,
              }
            : null,
        }),
      );
      const formattedSentRequests = sentFriendRequests.map((request) => ({
        id: request.id,
        status: request.status,
        sender: request.Sender
          ? {
              id: request.Sender.id,
              name: request.Sender.name,
              email: request.Sender.email,
            }
          : null,
        receiver: request.Receiver
          ? {
              id: request.Receiver.id,
              name: request.Receiver.name,
              email: request.Receiver.email,
            }
          : null,
      }));
      console.log("FULL UPDATE " + user.id);
      // Build the response
      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        friends: friendsPuffSummaries.map((friend) => ({
          id: friend.id,
          name: friend.name,
          email: friend.email,
          puffsummary: friend.puffSummaries,
        })),
        sentFriendRequests: formattedSentRequests,
        receivedFriendRequests: formattedReceivedRequests,
      };
    } catch (error) {
      console.error("Error getting full sync:", error);
      throw error;
    }
  },
  async dumpDatabase() {
    try {
      const users = await User.findAll({
        attributes: { exclude: ["password"] },
        raw: true,
      });

      const puffs = await Puff.findAll({ raw: true });

      const friendRequests = await FriendRequest.findAll({ raw: true });

      return {
        users,
        puffs,
        friendRequests,
      };
    } catch (error) {
      console.error("Error dumping database:", error);
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
