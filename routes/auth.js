const express = require("express");

const {
  signup,
  login
} = require("../controllers/authController");

const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();


// =========================
// PUBLIC ROUTES
// =========================

router.post("/signup", signup);

router.post("/login", login);


// =========================
// PROTECTED ROUTE
// =========================

router.get(
  "/profile",
  authenticateToken,
  (req, res) => {
    res.json({
      message: "You have access to your profile!",
      user: req.user
    });
  }
);


module.exports = router;