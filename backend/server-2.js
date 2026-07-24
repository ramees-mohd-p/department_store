import express from 'express';
import sqlite3 from 'sqlite3';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import cors from 'cors';
import Razorpay from 'razorpay';
dotenv.config();
const app = express();

// CORS configuration
const corsOptions = {
  origin: '*',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-password']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));


// ========================================
// CONFIGURATION
// ========================================

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret'
});

// ========================================
// DATABASE SETUP
// ========================================

const db = new sqlite3.Database('./shop.db');

const initDatabase = () => {
  db.serialize(() => {
    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User addresses
    db.run(`
      CREATE TABLE IF NOT EXISTS user_addresses (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT,
        phone TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        zip TEXT,
        is_default INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Products table
    db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        article TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        category TEXT,
        price REAL,
        blurb TEXT,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Product colors
    db.run(`
      CREATE TABLE IF NOT EXISTS product_colors (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        color_name TEXT,
        color_code TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    // Product photos
    db.run(`
      CREATE TABLE IF NOT EXISTS product_photos (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        color_id TEXT,
        photo_url TEXT,
        display_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (color_id) REFERENCES product_colors(id)
      )
    `);

    // Product sizes
    db.run(`
      CREATE TABLE IF NOT EXISTS product_sizes (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        size TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    // Orders table
    db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        customer_email TEXT,
        customer_name TEXT,
        customer_phone TEXT,
        shipping_address TEXT,
        shipping_city TEXT,
        shipping_state TEXT,
        shipping_zip TEXT,
        subtotal REAL,
        shipping REAL,
        tax REAL,
        total REAL,
        payment_method TEXT,
        payment_status TEXT DEFAULT 'pending',
        order_status TEXT DEFAULT 'pending',
        razorpay_order_id TEXT,
        razorpay_payment_id TEXT,
        razorpay_signature TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Order items
    db.run(`
      CREATE TABLE IF NOT EXISTS order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        product_name TEXT,
        color TEXT,
        size TEXT,
        quantity INTEGER,
        price REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    console.log('✅ Database tables created/verified');
  });
};

initDatabase();

// ========================================
// MULTER SETUP FOR FILE UPLOADS
// ========================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync('./uploads')) {
      fs.mkdirSync('./uploads');
    }
    cb(null, './uploads');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// ========================================
// MIDDLEWARE
// ========================================

app.use('/uploads', express.static('uploads'));

const generateId = () => Math.random().toString(36).substr(2, 9) + Date.now();

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const verifyAdmin = (req, res, next) => {
  const adminPassword = req.headers['x-admin-password'];
  if (adminPassword !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// ========================================
// AUTHENTICATION ENDPOINTS
// ========================================

// Register
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = generateId();

    db.run(
      `INSERT INTO users (id, email, password, name) VALUES (?, ?, ?, ?)`,
      [userId, email, hashedPassword, name || ''],
      function(err) {
        if (err) {
          return res.status(400).json({ error: 'Email already exists' });
        }

        const token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ token, user: { id: userId, email, name } });
      }
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    try {
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
      res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
});

// Get profile
app.get('/api/auth/profile', verifyToken, (req, res) => {
  db.get(`SELECT id, email, name, phone FROM users WHERE id = ?`, [req.userId], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  });
});

// Update profile
app.put('/api/auth/profile', verifyToken, (req, res) => {
  const { name, phone } = req.body;
  db.run(
    `UPDATE users SET name = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [name, phone, req.userId],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// ========================================
// PRODUCTS ENDPOINTS (ENHANCED)
// ========================================

// Get all products with filters
app.get('/api/products', (req, res) => {
  const { category, color, price_min, price_max, search } = req.query;

  let query = `SELECT DISTINCT p.* FROM products p`;
  let conditions = [];
  let params = [];

  if (category) {
    conditions.push(`p.category = ?`);
    params.push(category);
  }

  if (search) {
    conditions.push(`(p.name LIKE ? OR p.article LIKE ?)`);
    params.push(`%${search}%`, `%${search}%`);
  }

  if (color) {
    query += ` LEFT JOIN product_colors pc ON p.id = pc.product_id`;
    conditions.push(`pc.color_name = ?`);
    params.push(color);
  }

  if (price_min || price_max) {
    if (price_min) {
      conditions.push(`p.price >= ?`);
      params.push(price_min);
    }
    if (price_max) {
      conditions.push(`p.price <= ?`);
      params.push(price_max);
    }
  }

  if (conditions.length > 0) {
    query += ` WHERE ` + conditions.join(` AND `);
  }

  db.all(query, params, (err, products) => {
    if (err) return res.status(500).json({ error: err.message });

    // Fetch colors and photos for each product
    const productList = products.map(p => new Promise((resolve) => {
      db.all(`SELECT id, color_name, color_code FROM product_colors WHERE product_id = ?`, [p.id], (err, colors) => {
        db.all(`SELECT id, photo_url, color_id FROM product_photos WHERE product_id = ? ORDER BY display_order`, [p.id], (err, photos) => {
          resolve({
            ...p,
            colors: colors || [],
            photos: photos || []
          });
        });
      });
    }));

    Promise.all(productList).then(data => res.json(data));
  });
});

// Get single product with all details
app.get('/api/products/:id', (req, res) => {
  db.get(`SELECT * FROM products WHERE id = ?`, [req.params.id], (err, product) => {
    if (err || !product) return res.status(404).json({ error: 'Product not found' });

    // Get colors
    db.all(`SELECT id, color_name, color_code FROM product_colors WHERE product_id = ?`, [req.params.id], (err, colors) => {
      // Get photos
      db.all(`SELECT id, photo_url, color_id FROM product_photos WHERE product_id = ? ORDER BY display_order`, [req.params.id], (err, photos) => {
        // Get sizes
        db.all(`SELECT size FROM product_sizes WHERE product_id = ?`, [req.params.id], (err, sizes) => {
          res.json({
            ...product,
            colors: colors || [],
            photos: photos || [],
            sizes: sizes?.map(s => s.size) || []
          });
        });
      });
    });
  });
});

// Add new product (Admin only)
app.post('/api/products', verifyAdmin, (req, res) => {
  const { article, name, category, price, blurb, details } = req.body;
  const productId = generateId();

  db.run(
    `INSERT INTO products (id, article, name, category, price, blurb, details) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [productId, article, name, category, price, blurb, JSON.stringify(details || [])],
    function(err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ id: productId, ...req.body });
    }
  );
});

