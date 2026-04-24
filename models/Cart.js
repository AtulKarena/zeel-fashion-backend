const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId},
      quantity: Number,
      size: String,
      color: String,
      price: Number,
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model("Cart", cartSchema);