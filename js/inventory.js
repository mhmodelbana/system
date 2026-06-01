// إدارة المخزون
const Inventory = {
    // إضافة حركة مخزون
    addMovement: (movementData) => {
        const movements = Storage.get('inventoryMovements') || [];
        const newMovement = {
            id: generateId(),
            ...movementData,
            createdAt: new Date().toISOString()
        };
        movements.push(newMovement);
        Storage.set('inventoryMovements', movements);
        
        // تحديث مخزون المنتج
        const product = Products.getAll().find(p => p.id === movementData.productId);
        if (product) {
            const newStock = movementData.type === 'in' 
                ? product.stock + movementData.quantity
                : product.stock - movementData.quantity;
            Products.updateStock(product.id, newStock);
        }
        
        return newMovement;
    },

    // الحصول على جميع الحركات
    getAllMovements: () => {
        return Storage.get('inventoryMovements') || [];
    },

    // الحصول على حركات منتج
    getProductMovements: (productId) => {
        const movements = Storage.get('inventoryMovements') || [];
        return movements.filter(m => m.productId === productId);
    },

    // جرد المخزون
    stockTake: (stockData) => {
        const products = Storage.get('products') || [];
        const differences = [];
        
        stockData.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            if (product) {
                const difference = item.actualStock - product.stock;
                if (difference !== 0) {
                    differences.push({
                        productId: item.productId,
                        productName: product.name,
                        systemStock: product.stock,
                        actualStock: item.actualStock,
                        difference: difference
                    });
                    
                    // تحديث المخزون
                    Products.updateStock(product.id, item.actualStock);
                    
                    // تسجيل الحركة
                    Inventory.addMovement({
                        productId: item.productId,
                        type: difference > 0 ? 'in' : 'out',
                        quantity: Math.abs(difference),
                        reason: 'جرد مخزون',
                        notes: `الفرق: ${difference}`
                    });
                }
            }
        });
        
        return differences;
    },

    // الحصول على تقرير المخزون
    getStockReport: () => {
        const products = Storage.get('products') || [];
        const branches = Storage.get('branches') || [];
        
        return {
            totalProducts: products.length,
            totalStock: products.reduce((sum, p) => sum + p.stock, 0),
            totalValue: products.reduce((sum, p) => sum + (p.stock * p.cost), 0),
            lowStockCount: products.filter(p => p.stock <= p.minStock).length,
            outOfStockCount: products.filter(p => p.stock === 0).length,
            byBranch: branches.map(branch => ({
                branchName: branch.name,
                products: products.filter(p => p.branchId === branch.id).length,
                stock: products.filter(p => p.branchId === branch.id).reduce((sum, p) => sum + p.stock, 0)
            }))
        };
    }
};

