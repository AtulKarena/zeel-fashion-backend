const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const Razorpay = require("razorpay");

const Payment = require("../models/Payment");
const Order = require("../models/Order");
const Product = require("../models/Product");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

router.post("/create-order", async (req, res) => {
  try {
    const { orderId, amount } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({
        success: false,
        message: "orderId and amount are required",
      });
    }

    const options = {
      amount: amount * 100, // convert ₹ to paise
      currency: "INR",
      receipt: `order_${orderId}`,
    };

    const order = await razorpay.orders.create(options);

    return res.json({
      success: true,
      razorpayOrderId: order.id,
      amount: order.amount,
    });
  } catch (error) {
    console.error("Razorpay Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create Razorpay order",
    });
  }
});

const sessions = {};

router.post("/verify", async (req, res) => {
  try {
    const {
      orderId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const sessionId = uuidv4();

    // ✅ Step 1: Validate input
    if (
      !orderId ||
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // ✅ Step 2: Verify signature
    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    // ✅ Step 3: Fetch order
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // 🔥 Prevent duplicate processing
    if (order.isPaid) {
      return res.status(400).json({
        success: false,
        message: "Order already paid",
      });
    }

    // 🔥 Step 4: FINAL STOCK DEDUCTION
    for (const item of order.orderItems) {
      const updated = await Product.findOneAndUpdate(
        {
          _id: item.productId,
          reservedStock: { $gte: item.quantity },
          stock: { $gte: item.quantity },
        },
        {
          $inc: {
            stock: -item.quantity,
            reservedStock: -item.quantity,
          },
        },
      );

      if (!updated) {
        return res.status(400).json({
          success: false,
          message: "Stock error during payment",
        });
      }
    }

    // ✅ Step 5: Mark order paid
    order.isPaid = true;
    order.status = "PAID";
    order.paymentId = razorpay_payment_id;

    await order.save();

    // ✅ Step 6: Save payment record
    const paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);

    await Payment.create({
      userId: order.userId,
      orderId: order._id,
      amount: paymentDetails.amount / 100,
      currency: paymentDetails.currency,
      paymentMethod: paymentDetails.method,
      transactionId: razorpay_payment_id,
      paymentStatus:
        paymentDetails.status === "captured"
          ? "success"
          : paymentDetails.status,
      paymentGateway: "razorpay",
      paidAt: new Date(),
      receipt: razorpay_order_id,
    });

    sessions[sessionId] = {
      valid: true,
      createdAt: new Date(),
    };

    return res.json({
      success: true,
      message: "Payment verified & stock updated",
      session_id: sessionId,
    });
  } catch (error) {
    console.error("Verify Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

router.post("/verify-session/:session_id", (req, res) => {
  const { session_id } = req.params;

  const session = sessions[session_id];

  if (session && session.valid) {
    return res.json({ valid: true });
  }

  return res.json({ valid: false });
});

router.post("/webhook", (req, res) => {
  const event = req.body.event;

  if (event === "payment.captured") {
    // update DB → status = paid
  }

  if (event === "payment.failed") {
    // update DB → status = failed
  }

  res.status(200).send("ok");
});

router.get("/", async (req, res) => {
  try {
    // Query params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";

    const skip = (page - 1) * limit;

    // Search filter (adjust fields as needed)
    const payments = await Payment.aggregate([
      {
        $lookup: {
          from: "users",
          let: { userId: "$userId" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$userId"] },
              },
            },
            {
              $project: {
                name: 1,
                email: 1,
              },
            },
          ],
          as: "user",
        },
      },

      { $unwind: "$user" },

      // 🔍 Search on name OR email
      {
        $match: {
          $or: [
            { "user.name": { $regex: search, $options: "i" } },
            { "user.email": { $regex: search, $options: "i" } },
          ],
        },
      },

      {
        $facet: {
          data: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },

            // 🎯 Final shape of response
            {
              $project: {
                amount: 1,
                currency: 1,
                transactionId: 1,
                paymentStatus: 1,
                paymentMethod: 1,
                paymentGateway: 1,
                createdAt: 1,
                "user.name": 1,
                "user.email": 1,
              },
            },
          ],

          totalCount: [{ $count: "count" }],
        },
      },
    ]);
    const data = payments[0].data;
    const total = payments[0].totalCount[0]?.count || 0;

    res.status(200).json({
      success: true,
      data: data,
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
      message: "Failed to fetch payments. Please try again.",
    });
  }
});

exports.paymentFailed = async (orderId) => {
  const order = await Order.findById(orderId);

  if (!order || order.isPaid) return;

  for (const item of order.orderItems) {
    await Product.findByIdAndUpdate(item.productId, {
      $inc: { reservedStock: -item.quantity },
    });
  }

  order.status = "FAILED";
  await order.save();
};

module.exports = router;
