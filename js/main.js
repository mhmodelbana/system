// الملف الرئيسي
let currentPage = 'dashboard';

// تحميل الصفحة
const loadPage = (pageName) => {
    currentPage = pageName;
    const contentArea = document.getElementById('content-area');
    const pageTitle = document.getElementById('page-title');
    
    // تحديث العنوان
    const titles = {
        dashboard: 'الرئيسية',
        pos: 'نقطة البيع',
        products: 'المنتجات',
        inventory: 'المخزون',
        suppliers: 'الموردين',
        purchases: 'المشتريات',
        customers: 'العملاء',
        discounts: 'العروض والخصومات',
        reports: 'التقارير',
        sales: 'الفواتير',
        users: 'المستخدمين',
        branches: 'الفروع',
        settings: 'الإعدادات'
    };
    
    pageTitle.textContent = titles[pageName] || pageName;
    
    // تحديث القائمة النشطة
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageName) {
            item.classList.add('active');
        }
    });
    
    // تحميل محتوى الصفحة
    switch (pageName) {
        case 'dashboard':
            renderDashboardPage();
            break;
        case 'pos':
            renderPOSPage();
            break;
        case 'products':
            renderProductsPage();
            break;
        case 'inventory':
            renderInventoryPage();
            break;
        case 'suppliers':
            renderSuppliersPage();
            break;
        case 'purchases':
            renderPurchasesPage();
            break;
        case 'sales':
            renderSalesPage();
            break;
        case 'customers':
            renderCustomersPage();
            break;
        case 'discounts':
            renderDiscountsPage();
            break;
        case 'reports':
            renderReportsPage();
            break;
        case 'users':
            renderUsersPage();
            break;
        case 'branches':
            renderBranchesPage();
            break;
        case 'settings':
            renderSettingsPage();
            break;
        default:
            renderDashboardPage();
    }
};


