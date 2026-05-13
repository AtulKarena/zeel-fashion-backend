const Order = require("../models/Order");
const Product = require("../models/Product");
const Contact = require("../models/Contact");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const tz = require("dayjs/plugin/timezone");

dayjs.extend(utc);
dayjs.extend(tz);

exports.getDashboardStats = async (req, res) => {
  try {
    // 📅 Get current time
    const startOfToday = dayjs().tz("Asia/Kolkata").startOf("day").toDate();
    const endOfToday = dayjs().tz("Asia/Kolkata").endOf("day").toDate();

    // 📅 Yesterday (based on UTC)
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const endOfYesterday = new Date(endOfToday);
    endOfYesterday.setDate(endOfYesterday.getDate() - 1);
    console.log("startOfToday:", startOfToday);
    console.log("endOfToday:", endOfToday);

    const [
      todaySalesResult,
      yesterdaySalesResult,
      totalOrders,
      lowStock,
      newInquiries,
    ] = await Promise.all([
      // 💰 Today Sales
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfToday, $lte: endOfToday },
            isPaid: true,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalPrice" },
          },
        },
      ]),

      // 💰 Yesterday Sales
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfYesterday, $lte: endOfYesterday },
            isPaid: true,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalPrice" },
          },
        },
      ]),

      // 📦 Counts
      Order.countDocuments(),
      Product.countDocuments({ stock: { $lte: 10 } }),

      Contact.countDocuments({
        createdAt: { $gte: startOfToday, $lte: endOfToday },
      }),
    ]);

    // ✅ Safe extraction
    const todaySales = todaySalesResult[0]?.total || 0;
    const yesterdaySales = yesterdaySalesResult[0]?.total || 0;

    // 📈 Percentage calc
    let percentage = 0;
    if (yesterdaySales > 0) {
      percentage = ((todaySales - yesterdaySales) / yesterdaySales) * 100;
    }

    const stats = [
      {
        label: "Today’s sales",
        value: `₹ ${todaySales.toLocaleString()}`,
        note: `${percentage >= 0 ? "+" : ""}${percentage.toFixed(1)}% vs yesterday`,
      },
      {
        label: "Orders",
        value: totalOrders.toString(),
        note: "All orders",
      },
      {
        label: "Low stock",
        value: lowStock.toString(),
        note: "Reorder soon",
      },
      {
        label: "New inquiries",
        value: newInquiries.toString(),
        note: "Today",
      },
    ];

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.getLatestOrders = async (req, res) => {
  try {
    const latestOrders = await Order.find()
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    res.json({
      success: true,
      data: latestOrders,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};
