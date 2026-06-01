// إدارة المنتجات
const Products = {
    // إضافة منتج
    add: (productData) => {
        const products = Storage.get('products') || [];
        const newProduct = {
            id: generateId(),
            ...productData,
            createdAt: new Date().toISOString()
        };
        products.push(newProduct);
        Storage.set('products', products);
        return newProduct;
    },

    // تحديث منتج
    update: (productId, productData) => {
        const products = Storage.get('products') || [];
        const index = products.findIndex(p => p.id === productId);
        if (index !== -1) {
            products[index] = { ...products[index], ...productData };
            Storage.set('products', products);
            return products[index];
        }
        return null;
    },

    // حذف منتج
    delete: (productId) => {
        const products = Storage.get('products') || [];
        const filteredProducts = products.filter(p => p.id !== productId);
        Storage.set('products', filteredProducts);
        return true;
    },

    // الحصول على جميع المنتجات
    getAll: () => {
        return Storage.get('products') || [];
    },

    // البحث عن منتج
    search: (query) => {
        const products = Storage.get('products') || [];
        const lowerQuery = query.toLowerCase();
        return products.filter(p => 
            (p.name || '').toLowerCase().includes(lowerQuery) || 
            (p.barcode || '').toLowerCase().includes(lowerQuery) ||
            (p.category || '').toLowerCase().includes(lowerQuery)
        );
    },

    // الحصول على منتج بالباركود
    getByBarcode: (barcode) => {
        const products = Storage.get('products') || [];
        return products.find(p => p.barcode === barcode);
    },

    // تحديث المخزون
    updateStock: (productId, quantity) => {
        const products = Storage.get('products') || [];
        const product = products.find(p => p.id === productId);
        if (product) {
            product.stock = quantity;
            Storage.set('products', products);
            
            // التحقق من نقص المخزون
            if (product.stock <= product.minStock) {
                showNotification(`تنبيه: المنتج ${product.name} وصل للحد الأدنى`, 'warning');
            }
            
            return product;
        }
        return null;
    },

    // الحصول على المنتجات منخفضة المخزون
    getLowStock: () => {
        const products = Storage.get('products') || [];
        return products.filter(p => p.stock <= p.minStock);
    },

    // الحصول على المنتجات حسب الفئة
    getByCategory: (category) => {
        const products = Storage.get('products') || [];
        return products.filter(p => p.category === category);
    },

    // الحصول على الفئات
    getCategories: () => {
        const products = Storage.get('products') || [];
        const categories = [...new Set(products.map(p => p.category))];
        return categories;
    }
};

// عرض صفحة المنتجات
const renderProductsPage = () => {
    const contentArea = document.getElementById('content-area');
    const products = Products.getAll();
    const categories = Products.getCategories();
    const branches = Branches.getAll();

    contentArea.innerHTML = `
        <div class="page-header">
            <div class="page-actions">
                <button class="btn btn-primary" onclick="showAddProductModal()">
                    <i class="fas fa-plus"></i>
                    إضافة منتج
                </button>
                <button class="btn btn-secondary" onclick="showImportProductsModal()">
                    <i class="fas fa-file-import"></i>
                    استيراد
                </button>
                <button class="btn btn-info" onclick="exportProducts()">
                    <i class="fas fa-file-export"></i>
                    تصدير
                </button>
            </div>
        </div>

        <div class="filters">
            <div class="filter-group">
                <label>البحث:</label>
                <input type="text" id="product-search" placeholder="اسم المنتج أو الباركود" oninput="filterProducts()">
            </div>
            <div class="filter-group">
                <label>الفئة:</label>
                <select id="category-filter" onchange="filterProducts()">
                    <option value="">الكل</option>
                    ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label>الفرع:</label>
                <select id="branch-filter" onchange="filterProducts()">
                    <option value="">الكل</option>
                    ${branches.map(branch => `<option value="${branch.id}">${branch.name}</option>`).join('')}
                </select>
            </div>
        </div>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>الباركود</th>
                        <th>اسم المنتج</th>
                        <th>الفئة</th>
                        <th>سعر البيع</th>
                        <th>سعر التكلفة</th>
                        <th>المخزون</th>
                        <th>الفرع</th>
                        <th>الإجراءات</th>
                    </tr>
                </thead>
                <tbody id="products-table-body">
                    ${renderProductsRows(products)}
                </tbody>
            </table>
        </div>
    `;
};

