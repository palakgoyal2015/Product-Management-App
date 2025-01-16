const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    image: {
        type: String,  // Store the image URL (path to the uploaded image)
        required: false  // This is optional, so it won't cause errors if no image is uploaded
    }
});

const Product = mongoose.model('Product', ProductSchema);

module.exports = Product;
