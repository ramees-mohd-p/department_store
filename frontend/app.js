// ============================================
// MARWAN PETITE COUTURE - ENHANCED FRONTEND
// ============================================

const API_URL = 'http://192.168.10.33:5000';
let currentUser = null;
let cart = [];
let products = [];
let allProducts = [];
let selectedProduct = null;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    initEventListeners();
    checkAuth();
    setupHeroSlider();
    loadCartFromStorage();
});

function initEventListeners() {
    // Header
    document.getElementById('menuToggle').addEventListener('click', toggleMobileMenu);
    document.getElementById('brandName').addEventListener('click', () => window.location.reload());
    document.getElementById('profileBtn').addEventListener('click', openProfileModal);
    document.getElementById('cartBtn').addEventListener('click', openCartDrawer);
    document.getElementById('searchBtn').addEventListener('click', performSearch);
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });

    // Filters
    document.getElementById('applyFilters').addEventListener('click', applyFilters);
    document.getElementById('clearFilters').addEventListener('click', clearFilters);
    document.getElementById('categoryFilter').addEventListener('change', () => {
        const event = new Event('change');
        document.getElementById('categoryFilter').dispatchEvent(event);
    });

    // Modal closes
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeModals);
    });

    // Cart drawer
    document.querySelector('.cart-close').addEventListener('click', closeCartDrawer);
    document.getElementById('continueShopping').addEventListener('click', closeCartDrawer);
    document.getElementById('checkoutBtn').addEventListener('click', openCheckoutModal);

    // Profile tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', switchProfileTab);
    });

    // Login/Register forms
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Checkout
    document.getElementById('nextPaymentBtn').addEventListener('click', goToPayment);
    document.getElementById('placeOrderBtn').addEventListener('click', placeOrder);
    document.getElementById('backToShopBtn').addEventListener('click', () => {
        closeModals();
        closeCartDrawer();
    });

    // Payment method
    document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
        radio.addEventListener('change', updatePaymentDisplay);
    });
}

// ============================================
// PRODUCTS
// ============================================

