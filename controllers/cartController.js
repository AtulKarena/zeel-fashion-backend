const Cart = require("../models/Cart");
const Product = require("../models/Product");


// 🛒 ➕ Add to Cart
exports.addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity, size, color, price } = req.body;

    if (!productId || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid product or quantity",
      });
    }

    // ✅ SAFE STOCK RESERVE (atomic)
    const product = await Product.findOneAndUpdate(
      {
        _id: productId,
        $expr: {
          $gte: [
            { $subtract: ["$stock", "$reservedStock"] },
            quantity,
          ],
        },
      },
      {
        $inc: { reservedStock: quantity },
      },
      { returnDocument: true }
    );

    if (!product) {
      return res.status(400).json({
        success: false,
        message: "Not enough stock",
      });
    }

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = await Cart.create({
        userId,
        items: [{ productId, quantity, size, color, price }],
      });
    } else {
      const item = cart.items.find(
        (i) => i.productId.toString() === productId
      );

      if (item) {
        item.quantity += quantity;
      } else {
        cart.items.push({ productId, quantity, size, color, price });
      }

      await cart.save();
    }

    res.status(200).json({
      success: true,
      message: "Product added to cart",
      data: cart,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Add to cart failed",
    });
  }
};



// 📄 Get Cart
exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.id })
      .populate("items.productId")
      .lean();

    res.status(200).json({
      success: true,
      data: cart || { items: [] },
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch cart",
    });
  }
};



// ❌ Remove Item (WITH STOCK RELEASE)
exports.removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const item = cart.items.find(
      (i) => i.productId.toString() === id
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    // ✅ RELEASE STOCK
    await Product.findByIdAndUpdate(id, {
      $inc: { reservedStock: -item.quantity },
    });

    cart.items = cart.items.filter(
      (i) => i.productId.toString() !== id
    );

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Item removed",
      data: cart,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Remove failed",
    });
  }
};



// 🔄 Update Quantity (SAFE)
exports.updateCartQuantity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity } = req.body;

    if (!productId || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid input",
      });
    }

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const item = cart.items.find(
      (i) => i.productId.toString() === productId
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    const diff = quantity - item.quantity;

    // 🔺 Increase quantity → reserve more
    if (diff > 0) {
      const product = await Product.findOneAndUpdate(
        {
          _id: productId,
          $expr: {
            $gte: [
              { $subtract: ["$stock", "$reservedStock"] },
              diff,
            ],
          },
        },
        {
          $inc: { reservedStock: diff },
        },
        { returnDocument: true }
      );

      if (!product) {
        return res.status(400).json({
          success: false,
          message: "Not enough stock",
        });
      }
    }

    // 🔻 Decrease → release stock
    if (diff < 0) {
      await Product.findByIdAndUpdate(productId, {
        $inc: { reservedStock: diff },
      });
    }

    item.quantity = quantity;
    await cart.save();

    res.status(200).json({
      success: true,
      message: "Cart updated",
      data: cart,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Update failed",
    });
  }
};



// 🧹 Clear Cart (RELEASE ALL STOCK)
exports.clearCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    // ✅ release all stock
    for (const item of cart.items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { reservedStock: -item.quantity },
      });
    }

    cart.items = [];
    await cart.save();

    res.status(200).json({
      success: true,
      message: "Cart cleared",
      data: cart,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Clear failed",
    });
  }
};



// 🔄 Merge Cart (LOGIN CASE)
exports.mergeCart = async (req, res) => {
  try {
    const userId = req.user.id;
    let { items } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: "Items must be array",
      });
    }

    const existingCart = await Cart.findOne({ userId });

    // ✅ RELEASE OLD STOCK
    if (existingCart) {
      for (const item of existingCart.items) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { reservedStock: -item.quantity },
        });
      }
    }

    // ✅ RESERVE NEW STOCK
    for (const item of items) {
      const product = await Product.findOneAndUpdate(
        {
          _id: item.productId,
          $expr: {
            $gte: [
              { $subtract: ["$stock", "$reservedStock"] },
              item.quantity,
            ],
          },
        },
        {
          $inc: { reservedStock: item.quantity },
        }
      );

      if (!product) {
        return res.status(400).json({
          success: false,
          message: "Stock issue in merge",
        });
      }
    }

    const cart = await Cart.findOneAndUpdate(
      { userId },
      { items },
      { returnDocument: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: "Cart merged",
      data: cart,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Merge failed",
    });
  }
};