const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/product-management', {
            // No need to specify useNewUrlParser or useUnifiedTopology
        });
        console.log('MongoDB connected');
    } catch (err) {
        console.error(err);
    }
};

module.exports = connectDB;
