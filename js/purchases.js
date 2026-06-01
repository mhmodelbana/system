// إدارة المشتريات
const Purchases = {
    // إضافة مشتريات
    add: (purchaseData) => {
        const purchases = Storage.get('purchases') || [];
        const newPurchase = {
            id: generateId(),
            ...purchaseData,
            createdAt: new Date().toISOString()
        };
        purchases.push(newPurchase);
        Storage.set('purchases', purchases);
        return newPurchase;
    },

    // تحديث مشتريات
    update: (purchaseId, purchaseData) => {
        const purchases = Storage.get('purchases') || [];
        const index = purchases.findIndex(p => p.id === purchaseId);
        if (index !== -1) {
            purchases[index] = { ...purchases[index], ...purchaseData };
            Storage.set('purchases', purchases);
            return purchases[index];
        }
        return null;
    },

    // حذف مشتريات
    delete: (purchaseId) => {
        const purchases = Storage.get('purchases') || [];
        const filteredPurchases = purchases.filter(p => p.id !== purchaseId);
        Storage.set('purchases', filteredPurchases);
        return true;
    },

    // الحصول على جميع المشتريات
    getAll: () => {
        return Storage.get('purchases') || [];
    },

    // البحث عن مشتريات
    search: (query) => {
        const purchases = Storage.get('purchases') || [];
        const suppliers = Suppliers.getAll();
        const lowerQuery = query.toLowerCase();
        return purchases.filter(p => {
            const supplier = suppliers.find(s => s.id === p.supplierId);
            const matchesId = String(p.id || '').toLowerCase().includes(lowerQuery);
            const matchesSupplier = supplier && (
                (supplier.name || '').toLowerCase().includes(lowerQuery) ||
                (supplier.phone || '').toLowerCase().includes(lowerQuery) ||
                (supplier.email || '').toLowerCase().includes(lowerQuery)
            );
            return matchesId || matchesSupplier;
        });
    },

    // الحصول على مشتريات مورد
    getBySupplier: (supplierId) => {
        const purchases = Storage.get('purchases') || [];
        return purchases.filter(p => p.supplierId === supplierId);
    },

    // الحصول على تقرير المشتريات
    getReport: (startDate, endDate) => {
        const purchases = Storage.get('purchases') || [];
        const filteredPurchases = purchases.filter(p => {
            const purchaseDate = new Date(p.createdAt);
            return (!startDate || purchaseDate >= new Date(startDate)) &&
                   (!endDate || purchaseDate <= new Date(endDate));
        });

        const totalPurchases = filteredPurchases.reduce((sum, p) => sum + p.total, 0);

        return {
            purchasesCount: filteredPurchases.length,
            totalPurchases,
            averagePurchase: filteredPurchases.length > 0 ? totalPurchases / filteredPurchases.length : 0,
            purchases: filteredPurchases
        };
    }
};

// عرض صفحة المشتريات
const renderPurchasesPage = () => {
    const contentArea = document.getElementById('content-area');
    const purchases = Purchases.getAll();
    const suppliers = Suppliers.getAll();
    const report = Purchases.getReport();

    contentArea.innerHTML = `
        <div class="page-header">
            <div class="page-actions">
                <button class="btn btn-primary" onclick="showAddPurchaseModal()">
                    <i class="fas fa-plus"></i>
                    إضافة مشتريات
                </button>
                <button class="btn btn-secondary" onclick="showPurchaseReportModal()">
                    <i class="fas fa-chart-bar"></i>
                    تقرير المشتريات
                </button>
            </div>
        </div>

        <div class="cards-grid">
            <div class="card">
                <div class="card-icon primary">
                    <i class="fas fa-shopping-cart"></i>
                </div>
                <div class="card-title">إجمالي المشتريات</div>
                <div class="card-value">${report.purchasesCount}</div>
            </div>
            <div class="card">
                <div class="card-icon secondary">
                    <i class="fas fa-coins"></i>
                </div>
                <div class="card-title">إجمالي المصروف</div>
                <div class="card-value">${formatCurrency(report.totalPurchases)}</div>
            </div>
            <div class="card">
                <div class="card-icon success">
                    <i class="fas fa-calculator"></i>
                </div>
                <div class="card-title">المتوسط</div>
                <div class="card-value">${formatCurrency(report.averagePurchase)}</div>
            </div>
        </div>

        <div class="filters">
            <div class="filter-group">
                <label>البحث:</label>
                <input type="text" id="purchase-search" placeholder="رقم المشتريات أو المورد" oninput="filterPurchases()">
            </div>
            <div class="filter-group">
                <label>المورد:</label>
                <select id="supplier-filter" onchange="filterPurchases()">
                    <option value="">الكل</option>
                    ${suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                </select>
            </div>
        </div>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>رقم</th>
                        <th>المورد</th>
                        <th>الإجمالي</th>
                        <th>عدد المنتجات</th>
                        <th>التاريخ</th>
                        <th>الإجراءات</th>
                    </tr>
                </thead>
                <tbody id="purchases-table-body">
                    ${renderPurchasesRows(purchases, suppliers)}
                </tbody>
            </table>
        </div>
    `;
};

