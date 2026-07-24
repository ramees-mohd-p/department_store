// ============================================================
// MAISON VEIL - COMPLETE APP.JS
// Full Frontend with Photo Upload + Payments + Orders
// ============================================================

const API_BASE = window.location.origin;

let state = {
  products: [],
  cart: [],
  authToken: localStorage.getItem('authToken') || null,
  shipping: 'standard',
  selectedSize: null
};

// ============================================================
// LOAD PRODUCTS
// ============================================================
async function loadProducts() {
  try {
    const res = await fetch(`${API_BASE}/api/products`);
    const products = await res.json();
    state.products = products;
    renderShop();
  } catch (e) {
    showToast('Failed to load products: ' + e.message);
    console.error('Load products error:', e);
  }
}

// ============================================================
// RENDER SHOP
// ============================================================
function renderShop() {
  const catalogCount = document.getElementById('catalog-count');
  if (state.products.length === 0) {
    catalogCount.innerHTML = '<p style="color:#999;">No products available</p>';
    document.getElementById('product-grid').innerHTML = '<p style="padding:40px;text-align:center;color:#999;">No products yet. Admin can add them!</p>';
    return;
  }

  catalogCount.textContent = `${state.products.length} pieces`;

  let html = '';
  state.products.forEach(p => {
    const photoHtml = p.photo_url 
      ? `<img src="${p.photo_url}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;" />`
      : `<div style="width:100%;height:100%;background:#F5F5F5;display:flex;align-items:center;justify-content:center;"><span style="color:#A8483D;font-size:48px;">${p.name.charAt(0)}</span></div>`;
    
    html += `
      <div class="product-card" data-product-id="${p.id}">
        <div class="product-photo">${photoHtml}</div>
        <h3 class="product-name">${p.name}</h3>
        <p class="product-category">${p.category}</p>
        <p class="product-price">$${p.price}</p>
        <button class="btn-primary product-btn" data-product-id="${p.id}">View</button>
      </div>
    `;
  });

  document.getElementById('product-grid').innerHTML = html;

  // Add event listeners
  document.querySelectorAll('.product-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const productId = btn.getAttribute('data-product-id');
      openPDP(productId);
    });
  });
}