async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/api/products`);
        if (!response.ok) throw new Error('Failed to load products');
        
        allProducts = await response.json();
        products = [...allProducts];
        renderProducts();
        populateFilters();
    } catch (error) {
        console.error('Error loading products:', error);
        showToast('Failed to load products', 'error');
    }
}

function renderProducts() {
    const grid = document.getElementById('productsGrid');
    
    if (products.length === 0) {
        grid.innerHTML = '<div class="loading">No products found</div>';
        return;
    }

    grid.innerHTML = products.map(product => `
        <div class="product-card" onclick="openProductDetail('${product.id}')">
            <div class="product-image">
                <img src="${product.photos?.[0]?.photo_url || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22%3E%3C/svg%3E'}" alt="${product.name}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22250%22 height=%22250%22%3E%3Crect fill=%22%23fce7f3%22 width=%22250%22 height=%22250%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22%3ENo Image%3C/text%3E%3C/svg%3E'">
            </div>
            <div class="product-card-content">
                <div class="product-card-name">${product.name}</div>
                <div class="product-card-price">₹${product.price?.toLocaleString()}</div>
                ${product.colors?.length > 0 ? `
                    <div class="product-colors-preview">
                        ${product.colors.slice(0, 3).map(color => `
                            <div class="color-dot" style="background-color: ${color.color_code || '#ccc'}" title="${color.color_name}"></div>
                        `).join('')}
                        ${product.colors.length > 3 ? `<span style="font-size: 12px; color: #666;">+${product.colors.length - 3}</span>` : ''}
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

async function openProductDetail(productId) {
    try {
        const response = await fetch(`${API_URL}/api/products/${productId}`);
        if (!response.ok) throw new Error('Failed to load product');
        
        selectedProduct = await response.json();
        populateProductModal();
        document.getElementById('productModal').classList.add('open');
    } catch (error) {
        console.error('Error loading product:', error);
        showToast('Failed to load product details', 'error');
    }
}

function populateProductModal() {
    if (!selectedProduct) return;

    document.getElementById('productName').textContent = selectedProduct.name;
    document.getElementById('productPrice').textContent = `₹${selectedProduct.price?.toLocaleString()}`;
    document.getElementById('productBlurb').textContent = selectedProduct.blurb || '';
    
    // Product details
    const detailsEl = document.getElementById('productDetails');
    if (selectedProduct.details && Array.isArray(selectedProduct.details)) {
        detailsEl.innerHTML = '<ul>' + selectedProduct.details.map(d => `<li>${d}</li>`).join('') + '</ul>';
    }

    // Main image
    const mainImg = document.getElementById('mainImage');
    if (selectedProduct.photos?.length > 0) {
        mainImg.src = selectedProduct.photos[0].photo_url;
    }

    // Gallery thumbnails
    const galleryCtn = document.getElementById('galleryThumbnails');
    galleryCtn.innerHTML = (selectedProduct.photos || []).map((photo, idx) => `
        <div class="thumbnail ${idx === 0 ? 'active' : ''}" onclick="updateMainImage('${photo.photo_url}', this)">
            <img src="${photo.photo_url}" alt="Product image">
        </div>
    `).join('');

    // Colors
    const colorsCtn = document.getElementById('colorOptions');
    colorsCtn.innerHTML = (selectedProduct.colors || []).map(color => `
        <div class="color-option ${color.color_code ? '' : 'text-only'}" 
             style="${color.color_code ? `background-color: ${color.color_code};` : ''}"
             onclick="selectColor(this, '${color.id}', '${color.color_name}')"
             title="${color.color_name}">
            ${!color.color_code ? color.color_name.substring(0, 2) : ''}
        </div>
    `).join('');

    // Sizes
    const sizesCtn = document.getElementById('sizeOptions');
    sizesCtn.innerHTML = (selectedProduct.sizes || ['XS', 'S', 'M', 'L', 'XL']).map(size => `
        <div class="size-option" onclick="selectSize(this, '${size}')">${size}</div>
    `).join('');

    // Reset quantity
    document.getElementById('productQty').value = 1;

    // Zoom
    document.getElementById('mainImage').addEventListener('click', openZoom);
}

function updateMainImage(src, thumbEl) {
    document.getElementById('mainImage').src = src;
    document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
    thumbEl.classList.add('active');
}

function selectColor(el, colorId, colorName) {
    document.querySelectorAll('.color-option').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    el.dataset.colorId = colorId;
    el.dataset.colorName = colorName;
}

function selectSize(el, size) {
    document.querySelectorAll('.size-option').forEach(s => s.classList.remove('selected'));
    el.classList.add('selected');
    el.dataset.size = size;
}

function addToCart() {
    if (!selectedProduct) return;

    const qty = parseInt(document.getElementById('productQty').value) || 1;
    const colorEl = document.querySelector('.color-option.selected');
    const sizeEl = document.querySelector('.size-option.selected');
    
    const color = colorEl?.dataset.colorName || 'Standard';
    const size = sizeEl?.dataset.size || 'One Size';

    const cartItem = {
        id: selectedProduct.id,
        name: selectedProduct.name,
        price: selectedProduct.price,
        color,
        size,
        qty,
        image: selectedProduct.photos?.[0]?.photo_url || ''
    };

    // Check if item already exists
    const existing = cart.findIndex(item => 
        item.id === cartItem.id && item.color === cartItem.color && item.size === cartItem.size
    );

    if (existing >= 0) {
        cart[existing].qty += qty;
    } else {
        cart.push(cartItem);
    }

    saveCartToStorage();
    updateCartCount();
    showToast(`Added ${qty} item(s) to cart`, 'success');
    closeModals();
}

function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    document.getElementById('cartCount').textContent = count;
}

function saveCartToStorage() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function loadCartFromStorage() {
    const saved = localStorage.getItem('cart');
    if (saved) {
        cart = JSON.parse(saved);
        updateCartCount();
    }
}

// ============================================
// FILTERS
// ============================================

function populateFilters() {
    // Color filter
    const colors = new Set();
    allProducts.forEach(p => {
        p.colors?.forEach(c => colors.add(JSON.stringify({ name: c.color_name, code: c.color_code })));
    });

    const colorCtn = document.getElementById('colorFilter');
    colorCtn.innerHTML = Array.from(colors).map(c => {
        const { name, code } = JSON.parse(c);
        return `
            <div class="color-swatch" style="background-color: ${code || '#ccc'}" 
                 onclick="this.classList.toggle('selected')" 
                 data-color="${name}"
                 title="${name}"></div>
        `;
    }).join('');
}

function applyFilters() {
    const category = document.getElementById('categoryFilter').value;
    const price = parseInt(document.getElementById('priceFilter').value);
    const colors = Array.from(document.querySelectorAll('.color-swatch.selected')).map(el => el.dataset.color);

    products = allProducts.filter(p => {
        if (category && p.category !== category) return false;
        if (p.price > price) return false;
        if (colors.length > 0) {
            const hasColor = p.colors?.some(c => colors.includes(c.color_name));
            if (!hasColor) return false;
        }
        return true;
    });

    renderProducts();
}

function clearFilters() {
    document.getElementById('categoryFilter').value = '';
    document.getElementById('priceFilter').value = '50000';
    document.getElementById('priceValue').textContent = '₹0 - ₹50000';
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
    products = [...allProducts];
    renderProducts();
}

function performSearch() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    products = allProducts.filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.article?.toLowerCase().includes(query)
    );
    renderProducts();
}

// ============================================
// CART DRAWER
// ============================================

function openCartDrawer() {
    document.getElementById('cartDrawer').classList.add('open');
    renderCart();
}

function closeCartDrawer() {
    document.getElementById('cartDrawer').classList.remove('open');
}

function renderCart() {
    const cartCtn = document.getElementById('cartItems');
    
    if (cart.length === 0) {
        cartCtn.innerHTML = '<div class="empty-cart">Your cart is empty</div>';
        updateCartSummary();
        return;
    }

    cartCtn.innerHTML = cart.map((item, idx) => `
        <div class="cart-item">
            <div class="cart-item-image">
                <img src="${item.image}" alt="${item.name}" onerror="this.src='data:image/svg+xml,%3Csvg%3E%3C/svg%3E'">
            </div>
            <div class="cart-item-details">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-meta">${item.color} • ${item.size}</div>
                <div class="cart-item-price">₹${(item.price * item.qty).toLocaleString()}</div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <input type="number" value="${item.qty}" min="1" onchange="updateQty(${idx}, this.value)" style="width: 50px; padding: 4px; border: 1px solid #e5e7eb; border-radius: 4px;">
                    <button class="cart-item-remove" onclick="removeFromCart(${idx})">Remove</button>
                </div>
            </div>
        </div>
    `).join('');

    updateCartSummary();
}

function updateQty(idx, qty) {
    cart[idx].qty = Math.max(1, parseInt(qty));
    saveCartToStorage();
    updateCartCount();
    renderCart();
}

function removeFromCart(idx) {
    cart.splice(idx, 1);
    saveCartToStorage();
    updateCartCount();
    renderCart();
}

function updateCartSummary() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const shippingMethod = document.querySelector('input[name="shipping"]:checked')?.value || 'standard';
    const shipping = shippingMethod === 'express' ? 500 : 100;
    const tax = Math.round(subtotal * 0.08);
    const total = subtotal + shipping + tax;

    document.getElementById('subtotal').textContent = `₹${subtotal.toLocaleString()}`;
    document.getElementById('shipping').textContent = `₹${shipping}`;
    document.getElementById('tax').textContent = `₹${tax}`;
    document.getElementById('total').textContent = `₹${total.toLocaleString()}`;
}

// ============================================
// AUTHENTICATION
// ============================================

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) throw new Error('Login failed');

        const { token, user } = await response.json();
        localStorage.setItem('authToken', token);
        currentUser = user;
        showToast('Login successful!', 'success');
        switchProfileTab({ target: { dataset: { tab: 'account' } } });
        checkAuth();
    } catch (error) {
        showToast('Login failed. Check your credentials.', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirm = document.getElementById('registerConfirm').value;

    if (password !== confirm) {
        showToast('Passwords do not match', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name })
        });

        if (!response.ok) throw new Error('Registration failed');

        const { token, user } = await response.json();
        localStorage.setItem('authToken', token);
        currentUser = user;
        showToast('Account created successfully!', 'success');
        switchProfileTab({ target: { dataset: { tab: 'account' } } });
        checkAuth();
    } catch (error) {
        showToast('Registration failed. Email may already exist.', 'error');
    }
}

function handleLogout() {
    localStorage.removeItem('authToken');
    currentUser = null;
    cart = [];
    saveCartToStorage();
    updateCartCount();
    closeModals();
    showToast('Logged out successfully', 'success');
    checkAuth();
}

function checkAuth() {
    const token = localStorage.getItem('authToken');
    const accountTab = document.getElementById('accountTab');

    if (token && currentUser) {
        accountTab.style.display = 'block';
        document.getElementById('logoutBtn').style.display = 'block';
        updateAccountDisplay();
    } else {
        accountTab.style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'none';
    }
}

async function updateAccountDisplay() {
    const token = localStorage.getItem('authToken');
    try {
        const response = await fetch(`${API_URL}/api/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const user = await response.json();
            document.getElementById('accountContent').innerHTML = `
                <div style="margin-bottom: 20px;">
                    <p><strong>Name:</strong> ${user.name}</p>
                    <p><strong>Email:</strong> ${user.email}</p>
                    <p><strong>Phone:</strong> ${user.phone || 'Not set'}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading account:', error);
    }
}

// ============================================
// CHECKOUT
// ============================================

function openCheckoutModal() {
    if (cart.length === 0) {
        showToast('Add items to cart first', 'error');
        return;
    }

    resetCheckout();
    document.getElementById('checkoutModal').classList.add('open');
    updateCartSummary();
}

function resetCheckout() {
    document.querySelectorAll('.checkout-step').forEach(step => step.classList.remove('active'));
    document.getElementById('step1').classList.add('active');
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.querySelector('.step[data-step="1"]').classList.add('active');
}

function goToPayment() {
    // Validate shipping form
    const name = document.getElementById('customerName').value;
    const email = document.getElementById('customerEmail').value;
    const phone = document.getElementById('customerPhone').value;
    const address = document.getElementById('address').value;
    const city = document.getElementById('city').value;
    const state = document.getElementById('state').value;
    const zip = document.getElementById('zip').value;

    if (!name || !email || !phone || !address || !city || !state || !zip) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    // Move to payment step
    document.getElementById('step1').classList.remove('active');
    document.getElementById('step2').classList.add('active');
    document.querySelector('.step[data-step="1"]').classList.remove('active');
    document.querySelector('.step[data-step="2"]').classList.add('active');
}

async function placeOrder() {
    const shippingMethod = document.querySelector('input[name="shipping"]:checked').value;
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;

    const orderData = {
        user_id: currentUser?.id || null,
        customer_name: document.getElementById('customerName').value,
        customer_email: document.getElementById('customerEmail').value,
        customer_phone: document.getElementById('customerPhone').value,
        shipping_address: document.getElementById('address').value,
        shipping_city: document.getElementById('city').value,
        shipping_state: document.getElementById('state').value,
        shipping_zip: document.getElementById('zip').value,
        items: cart,
        subtotal: parseFloat(document.getElementById('subtotal').textContent.replace('₹', '').replace(/,/g, '')),
        shipping: parseInt(document.querySelector('input[name="shipping"]:checked').value === 'express' ? 500 : 100),
        tax: parseInt(document.getElementById('tax').textContent.replace('₹', '').replace(/,/g, '')),
        payment_method: paymentMethod,
        shipping_method: shippingMethod
    };

    try {
        const response = await fetch(`${API_URL}/api/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });

        if (!response.ok) throw new Error('Failed to place order');

        const { orderId } = await response.json();

        // Show confirmation
        document.getElementById('step2').classList.remove('active');
        document.getElementById('step3').classList.add('active');
        document.querySelector('.step[data-step="2"]').classList.remove('active');
        document.querySelector('.step[data-step="3"]').classList.add('active');

        document.getElementById('confirmationDetails').innerHTML = `
            <p style="margin-bottom: 20px;"><strong>Order ID:</strong> ${orderId}</p>
            <p><strong>Total Amount:</strong> ₹${orderData.subtotal + orderData.shipping + orderData.tax}</p>
            <p style="margin-top: 20px; color: #666; font-size: 14px;">Thank you for your purchase! You will receive a confirmation email shortly.</p>
        `;

        // Clear cart
        cart = [];
        saveCartToStorage();
        updateCartCount();
    } catch (error) {
        showToast('Failed to place order', 'error');
        console.error(error);
    }
}