// عرض صفوف المشتريات
const renderPurchasesRows = (purchases, suppliers) => {
    if (purchases.length === 0) {
        return '<tr><td colspan="6" style="text-align: center;">لا توجد مشتريات</td></tr>';
    }

    return purchases.map(purchase => {
        const supplier = suppliers.find(s => s.id === purchase.supplierId);
        return `
            <tr>
                <td>${purchase.id}</td>
                <td>${supplier ? supplier.name : 'غير معروف'}</td>
                <td>${formatCurrency(purchase.total)}</td>
                <td>${purchase.items ? purchase.items.length : 0}</td>
                <td>${formatDate(purchase.createdAt)}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewPurchase('${purchase.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deletePurchase('${purchase.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
};

// تصفية المشتريات
const filterPurchases = () => {
    const search = document.getElementById('purchase-search').value;
    const supplierId = document.getElementById('supplier-filter').value;
    
    let purchases = Purchases.getAll();
    
    if (search) {
        purchases = Purchases.search(search);
    }
    
    if (supplierId) {
        purchases = purchases.filter(p => p.supplierId === supplierId);
    }
    
    const suppliers = Suppliers.getAll();
    document.getElementById('purchases-table-body').innerHTML = renderPurchasesRows(purchases, suppliers);
};

// عرض نافذة إضافة مشتريات
const showAddPurchaseModal = () => {
    const suppliers = Suppliers.getAll();
    const products = Products.getAll();

    document.getElementById('modal-title').textContent = 'إضافة مشتريات جديدة';
    document.getElementById('modal-body').innerHTML = `
        <form id="add-purchase-form">
            <div class="form-group">
                <label>المورد *</label>
                <select name="supplierId" required>
                    ${suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>المنتجات</label>
                <div id="purchase-items">
                    <div class="purchase-item" style="display: flex; gap: 10px; margin-bottom: 10px;">
                        <select name="product_0" class="product-select" style="flex: 2;" onchange="updateProductCost(this)">
                            ${products.map(p => `<option value="${p.id}" data-cost="${p.cost}">${p.name}</option>`).join('')}
                        </select>
                        <input type="number" name="quantity_0" placeholder="الكمية" style="flex: 1;" min="1" value="1">
                        <input type="number" name="cost_0" placeholder="التكلفة" style="flex: 1;" step="0.01">
                    </div>
                </div>
                <button type="button" class="btn btn-sm btn-secondary" onclick="addPurchaseItem()">إضافة منتج</button>
            </div>
            <div class="form-group">
                <label>الإجمالي:</label>
                <p id="purchase-total">${formatCurrency(0)}</p>
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
    
    let itemCount = 1;
    
    // تحديث تكلفة المنتج عند الاختيار
    window.updateProductCost = (select) => {
        const cost = select.options[select.selectedIndex].dataset.cost;
        const costInput = select.parentElement.querySelector('input[name^="cost_"]');
        if (cost && costInput) {
            costInput.value = cost;
            calculatePurchaseTotal();
        }
    };
    
    // حساب الإجمالي
    window.calculatePurchaseTotal = () => {
        let total = 0;
        document.querySelectorAll('.purchase-item').forEach(item => {
            const quantity = parseFloat(item.querySelector('input[name^="quantity_"]').value) || 0;
            const cost = parseFloat(item.querySelector('input[name^="cost_"]').value) || 0;
            total += quantity * cost;
        });
        document.getElementById('purchase-total').textContent = formatCurrency(total);
    };
    
    window.addPurchaseItem = () => {
        const itemsContainer = document.getElementById('purchase-items');
        const newItem = document.createElement('div');
        newItem.className = 'purchase-item';
        newItem.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px;';
        newItem.innerHTML = `
            <select name="product_${itemCount}" class="product-select" style="flex: 2;" onchange="updateProductCost(this)">
                ${products.map(p => `<option value="${p.id}" data-cost="${p.cost}">${p.name}</option>`).join('')}
            </select>
            <input type="number" name="quantity_${itemCount}" placeholder="الكمية" style="flex: 1;" min="1" value="1" onchange="calculatePurchaseTotal()">
            <input type="number" name="cost_${itemCount}" placeholder="التكلفة" style="flex: 1;" step="0.01" onchange="calculatePurchaseTotal()">
            <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove(); calculatePurchaseTotal()">×</button>
        `;
        itemsContainer.appendChild(newItem);
        itemCount++;
    };
    
    // إضافة مستمعي الأحداث للحساب التلقائي
    document.querySelectorAll('.purchase-item input').forEach(input => {
        input.addEventListener('change', calculatePurchaseTotal);
    });
    
    document.getElementById('add-purchase-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const purchaseData = {
            supplierId: formData.get('supplierId'),
            notes: formData.get('notes'),
            items: [],
            total: 0
        };
        
        // جمع المنتجات
        for (let i = 0; i < itemCount; i++) {
            const productId = formData.get(`product_${i}`);
            const quantity = parseInt(formData.get(`quantity_${i}`));
            const cost = parseFloat(formData.get(`cost_${i}`));
            
            if (productId && quantity && cost) {
                const product = Products.getAll().find(p => p.id === productId);
                if (product) {
                    purchaseData.items.push({
                        productId,
                        productName: product.name,
                        quantity,
                        cost
                    });
                    purchaseData.total += quantity * cost;
                    
                    // تحديث المخزون
                    Products.updateStock(productId, product.stock + quantity);
                }
            }
        }
        
        if (purchaseData.items.length === 0) {
            showToast('الرجاء إضافة منتج واحد على الأقل', 'error');
            return;
        }
        
        Purchases.add(purchaseData);
        closeModal();
        showToast('تم إضافة المشتريات بنجاح', 'success');
        renderPurchasesPage();
    });
};

// عرض تفاصيل المشتريات
const viewPurchase = (purchaseId) => {
    const purchase = Purchases.getAll().find(p => p.id === purchaseId);
    const suppliers = Suppliers.getAll();
    
    if (!purchase) return;
    
    const supplier = suppliers.find(s => s.id === purchase.supplierId);
    
    document.getElementById('modal-title').textContent = 'تفاصيل المشتريات';
    document.getElementById('modal-body').innerHTML = `
        <div class="form-group">
            <label>رقم المشتريات:</label>
            <p>${purchase.id}</p>
        </div>
        <div class="form-group">
            <label>المورد:</label>
            <p>${supplier ? supplier.name : 'غير معروف'}</p>
        </div>
        <div class="form-group">
            <label>التاريخ:</label>
            <p>${new Date(purchase.createdAt).toLocaleString('ar-SA')}</p>
        </div>
        <div class="form-group">
            <label>المنتجات:</label>
            <table>
                <thead>
                    <tr>
                        <th>المنتج</th>
                        <th>الكمية</th>
                        <th>التكلفة</th>
                        <th>الإجمالي</th>
                    </tr>
                </thead>
                <tbody>
                    ${purchase.items ? purchase.items.map(item => `
                        <tr>
                            <td>${item.productName}</td>
                            <td>${item.quantity}</td>
                            <td>${formatCurrency(item.cost)}</td>
                            <td>${formatCurrency(item.quantity * item.cost)}</td>
                        </tr>
                    `).join('') : ''}
                </tbody>
            </table>
        </div>
        <div class="form-group">
            <label>الإجمالي:</label>
            <p class="total">${formatCurrency(purchase.total)}</p>
        </div>
        ${purchase.notes ? `
        <div class="form-group">
            <label>ملاحظات:</label>
            <p>${purchase.notes}</p>
        </div>
        ` : ''}
        <div class="form-actions">
            <button class="btn btn-secondary" onclick="closeModal()">إغلاق</button>
        </div>
    `;
    
    document.getElementById('modal-overlay').classList.remove('hidden');
};

// حذف مشتريات
const deletePurchase = (purchaseId) => {
    if (confirm('هل أنت متأكد من حذف هذه المشتريات؟')) {
        Purchases.delete(purchaseId);
        showToast('تم حذف المشتريات بنجاح', 'success');
        renderPurchasesPage();
    }
};

// عرض تقرير المشتريات
const showPurchaseReportModal = () => {
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    
    document.getElementById('modal-title').textContent = 'تقرير المشتريات';
    document.getElementById('modal-body').innerHTML = `
        <div class="form-group">
            <label>من:</label>
            <input type="date" id="report-start-date" value="${firstDayOfMonth}">
        </div>
        <div class="form-group">
            <label>إلى:</label>
            <input type="date" id="report-end-date" value="${today}">
        </div>
        <div class="form-actions">
            <button class="btn btn-primary" onclick="generatePurchaseReport()">عرض التقرير</button>
            <button class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
        </div>
        <div id="purchase-report-result"></div>
    `;
    
    document.getElementById('modal-overlay').classList.remove('hidden');
};

// توليد تقرير المشتريات
const generatePurchaseReport = () => {
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;
    
    const report = Purchases.getReport(startDate, endDate);
    
    document.getElementById('purchase-report-result').innerHTML = `
        <div style="margin-top: 20px; padding: 20px; background: #f8fafc; border-radius: 10px;">
            <h4>ملخص التقرير</h4>
            <p>عدد المشتريات: ${report.purchasesCount}</p>
            <p>إجمالي المشتريات: ${formatCurrency(report.totalPurchases)}</p>
            <p>متوسط قيمة المشتريات: ${formatCurrency(report.averagePurchase)}</p>
        </div>
    `;
};