// Add color to product (Admin)
app.post('/api/products/:id/colors', verifyAdmin, (req, res) => {
  const { color_name, color_code } = req.body;
  const colorId = generateId();

  db.run(
    `INSERT INTO product_colors (id, product_id, color_name, color_code) VALUES (?, ?, ?, ?)`,
    [colorId, req.params.id, color_name, color_code],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: colorId, color_name, color_code });
    }
  );
});

// Add photo to product (Admin)
app.post('/api/products/:id/photos', verifyAdmin, upload.single('photo'), (req, res) => {
  const { color_id, display_order } = req.body;
  const photoId = generateId();
  const photoUrl = `/uploads/${req.file.filename}`;

  db.run(
    `INSERT INTO product_photos (id, product_id, color_id, photo_url, display_order) VALUES (?, ?, ?, ?, ?)`,
    [photoId, req.params.id, color_id || null, photoUrl, display_order || 0],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: photoId, photo_url: photoUrl });
    }
  );
});

// ========================================
// ORDERS ENDPOINTS (ENHANCED)
// ========================================

// Create order
app.post('/api/orders', (req, res) => {
  const {
    user_id,
    items,
    subtotal,
    shipping,
    tax,
    customer_email,
    customer_name,
    customer_phone,
    shipping_address,
    shipping_city,
    shipping_state,
    shipping_zip,
    payment_method
  } = req.body;

  const orderId = generateId();
  const total = subtotal + shipping + tax;

  db.run(
    `INSERT INTO orders (
      id, user_id, customer_email, customer_name, customer_phone,
      shipping_address, shipping_city, shipping_state, shipping_zip,
      subtotal, shipping, tax, total, payment_method
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      orderId, user_id || null, customer_email, customer_name, customer_phone,
      shipping_address, shipping_city, shipping_state, shipping_zip,
      subtotal, shipping, tax, total, payment_method
    ],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });

      // Add order items
      const itemInserts = items.map(item => {
        const itemId = generateId();
        return new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO order_items (id, order_id, product_id, product_name, color, size, quantity, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [itemId, orderId, item.id, item.name, item.color, item.size, item.qty, item.price],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      });

      Promise.all(itemInserts)
        .then(() => res.json({ orderId, total }))
        .catch(e => res.status(500).json({ error: e.message }));
    }
  );
});

// Get order details
app.get('/api/orders/:id', (req, res) => {
  db.get(`SELECT * FROM orders WHERE id = ?`, [req.params.id], (err, order) => {
    if (err || !order) return res.status(404).json({ error: 'Order not found' });

    db.all(`SELECT * FROM order_items WHERE order_id = ?`, [req.params.id], (err, items) => {
      res.json({
        ...order,
        items: items || []
      });
    });
  });
});

// Get user's orders
app.get('/api/user/orders', verifyToken, (req, res) => {
  db.all(`SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`, [req.userId], (err, orders) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(orders || []);
  });
});

// Update order status
app.patch('/api/orders/:id', verifyAdmin, (req, res) => {
  const { order_status, payment_status } = req.body;

  db.run(
    `UPDATE orders SET order_status = ?, payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [order_status || null, payment_status || null, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// Get all orders (Admin)
app.get('/api/admin/orders', verifyAdmin, (req, res) => {
  db.all(`SELECT * FROM orders ORDER BY created_at DESC`, (err, orders) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(orders || []);
  });
});

// ========================================
// USER ADDRESSES
// ========================================

app.get('/api/addresses', verifyToken, (req, res) => {
  db.all(`SELECT * FROM user_addresses WHERE user_id = ?`, [req.userId], (err, addresses) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(addresses || []);
  });
});

app.post('/api/addresses', verifyToken, (req, res) => {
  const { name, phone, address, city, state, zip } = req.body;
  const addressId = generateId();

  db.run(
    `INSERT INTO user_addresses (id, user_id, name, phone, address, city, state, zip) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [addressId, req.userId, name, phone, address, city, state, zip],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: addressId, ...req.body });
    }
  );
});

// ========================================
// STATIC FILES
// ========================================

app.use(express.static('frontend'));

app.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'frontend' });
});

// ========================================
// START SERVER
// ========================================

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📦 Admin password: ${ADMIN_PASSWORD}`);
});
