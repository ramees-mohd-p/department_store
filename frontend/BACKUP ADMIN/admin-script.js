const API_URL = 'http://192.168.10.33:5000';
let adminToken = localStorage.getItem('adminToken');
let currentProductId = null;
let currentOrderId = null;

// Check admin auth
window.addEventListener('load', () => {
    const password = prompt('Enter admin password:');
    if (!password) {
        window.location.href = '/';
        return;
    }
    
    fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
    })
    .then(r => r.json())
    .then(d => {
        if (d.error) {
            alert('Invalid password');
            window.location.href = '/';
        } else {
            localStorage.setItem('adminToken', password);
            loadDashboard();
            setupEventListeners();
        }
    });
});

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            
            if (section === 'logout') {
                localStorage.removeItem('adminToken');
                window.location.href = '/';
                return;
            }
            
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            
            item.classList.add('active');
            document.getElementById(section).classList.add('active');
            document.getElementById('page-title').textContent = item.textContent.trim();
            
            if (section === 'products') loadProducts();
            if (section === 'orders') loadOrders();
        });
    });

    // Add Product Form
    document.getElementById('add-product-form').addEventListener('submit', addProduct);

    // Logout button
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('adminToken');
        window.location.href = '/';
    });

    // Order Status Filter
    document.getElementById('order-status-filter').addEventListener('change', loadOrders);
}

function loadDashboard() {
    // Load dashboard stats
    fetch(`${API_URL}/api/products`, { headers: { 'x-admin-password': 'admin123' } })
        .then(r => r.json())
        .then(products => {
            document.getElementById('total-products').textContent = products.length;
        });

    fetch(`${API_URL}/api/admin/orders`, { headers: { 'x-admin-password': 'admin123' } })
        .then(r => r.json())
        .then(orders => {
            document.getElementById('total-orders').textContent = orders.length;
            const pending = orders.filter(o => o.order_status === 'pending').length;
            document.getElementById('pending-orders').textContent = pending;
            
            const revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
            document.getElementById('total-revenue').textContent = revenue.toLocaleString();
            
            // Show recent orders
            const recent = orders.slice(0, 5);
            document.getElementById('recent-orders-body').innerHTML = recent.map(order => `
                <tr>
                    <td>${order.id}</td>
                    <td>${order.customer_name}</td>
                    <td>₹${order.total}</td>
                    <td><span class="status ${order.order_status}">${order.order_status}</span></td>
                    <td>${new Date(order.created_at).toLocaleDateString()}</td>
                    <td><button onclick="viewOrder('${order.id}')" class="btn-secondary">View</button></td>
                </tr>
            `).join('');
        });
}

function loadProducts() {
    fetch(`${API_URL}/api/products`, { headers: { 'x-admin-password': 'admin123' } })
        .then(r => r.json())
        .then(products => {
            document.getElementById('products-body').innerHTML = products.map(p => `
                <tr>
                    <td>${p.article}</td>
                    <td>${p.name}</td>
                    <td>${p.category}</td>
                    <td>₹${p.price}</td>
                    <td>${(p.colors || []).length} colors</td>
                    <td>${(p.photos || []).length} photos</td>
                    <td>
                        <button onclick="editProduct('${p.id}')" class="btn-secondary">Edit</button>
                    </td>
                </tr>
            `).join('');
        });
}

function loadOrders() {
    const status = document.getElementById('order-status-filter').value;
    
    fetch(`${API_URL}/api/admin/orders`, { headers: { 'x-admin-password': 'admin123' } })
        .then(r => r.json())
        .then(orders => {
            const filtered = status ? orders.filter(o => o.order_status === status) : orders;
            
            document.getElementById('orders-body').innerHTML = filtered.map(order => `
                <tr>
                    <td>${order.id}</td>
                    <td>${order.customer_name}</td>
                    <td>${order.customer_email}</td>
                    <td>₹${order.total}</td>
                    <td><span class="status ${order.order_status}">${order.order_status}</span></td>
                    <td>${order.payment_status}</td>
                    <td>${new Date(order.created_at).toLocaleDateString()}</td>
                    <td><button onclick="viewOrder('${order.id}')" class="btn-secondary">View</button></td>
                </tr>
            `).join('');
        });
}

function addProduct(e) {
    e.preventDefault();
    
    const product = {
        article: document.getElementById('article').value,
        name: document.getElementById('product-name').value,
        category: document.getElementById('category').value,
        price: parseFloat(document.getElementById('price').value),
        blurb: document.getElementById('blurb').value,
        details: document.getElementById('details').value.split(',').map(d => d.trim())
    };

    fetch(`${API_URL}/api/products`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-admin-password': 'admin123'
        },
        body: JSON.stringify(product)
    })
    .then(r => r.json())
    .then(data => {
        if (data.error) {
            showToast('Error: ' + data.error, 'error');
        } else {
            currentProductId = data.id;
            showToast('Product added! Now add colors and photos', 'success');
            
            document.getElementById('product-success').style.display = 'block';
            document.getElementById('product-created-info').innerHTML = `
                <p><strong>Product ID:</strong> ${data.id}</p>
                <p><strong>Name:</strong> ${data.name}</p>
            `;
            
            document.getElementById('add-product-form').reset();
        }
    });
}

