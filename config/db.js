const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect("mongodb+srv://atulkarena2903_db_user:rCLB5ulC43RC32im@cluster0.yzbgoxb.mongodb.net/zeel_fashion?retryWrites=true&w=majority");
    console.log("MongoDB Connected");
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

module.exports = connectDB;