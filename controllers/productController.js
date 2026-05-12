const Product = require("../models/Product");
const Category = require("../models/Category");
const mongoose = require("mongoose");
// ➕ Add Product (Admin)
exports.createProduct = async (req, res) => {
  try {
    // Validation
    if (!req.body.name || !req.body.price || !req.body.category) {
      return res.status(400).json({
        success: false,
        message: "Please provide product name, price, and category",
      });
    }
    console.log("req.files", req.files);
    const imageUrls = req.files.map((file) => file.path);
    /* if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please upload at least one product image",
      });
    } */

    /*     const imagePaths = req.files.map(
      (file) => "http://localhost:5000/" + file.path,
    ); */
    console.log("imageUrls", imageUrls);
    console.log(typeof imageUrls);
    
    const productData = {
      ...req.body,
      images: 'imageUrls',
    };

    const product = await Product.create(productData);

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create product. Please try again.",
    });
  }
};

// 📄 Get All Products
exports.getProducts = async (req, res) => {
  try {
    // Query params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";

    const skip = (page - 1) * limit;

    // Search filter (adjust fields as needed)
    const searchFilter = {
      $or: [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ],
    };

    // Total count (for pagination)
    const total = await Product.countDocuments(searchFilter);

    // Fetch paginated data
    const products = await Product.find(searchFilter)
      .populate("category")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: products,
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
      message: "Failed to fetch products. Please try again.",
    });
  }
};

// 🔍 Get Single Product
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch product. Please try again.",
    });
  }
};

// ✏️ Update Product
exports.updateProduct = async (req, res) => {
  try {
    // ✅ Validate Product ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const updateData = {};

    // ✅ Only update fields if provided (prevents overwriting with undefined)
    if (req.body.name !== undefined) updateData.name = req.body.name;

    if (req.body.description !== undefined)
      updateData.description = req.body.description;

    if (req.body.price !== undefined) updateData.price = Number(req.body.price);

    if (req.body.stock !== undefined) updateData.stock = Number(req.body.stock);

    if (req.body.ratings !== undefined)
      updateData.ratings = Number(req.body.ratings);

    // ✅ Validate category ObjectId
    if (req.body.category !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(req.body.category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid category ID",
        });
      }
      updateData.category = req.body.category;
    }

    // ✅ Handle sizes array
    if (req.body.sizes !== undefined) {
      const sizes = Array.isArray(req.body.sizes)
        ? req.body.sizes
        : [req.body.sizes];

      updateData.sizes = sizes.filter(Boolean); // remove empty/null values
    }

    // ✅ Handle colors array
    if (req.body.colors !== undefined) {
      const colors = Array.isArray(req.body.colors)
        ? req.body.colors
        : [req.body.colors];

      updateData.colors = colors.filter(Boolean);
    }

    // ✅ Handle images (replace only if new images uploaded)
    if (req.files && req.files.length > 0) {
      const imagePaths = req.files.map((file) => file.path);
      updateData.images = imagePaths;
    }

    if (req.body.offer) {
      try {
        const offerData = JSON.parse(req.body.offer);
        updateData.offer = offerData;
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: "Invalid offer format. Please provide a valid JSON string.",
        });
      }
    }

    // ✅ Update product with validation
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      {
        new: true, // return updated document
        runValidators: true, // run schema validation
        context: "query", // important for validators
      },
    ).populate("category");

    // ❌ If product not found
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // ✅ Success response
    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    console.error("Update error:", error);

    // ✅ Handle Mongoose validation errors
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    // ✅ Handle cast errors (invalid ObjectId etc.)
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid data format",
      });
    }

    // ❌ Generic error
    res.status(500).json({
      success: false,
      message: "Failed to update product. Please try again.",
    });
  }
};
// ❌ Delete Product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete product. Please try again.",
    });
  }
};

exports.getProductsByCategory = async (req, res) => {
  try {
    console.log("hello");
    // 1. Get category IDs
    const menswear = await Category.findOne({ name: "Menswear" });
    const kidswear = await Category.findOne({ name: "Kidswear" });

    // 2. Menswear products (latest 3)
    const mensProducts = menswear
      ? await Product.find({ category: menswear._id })
          .populate("category")
          .sort({ createdAt: -1 })
          .limit(3)
      : [];

    // 3. Kidswear products (latest 3)
    const kidsProducts = kidswear
      ? await Product.find({ category: kidswear._id })
          .populate("category")
          .sort({ createdAt: -1 })
          .limit(3)
      : [];

    // 4. Other products (random 3, excluding mens & kids)
    const excludedCategories = [];
    if (menswear) excludedCategories.push(menswear._id);
    if (kidswear) excludedCategories.push(kidswear._id);

    const otherProducts =
      excludedCategories.length > 0
        ? await Product.aggregate([
            {
              $match: {
                category: { $nin: excludedCategories },
              },
            },
            {
              $sample: { size: 3 }, // random products
            },
            {
              $lookup: {
                from: "categories", // collection name in MongoDB
                localField: "category",
                foreignField: "_id",
                as: "category",
              },
            },
            {
              $unwind: "$category",
            },
          ])
        : [];

    // 5. Final response
    res.status(200).json({
      success: true,
      data: {
        menswear: mensProducts,
        kidswear: kidsProducts,
        others: otherProducts,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch category-wise products",
    });
  }
};

exports.addStock = async (productId, quantity) => {
  await Product.findByIdAndUpdate(productId, {
    $inc: { stock: quantity },
  });
};

exports.updateStock = async (req, res) => {
  try {
    const { productId, quantity, type } = req.body;
    // type = "ADD" | "REMOVE"

    if (!productId || !quantity) {
      return res.status(400).json({
        success: false,
        message: "Missing fields",
      });
    }

    const update =
      type === "add"
        ? { $inc: { stock: quantity } }
        : { $inc: { stock: -quantity } };

    const product = await Product.findByIdAndUpdate(productId, update, {
      new: true,
    });

    res.json({
      success: true,
      data: product,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Stock update failed",
    });
  }
};

exports.getInventory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";

    const skip = (page - 1) * limit;

    // ✅ Search filter

    const searchFilter = {
      $or: [{ name: { $regex: search, $options: "i" } }],
    };

    // ✅ Total count
    const total = await Product.countDocuments(searchFilter);

    // ✅ Apply pagination + search
    const products = await Product.find(searchFilter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    // ✅ Format data
    const data = products.map((p) => ({
      productId: p._id,
      name: p.name,
      price: p.price,
      stock: p.stock,
      reserved: p.reservedStock,
      available: p.stock - p.reservedStock,
      lowStock: p.stock <= 10, // 🔥 useful for UI
    }));

    res.json({
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Inventory Error:", err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch inventory",
    });
  }
};
