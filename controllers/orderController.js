const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");

const jwt = require("jsonwebtoken");

exports.createOrder = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      address,
      city,
      country,
      email,
      fullName,
      phone,
      zip,
      checkoutToken,
    } = req.body;

    if (!checkoutToken) {
      return res.status(403).json({ message: "No checkout token" });
    }

    let decoded;
    try {
      decoded = jwt.verify(checkoutToken, process.env.JWT_CHECKOUT_SECRET);
    } catch (err) {
      return res.status(403).json({
        message: "Invalid or expired checkout token",
      });
    }

    if (decoded.type !== "checkout" || decoded.userId !== userId) {
      return res.status(403).json({
        message: "Invalid checkout flow",
      });
    }

    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    // 🔥 STEP 1: VALIDATE + PREPARE ITEMS
    const orderItems = [];
    for (const item of cart.items) {
      const product = await Product.findById(item.productId);

      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product not found`,
        });
      }

      // ✅ Safety check (optional but good)
      if (product.reservedStock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Stock mismatch for ${product.name}`,
        });
      }

      orderItems.push({
        productId: item.productId,
        name: product.name,
        quantity: item.quantity,
        price: item.price,
        size: item.size,
        color: item.color,
      });
    }

    // 🔥 STEP 2: FINAL STOCK UPDATE (VERY IMPORTANT)
    for (const item of cart.items) {
      const updated = await Product.findOneAndUpdate(
        {
          _id: item.productId,
          reservedStock: { $gte: item.quantity },
          stock: { $gte: item.quantity },
        },
       
      );

      if (!updated) {
        return res.status(400).json({
          success: false,
          message: "Stock update failed. Try again.",
        });
      }
    }

    // 🧾 STEP 3: CREATE ORDER
    const totalPrice = orderItems.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );

    const order = await Order.create({
      userId,
      orderItems,
      totalPrice,
      contactInformation: {
        name: fullName,
        email,
        phone,
      },
      shippingAddress: {
        address,
        city,
        zip,
        country,
      },
      status: "PLACED",
    });

    // 🧹 STEP 4: CLEAR CART
    await Cart.findOneAndDelete({ userId });

    // 🔐 STEP 5: PAYMENT TOKEN
    const paymentToken = jwt.sign(
      {
        userId,
        orderId: order._id,
        type: "payment",
      },
      process.env.JWT_CHECKOUT_SECRET,
      { expiresIn: "10m" }
    );

    return res.status(201).json({
      success: true,
      message: "Order placed successfully!",
      orderId: order._id,
      paymentToken,
    });

  } catch (error) {
    console.error("Error from create order:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create order",
    });
  }
};

exports.getOrders = async (req, res) => {
  try {
    // Query params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";

    const skip = (page - 1) * limit;

    // Search filter (adjust fields as needed)
    const searchFilter = search
      ? {
          $or: [
            { "contactInformation.name": { $regex: search, $options: "i" } },
            { "contactInformation.email": { $regex: search, $options: "i" } },
            { "orderItems.name": { $regex: search, $options: "i" } },
          ],
        }
      : {};

    // Total count (for pagination)
    const total = await Order.countDocuments(searchFilter);

    // Fetch paginated data
    const Orders = await Order.find(searchFilter)
      .populate("userId")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: Orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders. Please try again.",
    });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete order. Please try again.",
    });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("userId");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch order. Please try again.",
    });
  }
};

exports.updateOrderById = async (req, res) => {
  try {
    const { id, isDelivered } = req.body;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Update delivery status
    order.isDelivered = isDelivered;

    const updatedOrder = await order.save();

    return res.status(200).json({
      success: true,
      message: "Order marked as delivered",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Update Order Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.status === "CANCELLED") {
      return res.status(400).json({
        success: false,
        message: "Already cancelled",
      });
    }

    // 🔥 RESTOCK
    for (const item of order.orderItems) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: item.quantity },
      });
    }

    order.status = "CANCELLED";
    await order.save();

    res.json({
      success: true,
      message: "Order cancelled & stock restored",
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Cancel failed",
    });
  }
};