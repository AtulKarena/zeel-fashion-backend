const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, index: true },
    description: String,
    price: Number,
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    sizes: [String],
    colors: [String],
    stock: Number,
    reservedStock: {
      type: Number,
      default: 0,
    },
    images: [String],
    ratings: { type: Number, default: 0 },
    offer: {
      label: { type: String, default: "Discount" },
      percentOff: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);
productSchema.virtual("availableStock").get(function () {
  return this.stock - this.reservedStock;
});
module.exports = mongoose.model("Product", productSchema);
