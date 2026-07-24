import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import axios from 'axios';
import crypto from 'crypto';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'your-razorpay-key-id';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'your-razorpay-key-secret';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(uploadsDir)); // Serve uploaded images

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF allowed.'));
    }
  }
});

// Database setup
const db = new sqlite3.Database(path.join(__dirname, 'shop.db'), (err) => {
  if (err) console.error('DB error:', err);
  else console.log('SQLite connected');
});

db.serialize(() => {
  // Products table with photo field
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      fabric TEXT NOT NULL,
      silhouette TEXT NOT NULL,
      blurb TEXT NOT NULL,
      details TEXT NOT NULL,
      colors TEXT NOT NULL,
      sizes TEXT NOT NULL,
      photo_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Orders table
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      items TEXT NOT NULL,
      subtotal REAL NOT NULL,
      shipping REAL NOT NULL,
      tax REAL NOT NULL,
      total REAL NOT NULL,
      customer_email TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      shipping_address TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      payment_status TEXT DEFAULT 'pending',
      order_status TEXT DEFAULT 'pending',
      razorpay_order_id TEXT,
      razorpay_payment_id TEXT,
      razorpay_signature TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed default product on first run
  db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
    if (row && row.count === 0) {
      seedDefaultProducts();
    }
  });
});

function seedDefaultProducts() {
  const defaultProducts = [
    {
      id: "p01",
      name: "Adeline Slip",
      category: "evening",
      price: 168,
      fabric: "Washed silk-blend",
      silhouette: "slip",
      blurb: "A bias-cut slip that falls straight from the hip — wear it with the matching cardigan when the room cools down.",
      details: ["Bias-cut, mid-calf length", "Adjustable straps", "Fully lined", "Dry clean only"],
      colors: [
        { name: "Brick", swatch: "#A8483D", line: "#6E2F29" },
        { name: "Ink", swatch: "#1C1410", line: "#3D4A3E" },
        { name: "Taupe", swatch: "#D9CFC4", line: "#A8483D" }
      ],
      sizes: ["XS", "S", "M", "L"],
      photo_url: null
    }
  ];
  defaultProducts.forEach(p => {
    db.run(
      `INSERT INTO products (id, name, category, price, fabric, silhouette, blurb, details, colors, sizes, photo_url) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.name, p.category, p.price, p.fabric, p.silhouette, p.blurb, 
       JSON.stringify(p.details), JSON.stringify(p.colors), JSON.stringify(p.sizes), p.photo_url]
    );
  });
  console.log('Default products seeded');
}

// Auth middleware
function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

// ============================================================
// SHOP API (public)
// ============================================================

// Get all products
app.get('/api/products', (req, res) => {
  db.all(`SELECT * FROM products ORDER BY created_at DESC`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const products = rows.map(p => ({
      ...p,
      details: JSON.parse(p.details),
      colors: JSON.parse(p.colors),
      sizes: JSON.parse(p.sizes)
    }));
    res.json(products);
  });
});

// Get single product
app.get('/api/products/:id', (req, res) => {
  db.get(`SELECT * FROM products WHERE id = ?`, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Product not found' });
    res.json({
      ...row,
      details: JSON.parse(row.details),
      colors: JSON.parse(row.colors),
      sizes: JSON.parse(row.sizes)
    });
  });
});

// ============================================================
// PAYMENT GATEWAY (Razorpay)
// ============================================================

// Create Razorpay order
app.post('/api/payments/razorpay/create-order', (req, res) => {
  const { amount, orderId, customerEmail, customerName } = req.body;

  const options = {
    amount: Math.round(amount * 100), // Razorpay expects amount in paise
    currency: 'INR',
    receipt: orderId,
    payment_capture: 1
  };

  const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');

  axios.post('https://api.razorpay.com/v1/orders', options, {
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json'
    }
  })
    .then(response => {
      res.json({
        razorpayOrderId: response.data.id,
        amount: response.data.amount,
        currency: response.data.currency,
        keyId: RAZORPAY_KEY_ID
      });
    })
    .catch(error => {
      console.error('Razorpay error:', error.response?.data || error.message);
      res.status(500).json({ error: 'Failed to create payment order' });
    });
});

// Verify Razorpay payment
app.post('/api/payments/razorpay/verify', (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = req.body;

  const hmac = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET);
  hmac.update(razorpayOrderId + '|' + razorpayPaymentId);
  const computedSignature = hmac.digest('hex');

  if (computedSignature === razorpaySignature) {
    // Payment verified, update order
    db.run(
      `UPDATE orders SET payment_status = 'completed', order_status = 'confirmed',
       razorpay_order_id = ?, razorpay_payment_id = ?, razorpay_signature = ? WHERE id = ?`,
      [razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'Payment verified and order confirmed' });
      }
    );
  } else {
    res.status(400).json({ error: 'Invalid signature' });
  }
});

// ============================================================
// ORDERS API
// ============================================================

// Create order
app.post('/api/orders', (req, res) => {
  const { items, subtotal, shipping, tax, total, customer_email, customer_name, shipping_address, payment_method } = req.body;
  const orderId = 'MV-' + Math.floor(100000 + Math.random() * 900000);

  db.run(
    `INSERT INTO orders (id, items, subtotal, shipping, tax, total, customer_email, customer_name, shipping_address, payment_method, payment_status, order_status) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [orderId, JSON.stringify(items), subtotal, shipping, tax, total, customer_email, customer_name, JSON.stringify(shipping_address), payment_method, 'pending', 'pending'],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ orderId });
    }
  );
});