// عرض صفحة المخزون
const renderInventoryPage = () => {
    const contentArea = document.getElementById('content-area');
    const products = Products.getAll();
    const lowStockProducts = Products.getLowStock();
    const report = Inventory.getStockReport();

    contentArea.innerHTML = `
        <div class="cards-grid">
            <div class="card">
                <div class="card-icon primary">
                    <i class="fas fa-boxes"></i>
                </div>
                <div class="card-title">إجمالي المنتجات</div>
                <div class="card-value">${report.totalProducts}</div>
            </div>
            <div class="card">
                <div class="card-icon success">
                    <i class="fas fa-warehouse"></i>
                </div>
                <div class="card-title">إجمالي المخزون</div>
                <div class="card-value">${report.totalStock}</div>
            </div>
            <div class="card">
                <div class="card-icon warning">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="card-title">منتجات منخفضة المخزون</div>
                <div class="card-value">${report.lowStockCount}</div>
            </div>
            <div class="card">
                <div class="card-icon danger">
                    <i class="fas fa-times-circle"></i>
                </div>
                <div class="card-title">منتجات نفذت</div>
                <div class="card-value">${report.outOfStockCount}</div>
            </div>
        </div>

        <div class="page-header">
            <h3>تنبيهات نقص المخزون</h3>
            <div class="page-actions">
                <button class="btn btn-primary" onclick="showStockTakeModal()">
                    <i class="fas fa-clipboard-check"></i>
                    جرد مخزون
                </button>
                <button class="btn btn-secondary" onclick="showAddMovementModal()">
                    <i class="fas fa-exchange-alt"></i>
                    حركة مخزون
                </button>
            </div>
        </div>

        ${lowStockProducts.length > 0 ? `
        <div class="table-container">
            <div class="table-header">
                <h3>منتجات منخفضة المخزون</h3>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>الباركود</th>
                        <th>اسم المنتج</th>
                        <th>المخزون الحالي</th>
                        <th>الحد الأدنى</th>
                        <th>الفرق</th>
                        <th>الإجراء</th>
                    </tr>
                </thead>
                <tbody>
                    ${lowStockProducts.map(p => `
                        <tr>
                            <td>${p.barcode}</td>
                            <td>${p.name}</td>
                            <td class="text-danger">${p.stock}</td>
                            <td>${p.minStock}</td>
                            <td>${p.minStock - p.stock}</td>
                            <td>
                                <button class="btn btn-sm btn-success" onclick="quickRestock('${p.id}')">
                                    <i class="fas fa-plus"></i>
                                    طلب توريد
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : '<p class="text-success">لا توجد تنبيهات نقص مخزون</p>'}

        <div class="table-container">
            <div class="table-header">
                <h3>حركات المخزون الأخيرة</h3>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>التاريخ</th>
                        <th>المنتج</th>
                        <th>النوع</th>
                        <th>الكمية</th>
                        <th>السبب</th>
                    </tr>
                </thead>
                <tbody>
                    ${renderInventoryMovements()}
                </tbody>
            </table>
        </div>
    `;
};

// عرض حركات المخزون
const renderInventoryMovements = () => {
    const movements = Inventory.getAllMovements().slice(-10).reverse();
    const products = Products.getAll();
    
    if (movements.length === 0) {
        return '<tr><td colspan="5" style="text-align: center;">لا توجد حركات</td></tr>';
    }
    
    return movements.map(m => {
        const product = products.find(p => p.id === m.productId);
        return `
            <tr>
                <td>${new Date(m.createdAt).toLocaleDateString('ar-SA')}</td>
                <td>${product ? product.name : 'غير معروف'}</td>
                <td>
                    <span class="${m.type === 'in' ? 'text-success' : 'text-danger'}">
                        ${m.type === 'in' ? 'إدخال' : 'إخراج'}
                    </span>
                </td>
                <td>${m.quantity}</td>
                <td>${m.reason}</td>
            </tr>
        `;
    }).join('');
};

// عرض نافذة جرد المخزون
const showStockTakeModal = () => {
    const products = Products.getAll();
    
    document.getElementById('modal-title').textContent = 'جرد المخزون';
    document.getElementById('modal-body').innerHTML = `
        <form id="stock-take-form">
            <div class="form-group">
                <label>اختر المنتجات للجرد:</label>
                <div style="max-height: 400px; overflow-y: auto;">
                    ${products.map(p => `
                        <div class="stock-item" style="padding: 10px; border-bottom: 1px solid #eee;">
                            <label>${p.name} (${p.barcode})</label>
                            <div style="display: flex; gap: 10px; margin-top: 5px;">
                                <span>المخزون النظامي: ${p.stock}</span>
                                <input type="number" name="stock_${p.id}" placeholder="المخزون الفعلي" style="width: 150px;">
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">حفظ الجرد</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
            </div>
        </form>
    `;
    
    document.getElementById('modal-overlay').classList.remove('hidden');
    
    document.getElementById('stock-take-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const stockData = [];
        
        products.forEach(p => {
            const actualStock = formData.get(`stock_${p.id}`);
            if (actualStock !== null && actualStock !== '') {
                stockData.push({
                    productId: p.id,
                    actualStock: parseInt(actualStock)
                });
            }
        });
        
        const differences = Inventory.stockTake(stockData);
        
        if (differences.length > 0) {
            showToast(`تم اكتشاف ${differences.length} اختلافات في المخزون`, 'warning');
        } else {
            showToast('المخزون متطابق', 'success');
        }
        
        closeModal();
        renderInventoryPage();
    });
};

// عرض نافذة إضافة حركة مخزون
const showAddMovementModal = () => {
    const products = Products.getAll();
    
    document.getElementById('modal-title').textContent = 'إضافة حركة مخزون';
    document.getElementById('modal-body').innerHTML = `
        <form id="add-movement-form">
            <div class="form-group">
                <label>المنتج *</label>
                <select name="productId" required>
                    ${products.map(p => `<option value="${p.id}">${p.name} (${p.barcode})</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>نوع الحركة *</label>
                <select name="type" required>
                    <option value="in">إدخال</option>
                    <option value="out">إخراج</option>
                </select>
            </div>
            <div class="form-group">
                <label>الكمية *</label>
                <input type="number" name="quantity" required min="1">
            </div>
            <div class="form-group">
                <label>السبب *</label>
                <select name="reason" required>
                    <option value="شراء">شراء</option>
                    <option value="بيع">بيع</option>
                    <option value="تلف">تلف</option>
                    <option value="تحويل">تحويل</option>
                    <option value="تعديل">تعديل</option>
                    <option value="أخرى">أخرى</option>
                </select>
            </div>
            <div class="form-group">
                <label>ملاحظات</label>
                <textarea name="notes" rows="3"></textarea>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">إضافة</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
            </div>
        </form>
    `;
    
    document.getElementById('modal-overlay').classList.remove('hidden');
    
    document.getElementById('add-movement-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const movementData = Object.fromEntries(formData.entries());
        movementData.quantity = parseInt(movementData.quantity);
        
        Inventory.addMovement(movementData);
        closeModal();
        showToast('تم إضافة الحركة بنجاح', 'success');
        renderInventoryPage();
    });
};

// طلب توريد سريع
const quickRestock = (productId) => {
    const product = Products.getAll().find(p => p.id === productId);
    if (!product) return;
    
    const restockQuantity = product.minStock * 2 - product.stock;
    
    document.getElementById('modal-title').textContent = 'طلب توريد';
    document.getElementById('modal-body').innerHTML = `
        <div class="form-group">
            <label>المنتج:</label>
            <p>${product.name}</p>
        </div>
        <div class="form-group">
            <label>المخزون الحالي:</label>
            <p>${product.stock}</p>
        </div>
        <div class="form-group">
            <label>الكمية المقترحة للطلب:</label>
            <input type="number" id="restock-quantity" value="${restockQuantity}">
        </div>
        <div class="form-actions">
            <button class="btn btn-primary" onclick="confirmRestock('${productId}')">تأكيد الطلب</button>
            <button class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
        </div>
    `;
    
    document.getElementById('modal-overlay').classList.remove('hidden');
};

// تأكيد التوريد
const confirmRestock = (productId) => {
    const quantity = parseInt(document.getElementById('restock-quantity').value);
    
    Inventory.addMovement({
        productId: productId,
        type: 'in',
        quantity: quantity,
        reason: 'توريد',
        notes: 'طلب توريد سريع'
    });
    
    closeModal();
    showToast('تم إضافة طلب التوريد بنجاح', 'success');
    renderInventoryPage();
};
