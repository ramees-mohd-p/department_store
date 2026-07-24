# 🎀 Maison Veil — Full-Stack Dress Shop

**Complete e-commerce platform with admin panel, product management, and order tracking.**

## What You Get

✅ **Customer Shop**
- Browse & filter dresses by category/size
- View product details with multiple colors
- Hover to see front/detail views
- Add to cart & checkout
- Real order confirmation with order IDs

✅ **Admin Panel** (Password-protected)
- Add new products (name, price, fabric, colors, sizes, details)
- Edit existing products
- Delete products
- View all customer orders
- Update order status (pending → shipped → delivered)

✅ **Backend** (Node.js + Express + SQLite)
- Persistent database with automatic backups
- JWT authentication for admin
- RESTful API for all operations
- All data stays on your server

## Setup (Takes 5 minutes)

### Step 1: Install Node.js
Download from [nodejs.org](https://nodejs.org) (version 16+)

### Step 2: Prepare the App

Extract the zip file to a folder. Open terminal/command prompt in that folder and run:

```bash
cd backend
npm install
```

This downloads all dependencies.

### Step 3: Set Admin Password

Copy `.env.example` to `.env`:

```bash
cp .env.example .env    # On Mac/Linux
copy .env.example .env  # On Windows
```

Open `.env` in a text editor and change:
```
ADMIN_PASSWORD=your-secure-password
```

### Step 4: Start the Server

```bash
npm start
```

You should see: `Server running on http://localhost:5000`

### Step 5: Open in Browser

Go to **http://localhost:5000**

Click the 👤 icon in the top right to access admin panel.

## Admin Guide

### Adding a Product

1. Click 👤 → Enter password → "Admin Panel" → "Products" tab
2. Click "+ Add Product"
3. Fill in details:
   - **Name**: "Adeline Slip"
   - **Category**: evening / day / linen
   - **Price**: 168
   - **Fabric**: "Washed silk-blend"
   - **Silhouette**: slip, wrap, shirt, fitted, maxi, etc.
   - **Blurb**: Short description (what makes it special)
   - **Details**: Care instructions (one per line)
   - **Sizes**: Check all available sizes
   - **Colors**: Format = `Name|#Swatch|#LineColor`
     ```
     Brick|#A8483D|#6E2F29
     Ink|#1C1410|#3D4A3E
     Taupe|#D9CFC4|#A8483D
     ```

4. Click "Create"

### Editing a Product

1. Admin Panel → "Products" → Find product → Click "Edit"
2. Change any fields
3. Click "Save"

### Managing Orders

1. Admin Panel → "Orders" tab
2. See all customer orders with details
3. Click status dropdown to change (pending → processing → shipped → delivered)

## How to Deploy (to the world)

### Option A: Render (Easiest)

1. Push code to GitHub
2. Go to [render.com](https://render.com) and sign up (free)
3. Click "New" → "Web Service"
4. Connect your GitHub repo
5. Fill in:
   - **Name**: maison-veil
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
6. Add environment variables:
   - `ADMIN_PASSWORD`: your-secure-password
   - `JWT_SECRET`: any random string (e.g., copy-paste from a random password generator)
7. Click "Deploy"

Done! Your shop will be at `https://maison-veil.onrender.com`

### Option B: Railway (Also easy)

1. Go to [railway.app](https://railway.app)
2. Create new project
3. Connect your GitHub repo
4. Go to Variables tab, add:
   - `ADMIN_PASSWORD`
   - `JWT_SECRET`
5. Railway auto-deploys on push

### Option C: Your Own Server (Advanced)

1. Rent a VPS from DigitalOcean, Linode, AWS, etc.
2. SSH in and install Node.js
3. Clone your repo
4. Run `cd backend && npm install && npm start`
5. Set up Nginx to reverse-proxy port 5000
6. Get SSL cert (Let's Encrypt)

## Using the Shop as Customer

1. **Browse**: Scroll through dresses, filter by size
2. **View Details**: Click any dress card → see all colors, sizes, details
3. **Pick Color**: Click colored swatch to swap photos on product page
4. **Pick Size**: Click size button
5. **Add to Bag**: "Add to bag" button
6. **Checkout**: Bag icon → "Checkout" → enter email, address → place order
7. **Confirmation**: Order ID displayed (e.g., MV-123456)

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "npm: command not found" | Install Node.js from nodejs.org |
| "Cannot connect to localhost:5000" | Make sure server is running (`npm start`) |
| "Admin password doesn't work" | Check `.env` file, make sure no extra spaces |
| "Products not showing" | Refresh browser, check backend console for errors |
| Database issues | Delete `backend/shop.db` and restart (recreates it) |

## File Structure

```
project/
├── backend/              # The server
│   ├── server.js         # Main app (don't edit if unsure)
│   ├── package.json      # Dependencies list
│   ├── .env.example      # Copy this to .env
│   └── shop.db           # Database (auto-created)
├── frontend/             # The website
│   ├── index.html        # Main page
│   ├── styles.css        # Design
│   └── app.js            # Logic
└── README.md             # Full documentation
```

## Key Features

🎨 **Beautiful Design**
- Intentional typography and color palette
- Smooth animations and transitions
- Mobile-responsive

💾 **Persistent Data**
- SQLite database keeps products & orders
- No data lost on restart

🔐 **Secure**
- Password-protected admin panel
- JWT authentication tokens
- Passwords hashed

📊 **Order Management**
- Track all orders in admin panel
- Update status in real-time
- See customer details

🌈 **Color Variants**
- Each product can have unlimited colors
- Color swatches on product cards
- Visual design system per product

## Common Tasks

### Change Admin Password

Edit `backend/.env`:
```
ADMIN_PASSWORD=newpassword
```

Restart server.

### Add Default Products

Run this in `backend/` directory after first setup:
```bash
npm start
# Then open admin panel and add products manually
```

Or edit `server.js` line ~35 to seed more default products.

### Back Up Your Data

Copy `backend/shop.db` somewhere safe. This file holds all products and orders.

### View Raw Data

SQLite database is just a file. You can open `shop.db` with any SQLite viewer:
- [SQLite Online](https://sqliteonline.com) - paste the file contents
- [DBeaver](https://dbeaver.io) - desktop app

## What's Next?

Ideas for expanding:

- **Photos**: Upload real dress photos instead of CSS drawings
- **Inventory**: Track stock levels, mark items as out-of-stock
- **Payments**: Add Stripe integration to charge actual payment
- **Customers**: Let shoppers create accounts, save order history
- **Wishlist**: Add heart button to save favorite dresses
- **Search**: Full-text search for dresses by name/fabric
- **Analytics**: See which products are most popular

## Support

If something breaks:

1. Check error in terminal (where you ran `npm start`)
2. Check browser console (F12 → Console tab)
3. Try clearing browser cache (Ctrl+Shift+Delete)
4. Restart backend (`Ctrl+C` then `npm start` again)
5. Delete `backend/shop.db` and restart (fresh database)

## License & Credits

Built with ❤️ using Node.js, Express, SQLite, and modern web tech.

Enjoy! 🎀