// ============================================================
// PRODUCT DETAIL PAGE
// ============================================================
function openPDP(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  const photoHtml = product.photo_url
    ? `<img src="${product.photo_url}" alt="${product.name}" style="width:100%;height:100%;object-fit:cover;" />`
    : `<div style="width:100%;height:100%;background:#F5F5F5;display:flex;align-items:center;justify-content:center;"><span style="color:#A8483D;font-size:100px;">${product.name.charAt(0)}</span></div>`;

  document.getElementById('pdp-content').innerHTML = `
    <div class="pdp-grid">
      <div class="pdp-art">${photoHtml}</div>
      <div class="pdp-copy">
        <h2>${product.name}</h2>
        <p class="pdp-price">$${product.price}</p>
        <p class="pdp-blurb">${product.blurb}</p>
        
        <div class="pdp-section">
          <h4>Fabric</h4>
          <p>${product.fabric}</p>
        </div>

        <div class="pdp-section">
          <h4>Details</h4>
          <ul style="margin:0;padding-left:20px;color:#666;">
            ${product.details.map(d => `<li>${d}</li>`).join('')}
          </ul>
        </div>

        <div class="pdp-section">
          <h4>Colors</h4>
          <div class="colors-row">
            ${product.colors.map((c, i) => `
              <div class="color-swatch">
                <div style="width:40px;height:40px;background:${c.swatch};border:2px solid ${c.line};border-radius:4px;cursor:pointer;" data-color-index="${i}" title="${c.name}"></div>
                <span>${c.name}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="pdp-section">
          <h4>Size</h4>
          <div class="sizes-row">
            ${product.sizes.map(s => `
              <button class="size-btn" data-size="${s}">${s}</button>
            `).join('')}
          </div>
        </div>

        <button class="btn-primary full-width" id="add-to-cart-btn" data-product-id="${product.id}">Add to Bag</button>
      </div>
    </div>
  `;

  document.getElementById('pdp-panel').classList.add('open');
  document.getElementById('pdp-scrim').classList.add('visible');

  // Event listeners
  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedSize = btn.getAttribute('data-size');
    });
  });

  document.getElementById('add-to-cart-btn').addEventListener('click', () => {
    if (!state.selectedSize) {
      showToast('Please select a size');
      return;
    }
    const selectedColor = document.querySelector('.color-swatch .color-swatch')?.getAttribute('data-color-index') || 0;
    addToCart(product.id, state.selectedSize, product.colors[selectedColor].name);
  });

  document.getElementById('pdp-close').addEventListener('click', closePDP);
  document.getElementById('pdp-scrim').addEventListener('click', closePDP);
}

function closePDP() {
  document.getElementById('pdp-panel').classList.remove('open');
  document.getElementById('pdp-scrim').classList.remove('visible');
  state.selectedSize = null;
}

// ============================================================
// CART FUNCTIONS
// ============================================================
function addToCart(productId, size, color) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  const cartItem = {
    id: productId,
    size: size,
    color: color,
    qty: 1
  };

  state.cart.push(cartItem);
  showToast(`${product.name} added to bag`);
  renderCart();
  closePDP();
}

function removeFromCart(index) {
  state.cart.splice(index, 1);
  renderCart();
}

function updateCartQty(index, qty) {
  if (qty <= 0) {
    removeFromCart(index);
  } else {
    state.cart[index].qty = parseInt(qty);
    renderCart();
  }
}

function cartSubtotal() {
  return state.cart.reduce((sum, line) => {
    const product = state.products.find(p => p.id === line.id);
    return sum + (product ? product.price * line.qty : 0);
  }, 0);
}

function renderCart() {
  const cartCount = document.getElementById('cart-count');
  const count = state.cart.reduce((sum, line) => sum + line.qty, 0);
  cartCount.textContent = count;
  cartCount.style.display = count > 0 ? 'flex' : 'none';

  const cartItemsDiv = document.getElementById('cart-items');
  const subtotal = cartSubtotal();

  if (state.cart.length === 0) {
    cartItemsDiv.innerHTML = '<p style="padding:40px;text-align:center;color:#999;">Your bag is empty</p>';
    return;
  }

  let html = '';
  state.cart.forEach((line, idx) => {
    const product = state.products.find(p => p.id === line.id);
    if (!product) return;

    const photoHtml = product.photo_url
      ? `<img src="${product.photo_url}" alt="${product.name}" style="width:100%;height:100%;object-fit:cover;" />`
      : `<div style="background:#F5F5F5;width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><span style="color:#A8483D;">${product.name.charAt(0)}</span></div>`;

    html += `
      <div class="cart-item">
        <div class="cart-item-photo">${photoHtml}</div>
        <div class="cart-item-info">
          <p class="cart-item-name">${product.name}</p>
          <p class="cart-item-meta">${line.color} · Size ${line.size}</p>
          <p class="cart-item-price">$${product.price}</p>
        </div>
        <div class="cart-item-qty">
          <button onclick="updateCartQty(${idx}, ${line.qty - 1})">−</button>
          <input type="number" value="${line.qty}" onchange="updateCartQty(${idx}, this.value)" min="1" />
          <button onclick="updateCartQty(${idx}, ${line.qty + 1})">+</button>
        </div>
        <button class="icon-btn" onclick="removeFromCart(${idx})">✕</button>
      </div>
    `;
  });

  cartItemsDiv.innerHTML = html;

  document.getElementById('cart-drawer-count').textContent = `(${count})`;
  document.getElementById('cart-subtotal').textContent = `$${subtotal.toFixed(2)}`;
}