function addColor() {
    if (!currentProductId) {
        showToast('Create a product first!', 'error');
        return;
    }

    const colorName = document.getElementById('color-name').value;
    const colorCode = document.getElementById('color-code').value;

    if (!colorName) {
        showToast('Enter color name', 'error');
        return;
    }

    fetch(`${API_URL}/api/products/${currentProductId}/colors`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-admin-password': 'admin123'
        },
        body: JSON.stringify({ color_name: colorName, color_code: colorCode })
    })
    .then(r => r.json())
    .then(data => {
        if (data.error) {
            showToast('Error: ' + data.error, 'error');
        } else {
            showToast('Color added!', 'success');
            document.getElementById('color-name').value = '';
            
            // Add to color select for photos
            const option = document.createElement('option');
            option.value = data.id;
            option.textContent = data.color_name;
            document.getElementById('color-select').appendChild(option);
            
            // Refresh colors list
            loadColorsList();
        }
    });
}

function uploadPhoto() {
    if (!currentProductId) {
        showToast('Create a product first!', 'error');
        return;
    }

    const file = document.getElementById('photo-file').files[0];
    if (!file) {
        showToast('Select a photo', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('photo', file);
    formData.append('color_id', document.getElementById('color-select').value || '');
    formData.append('display_order', document.getElementById('display-order').value);

    fetch(`${API_URL}/api/products/${currentProductId}/photos`, {
        method: 'POST',
        headers: { 'x-admin-password': 'admin123' },
        body: formData
    })
    .then(r => r.json())
    .then(data => {
        if (data.error) {
            showToast('Error: ' + data.error, 'error');
        } else {
            showToast('Photo uploaded!', 'success');
            document.getElementById('photo-file').value = '';
            loadPhotosList();
        }
    });
}

function loadColorsList() {
    fetch(`${API_URL}/api/products/${currentProductId}`, { headers: { 'x-admin-password': 'admin123' } })
        .then(r => r.json())
        .then(product => {
            document.getElementById('colors-list').innerHTML = `
                <p><strong>Colors added:</strong></p>
                ${(product.colors || []).map(c => `
                    <div style="display: inline-block; margin: 5px; padding: 5px 10px; background: ${c.color_code}; border-radius: 4px; color: white;">
                        ${c.color_name}
                    </div>
                `).join('')}
            `;
        });
}

function loadPhotosList() {
    fetch(`${API_URL}/api/products/${currentProductId}`, { headers: { 'x-admin-password': 'admin123' } })
        .then(r => r.json())
        .then(product => {
            document.getElementById('photos-list').innerHTML = `
                <p><strong>Photos uploaded: ${(product.photos || []).length}</strong></p>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px;">
                    ${(product.photos || []).map(p => `
                        <img src="${p.photo_url}" alt="Photo" style="width: 100%; height: 100px; object-fit: cover; border-radius: 4px;">
                    `).join('')}
                </div>
            `;
        });
}

function viewOrder(orderId) {
    currentOrderId = orderId;
    
    fetch(`${API_URL}/api/orders/${orderId}`, { headers: { 'x-admin-password': 'admin123' } })
        .then(r => r.json())
        .then(order => {
            const itemsHTML = (order.items || []).map(item => `
                <tr>
                    <td>${item.product_name}</td>
                    <td>${item.color}</td>
                    <td>${item.size}</td>
                    <td>${item.quantity}</td>
                    <td>₹${item.price}</td>
                </tr>
            `).join('');

            document.getElementById('order-details').innerHTML = `
                <p><strong>Order ID:</strong> ${order.id}</p>
                <p><strong>Customer:</strong> ${order.customer_name}</p>
                <p><strong>Email:</strong> ${order.customer_email}</p>
                <p><strong>Phone:</strong> ${order.customer_phone}</p>
                <p><strong>Address:</strong> ${order.shipping_address}, ${order.shipping_city}, ${order.shipping_state} ${order.shipping_zip}</p>
                <p><strong>Subtotal:</strong> ₹${order.subtotal}</p>
                <p><strong>Shipping:</strong> ₹${order.shipping}</p>
                <p><strong>Tax:</strong> ₹${order.tax}</p>
                <p><strong>Total:</strong> ₹${order.total}</p>
                
                <h4>Items</h4>
                <table>
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Color</th>
                            <th>Size</th>
                            <th>Qty</th>
                            <th>Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHTML}
                    </tbody>
                </table>
            `;

            document.getElementById('order-status-update').value = order.order_status;
            document.getElementById('payment-status-update').value = order.payment_status;
            document.getElementById('order-modal').style.display = 'flex';
        });
}

function updateOrderStatus() {
    const status = document.getElementById('order-status-update').value;
    const payment = document.getElementById('payment-status-update').value;

    fetch(`${API_URL}/api/orders/${currentOrderId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'x-admin-password': 'admin123'
        },
        body: JSON.stringify({ order_status: status, payment_status: payment })
    })
    .then(r => r.json())
    .then(data => {
        if (data.error) {
            showToast('Error: ' + data.error, 'error');
        } else {
            showToast('Order updated!', 'success');
            closeOrderModal();
            loadOrders();
        }
    });
}

function closeOrderModal() {
    document.getElementById('order-modal').style.display = 'none';
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show ' + type;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}