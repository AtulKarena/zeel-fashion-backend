const router = require("express").Router();
const controller = require("../controllers/cartController");
const auth = require("../middleware/authMiddleware");

router.post("/",auth, controller.addToCart);
router.get("/",auth, controller.getCart);
router.put("/merge",auth, controller.mergeCart);
router.post("/quantity",auth, controller.updateCartQuantity);
router.delete('/',auth, controller.clearCart);
router.delete("/:id",auth, controller.removeFromCart);

module.exports = router;