// عرض صفوف المنتجات
const renderProductsRows = (products) => {
    if (products.length === 0) {
        return '<tr><td colspan="8" style="text-align: center;">لا توجد منتجات</td></tr>';
    }

    return products.map(product => `
        <tr class="${product.stock <= product.minStock ? 'low-stock' : ''}">
            <td>${product.barcode}</td>
            <td>${product.name}</td>
            <td>${product.category}</td>
            <td>${formatCurrency(product.price)}</td>
            <td>${formatCurrency(product.cost)}</td>
            <td>
                <span class="${product.stock <= product.minStock ? 'text-danger' : 'text-success'}">
                    ${product.stock}
                </span>
            </td>
            <td>${Branches.getById(product.branchId)?.name || 'الكل'}</td>
            <td>
                <button class="btn btn-sm btn-info" onclick="showEditProductModal('${product.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteProduct('${product.id}')">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="btn btn-sm btn-success" onclick="printBarcode('${product.id}')">
                    <i class="fas fa-barcode"></i>
                </button>
            </td>
        </tr>
    `).join('');
};

// تصفية المنتجات
const filterProducts = () => {
    const search = document.getElementById('product-search').value;
    const category = document.getElementById('category-filter').value;
    const branchId = document.getElementById('branch-filter').value;
    
    let products = Products.getAll();
    
    if (search) {
        products = Products.search(search);
    }
    
    if (category) {
        products = products.filter(p => p.category === category);
    }
    
    if (branchId) {
        products = products.filter(p => String(p.branchId) === branchId);
    }
    
    document.getElementById('products-table-body').innerHTML = renderProductsRows(products);
};

// عرض نافذة إضافة منتج
const showAddProductModal = () => {
    const branches = Storage.get('branches') || [];
    
    document.getElementById('modal-title').textContent = 'إضافة منتج جديد';
    document.getElementById('modal-body').innerHTML = `
        <form id="add-product-form">
            <div class="form-group">
                <label>اسم المنتج *</label>
                <input type="text" name="name" required>
            </div>
            <div class="form-group">
                <label>الباركود (اتركه فارغاً للتوليد التلقائي)</label>
                <input type="text" name="barcode" placeholder="سيتم توليده تلقائياً إذا تركته فارغاً">
            </div>
            <div class="form-group">
                <label>الفئة</label>
                <input type="text" name="category" list="categories-list">
                <datalist id="categories-list">
                    ${Products.getCategories().map(cat => `<option value="${cat}">`).join('')}
                </datalist>
            </div>
            <div class="form-group">
                <label>سعر البيع *</label>
                <input type="number" name="price" step="0.01" required>
            </div>
            <div class="form-group">
                <label>سعر التكلفة *</label>
                <input type="number" name="cost" step="0.01" required>
            </div>
            <div class="form-group">
                <label>المخزون *</label>
                <input type="number" name="stock" required>
            </div>
            <div class="form-group">
                <label>الحد الأدنى للمخزون</label>
                <input type="number" name="minStock" value="10">
            </div>
            <div class="form-group">
                <label>الفرع</label>
                <select name="branchId">
                    <option value="">الكل</option>
                    ${branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">إضافة</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
            </div>
        </form>
    `;
    
    document.getElementById('modal-overlay').classList.remove('hidden');
    
    document.getElementById('add-product-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const productData = Object.fromEntries(formData.entries());
        productData.price = parseFloat(productData.price) || 0;
        productData.cost = parseFloat(productData.cost) || 0;
        productData.stock = parseInt(productData.stock, 10) || 0;
        productData.minStock = parseInt(productData.minStock, 10) || 0;
        productData.branchId = productData.branchId ? parseInt(productData.branchId, 10) : null;
        
        // توليد باركود تلقائي إن لم يقدّم المستخدم واحدًا
        if (!productData.barcode) {
            let code = generateBarcodeNumber();
            const existing = Products.getAll();
            while (existing.find(p => p.barcode === code)) {
                code = generateBarcodeNumber();
            }
            productData.barcode = code;
        } else {
            // تأكيد عدم تكرار الباركود المقدم
            const existing = Products.getAll();
            if (existing.find(p => p.barcode === productData.barcode)) {
                showToast('الباركود موجود بالفعل، سيتم توليد باركود جديد', 'warning');
                let code = generateBarcodeNumber();
                while (existing.find(p => p.barcode === code)) code = generateBarcodeNumber();
                productData.barcode = code;
            }
        }

        Products.add(productData);
        closeModal();
        showToast('تم إضافة المنتج بنجاح', 'success');
        renderProductsPage();
    });
};