// ============================================================
// CHECKOUT
// ============================================================
function openCheckout() {
  if (state.cart.length === 0) {
    showToast('Your bag is empty');
    return;
  }
  renderCheckout();
  document.getElementById('checkout-panel').classList.add('open');
  document.getElementById('checkout-scrim').classList.add('visible');
}

function closeCheckout() {
  document.getElementById('checkout-panel').classList.remove('open');
  document.getElementById('checkout-scrim').classList.remove('visible');
}

function renderCheckout() {
  const subtotal = cartSubtotal();
  const shippingCost = subtotal === 0 ? 0 : (state.shipping === 'express' ? 18 : 0);
  const tax = subtotal * 0.0825;
  const total = subtotal + shippingCost + tax;

  const orderSummaryHtml = state.cart.map(line => {
    const p = state.products.find(x => x.id === line.id);
    if (!p) return '';
    
    const photoHtml = p.photo_url
      ? `<img src="${p.photo_url}" style="width:100%;height:100%;object-fit:cover;" />`
      : `<div style="background:#F5F5F5;width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><span style="color:#A8483D;">${p.name.charAt(0)}</span></div>`;
    
    return `
      <div class="order-line">
        <div class="order-line-art">${photoHtml}</div>
        <div>
          <div style="font-weight:600;">${p.name}</div>
          <div style="color:rgba(28,20,16,0.55);font-size:12px;">${line.color} · Size ${line.size} · Qty ${line.qty}</div>
        </div>
        <div class="price">$${(p.price * line.qty).toFixed(2)}</div>
      </div>
    `;
  }).join('');

  document.getElementById('checkout-content').innerHTML = `
    <form id="checkout-form" novalidate>
      <div class="form-section">
        <h3>Contact</h3>
        <div class="form-row single">
          <div class="field">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required />
          </div>
        </div>
      </div>

      <div class="form-section">
        <h3>Shipping Address</h3>
        <div class="form-row">
          <div class="field">
            <label for="firstName">First name</label>
            <input type="text" id="firstName" name="firstName" required />
          </div>
          <div class="field">
            <label for="lastName">Last name</label>
            <input type="text" id="lastName" name="lastName" required />
          </div>
        </div>
        <div class="form-row single">
          <div class="field">
            <label for="address">Address</label>
            <input type="text" id="address" name="address" required />
          </div>
        </div>
        <div class="form-row triple">
          <div class="field">
            <label for="city">City</label>
            <input type="text" id="city" name="city" required />
          </div>
          <div class="field">
            <label for="state">State</label>
            <input type="text" id="state" name="state" required />
          </div>
          <div class="field">
            <label for="zip">ZIP</label>
            <input type="text" id="zip" name="zip" required />
          </div>
        </div>
      </div>

      <div class="form-section">
        <h3>Shipping Method</h3>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <label style="display:flex;align-items:center;gap:10px;font-weight:400;text-transform:none;">
            <input type="radio" name="shipping" value="standard" checked />
            Standard (5-7 days) — Free
          </label>
          <label style="display:flex;align-items:center;gap:10px;font-weight:400;text-transform:none;">
            <input type="radio" name="shipping" value="express" />
            Express (2 days) — $18
          </label>
        </div>
      </div>

      <div class="form-section">
        <h3>Payment Method</h3>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <label style="display:flex;align-items:center;gap:10px;font-weight:400;text-transform:none;padding:12px;border:1px solid #D9CFC4;border-radius:4px;cursor:pointer;">
            <input type="radio" name="payment-method" value="cod" checked />
            <span>💵 Cash on Delivery</span>
          </label>
          <label style="display:flex;align-items:center;gap:10px;font-weight:400;text-transform:none;padding:12px;border:1px solid #D9CFC4;border-radius:4px;cursor:pointer;">
            <input type="radio" name="payment-method" value="razorpay" />
            <span>💳 Razorpay (Card / UPI)</span>
          </label>
          <label style="display:flex;align-items:center;gap:10px;font-weight:400;text-transform:none;padding:12px;border:1px solid #D9CFC4;border-radius:4px;cursor:pointer;">
            <input type="radio" name="payment-method" value="gpay" />
            <span>📱 Google Pay</span>
          </label>
        </div>
        <p style="font-size:12px;color:#999;margin-top:10px;">All payments are secure and encrypted with HTTPS</p>
      </div>

      <button type="submit" class="btn-primary full-width">Place order — $${total.toFixed(2)}</button>
      <p style="font-size:11.5px; color:rgba(28,20,16,0.5); text-align:center; margin-top:12px;">Secure payment powered by Razorpay</p>
    </form>

    <div class="order-summary">
      <h3>Order summary</h3>
      ${orderSummaryHtml}
      <div class="order-totals">
        <div class="order-total-row"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
        <div class="order-total-row"><span>Shipping</span><span>${shippingCost === 0 ? 'Free' : '$' + shippingCost.toFixed(2)}</span></div>
        <div class="order-total-row"><span>Tax</span><span>$${tax.toFixed(2)}</span></div>
        <div class="order-total-row grand"><span>Total</span><span class="price">$${total.toFixed(2)}</span></div>
      </div>
    </div>
  `;

  // Event listeners
  document.querySelectorAll('input[name="shipping"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.shipping = e.target.value;
      renderCheckout();
    });
  });

  document.getElementById('checkout-form').addEventListener('submit', handleCheckoutSubmit);
  document.getElementById('checkout-close').addEventListener('click', closeCheckout);
  document.getElementById('checkout-scrim').addEventListener('click', closeCheckout);
}

