const { adminAuth } = require("./auth");

module.exports = {
  authMiddleware: adminAuth,
  adminAuth,
};
