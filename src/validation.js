const Joi = require("joi");

const schemas = {
  registration: Joi.object({
    name: Joi.string().min(2).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  addFriend: Joi.object({
    friendId: Joi.string().length(6).required(),
  }),

  acceptRequest: Joi.object({
    requestId: Joi.string().length(6).required(),
  }),
  changeName: Joi.object({
    newName: Joi.string().min(2).max(30).required(),
  }),
  addPuffs: Joi.object({
    puffs: Joi.array()
      .items(
        Joi.object({
          id: Joi.string().guid({ version: "uuidv4" }).required(),
          timestamp: Joi.number().integer().min(0).required(), // Unix seconds timestamp
          isSynced: Joi.boolean().required(),
        }),
      )
      .min(1)
      .required(),
  }),
  contact: Joi.object({
    name: Joi.string().min(2).max(100).required().trim().messages({
      "string.min": "Name must be at least 2 characters long",
      "string.max": "Name cannot exceed 100 characters",
      "string.empty": "Name is required",
    }),

    email: Joi.string().email().required().trim().messages({
      "string.email": "Please provide a valid email address",
      "string.empty": "Email is required",
    }),

    message: Joi.string().min(10).max(3000).required().trim().messages({
      "string.min": "Message must be at least 10 characters long",
      "string.max": "Message cannot exceed 3000 characters",
      "string.empty": "Message is required",
    }),
  }),
  rejectRequest: Joi.object({
    requestId: Joi.string().length(6).required(),
  }),

  cancelRequest: Joi.object({
    requestId: Joi.string().length(6).required(),
  }),
};

module.exports = schemas;
