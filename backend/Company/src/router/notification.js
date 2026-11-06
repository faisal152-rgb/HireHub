const express = require("express");
const { companyOrRecruiterAuth } = require("../middleware/auth");
const {
  allNotification,
  readNotification,
  markAllAsRead,
  clearNotification,
  clearAllNotifications,
} = require("../controllers/notification");

const router = express.Router();

// Allow both company auth and recruiter auth
router.get("/", companyOrRecruiterAuth, allNotification);
router.patch("/read/:id", companyOrRecruiterAuth, readNotification);
router.patch("/:id/read", companyOrRecruiterAuth, readNotification);
router.patch("/all-read", companyOrRecruiterAuth, markAllAsRead);
router.patch("/read-all", companyOrRecruiterAuth, markAllAsRead);
router.patch("/:id", companyOrRecruiterAuth, readNotification);
router.delete("/clear/:id", companyOrRecruiterAuth, clearNotification);
router.delete("/clear-all", companyOrRecruiterAuth, clearAllNotifications || markAllAsRead);
router.delete("/:id", companyOrRecruiterAuth, clearNotification);

module.exports = router;