function updatePaymentDisplay() {
    const method = document.querySelector('input[name="paymentMethod"]:checked').value;
    document.getElementById('razorpayOptions').style.display = method === 'razorpay' ? 'block' : 'none';
    document.getElementById('codOptions').style.display = method === 'cod' ? 'block' : 'none';
}

// ============================================
// MODALS
// ============================================

function openProfileModal() {
    document.getElementById('profileModal').classList.add('open');
}

function closeModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('open'));
}

function switchProfileTab(e) {
    const tab = e.target.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    e.target.classList.add('active');
    document.getElementById(tab + 'Tab').classList.add('active');
}

function openZoom() {
    document.getElementById('zoomModal').classList.add('open');
    document.getElementById('zoomImage').src = document.getElementById('mainImage').src;
}

// ============================================
// HERO SLIDER
// ============================================

let heroIndex = 0;

function setupHeroSlider() {
    const slides = document.querySelectorAll('.hero-slide');
    const dotsContainer = document.getElementById('heroDots');

    // Create dots
    slides.forEach((_, idx) => {
        const dot = document.createElement('div');
        dot.className = `dot ${idx === 0 ? 'active' : ''}`;
        dot.onclick = () => goToHeroSlide(idx);
        dotsContainer.appendChild(dot);
    });

    document.querySelector('.hero-prev').addEventListener('click', () => changeHeroSlide(-1));
    document.querySelector('.hero-next').addEventListener('click', () => changeHeroSlide(1));

    // Auto-advance
    setInterval(() => changeHeroSlide(1), 5000);
}