async function handleCheckoutSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const v = (name) => form.elements[name].value;

  const email = v('email');
  const firstName = v('firstName');
  const lastName = v('lastName');
  const address = v('address');
  const city = v('city');
  const stateVal = v('state');
  const zip = v('zip');
  const paymentMethod = document.querySelector('input[name="payment-method"]:checked')?.value || 'cod';

  if (!email || !firstName || !lastName || !address || !city || !stateVal || !zip) {
    showToast('Please fill all fields');
    return;
  }

  const order = {
    items: state.cart,
    subtotal: cartSubtotal(),
    shipping: state.shipping === 'express' ? 18 : 0,
    tax: cartSubtotal() * 0.0825,
    customer_email: email,
    customer_name: firstName + ' ' + lastName,
    shipping_address: { address, city, state: stateVal, zip },
    payment_method: paymentMethod
  };

  order.total = order.subtotal + order.shipping + order.tax;

  try {
    const res = await fetch(`${API_BASE}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    });

    const data = await res.json();
    if (!data.orderId) throw new Error('Failed to create order');

    if (paymentMethod === 'cod') {
      showOrderConfirmation(data.orderId, order, 'cod');
    } else if (paymentMethod === 'razorpay' || paymentMethod === 'gpay') {
      await processRazorpayPayment(data.orderId, order);
    }
  } catch (e) {
    showToast('Order failed: ' + e.message);
  }
}

async function processRazorpayPayment(orderId, order) {
  try {
    const razorpayRes = await fetch(`${API_BASE}/api/payments/razorpay/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: order.total,
        orderId: orderId,
        customerEmail: order.customer_email,
        customerName: order.customer_name
      })
    });

    const razorpayData = await razorpayRes.json();

    if (!window.Razorpay) {
      showToast('Razorpay library not loaded');
      return;
    }

    const options = {
      key: 'rzp_test_1234567890123456',
      amount: razorpayData.amount,
      currency: razorpayData.currency,
      order_id: razorpayData.razorpayOrderId,
      name: 'Maison Veil',
      description: 'Dress Purchase',
      customer_email: order.customer_email,
      customer_name: order.customer_name,
      handler: async function(response) {
        await verifyRazorpayPayment(
          orderId,
          razorpayData.razorpayOrderId,
          response.razorpay_payment_id,
          response.razorpay_signature,
          order
        );
      },
      prefill: {
        name: order.customer_name,
        email: order.customer_email
      },
      theme: { color: '#A8483D' },
      modal: {
        ondismiss: function() {
          showToast('Payment cancelled');
        }
      }
    };

    const rzp = new Razorpay(options);
    rzp.open();
  } catch (e) {
    showToast('Payment setup failed: ' + e.message);
  }
}

