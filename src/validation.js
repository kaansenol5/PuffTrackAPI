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

  rejectRequest: Joi.object({
    requestId: Joi.string().length(6).required(),
  }),

  cancelRequest: Joi.object({
    requestId: Joi.string().length(6).required(),
  }),
};

module.exports = schemas;
