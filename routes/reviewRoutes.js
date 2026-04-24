const router = require("express").Router();
const controller = require("../controllers/reviewController");
const auth = require("../middleware/authMiddleware");

router.post("/",auth, controller.addReview);
router.get("/:productId", controller.getReviews);

module.exports = router;