function changeHeroSlide(n) {
    heroIndex += n;
    if (heroIndex >= document.querySelectorAll('.hero-slide').length) heroIndex = 0;
    if (heroIndex < 0) heroIndex = document.querySelectorAll('.hero-slide').length - 1;
    updateHeroSlide();
}

function goToHeroSlide(n) {
    heroIndex = n;
    updateHeroSlide();
}

function updateHeroSlide() {
    const slides = document.querySelectorAll('.hero-slide');
    document.querySelector('.hero-slides').style.transform = `translateX(-${heroIndex * 100}%)`;
    document.querySelectorAll('.dot').forEach((d, idx) => {
        d.classList.toggle('active', idx === heroIndex);
    });
}

// ============================================
// UTILITIES
// ============================================

function toggleMobileMenu() {
    document.getElementById('mobileMenu').classList.toggle('open');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Zoom functionality
document.addEventListener('DOMContentLoaded', () => {
    let scale = 1;
    const zoomImage = document.getElementById('zoomImage');
    
    document.getElementById('zoomIn').addEventListener('click', () => {
        scale += 0.2;
        zoomImage.style.transform = `scale(${scale})`;
    });

    document.getElementById('zoomOut').addEventListener('click', () => {
        scale = Math.max(1, scale - 0.2);
        zoomImage.style.transform = `scale(${scale})`;
    });
});

// Add to wishlist
function addToWishlist() {
    showToast('Added to wishlist!', 'success');
}

// Quantity controls
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('qtyPlus').addEventListener('click', () => {
        const qty = document.getElementById('productQty');
        qty.value = parseInt(qty.value) + 1;
    });

    document.getElementById('qtyMinus').addEventListener('click', () => {
        const qty = document.getElementById('productQty');
        if (qty.value > 1) qty.value = parseInt(qty.value) - 1;
    });

    document.getElementById('addToCartBtn').addEventListener('click', addToCart);
    document.getElementById('addToWishlistBtn').addEventListener('click', addToWishlist);
});

// Price range update
document.addEventListener('DOMContentLoaded', () => {
    const priceFilter = document.getElementById('priceFilter');
    if (priceFilter) {
        priceFilter.addEventListener('input', () => {
            const price = parseInt(priceFilter.value);
            document.getElementById('priceValue').textContent = `₹0 - ₹${price.toLocaleString()}`;
        });
    }
});