// عرض صفحة الإعدادات
const renderSettingsPage = () => {
    const settings = Storage.get('settings') || {};

    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div class="page-header">
            <h3>الإعدادات العامة</h3>
        </div>

        <div class="table-container">
            <form id="settings-form">
                <div class="form-group">
                    <label>اسم الشركة</label>
                    <input type="text" name="companyName" value="${settings.companyName || ''}">
                </div>
                <div class="form-group">
                    <label>عنوان الشركة</label>
                    <input type="text" name="companyAddress" value="${settings.companyAddress || ''}">
                </div>
                <div class="form-group">
                    <label>هاتف الشركة</label>
                    <input type="tel" name="companyPhone" value="${settings.companyPhone || ''}">
                </div>
                <div class="form-group">
                    <label>العملة</label>
                    <input type="text" name="currency" value="${settings.currency || 'ج.م'}">
                </div>
                <div class="form-group">
                    <label>نسبة الضريبة (%)</label>
                    <input type="number" name="taxRate" value="${settings.taxRate || 0}" step="0.1">
                </div>
                <div class="form-group">
                    <label>بادئة الباركود</label>
                    <input type="text" name="barcodePrefix" value="${settings.barcodePrefix || '100'}">
                </div>
                <div class="form-group">
                    <label>تذييل الإيصال</label>
                    <textarea name="receiptFooter" rows="3">${settings.receiptFooter || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" name="lowStockAlert" ${settings.lowStockAlert ? 'checked' : ''}>
                        تنبيه نقص المخزون
                    </label>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">حفظ الإعدادات</button>
                </div>
            </form>
        </div>

        <div class="page-header">
            <h3>النسخ الاحتياطي</h3>
        </div>

        <div class="table-container">
            <div class="form-group">
                <button class="btn btn-success" onclick="backupData()">
                    <i class="fas fa-download"></i>
                    تحميل نسخة احتياطية
                </button>
                <button class="btn btn-info" onclick="document.getElementById('restore-file').click()">
                    <i class="fas fa-upload"></i>
                    استعادة نسخة احتياطية
                </button>
                <input type="file" id="restore-file" style="display: none;" accept=".json" onchange="restoreData(this)">
            </div>
        </div>

        <div class="page-header">
            <h3>مسح البيانات</h3>
        </div>

        <div class="table-container">
            <div class="form-group">
                <button class="btn btn-danger" onclick="clearAllData()">
                    <i class="fas fa-trash"></i>
                    مسح جميع البيانات
                </button>
            </div>
        </div>
    `;

    document.getElementById('settings-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const newSettings = {
            companyName: formData.get('companyName'),
            companyAddress: formData.get('companyAddress'),
            companyPhone: formData.get('companyPhone'),
            currency: formData.get('currency'),
            taxRate: parseFloat(formData.get('taxRate')),
            barcodePrefix: formData.get('barcodePrefix'),
            receiptFooter: formData.get('receiptFooter'),
            lowStockAlert: formData.get('lowStockAlert') === 'on'
        };
        Storage.set('settings', newSettings);
        showToast('تم حفظ الإعدادات بنجاح', 'success');
        // If POS is open, refresh cart totals to reflect new taxRate immediately
        try {
            if (typeof updateCartDisplay === 'function' && currentPage === 'pos') {
                updateCartDisplay();
            }
        } catch (e) {
            console.error('Failed to update POS after settings change', e);
        }
    });
};

// النسخ الاحتياطي
const backupData = () => {
    const backup = Storage.backup();
    if (backup) {
        const blob = new Blob([backup], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        showToast('تم تحميل النسخة الاحتياطية', 'success');
    }
};

// استعادة النسخة الاحتياطية
const restoreData = (input) => {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (Storage.restore(e.target.result)) {
                showToast('تم استعادة النسخة الاحتياطية بنجاح', 'success');
                location.reload();
            } else {
                showToast('خطأ في استعادة النسخة الاحتياطية', 'error');
            }
        };
        reader.readAsText(file);
    }
};

// مسح جميع البيانات
const clearAllData = () => {
    if (confirm('هل أنت متأكد من مسح جميع البيانات؟ هذا الإجراء لا يمكن التراجع عنه!')) {
        if (confirm('تأكيد نهائي: سيتم مسح جميع البيانات!')) {
            Storage.clear();
            initializeData();
            showToast('تم مسح جميع البيانات', 'success');
            location.reload();
        }
    }
};

// عرض صفحة لوحة التحكم
const renderDashboardPage = () => {
    const contentArea = document.getElementById('content-area');
    const sales = Storage.get('sales') || [];
    const products = Products.getAll();
    const customers = Customers.getAll();
    const today = new Date().toDateString();
    
    // مبيعات اليوم
    const todaySales = sales.filter(s => new Date(s.createdAt).toDateString() === today);
    const todayRevenue = todaySales.reduce((sum, s) => sum + s.totals.total, 0);
    
    // مبيعات الشهر
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const monthSales = sales.filter(s => {
        const date = new Date(s.createdAt);
        return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
    });
    const monthRevenue = monthSales.reduce((sum, s) => sum + s.totals.total, 0);
    
    // المنتجات منخفضة المخزون
    const lowStockProducts = Products.getLowStock();
    
    // آخر المبيعات
    const recentSales = sales.slice(-5).reverse();

    contentArea.innerHTML = `
        <div class="cards-grid">
            <div class="card">
                <div class="card-icon primary">
                    <i class="fas fa-chart-line"></i>
                </div>
                <div class="card-title">مبيعات اليوم</div>
                <div class="card-value">${formatCurrency(todayRevenue)}</div>
                <p style="margin-top: 10px; font-size: 14px; color: var(--secondary-color);">
                    ${todaySales.length} فاتورة
                </p>
            </div>
            <div class="card">
                <div class="card-icon success">
                    <i class="fas fa-calendar"></i>
                </div>
                <div class="card-title">مبيعات الشهر</div>
                <div class="card-value">${formatCurrency(monthRevenue)}</div>
                <p style="margin-top: 10px; font-size: 14px; color: var(--secondary-color);">
                    ${monthSales.length} فاتورة
                </p>
            </div>
            <div class="card">
                <div class="card-icon warning">
                    <i class="fas fa-boxes"></i>
                </div>
                <div class="card-title">المنتجات</div>
                <div class="card-value">${products.length}</div>
                <p style="margin-top: 10px; font-size: 14px; color: var(--secondary-color);">
                    ${lowStockProducts.length} منخفض المخزون
                </p>
            </div>
            <div class="card">
                <div class="card-icon info">
                    <i class="fas fa-users"></i>
                </div>
                <div class="card-title">العملاء</div>
                <div class="card-value">${customers.length}</div>
            </div>
        </div>

        <div class="dashboard-actions" style="margin: 20px 0; display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));">
            <button class="btn btn-primary" onclick="loadPage('products')">إضافة منتج جديد</button>
            <button class="btn btn-success" onclick="loadPage('pos')">فتح نقطة بيع</button>
            <button class="btn btn-warning" onclick="loadPage('inventory')">عرض المخزون المنخفض</button>
            <button class="btn btn-info" onclick="loadPage('reports')">عرض تقارير البيع</button>
        </div>

        ${lowStockProducts.length > 0 ? `
        <div class="table-container">
            <div class="table-header">
                <h3>تنبيهات نقص المخزون</h3>
                <button class="btn btn-sm btn-primary" onclick="loadPage('inventory')">
                    عرض الكل
                </button>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>المنتج</th>
                        <th>المخزون</th>
                        <th>الحد الأدنى</th>
                    </tr>
                </thead>
                <tbody>
                    ${lowStockProducts.slice(0, 5).map(p => `
                        <tr>
                            <td>${p.name}</td>
                            <td class="text-danger">${p.stock}</td>
                            <td>${p.minStock}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}

        <div class="table-container">
            <div class="table-header">
                <h3>آخر المبيعات</h3>
                <button class="btn btn-sm btn-primary" onclick="loadPage('reports')">
                    عرض الكل
                </button>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>رقم الفاتورة</th>
                        <th>التاريخ</th>
                        <th>الإجمالي</th>
                        <th>طريقة الدفع</th>
                    </tr>
                </thead>
                <tbody>
                    ${recentSales.length > 0 ? recentSales.map(sale => `
                        <tr>
                            <td>${sale.invoiceNumber || sale.id}</td>
                            <td>${formatDate(sale.createdAt, true)}</td>
                            <td>${formatCurrency(sale.totals.total)}</td>
                            <td>${sale.paymentMethod === 'cash' ? 'نقدي' : sale.paymentMethod === 'card' ? 'بطاقة' : 'تحويل'}</td>
                        </tr>
                    `).join('') : '<tr><td colspan="4" style="text-align: center;">لا توجد مبيعات</td></tr>'}
                </tbody>
            </table>
        </div>
    `;
};

// إغلاق النافذة المنبثقة
const closeModal = () => {
    document.getElementById('modal-overlay').classList.add('hidden');
};

// عرض التنبيه
const showToast = (message, type = 'info') => {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
};

// عرض الإشعار
const showNotification = (message, type = 'info') => {
    const count = document.getElementById('notification-count');
    count.textContent = parseInt(count.textContent) + 1;
    showToast(message, type);
};

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', () => {
    // إضافة مستمعي الأحداث للقائمة
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            loadPage(page);
        });
    });

    // إغلاق النافذة المنبثقة عند النقر خارجها
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'modal-overlay') {
            closeModal();
        }
    });

    // إغلاق النافذة المنبثقة عند النقر على زر الإغلاق
    document.querySelector('.modal-close').addEventListener('click', closeModal);

    // تحميل الصفحة الافتراضية
    if (Auth.checkAuth()) {
        loadPage('dashboard');
    }
});

