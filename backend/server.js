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
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendPath = path.join(__dirname, '../frontend');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-this';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret'
});

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

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-password');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Content-Security-Policy', "default-src *; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline'");
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(frontendPath));

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

    // INVENTORY - Size & Quantity tracking
    db.run(`
      CREATE TABLE IF NOT EXISTS inventory (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        color_id TEXT,
        size_id TEXT,
        size_name TEXT,
        quantity INTEGER DEFAULT 0,
        sold INTEGER DEFAULT 0,
        available INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (color_id) REFERENCES product_colors(id),
        FOREIGN KEY (size_id) REFERENCES product_sizes(id)
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

    // Wishlist
    db.run(`
      CREATE TABLE IF NOT EXISTS wishlist (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    console.log('✅ Database tables created/verified');
  });
};

initDatabase();

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

// AUTHENTICATION
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

app.get('/api/auth/profile', verifyToken, (req, res) => {
  db.get(`SELECT id, email, name, phone FROM users WHERE id = ?`, [req.userId], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  });
});

// PRODUCTS - WITH INVENTORY
app.get('/api/products', (req, res) => {
  db.all(`SELECT * FROM products`, (err, products) => {
    if (err) return res.status(500).json({ error: err.message });

    const productList = (products || []).map(p => new Promise((resolve) => {
      db.all(`SELECT * FROM product_colors WHERE product_id = ?`, [p.id], (err, colors) => {
        db.all(`SELECT * FROM product_sizes WHERE product_id = ?`, [p.id], (err, sizes) => {
          db.all(`SELECT * FROM product_photos WHERE product_id = ? ORDER BY display_order`, [p.id], (err, photos) => {
            db.all(`SELECT * FROM inventory WHERE product_id = ?`, [p.id], (err, inventory) => {
              resolve({
                ...p,
                colors: colors || [],
                sizes: sizes || [],
                photos: photos || [],
                inventory: inventory || []
              });
            });
          });
        });
      });
    }));

    Promise.all(productList).then(data => res.json(data));
  });
});

app.get('/api/products/:id', (req, res) => {
  db.get(`SELECT * FROM products WHERE id = ?`, [req.params.id], (err, product) => {
    if (err || !product) return res.status(404).json({ error: 'Product not found' });

    db.all(`SELECT * FROM product_colors WHERE product_id = ?`, [req.params.id], (err, colors) => {
      db.all(`SELECT * FROM product_sizes WHERE product_id = ?`, [req.params.id], (err, sizes) => {
        db.all(`SELECT * FROM product_photos WHERE product_id = ? ORDER BY display_order`, [req.params.id], (err, photos) => {
          db.all(`SELECT * FROM inventory WHERE product_id = ?`, [req.params.id], (err, inventory) => {
            res.json({
              ...product,
              colors: colors || [],
              sizes: sizes || [],
              photos: photos || [],
              inventory: inventory || []
            });
          });
        });
      });
    });
  });
});

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

// ADD SIZES
app.post('/api/products/:id/sizes', verifyAdmin, (req, res) => {
  const { size } = req.body;
  const sizeId = generateId();

  db.run(
    `INSERT INTO product_sizes (id, product_id, size) VALUES (?, ?, ?)`,
    [sizeId, req.params.id, size],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: sizeId, size });
    }
  );
});

// INVENTORY MANAGEMENT
app.post('/api/inventory', verifyAdmin, (req, res) => {
  const { product_id, color_id, size_id, size_name, quantity } = req.body;
  const inventoryId = generateId();

  db.run(
    `INSERT INTO inventory (id, product_id, color_id, size_id, size_name, quantity, available) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [inventoryId, product_id, color_id || null, size_id, size_name, quantity, quantity],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: inventoryId, quantity, available: quantity });
    }
  );
});

app.get('/api/inventory/:product_id', (req, res) => {
  db.all(`SELECT * FROM inventory WHERE product_id = ?`, [req.params.product_id], (err, inventory) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(inventory || []);
  });
});

app.patch('/api/inventory/:id', verifyAdmin, (req, res) => {
  const { quantity } = req.body;

  db.run(
    `UPDATE inventory SET quantity = ?, available = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [quantity, quantity, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

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

// ORDERS - WITH INVENTORY DEDUCTION
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

      const itemInserts = items.map(item => {
        const itemId = generateId();
        return new Promise((resolve, reject) => {
          // Insert order item
          db.run(
            `INSERT INTO order_items (id, order_id, product_id, product_name, color, size, quantity, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [itemId, orderId, item.id, item.name, item.color, item.size, item.qty, item.price],
            (err) => {
              if (err) {
                reject(err);
              } else {
                // Deduct from inventory
                db.run(
                  `UPDATE inventory SET sold = sold + ?, available = quantity - (sold + ?) WHERE product_id = ? AND size_name = ?`,
                  [item.qty, item.qty, item.id, item.size],
                  (err) => {
                    if (err) reject(err);
                    else resolve();
                  }
                );
              }
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

app.get('/api/admin/orders', verifyAdmin, (req, res) => {
  db.all(`SELECT * FROM orders ORDER BY created_at DESC`, (err, orders) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(orders || []);
  });
});

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

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  
  if (password === ADMIN_PASSWORD) {
    const token = jwt.sign({ isAdmin: true }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

app.get('/', (req, res) => {
  res.sendFile('index.html', { root: frontendPath });
});

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
    res.sendFile('index.html', { root: frontendPath });
  } else {
    res.status(404).json({ error: 'Route not found' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`🔑 Admin password: ${ADMIN_PASSWORD}`);
  console.log(`📁 Frontend path: ${frontendPath}`);
});

export default app;