async function verifyRazorpayPayment(orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature, order) {
  try {
    const verifyRes = await fetch(`${API_BASE}/api/payments/razorpay/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: orderId,
        razorpayOrderId: razorpayOrderId,
        razorpayPaymentId: razorpayPaymentId,
        razorpaySignature: razorpaySignature
      })
    });

    const verifyData = await verifyRes.json();
    if (verifyData.success) {
      showOrderConfirmation(orderId, order, 'razorpay');
    } else {
      showToast('Payment verification failed');
    }
  } catch (e) {
    showToast('Verification error: ' + e.message);
  }
}

function showOrderConfirmation(orderId, order, paymentMethod) {
  document.getElementById('checkout-content').innerHTML = `
    <div class="confirm-screen" style="grid-column:1/-1;">
      <div class="confirm-mark"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FAF6F2" stroke-width="2.2"><polyline points="4 13 9 18 20 6"/></svg></div>
      <h2>Order Placed Successfully! 🎉</h2>
      <p style="color:rgba(28,20,16,0.7); margin-bottom:18px;">Thank you for your order!</p>

      <div style="background: #FAF6F2; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: left;">
        <p style="margin: 0 0 10px;"><strong>Order ID:</strong> ${orderId}</p>
        <p style="margin: 0 0 10px;"><strong>Amount:</strong> $${order.total.toFixed(2)}</p>
        <p style="margin: 0 0 10px;"><strong>Payment Method:</strong> ${paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</p>
        <p style="margin: 0;"><strong>Status:</strong> <span style="color: #6E2F29; font-weight: bold;">Confirmed</span></p>
      </div>

      <p style="font-size: 14px; color: #666; margin-bottom: 20px;">
        A confirmation email has been sent to <strong>${order.customer_email}</strong>
      </p>

      <div style="background: #E8F5E9; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #4CAF50;">
        <p style="margin: 0; color: #2E7D32; font-weight: 500;">✓ Order Confirmed</p>
        <p style="margin: 5px 0 0; font-size: 13px; color: #558B2F;">We will start processing your order and send you tracking updates via email.</p>
      </div>

      <button class="btn-secondary" style="margin-top:20px; padding: 12px 30px;" id="continue-shopping-btn">Continue Shopping</button>
    </div>
  `;

  state.cart = [];
  renderCart();
  document.getElementById('continue-shopping-btn').addEventListener('click', closeCheckout);
}

// ============================================================
// ADMIN PANEL
// ============================================================
async function handleAdminLogin(e) {
  e.preventDefault();
  const password = document.getElementById('admin-password').value;

  try {
    const res = await fetch(`${API_BASE}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    const data = await res.json();
    if (!data.token) throw new Error(data.error || 'Login failed');

    state.authToken = data.token;
    localStorage.setItem('authToken', data.token);
    document.getElementById('admin-login-form').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';
    loadAdminProducts();
    loadAdminOrders();
  } catch (e) {
    document.getElementById('admin-error').textContent = e.message;
  }
}

function handleAdminLogout() {
  state.authToken = null;
  localStorage.removeItem('authToken');
  document.getElementById('admin-login-form').style.display = 'block';
  document.getElementById('admin-panel').style.display = 'none';
  document.getElementById('admin-password').value = '';
  document.getElementById('admin-error').textContent = '';
}

async function loadAdminProducts() {
  try {
    const res = await fetch(`${API_BASE}/api/products`);
    const products = await res.json();
    renderAdminProducts(products);
  } catch (e) {
    showToast('Failed to load products: ' + e.message);
  }
}

function renderAdminProducts(products) {
  let html = '';
  products.forEach(p => {
    html += `
      <div style="padding:12px;border:1px solid #D9CFC4;border-radius:4px;margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:start;">
          <div style="flex:1;">
            <p style="margin:0;font-weight:600;">${p.name}</p>
            <p style="margin:4px 0 0;color:#999;font-size:12px;">$${p.price} · ${p.category}</p>
            ${p.photo_url ? `<p style="margin:4px 0 0;color:#999;font-size:12px;">📷 Photo uploaded</p>` : ''}
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn-secondary" onclick="openProductForm('${p.id}')">Edit</button>
            <button class="btn-secondary" onclick="deleteProduct('${p.id}')" style="color:#A8483D;">Delete</button>
          </div>
        </div>
      </div>
    `;
  });

  document.getElementById('admin-products-list').innerHTML = `
    <button class="btn-primary" onclick="openProductForm(null)">+ Add Product</button>
    <div style="margin-top:20px;">${html}</div>
  `;
}

async function loadAdminOrders() {
  try {
    const res = await fetch(`${API_BASE}/api/orders`, {
      headers: { 'Authorization': `Bearer ${state.authToken}` }
    });

    if (!res.ok) throw new Error('Failed to load orders');
    const orders = await res.json();
    renderAdminOrders(orders);
  } catch (e) {
    document.getElementById('admin-orders-list').innerHTML = '<p style="color:#999;">Failed to load orders</p>';
  }
}

function renderAdminOrders(orders) {
  if (orders.length === 0) {
    document.getElementById('admin-orders-list').innerHTML = '<p style="color:#999;">No orders yet</p>';
    return;
  }

  let html = '<table style="width:100%;border-collapse:collapse;">';
  html += '<tr style="background:#F5F5F5;"><th style="padding:10px;text-align:left;">Order ID</th><th style="padding:10px;text-align:left;">Customer</th><th style="padding:10px;text-align:left;">Total</th><th style="padding:10px;text-align:left;">Payment</th><th style="padding:10px;text-align:left;">Status</th></tr>';

  orders.forEach(o => {
    const paymentStatus = o.payment_status || 'pending';
    const orderStatus = o.order_status || 'pending';
    
    html += `
      <tr style="border-bottom:1px solid #E0E0E0;">
        <td style="padding:10px;">${o.id}</td>
        <td style="padding:10px;">${o.customer_name}</td>
        <td style="padding:10px;">$${parseFloat(o.total || 0).toFixed(2)}</td>
        <td style="padding:10px;font-size:12px;"><span style="background:${paymentStatus === 'completed' ? '#E8F5E9' : '#FFF3E0'};padding:4px 8px;border-radius:3px;">${paymentStatus}</span></td>
        <td style="padding:10px;font-size:12px;">
          <select onchange="updateOrderStatus('${o.id}', this.value)" style="padding:4px;border:1px solid #D9CFC4;">
            <option value="pending" ${orderStatus === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="confirmed" ${orderStatus === 'confirmed' ? 'selected' : ''}>Confirmed</option>
            <option value="processing" ${orderStatus === 'processing' ? 'selected' : ''}>Processing</option>
            <option value="shipped" ${orderStatus === 'shipped' ? 'selected' : ''}>Shipped</option>
            <option value="delivered" ${orderStatus === 'delivered' ? 'selected' : ''}>Delivered</option>
          </select>
        </td>
      </tr>
    `;
  });

  html += '</table>';
  document.getElementById('admin-orders-list').innerHTML = html;
}

async function updateOrderStatus(orderId, status) {
  try {
    const res = await fetch(`${API_BASE}/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.authToken}`
      },
      body: JSON.stringify({ order_status: status })
    });

    if (res.ok) {
      showToast(`Order status updated to ${status}`);
      loadAdminOrders();
    }
  } catch (e) {
    showToast('Failed to update status');
  }
}

