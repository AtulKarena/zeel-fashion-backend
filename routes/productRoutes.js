const router = require("express").Router();
const controller = require("../controllers/productController");
const auth = require("../middleware/authMiddleware");
const upload = require("../config/upload");

router.post("/", auth, upload.array("images", 5), controller.createProduct);
router.get("/inventory", auth, controller.getInventory);
router.get("/home", controller.getProductsByCategory);
router.get("/", controller.getProducts);
router.get("/:id", controller.getProductById);
router.put("/inventory/update-stock", auth, controller.updateStock);
router.put("/:id", auth, upload.array("images", 5), controller.updateProduct);

router.delete("/:id", auth, controller.deleteProduct);

module.exports = router;
