const router = require("express").Router();
const controller = require("../controllers/orderController");
const auth = require("../middleware/authMiddleware");

router.post("/", auth, controller.createOrder);
router.get("/", auth, controller.getOrders);
router.get("/:id", auth, controller.getOrderById);
router.put("/", auth, controller.updateOrderById);
router.delete("/:id", auth, controller.deleteOrder);

module.exports = router;
