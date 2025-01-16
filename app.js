const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const User = require('./models/User');
const Product = require('./models/Product');
const connectDB = require('./config/db');

// Connect to MongoDB
connectDB();

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());
// Serve static files (images) from the 'uploads' directory
app.use('/uploads', express.static('uploads'));

// Middleware to parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Session setup
app.use(session({
    secret: 'mysecret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30000 } // Session expires after 15 seconds
}));

// Multer setup for image upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Set view engine
app.set('view engine', 'ejs');

// Middleware to check if session expired
const sessionExpired = (req, res, next) => {
    if (!req.session.userId) {
        req.session.expired = true; // Set a flag for the expired session
        return res.redirect('/');
    }
    next();
};

// Routes

// Landing Page Route
app.get('/landing', (req, res) => {
    res.render('landing');
});

// Home Route (Redirect to Landing Page)
app.get('/', (req, res) => {
    res.redirect('/landing');
});

// Login Page Route
app.get('/login', (req, res) => {
    const errorMessage = req.session.expired ? 'Session expired. Please log in again.' : null;
    req.session.expired = false; // Reset the expired flag
    res.render('login', { errorMessage });
});

// Sign Up Route
app.get('/signup', (req, res) => {
    res.render('signup');
});

app.post('/signup', async (req, res) => {
    const { username, password, role } = req.body;

    try {
        const user = new User({ username, password, role });
        await user.save();
        res.redirect('/login');
    } catch (err) {
        console.error(err);
        res.redirect('/signup');
    }
});

// Login Route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });
        if (user && await user.comparePassword(password)) {
            req.session.userId = user._id;
            req.session.username = user.username;
            req.session.role = user.role;
            res.redirect('/dashboard');
        } else {
            res.render('login', { errorMessage: 'Invalid username or password. Please sign up if you are not registered.' });
        }
    } catch (err) {
        console.error(err);
        res.redirect('/login');
    }
});

// Dashboard Route
app.get('/dashboard', sessionExpired, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const products = await Product.find();
        res.render('dashboard', {
            username: user.username,
            role: user.role,
            products
        });
    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
});

// Add Product Page
app.get('/add-product', sessionExpired, (req, res) => {
    res.render('add-product', { username: req.session.username });
});

app.post('/add-product', upload.single('product-image'), async (req, res) => {
    // Check if the session is expired
    if (!req.session.userId) {
        return res.status(403).json({ success: false, message: 'Session expired. Please log in again.' });
    }

    const user = await User.findById(req.session.userId);

    if (user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Only admins can add products.' });
    }

    const { 'product-name': productName, 'product-description': productDescription } = req.body;
    const productImage = req.file ? `/uploads/${req.file.filename}` : null;

    if (!productName || !productDescription) {
        return res.status(400).json({ success: false, message: 'Product name and description are required.' });
    }

    try {
        const newProduct = new Product({
            name: productName,
            description: productDescription,
            image: productImage
        });
        await newProduct.save();
        res.json({ success: true, message: 'Product added successfully!' });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ success: false, message: 'Error adding product' });
    }
});

// View Products Route
app.get('/view-products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ message: 'Error fetching products' });
    }
});

// Delete Product Route
app.delete('/delete-product/:id', async (req, res) => {
    const productId = req.params.id;

    try {
        await Product.findByIdAndDelete(productId);
        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ message: 'Error deleting product' });
    }
});

// Logout Route
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error(err);
        }
        res.redirect('/landing');
    });
});

// Start the server
app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
