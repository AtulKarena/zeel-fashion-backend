const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const jwt = require("jsonwebtoken");

router.post("/session", auth, (req, res) => {
  const userId = req.user.id;

  // Optional: validate cart is not empty
  if (!req.body.cart || req.body.cart.length === 0) {
    return res.status(400).json({ message: "Cart is empty" });
  }

  const checkoutToken = jwt.sign(
    {
      userId,
      type: "checkout",
    },
    process.env.JWT_CHECKOUT_SECRET,
    { expiresIn: "10m" }, // short-lived
  );

  res.json({ checkoutToken });
});


module.exports = router;
