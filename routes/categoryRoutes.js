const router = require("express").Router();
const controller = require("../controllers/categoryController");
const auth = require("../middleware/authMiddleware");

router.post("/",auth, controller.createCategory);
router.get("/",auth, controller.getCategories);
router.get("/all",auth, controller.getAllCategories);
router.get("/:id",auth, controller.getCategoryById);
router.put("/:id",auth, controller.updateCategory);
router.delete("/:id",auth, controller.deleteCategory);

module.exports = router;