const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const {

  getUserProfile,
  updateUserProfile,
} = require("../controllers/authController");

router.get("/", auth, getUserProfile);
router.put("/update-profile", auth, updateUserProfile);


module.exports = router;
