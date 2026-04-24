const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    orderItems: [
      {
        productId: mongoose.Schema.Types.ObjectId,
        name: String,
        quantity: Number,
        price: Number,
        size: String,
        color: String,
      },
    ],
    contactInformation: {
      name: String,
      email: String,
      phone: Number,
    },
    shippingAddress: {
      address: String,
      city: String,
      zip: Number,
      country: String,
    },
    totalPrice: Number,
    isPaid: { type: Boolean, default: false },
    isDelivered: { type: Boolean, default: false },
    paymentId: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
