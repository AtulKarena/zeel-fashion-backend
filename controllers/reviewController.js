const Review = require("../models/Review");

// ➕ Add Review
exports.addReview = async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;

    // Validation
    if (!productId || !rating) {
      return res.status(400).json({ 
        success: false, 
        message: "Please provide product ID and rating" 
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ 
        success: false, 
        message: "Rating must be between 1 and 5" 
      });
    }

    const review = await Review.create({
      productId,
      userId: req.user.id,
      rating,
      comment
    });
    
    res.status(201).json({ 
      success: true, 
      message: "Thank you! Your review has been posted successfully.",
      data: review 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Failed to add review. Please try again." 
    });
  }
};

// 📄 Get Product Reviews
exports.getReviews = async (req, res) => {
  try {
    const reviews = await Review.find({
      productId: req.params.productId
    }).populate("userId", "name");

    if (!reviews || reviews.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: "No reviews yet for this product",
        data: [] 
      });
    }

    res.status(200).json({ 
      success: true, 
      data: reviews 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch reviews. Please try again." 
    });
  }
};