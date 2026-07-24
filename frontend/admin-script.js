const API_URL = 'http://localhost:5000';
let currentProductId = null;
let currentOrderId = null;
let currentColorId = null;
let currentPhotoId = null;
let isEditing = false;

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
            if (section === 'add-product') resetProductForm();
        });
    });

    // Add Product Form
    document.getElementById('add-product-form').addEventListener('submit', addOrUpdateProduct);

    // Logout button
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('adminToken');
        window.location.href = '/';
    });

    // Order Status Filter
    document.getElementById('order-status-filter').addEventListener('change', loadOrders);

    // Search products
    document.getElementById('search-products').addEventListener('keyup', searchProducts);
}

function loadDashboard() {
    fetch(`${API_URL}/api/products`)
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
    fetch(`${API_URL}/api/products`)
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
                        <button onclick="deleteProduct('${p.id}')" class="btn-danger">Delete</button>
                    </td>
                </tr>
            `).join('');
        })
        .catch(err => showToast('Error loading products: ' + err.message, 'error'));
}

function searchProducts() {
    const search = document.getElementById('search-products').value.toLowerCase();
    const rows = document.querySelectorAll('#products-body tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(search) ? '' : 'none';
    });
}

function resetProductForm() {
    isEditing = false;
    currentProductId = null;
    document.getElementById('form-title').textContent = 'Add New Product';
    document.getElementById('submit-btn').textContent = 'Add Product';
    document.getElementById('cancel-edit-btn').style.display = 'none';
    document.getElementById('add-product-form').reset();
    document.getElementById('product-success').style.display = 'none';
}

function editProduct(productId) {
    fetch(`${API_URL}/api/products/${productId}`)
        .then(r => r.json())
        .then(product => {
            isEditing = true;
            currentProductId = product.id;
            
            document.getElementById('form-title').textContent = 'Edit Product';
            document.getElementById('submit-btn').textContent = 'Update Product';
            document.getElementById('cancel-edit-btn').style.display = 'inline-block';
            
            document.getElementById('article').value = product.article;
            document.getElementById('product-name').value = product.name;
            document.getElementById('category').value = product.category;
            document.getElementById('price').value = product.price;
            document.getElementById('blurb').value = product.blurb;
            
            try {
                const details = JSON.parse(product.details);
                document.getElementById('details').value = details.join(', ');
            } catch (e) {
                document.getElementById('details').value = product.details || '';
            }
            
            document.getElementById('product-success').style.display = 'block';
            document.getElementById('success-message').textContent = '✅ Product loaded for editing!';
            document.getElementById('product-created-info').innerHTML = `
                <p><strong>Product ID:</strong> ${product.id}</p>
                <p><strong>Article:</strong> ${product.article}</p>
                <hr style="margin: 15px 0;">
            `;
            
            const colorSelect = document.getElementById('color-select');
            colorSelect.innerHTML = '<option value="">Select color (optional)</option>';
            (product.colors || []).forEach(color => {
                const option = document.createElement('option');
                option.value = color.id;
                option.textContent = color.color_name;
                colorSelect.appendChild(option);
            });
            
            loadColorsList(product);
            loadPhotosList(product);
            
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.querySelector('[data-section="add-product"]').classList.add('active');
            document.getElementById('add-product').classList.add('active');
            document.getElementById('page-title').textContent = 'Edit Product';
            
            showToast('Product loaded for editing!', 'success');
        })
        .catch(err => showToast('Error: ' + err.message, 'error'));
}

function cancelEdit() {
    resetProductForm();
}

function deleteProduct(productId) {
    if (confirm('Are you sure? This will delete the product and all its colors/photos.')) {
        // Note: This requires a DELETE endpoint in backend
        showToast('Delete feature coming soon', 'info');
    }
}

function addOrUpdateProduct(e) {
    e.preventDefault();
    
    const product = {
        article: document.getElementById('article').value,
        name: document.getElementById('product-name').value,
        category: document.getElementById('category').value,
        price: parseFloat(document.getElementById('price').value),
        blurb: document.getElementById('blurb').value,
        details: document.getElementById('details').value.split(',').map(d => d.trim())
    };

    if (!product.article || !product.name || !product.category || !product.price) {
        showToast('Please fill all required fields', 'error');
        return;
    }

    const url = isEditing ? `${API_URL}/api/products/${currentProductId}` : `${API_URL}/api/products`;
    const method = isEditing ? 'PATCH' : 'POST';

    fetch(url, {
        method: method,
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
            currentProductId = data.id || currentProductId;
            showToast(isEditing ? 'Product updated!' : 'Product added!', 'success');
            
            document.getElementById('product-success').style.display = 'block';
            document.getElementById('product-created-info').innerHTML = `
                <p><strong>Product ID:</strong> ${currentProductId}</p>
                <p><strong>Name:</strong> ${product.name}</p>
                <hr style="margin: 15px 0;">
            `;
            
            if (!isEditing) {
                document.getElementById('add-product-form').reset();
                const colorSelect = document.getElementById('color-select');
                colorSelect.innerHTML = '<option value="">Select color (optional)</option>';
                document.getElementById('colors-list').innerHTML = '';
                document.getElementById('photos-list').innerHTML = '';
            }
        }
    })
    .catch(err => showToast('Error: ' + err.message, 'error'));
}

function addColor() {
    if (!currentProductId) {
        showToast('Create or select a product first!', 'error');
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
            showToast('✅ Color added!', 'success');
            document.getElementById('color-name').value = '';
            document.getElementById('color-code').value = '#FF0000';
            
            const option = document.createElement('option');
            option.value = data.id;
            option.textContent = data.color_name;
            document.getElementById('color-select').appendChild(option);
            
            fetch(`${API_URL}/api/products/${currentProductId}`)
                .then(r => r.json())
                .then(product => loadColorsList(product));
        }
    })
    .catch(err => showToast('Error: ' + err.message, 'error'));
}

function editColor(colorId) {
    fetch(`${API_URL}/api/products/${currentProductId}`)
        .then(r => r.json())
        .then(product => {
            const color = product.colors.find(c => c.id === colorId);
            if (!color) return;
            
            currentColorId = colorId;
            document.getElementById('edit-color-name').value = color.color_name;
            document.getElementById('edit-color-code').value = color.color_code;
            document.getElementById('color-edit-modal').style.display = 'flex';
        });
}

function saveColorEdit() {
    // Note: This requires an UPDATE endpoint in backend
    showToast('Color update feature coming soon', 'info');
    closeColorModal();
}

function deleteColor() {
    if (confirm('Delete this color?')) {
        // Note: This requires a DELETE endpoint in backend
        showToast('Color delete feature coming soon', 'info');
        closeColorModal();
    }
}

function closeColorModal() {
    document.getElementById('color-edit-modal').style.display = 'none';
}

function uploadPhoto() {
    if (!currentProductId) {
        showToast('Create or select a product first!', 'error');
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
            showToast('✅ Photo uploaded!', 'success');
            document.getElementById('photo-file').value = '';
            
            fetch(`${API_URL}/api/products/${currentProductId}`)
                .then(r => r.json())
                .then(product => loadPhotosList(product));
        }
    })
    .catch(err => showToast('Error: ' + err.message, 'error'));
}

function editPhoto(photoId) {
    fetch(`${API_URL}/api/products/${currentProductId}`)
        .then(r => r.json())
        .then(product => {
            const photo = product.photos.find(p => p.id === photoId);
            if (!photo) return;
            
            currentPhotoId = photoId;
            document.getElementById('edit-photo-preview').src = photo.photo_url;
            document.getElementById('edit-photo-order').value = photo.display_order;
            
            const colorSelect = document.getElementById('edit-photo-color');
            colorSelect.innerHTML = '<option value="">No Color</option>';
            (product.colors || []).forEach(color => {
                const option = document.createElement('option');
                option.value = color.id;
                option.textContent = color.color_name;
                if (color.id === photo.color_id) option.selected = true;
                colorSelect.appendChild(option);
            });
            
            document.getElementById('photo-edit-modal').style.display = 'flex';
        });
}

function savePhotoEdit() {
    // Note: This requires an UPDATE endpoint in backend
    showToast('Photo update feature coming soon', 'info');
    closePhotoModal();
}

function deletePhoto() {
    if (confirm('Delete this photo?')) {
        // Note: This requires a DELETE endpoint in backend
        showToast('Photo delete feature coming soon', 'info');
        closePhotoModal();
    }
}

function closePhotoModal() {
    document.getElementById('photo-edit-modal').style.display = 'none';
}

function loadColorsList(product) {
    const colors = product.colors || [];
    if (colors.length === 0) {
        document.getElementById('colors-list').innerHTML = '<p>No colors added yet</p>';
        return;
    }
    
    document.getElementById('colors-list').innerHTML = `
        <p><strong>Colors (${colors.length}):</strong></p>
        <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;">
            ${colors.map(c => `
                <div style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #f0f0f0; border-radius: 4px;">
                    <div style="width: 30px; height: 30px; background: ${c.color_code}; border-radius: 4px; border: 1px solid #ddd;"></div>
                    <span>${c.color_name}</span>
                    <button type="button" onclick="editColor('${c.id}')" class="btn-tiny">✎</button>
                </div>
            `).join('')}
        </div>
    `;
}

function loadPhotosList(product) {
    const photos = product.photos || [];
    if (photos.length === 0) {
        document.getElementById('photos-list').innerHTML = '<p>No photos uploaded yet</p>';
        return;
    }
    
    document.getElementById('photos-list').innerHTML = `
        <p><strong>Photos (${photos.length}):</strong></p>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; margin-top: 10px;">
            ${photos.map(p => `
                <div style="position: relative; overflow: hidden; border-radius: 4px; cursor: pointer;" onclick="editPhoto('${p.id}')">
                    <img src="${p.photo_url}" alt="Photo" style="width: 100%; height: 120px; object-fit: cover; display: block;">
                    <div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); color: white; padding: 4px; font-size: 12px; text-align: center;">
                        Order: ${p.display_order} | ✎ Edit
                    </div>
                </div>
            `).join('')}
        </div>
    `;
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
        })
        .catch(err => showToast('Error loading orders: ' + err.message, 'error'));
}

function viewOrder(orderId) {
    currentOrderId = orderId;
    
    fetch(`${API_URL}/api/orders/${orderId}`, { headers: { 'x-admin-password': 'admin123' } })
        .then(r => r.json())
        .then(order => {
            const itemsHTML = (order.items || []).map(item => `
                <tr>
                    <td>${item.product_name}</td>
                    <td>${item.color || '-'}</td>
                    <td>${item.size || '-'}</td>
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
                
                <hr style="margin: 15px 0;">
                
                <p><strong>Subtotal:</strong> ₹${order.subtotal}</p>
                <p><strong>Shipping:</strong> ₹${order.shipping}</p>
                <p><strong>Tax:</strong> ₹${order.tax}</p>
                <p><strong style="font-size: 16px;">Total:</strong> <span style="font-size: 16px;">₹${order.total}</span></p>
                
                <hr style="margin: 15px 0;">
                
                <h4>Order Items</h4>
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
        })
        .catch(err => showToast('Error: ' + err.message, 'error'));
}

function updateOrderStatus() {
    if (!currentOrderId) {
        showToast('No order selected', 'error');
        return;
    }

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
            showToast('✅ Order updated!', 'success');
            closeOrderModal();
            loadOrders();
        }
    })
    .catch(err => showToast('Error: ' + err.message, 'error'));
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

// Make functions global
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.viewOrder = viewOrder;
window.updateOrderStatus = updateOrderStatus;
window.closeOrderModal = closeOrderModal;
window.addColor = addColor;
window.editColor = editColor;
window.saveColorEdit = saveColorEdit;
window.deleteColor = deleteColor;
window.closeColorModal = closeColorModal;
window.uploadPhoto = uploadPhoto;
window.editPhoto = editPhoto;
window.savePhotoEdit = savePhotoEdit;
window.deletePhoto = deletePhoto;
window.closePhotoModal = closePhotoModal;
window.cancelEdit = cancelEdit;
window.resetProductForm = resetProductForm;
window.searchProducts = searchProducts;