// Get all orders (for admin)
app.get('/api/orders', authenticateToken, (req, res) => {
  db.all(`SELECT * FROM orders ORDER BY created_at DESC`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const orders = rows.map(o => ({
      ...o,
      items: JSON.parse(o.items),
      shipping_address: JSON.parse(o.shipping_address)
    }));
    res.json(orders);
  });
});

// Get single order
app.get('/api/orders/:id', (req, res) => {
  db.get(`SELECT * FROM orders WHERE id = ?`, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Order not found' });
    res.json({
      ...row,
      items: JSON.parse(row.items),
      shipping_address: JSON.parse(row.shipping_address)
    });
  });
});

// Update order status (admin)
app.patch('/api/orders/:id', authenticateToken, (req, res) => {
  const { order_status, payment_status } = req.body;
  
  let query = 'UPDATE orders SET ';
  let params = [];
  
  if (order_status) {
    query += 'order_status = ?';
    params.push(order_status);
  }
  if (payment_status) {
    if (params.length > 0) query += ', ';
    query += 'payment_status = ?';
    params.push(payment_status);
  }
  
  query += ' WHERE id = ?';
  params.push(req.params.id);

  db.run(query, params, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ============================================================
// ADMIN API (protected)
// ============================================================

// Admin login
app.post('/api/admin/login', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });

  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Invalid password' });

  const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token });
});

// Create product with photo upload
app.post('/api/admin/products', authenticateToken, upload.single('photo'), (req, res) => {
  const { name, category, price, fabric, silhouette, blurb, details, colors, sizes } = req.body;
  const id = 'p' + Math.random().toString(36).substr(2, 9);
  
  let photoUrl = null;
  if (req.file) {
    photoUrl = `/uploads/${req.file.filename}`;
  }

  db.run(
    `INSERT INTO products (id, name, category, price, fabric, silhouette, blurb, details, colors, sizes, photo_url) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name, category, price, fabric, silhouette, blurb, 
     JSON.stringify(JSON.parse(details)), JSON.stringify(JSON.parse(colors)), JSON.stringify(JSON.parse(sizes)), photoUrl],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id, photoUrl, success: true });
    }
  );
});

// Update product with photo
app.put('/api/admin/products/:id', authenticateToken, upload.single('photo'), (req, res) => {
  const { name, category, price, fabric, silhouette, blurb, details, colors, sizes } = req.body;
  
  let photoUrl = req.body.photoUrl;
  if (req.file) {
    photoUrl = `/uploads/${req.file.filename}`;
  }

  db.run(
    `UPDATE products SET name=?, category=?, price=?, fabric=?, silhouette=?, blurb=?, details=?, colors=?, sizes=?, photo_url=? WHERE id=?`,
    [name, category, price, fabric, silhouette, blurb, 
     JSON.stringify(JSON.parse(details)), JSON.stringify(JSON.parse(colors)), JSON.stringify(JSON.parse(sizes)), photoUrl, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, photoUrl });
    }
  );
});

// Delete product
app.delete('/api/admin/products/:id', authenticateToken, (req, res) => {
  db.run(`DELETE FROM products WHERE id = ?`, [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ============================================================
// SERVE FRONTEND
// ============================================================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