// ============================================================
// PRODUCT FORM WITH PHOTO UPLOAD
// ============================================================
function openProductForm(productId) {
  const product = state.products.find(p => p.id === productId);
  const isNew = !product;
  const p = product || {
    name: '', category: 'evening', price: 0, fabric: '', silhouette: 'slip',
    blurb: '', details: [], colors: [], sizes: [], photo_url: null
  };

  document.getElementById('product-form-content').innerHTML = `
    <h2>${isNew ? 'Add Product' : 'Edit Product'}</h2>
    <form id="product-form">
      <div class="product-form-group">
        <label>Product Photo</label>
        <input type="file" id="photo-input" name="photo" accept="image/*" />
        <p style="font-size: 12px; color: #999; margin-top: 8px;">Max 5MB. Formats: JPEG, PNG, WebP, GIF</p>
      </div>

      <div class="product-form-group">
        <label>Name</label>
        <input type="text" name="name" value="${p.name}" required />
      </div>

      <div class="product-form-group">
        <label>Category</label>
        <select name="category" required>
          <option value="evening" ${p.category === 'evening' ? 'selected' : ''}>Evening</option>
          <option value="day" ${p.category === 'day' ? 'selected' : ''}>Day</option>
          <option value="linen" ${p.category === 'linen' ? 'selected' : ''}>Linen</option>
        </select>
      </div>

      <div class="product-form-group">
        <label>Price ($)</label>
        <input type="number" name="price" value="${p.price}" step="0.01" required />
      </div>

      <div class="product-form-group">
        <label>Fabric</label>
        <input type="text" name="fabric" value="${p.fabric}" required />
      </div>

      <div class="product-form-group">
        <label>Silhouette</label>
        <select name="silhouette" required>
          <option value="slip" ${p.silhouette === 'slip' ? 'selected' : ''}>Slip</option>
          <option value="wrap" ${p.silhouette === 'wrap' ? 'selected' : ''}>Wrap</option>
          <option value="shirt" ${p.silhouette === 'shirt' ? 'selected' : ''}>Shirt</option>
          <option value="fitted" ${p.silhouette === 'fitted' ? 'selected' : ''}>Fitted</option>
          <option value="maxi" ${p.silhouette === 'maxi' ? 'selected' : ''}>Maxi</option>
        </select>
      </div>

      <div class="product-form-group">
        <label>Blurb</label>
        <textarea name="blurb" required>${p.blurb}</textarea>
      </div>

      <div class="product-form-group">
        <label>Details (one per line)</label>
        <textarea name="details" required>${p.details.join('\n')}</textarea>
      </div>

      <div class="product-form-group">
        <label>Sizes</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${['XS', 'S', 'M', 'L', 'XL'].map(s => `
            <label style="display:flex;align-items:center;gap:4px;">
              <input type="checkbox" name="sizes" value="${s}" ${p.sizes && p.sizes.includes(s) ? 'checked' : ''} />
              ${s}
            </label>
          `).join('')}
        </div>
      </div>

      <div class="product-form-group">
        <label>Colors (name|swatch|line, one per line)</label>
        <textarea name="colors" placeholder="Brick|#A8483D|#6E2F29" required>${p.colors.map(c => `${c.name}|${c.swatch}|${c.line}`).join('\n')}</textarea>
      </div>

      <div style="display:flex;gap:12px;margin-top:20px;">
        <button type="submit" class="btn-primary">${isNew ? 'Create' : 'Save'}</button>
        <button type="button" class="btn-secondary" onclick="closeProductForm()">Cancel</button>
      </div>
    </form>
  `;

  document.getElementById('product-form-modal').classList.add('open');
  document.getElementById('product-form-scrim').classList.add('visible');

  document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;

    const formData = new FormData();
    formData.append('name', form.elements['name'].value);
    formData.append('category', form.elements['category'].value);
    formData.append('price', parseFloat(form.elements['price'].value));
    formData.append('fabric', form.elements['fabric'].value);
    formData.append('silhouette', form.elements['silhouette'].value);
    formData.append('blurb', form.elements['blurb'].value);

    const details = form.elements['details'].value.trim().split('\n').map(d => d.trim());
    formData.append('details', JSON.stringify(details));

    const sizes = Array.from(form.querySelectorAll('input[name="sizes"]:checked')).map(x => x.value);
    formData.append('sizes', JSON.stringify(sizes));

    const colors = form.elements['colors'].value.trim().split('\n').map(line => {
      const [name, swatch, lineColor] = line.split('|');
      return { name: name.trim(), swatch: swatch.trim(), line: lineColor.trim() };
    });
    formData.append('colors', JSON.stringify(colors));

    const photoInput = document.getElementById('photo-input');
    if (photoInput && photoInput.files.length > 0) {
      formData.append('photo', photoInput.files[0]);
    }

    try {
      const method = isNew ? 'POST' : 'PUT';
      const url = isNew ? `${API_BASE}/api/admin/products` : `${API_BASE}/api/admin/products/${productId}`;

      const res = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${state.authToken}` },
        body: formData
      });

      const result = await res.json();
      if (result.success || result.id) {
        showToast(isNew ? 'Product created' : 'Product updated');
        closeProductForm();
        loadProducts();
        loadAdminProducts();
      } else {
        throw new Error(result.error || 'Save failed');
      }
    } catch (e) {
      showToast('Save failed: ' + e.message);
    }
  });
}

function closeProductForm() {
  document.getElementById('product-form-modal').classList.remove('open');
  document.getElementById('product-form-scrim').classList.remove('visible');
}

async function deleteProduct(productId) {
  if (!confirm('Delete this product?')) return;

  try {
    const res = await fetch(`${API_BASE}/api/admin/products/${productId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${state.authToken}` }
    });

    if (res.ok) {
      showToast('Product deleted');
      loadProducts();
      loadAdminProducts();
    }
  } catch (e) {
    showToast('Delete failed');
  }
}

// ============================================================
// UI HELPERS
// ============================================================
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 3000);
}

// ============================================================
// INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  loadProducts();

  document.getElementById('cart-toggle').addEventListener('click', () => {
    document.getElementById('cart-drawer').classList.toggle('open');
    document.getElementById('cart-scrim').classList.toggle('visible');
  });

  document.getElementById('cart-close').addEventListener('click', () => {
    document.getElementById('cart-drawer').classList.remove('open');
    document.getElementById('cart-scrim').classList.remove('visible');
  });

  document.getElementById('cart-scrim').addEventListener('click', () => {
    document.getElementById('cart-drawer').classList.remove('open');
    document.getElementById('cart-scrim').classList.remove('visible');
  });

  document.getElementById('checkout-btn').addEventListener('click', openCheckout);

  document.getElementById('admin-toggle').addEventListener('click', () => {
    document.getElementById('admin-modal').classList.toggle('open');
    document.getElementById('admin-scrim').classList.toggle('visible');
  });

  document.getElementById('admin-modal-close').addEventListener('click', () => {
    document.getElementById('admin-modal').classList.remove('open');
    document.getElementById('admin-scrim').classList.remove('visible');
  });

  document.getElementById('admin-scrim').addEventListener('click', () => {
    document.getElementById('admin-modal').classList.remove('open');
    document.getElementById('admin-scrim').classList.remove('visible');
  });

  document.getElementById('admin-login-btn').addEventListener('click', handleAdminLogin);
  document.getElementById('admin-logout-btn').addEventListener('click', handleAdminLogout);

  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.admin-tab-content').forEach(c => c.style.display = 'none');
      tab.classList.add('active');
      document.getElementById('admin-' + tab.getAttribute('data-tab') + '-tab').style.display = 'block';
    });
  });

  if (state.authToken) {
    document.getElementById('admin-login-form').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';
    loadAdminProducts();
    loadAdminOrders();
  }
});

renderCart();