// عرض نافذة تعديل منتج
const showEditProductModal = (productId) => {
    const product = Products.getAll().find(p => p.id === productId);
    const branches = Storage.get('branches') || [];
    
    if (!product) return;
    
    document.getElementById('modal-title').textContent = 'تعديل المنتج';
    document.getElementById('modal-body').innerHTML = `
        <form id="edit-product-form">
            <div class="form-group">
                <label>اسم المنتج *</label>
                <input type="text" name="name" value="${product.name}" required>
            </div>
            <div class="form-group">
                <label>الباركود *</label>
                <input type="text" name="barcode" value="${product.barcode}" required>
            </div>
            <div class="form-group">
                <label>الفئة</label>
                <input type="text" name="category" value="${product.category}" list="categories-list">
                <datalist id="categories-list">
                    ${Products.getCategories().map(cat => `<option value="${cat}">`).join('')}
                </datalist>
            </div>
            <div class="form-group">
                <label>سعر البيع *</label>
                <input type="number" name="price" step="0.01" value="${product.price}" required>
            </div>
            <div class="form-group">
                <label>سعر التكلفة *</label>
                <input type="number" name="cost" step="0.01" value="${product.cost}" required>
            </div>
            <div class="form-group">
                <label>المخزون *</label>
                <input type="number" name="stock" value="${product.stock}" required>
            </div>
            <div class="form-group">
                <label>الحد الأدنى للمخزون</label>
                <input type="number" name="minStock" value="${product.minStock}">
            </div>
            <div class="form-group">
                <label>الفرع</label>
                <select name="branchId">
                    <option value="">الكل</option>
                    ${branches.map(b => `<option value="${b.id}" ${product.branchId === b.id ? 'selected' : ''}>${b.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">حفظ التغييرات</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
            </div>
        </form>
    `;
    
    document.getElementById('modal-overlay').classList.remove('hidden');
    
    document.getElementById('edit-product-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const productData = Object.fromEntries(formData.entries());
        productData.price = parseFloat(productData.price) || 0;
        productData.cost = parseFloat(productData.cost) || 0;
        productData.stock = parseInt(productData.stock, 10) || 0;
        productData.minStock = parseInt(productData.minStock, 10) || 0;
        productData.branchId = productData.branchId ? parseInt(productData.branchId, 10) : null;
        
        Products.update(productId, productData);
        closeModal();
        showToast('تم تحديث المنتج بنجاح', 'success');
        renderProductsPage();
    });
};

// حذف منتج
const deleteProduct = (productId) => {
    if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
        Products.delete(productId);
        showToast('تم حذف المنتج بنجاح', 'success');
        renderProductsPage();
    }
};

// طباعة باركود
const printBarcode = (productId) => {
    const product = Products.getAll().find(p => p.id === productId);
    if (!product) return;
    const printWindow = window.open('', '_blank');
    const settings = Storage.get('settings') || {};

    // Use JsBarcode for professional barcode rendering in the print window
    printWindow.document.write(`
        <html>
        <head>
            <title>طباعة باركود - ${product.name}</title>
            <meta charset="utf-8">
            <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js"></script>
            <style>
                @media print { body { -webkit-print-color-adjust: exact; } }
                body { font-family: Cairo, Arial, sans-serif; color: #111827; padding: 18px; }
                .receipt { max-width: 520px; margin: 0 auto; border: 1px solid #e5e7eb; padding: 18px; border-radius: 8px; }
                .header { text-align: center; margin-bottom: 10px; }
                .company { font-size: 20px; font-weight: 900; }
                .meta { font-size: 12px; color: #6b7280; }
                .product { display:flex; flex-direction:column; gap:8px; align-items:center; margin: 8px 0; }
                .product .info { text-align: center; width:100% }
                .product .info .name { font-weight: 900; font-size: 20px; margin-bottom:6px }
                .product .info .sku { font-size: 14px; color: #374151; margin-top:4px }
                .price { font-size: 20px; color: #0ea5a4; font-weight: 900; margin-top:6px }
                .barcode-wrap { text-align:center; margin-top: 12px; }
                .barcode-wrap svg { width:100%; max-width:360px; height:auto; }
                .qr-wrap { display:flex; align-items:center; justify-content:center; }
                .qr-wrap img { width:180px; height:180px; object-fit:contain; }
                .details { margin-top: 10px; display:flex; justify-content:space-between; font-size:13px; color:#374151 }
                .footer { font-size: 12px; color: #6b7280; text-align: center; margin-top: 14px; }
                .logo { max-height:60px; margin-bottom:6px; }
            </style>
        </head>
        <body>
            <div class="receipt">
                <div class="header">
                    ${settings.companyLogo ? `<img src="${settings.companyLogo}" class="logo" alt="logo">` : ''}
                    <div class="company">${settings.companyName || 'متجر'}</div>
                    <div class="meta">${settings.companyAddress || ''} • ${settings.companyPhone || ''}</div>
                    <div class="meta">${formatDate(new Date(), true)}</div>
                </div>
                <div class="product">
                    <div class="qr-wrap" id="qr-wrap">
                        <div style="width:180px;height:180px;border-radius:8px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;color:#9ca3af">QR</div>
                    </div>
                    <div class="info">
                        <div class="name">${product.name}</div>
                        <div class="sku">الرمز: ${product.barcode}</div>
                        <div class="price">${formatCurrency(product.price)}</div>
                    </div>
                </div>
                <div class="barcode-wrap">
                    <svg id="barcode"></svg>
                </div>
                <!-- cost and stock intentionally omitted per user request -->
                <div class="footer">${settings.receiptFooter || ''}</div>
            </div>
            <script>
                document.addEventListener('DOMContentLoaded', function(){
                    // generate barcode (svg)
                    try {
                        JsBarcode('#barcode', '${product.barcode}', { format: 'CODE128', displayValue: true, fontSize: 14, height: 60, margin:10 });
                    } catch (e) {
                        const img = new Image();
                        img.src = '${generateBarcodeDataUrl(product.barcode,3,80)}';
                        const wrap = document.querySelector('.barcode-wrap');
                        wrap.innerHTML = '';
                        wrap.appendChild(img);
                    }

                    // generate QR (product barcode encoded) using qrcode lib if available
                    try {
                        if (window.QRCode && typeof QRCode.toDataURL === 'function') {
                            // generate larger QR
                            QRCode.toDataURL('${product.barcode}', { width: 220 }, function (err, url) {
                                if (!err) {
                                    const img = new Image();
                                    img.src = url;
                                    img.alt = 'QR';
                                    img.style.width = '180px';
                                    img.style.height = '180px';
                                    const qrWrap = document.getElementById('qr-wrap');
                                    if (qrWrap) {
                                        qrWrap.innerHTML = '';
                                        qrWrap.appendChild(img);
                                    }
                                }
                            });
                        }
                    } catch (e) {
                        // ignore QR errors
                    }

                    setTimeout(() => { window.print(); window.close(); }, 500);
                });
            </script>
        </body>
        </html>
    `);
};

// استيراد المنتجات
const showImportProductsModal = () => {
    document.getElementById('modal-title').textContent = 'استيراد منتجات';
    document.getElementById('modal-body').innerHTML = `
        <div class="form-group">
            <label>اختر ملف JSON يحتوي على قائمة منتجات</label>
            <input type="file" id="import-products-file" accept="application/json">
        </div>
        <div class="form-actions">
            <button type="button" class="btn btn-primary" id="import-products-button">استيراد</button>
            <button type="button" class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
        </div>
    `;
    document.getElementById('modal-overlay').classList.remove('hidden');

    document.getElementById('import-products-button').addEventListener('click', () => {
        const fileInput = document.getElementById('import-products-file');
        const file = fileInput.files[0];
        if (!file) {
            showToast('يرجى اختيار ملف JSON صالح', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                if (!Array.isArray(imported)) throw new Error('تنسيق غير صحيح');

                imported.forEach(item => {
                    const productData = {
                        name: item.name || item.productName || '',
                        barcode: item.barcode || item.code || '',
                        category: item.category || item.categoryName || '',
                        price: parseFloat(item.price) || 0,
                        cost: parseFloat(item.cost) || 0,
                        stock: parseInt(item.stock, 10) || 0,
                        minStock: parseInt(item.minStock, 10) || parseInt(item.minimumStock, 10) || 0,
                        branchId: item.branchId || null
                    };
                    if (productData.barcode && productData.name) {
                        const existing = Products.getAll().find(p => p.barcode === productData.barcode);
                        if (existing) {
                            Products.update(existing.id, productData);
                        } else {
                            Products.add(productData);
                        }
                    }
                });

                closeModal();
                showToast('تم استيراد المنتجات بنجاح', 'success');
                renderProductsPage();
            } catch (error) {
                showToast('فشل الاستيراد، يرجى التحقق من تنسيق الملف', 'error');
            }
        };
        reader.readAsText(file, 'utf-8');
    });
};

// تصدير المنتجات
const exportProducts = () => {
    const products = Products.getAll();
    const csv = [
        ['الباركود', 'اسم المنتج', 'الفئة', 'سعر البيع', 'سعر التكلفة', 'المخزون', 'الحد الأدنى'],
        ...products.map(p => [p.barcode, p.name, p.category, p.price, p.cost, p.stock, p.minStock])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'products.csv';
    link.click();
};

