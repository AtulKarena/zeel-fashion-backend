const Contact = require("../models/Contact");

// Create new contact message
exports.createContact = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    const newContact = new Contact({ name, email, message });
    await newContact.save();

    res
      .status(201)
      .json({
        success: true,
        message: "Your contact was saved successfully!",
        data: newContact,
      });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get all contact messages
exports.getContacts = async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: contacts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
