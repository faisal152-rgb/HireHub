const express = require("express");
const { candidateAuth } = require("../middleware/auth");
const {
  allNotification,
  readNotification,
  markAllAsRead,
  clearNotification,
} = require("../controllers/notification");

const router = express.Router();

router.get("/", candidateAuth, allNotification);
router.patch("/read/:id", candidateAuth, readNotification);
router.patch("/all-read", candidateAuth, markAllAsRead);
router.delete("/clear/:id", candidateAuth, clearNotification);

module.exports = router;
