const express = require("express");
const connectDB = require("./config/db");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const app = express();

connectDB();
// app.use(cors());
app.use(express.json());
/* app.use(
  cors({
    origin: "https://zeel-fashion.vercel.app",
    credentials: true, // ⭐ REQUIRED
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  }),
); */
const allowedOrigins = [
  "https://zeel-fashion.vercel.app",
];

app.use(cors({
  origin: function (origin, callback) {

    // allow requests with no origin
    // like mobile apps or Postman
    if (!origin) return callback(null, true);

    // allow production frontend
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // allow all Vercel preview deployments
    if (origin.endsWith(".vercel.app")) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },

  credentials: true
}));
app.use(cookieParser());
// Routes
app.use("/uploads", express.static("uploads"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/categories", require("./routes/categoryRoutes"));
app.use("/api/cart", require("./routes/cartRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/reviews", require("./routes/reviewRoutes"));
app.use("/api/payment", require("./routes/payment"));
app.use("/api/checkout", require("./routes/checkoutRoutes"));
app.use("/api/contacts", require("./routes/contactRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/profile", require("./routes/profileRoutes"));

app.listen(5000, () => console.log("Server running on port 5000"));
