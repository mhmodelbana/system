// إدارة التقارير
const Reports = {
    // تقرير المبيعات
    getSalesReport: (startDate, endDate, sales = null) => {
        const allSales = sales || Storage.get('sales') || [];
        const filteredSales = allSales.filter(s => {
            const saleDate = new Date(s.createdAt);
            return (!startDate || saleDate >= new Date(startDate)) &&
                   (!endDate || saleDate <= new Date(endDate));
        });

        const totalSales = filteredSales.reduce((sum, s) => sum + s.totals.total, 0);
        const totalProfit = filteredSales.reduce((sum, s) => {
            const cost = s.items.reduce((itemSum, item) => {
                const product = Products.getAll().find(p => p.id === item.productId);
                return itemSum + (product ? product.cost * item.quantity : 0);
            }, 0);
            return sum + (s.totals.total - cost);
        }, 0);

        return {
            salesCount: filteredSales.length,
            totalSales,
            totalProfit,
            averageSale: filteredSales.length > 0 ? totalSales / filteredSales.length : 0,
            sales: filteredSales
        };
    },

    // تقرير المنتجات الأكثر مبيعاً
    getTopProducts: (limit = 10, sales = null) => {
        const allSales = sales || Storage.get('sales') || [];
        const productSales = {};

        allSales.forEach(sale => {
            sale.items.forEach(item => {
                if (!productSales[item.productId]) {
                    productSales[item.productId] = {
                        productId: item.productId,
                        name: item.name,
                        quantity: 0,
                        revenue: 0
                    };
                }
                productSales[item.productId].quantity += item.quantity;
                productSales[item.productId].revenue += item.price * item.quantity;
            });
        });

        return Object.values(productSales)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, limit);
    },

    // تقرير العملاء الأكثر نشاطاً
    getTopCustomers: (limit = 10, sales = null) => {
        const allSales = sales || Storage.get('sales') || [];
        const customerSales = {};

        allSales.forEach(sale => {
            if (sale.customerId) {
                if (!customerSales[sale.customerId]) {
                    customerSales[sale.customerId] = {
                        customerId: sale.customerId,
                        totalSpent: 0,
                        purchaseCount: 0
                    };
                }
                customerSales[sale.customerId].totalSpent += sale.totals.total;
                customerSales[sale.customerId].purchaseCount += 1;
            }
        });

        const customers = Storage.get('customers') || [];
        return Object.values(customerSales)
            .map(cs => ({
                ...cs,
                name: customers.find(c => c.id === cs.customerId)?.name || 'غير معروف'
            }))
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, limit);
    },

    // تقرير الأرباح والخسائر
    getProfitLossReport: (startDate, endDate, sales = null) => {
        const allSales = sales || Storage.get('sales') || [];
        const salesList = allSales;
        const purchases = Storage.get('purchases') || [];

        const filteredSales = salesList.filter(s => {
            const saleDate = new Date(s.createdAt);
            return (!startDate || saleDate >= new Date(startDate)) &&
                   (!endDate || saleDate <= new Date(endDate));
        });

        const filteredPurchases = purchases.filter(p => {
            const purchaseDate = new Date(p.createdAt);
            return (!startDate || purchaseDate >= new Date(startDate)) &&
                   (!endDate || purchaseDate <= new Date(endDate));
        });

        const totalRevenue = filteredSales.reduce((sum, s) => {
            const saleTotal = s.totals?.total;
            if (typeof saleTotal === 'number') return sum + saleTotal;
            return sum + (s.items || []).reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0);
        }, 0);

        const totalCost = filteredSales.reduce((sum, s) => {
            const cost = (s.items || []).reduce((itemSum, item) => {
                const product = Products.getAll().find(p => String(p.id) === String(item.productId));
                const itemCost = product ? product.cost : (item.cost || 0);
                return itemSum + (itemCost * item.quantity);
            }, 0);
            return sum + cost;
        }, 0);

        const totalPurchases = filteredPurchases.reduce((sum, p) => {
            if (typeof p.total === 'number') return sum + p.total;
            if (p.totals && typeof p.totals.total === 'number') return sum + p.totals.total;
            return sum;
        }, 0);

        return {
            revenue: totalRevenue,
            costOfGoodsSold: totalCost,
            grossProfit: totalRevenue - totalCost,
            purchases: totalPurchases,
            netProfit: totalRevenue - totalCost - totalPurchases,
            salesCount: filteredSales.length,
            purchasesCount: filteredPurchases.length
        };
    },

    // تقرير المخزون
    getInventoryReport: () => {
        const products = Products.getAll();
        const totalValue = products.reduce((sum, p) => sum + (p.stock * p.cost), 0);
        const totalRetailValue = products.reduce((sum, p) => sum + (p.stock * p.price), 0);

        return {
            totalProducts: products.length,
            totalStock: products.reduce((sum, p) => sum + p.stock, 0),
            totalValue,
            totalRetailValue,
            potentialProfit: totalRetailValue - totalValue,
            lowStock: products.filter(p => p.stock <= p.minStock).length,
            outOfStock: products.filter(p => p.stock === 0).length
        };
    }
};

// عرض صفحة التقارير
const renderReportsPage = () => {
    if (!Auth.hasPermission('reports')) {
        showToast('ليس لديك صلاحية للوصول لهذه الصفحة', 'error');
        return;
    }

    const contentArea = document.getElementById('content-area');
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const branches = Storage.get('branches') || [];
    const customers = Storage.get('customers') || [];

    contentArea.innerHTML = `
        <div class="page-header">
            <div class="filters" style="align-items:flex-end; gap:10px; flex-wrap:wrap;">
                <div class="filter-group">
                    <label>نوع الفترة</label>
                    <select id="report-period-type" onchange="generateReports()">
                        <option value="monthly">شهري</option>
                        <option value="weekly">أسبوعي</option>
                        <option value="daily">يومي</option>
                        <option value="custom">مخصص</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>من</label>
                    <input type="date" id="report-start-date" value="${firstDayOfMonth}">
                </div>
                <div class="filter-group">
                    <label>إلى</label>
                    <input type="date" id="report-end-date" value="${today}">
                </div>
                <div class="filter-group">
                    <label>الفرع</label>
                    <select id="report-branch-filter">
                        <option value="">الكل</option>
                        ${branches.map(branch => `<option value="${branch.id}">${branch.name}</option>`).join('')}
                    </select>
                </div>
                <div class="filter-group">
                    <label>العميل</label>
                    <select id="report-customer-filter">
                        <option value="">الكل</option>
                        ${customers.map(customer => `<option value="${customer.id}">${customer.name}</option>`).join('')}
                    </select>
                </div>
                <div class="filter-group" style="display:flex;gap:8px;align-items:center;">
                    <button class="btn btn-primary" onclick="generateReports()">
                        <i class="fas fa-search"></i>
                        عرض التقرير
                    </button>
                    <button class="btn btn-info" onclick="printCurrentReport()">
                        <i class="fas fa-print"></i>
                        طباعة التقرير
                    </button>
                    <button class="btn btn-success" onclick="exportReportCsv()">
                        <i class="fas fa-file-csv"></i>
                        CSV
                    </button>
                    <button class="btn btn-secondary" onclick="exportReportExcel()">
                        <i class="fas fa-file-excel"></i>
                        Excel
                    </button>
                </div>
            </div>
        </div>

        <div class="cards-grid">
            <div class="card">
                <div class="card-icon primary">
                    <i class="fas fa-chart-line"></i>
                </div>
                <div class="card-title">إجمالي المبيعات</div>
                <div class="card-value" id="total-sales">0.00 ج.م</div>
            </div>
            <div class="card">
                <div class="card-icon success">
                    <i class="fas fa-dollar-sign"></i>
                </div>
                <div class="card-title">صافي الربح</div>
                <div class="card-value" id="net-profit">0.00 ج.م</div>
            </div>
            <div class="card">
                <div class="card-icon warning">
                    <i class="fas fa-receipt"></i>
                </div>
                <div class="card-title">عدد الفواتير</div>
                <div class="card-value" id="sales-count">0</div>
            </div>
            <div class="card">
                <div class="card-icon info">
                    <i class="fas fa-shopping-bag"></i>
                </div>
                <div class="card-title">متوسط قيمة الفاتورة</div>
                <div class="card-value" id="avg-sale">0.00 ج.م</div>
            </div>
        </div>

        <div class="cards-grid" style="margin-top: 14px;">
            <div class="card">
                <div class="card-icon info">
                    <i class="fas fa-balance-scale"></i>
                </div>
                <div class="card-title">الفترة الحالية</div>
                <div class="card-value" id="period-current">0.00 ج.م</div>
            </div>
            <div class="card">
                <div class="card-icon warning">
                    <i class="fas fa-arrow-left"></i>
                </div>
                <div class="card-title">الفترة السابقة</div>
                <div class="card-value" id="period-previous">0.00 ج.م</div>
            </div>
            <div class="card">
                <div class="card-icon success">
                    <i class="fas fa-percent"></i>
                </div>
                <div class="card-title">التغير</div>
                <div class="card-value" id="period-change">0%</div>
            </div>
            <div class="card">
                <div class="card-icon primary">
                    <i class="fas fa-warehouse"></i>
                </div>
                <div class="card-title">أقسام الفروع</div>
                <div class="card-value" id="branch-count">0</div>
            </div>
        </div>

        <div class="table-container">
            <div class="table-header">
                <h3>الفروع حسب المبيعات</h3>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>الفرع</th>
                        <th>عدد الفواتير</th>
                        <th>إجمالي المبيعات</th>
                    </tr>
                </thead>
                <tbody id="branch-sales-body">
                    <tr><td colspan="3" style="text-align: center;">اضغط على "عرض التقرير"</td></tr>
                </tbody>
            </table>
        </div>

        <div class="table-container">
            <div class="table-header">
                <h3>المنتجات الأكثر مبيعاً</h3>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>اسم المنتج</th>
                        <th>الكمية المباعة</th>
                        <th>الإيراد</th>
                    </tr>
                </thead>
                <tbody id="top-products-body">
                    <tr><td colspan="3" style="text-align: center;">اضغط على "عرض التقرير"</td></tr>
                </tbody>
            </table>
        </div>

        <div class="table-container">
            <div class="table-header">
                <h3>العملاء الأكثر نشاطاً</h3>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>اسم العميل</th>
                        <th>إجمالي المشتريات</th>
                        <th>عدد الفواتير</th>
                    </tr>
                </thead>
                <tbody id="top-customers-body">
                    <tr><td colspan="3" style="text-align: center;">اضغط على "عرض التقرير"</td></tr>
                </tbody>
            </table>
        </div>

        <div class="table-container">
            <div class="table-header">
                <h3>تقرير الأرباح والخسائر</h3>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>البند</th>
                        <th>القيمة</th>
                    </tr>
                </thead>
                <tbody id="profit-loss-body">
                    <tr><td colspan="2" style="text-align: center;">اضغط على "عرض التقرير"</td></tr>
                </tbody>
            </table>
        </div>

        <div class="table-container">
            <div class="table-header">
                <h3>تقرير المخزون</h3>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>البند</th>
                        <th>القيمة</th>
                    </tr>
                </thead>
                <tbody id="inventory-report-body">
                    <tr><td colspan="2" style="text-align: center;">اضغط على "عرض التقرير"</td></tr>
                </tbody>
            </table>
        </div>
    `;
};

const renderSaleInvoiceHtml = (sale) => {
    const settings = Storage.get('settings') || {};
    const customer = (Storage.get('customers') || []).find(c => c.id === sale.customerId);
    return `
        <div style="display: grid; gap: 14px;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
                <div>
                    <h3 style="margin:0;">فاتورة رقم ${sale.invoiceNumber || sale.id}</h3>
                    <p style="margin:4px 0 0;color:#64748b;">${formatDate(sale.createdAt, true)}</p>
                </div>
                <div style="text-align:right;">
                    <strong>${settings.companyName || ''}</strong><br>
                    <span style="color:#64748b;">${settings.companyPhone || ''}</span>
                </div>
            </div>
            <div style="padding:14px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc;">
                <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;">
                    <div><strong>العميل:</strong> ${customer?.name || 'نقدي'}</div>
                    <div><strong>الطريقة:</strong> ${sale.paymentMethod === 'cash' ? 'نقدي' : sale.paymentMethod === 'card' ? 'بطاقة' : 'تحويل'}</div>
                </div>
            </div>
            <div>
                <table style="width:100%;border-collapse:collapse;">
                    <thead>
                        <tr style="background:#eef2ff;color:#1e293b;text-align:right;">
                            <th style="padding:12px 10px;border:1px solid #e2e8f0;">المنتج</th>
                            <th style="padding:12px 10px;border:1px solid #e2e8f0;">الكمية</th>
                            <th style="padding:12px 10px;border:1px solid #e2e8f0;">السعر</th>
                            <th style="padding:12px 10px;border:1px solid #e2e8f0;">الإجمالي</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sale.items.map(item => `
                            <tr>
                                <td style="padding:12px 10px;border:1px solid #e2e8f0;">${item.name}</td>
                                <td style="padding:12px 10px;border:1px solid #e2e8f0;">${item.quantity}</td>
                                <td style="padding:12px 10px;border:1px solid #e2e8f0;">${formatCurrency(item.price)}</td>
                                <td style="padding:12px 10px;border:1px solid #e2e8f0;">${formatCurrency(item.price * item.quantity)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div style="display:grid;gap:8px;padding:16px;border:1px solid #e2e8f0;border-radius:16px;">
                <div style="display:flex;justify-content:space-between;"><span>المجموع</span><strong>${formatCurrency(sale.totals.subtotal)}</strong></div>
                <div style="display:flex;justify-content:space-between;"><span>الخصم</span><strong>${formatCurrency(sale.totals.discountAmount)}</strong></div>
                <div style="display:flex;justify-content:space-between;"><span>الضريبة</span><strong>${formatCurrency(sale.totals.tax)}</strong></div>
                <div style="display:flex;justify-content:space-between;color:#111827;font-size:18px;font-weight:800;"><span>الإجمالي</span><strong>${formatCurrency(sale.totals.total)}</strong></div>
            </div>
        </div>
    `;
};

// عرض صفحة الفواتير
const renderSalesPage = () => {
    const contentArea = document.getElementById('content-area');
    const today = new Date().toISOString().split('T')[0];

    const branches = Storage.get('branches') || [];
    const customers = Storage.get('customers') || [];

    contentArea.innerHTML = `
        <div class="page-header">
            <h3>سجل الفواتير</h3>
        </div>
        <div class="filters" style="align-items:flex-end; gap:10px; flex-wrap:wrap;">
            <div class="filter-group">
                <label>بحث برقم الفاتورة</label>
                <input type="text" id="sales-invoice-search" placeholder="أدخل رقم الفاتورة أو جزء منه">
            </div>
            <div class="filter-group">
                <label>الفرع</label>
                <select id="sales-branch-filter">
                    <option value="">الكل</option>
                    ${branches.map(branch => `<option value="${branch.id}">${branch.name}</option>`).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label>العميل</label>
                <select id="sales-customer-filter">
                    <option value="">الكل</option>
                    ${customers.map(customer => `<option value="${customer.id}">${customer.name}</option>`).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label>من</label>
                <input type="date" id="sales-start-date" value="${today}">
            </div>
            <div class="filter-group">
                <label>إلى</label>
                <input type="date" id="sales-end-date" value="${today}">
            </div>
            <button class="btn btn-primary" onclick="renderSalesTable()">
                <i class="fas fa-search"></i>
                تصفية
            </button>
            <button class="btn btn-success" onclick="printSelectedSales()">
                <i class="fas fa-print"></i>
                طباعة المختارة
            </button>
        </div>

        <div class="table-container">
            <div class="table-header">
                <h3>قائمة الفواتير</h3>
            </div>
            <table>
                <thead>
                    <tr>
                        <th><input type="checkbox" id="sales-select-all" onchange="toggleSelectAllSales(this.checked)"></th>
                        <th>رقم الفاتورة</th>
                        <th>التاريخ</th>
                        <th>الإجمالي</th>
                        <th>الفرع</th>
                        <th>العميل</th>
                        <th>العمليات</th>
                    </tr>
                </thead>
                <tbody id="sales-table-body">
                    <tr><td colspan="7" style="text-align: center;">اضغط على تصفية لعرض الفواتير</td></tr>
                </tbody>
            </table>
        </div>
    `;
    renderSalesTable();
};

const renderSalesTable = () => {
    const invoiceSearch = document.getElementById('sales-invoice-search').value.trim();
    const branchFilter = document.getElementById('sales-branch-filter').value;
    const customerFilter = document.getElementById('sales-customer-filter').value;
    const startDate = document.getElementById('sales-start-date').value;
    const endDate = document.getElementById('sales-end-date').value;
    let sales = Storage.get('sales') || [];

    if (invoiceSearch) {
        sales = sales.filter(sale => String(sale.invoiceNumber || sale.id).includes(invoiceSearch));
    }

    if (branchFilter) {
        sales = sales.filter(sale => String(sale.branchId) === branchFilter);
    }

    if (customerFilter) {
        sales = sales.filter(sale => String(sale.customerId) === customerFilter);
    }

    if (startDate) {
        sales = sales.filter(sale => new Date(sale.createdAt) >= new Date(`${startDate}T00:00:00`));
    }

    if (endDate) {
        sales = sales.filter(sale => new Date(sale.createdAt) <= new Date(`${endDate}T23:59:59`));
    }

    sales.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    document.getElementById('sales-table-body').innerHTML = sales.length > 0 ? sales.map(sale => `
        <tr>
            <td><input type="checkbox" class="sale-select-checkbox" value="${sale.id}"></td>
            <td>${sale.invoiceNumber || sale.id}</td>
            <td>${formatDate(sale.createdAt, true)}</td>
            <td>${formatCurrency(sale.totals.total)}</td>
            <td>${(Storage.get('branches') || []).find(b => b.id === sale.branchId)?.name || 'عام'}</td>
            <td>${(Storage.get('customers') || []).find(c => c.id === sale.customerId)?.name || 'نقدي'}</td>
            <td style="display:flex;gap:8px;flex-wrap:wrap;">
                <button class="btn btn-sm btn-info" onclick="showSaleDetails('${sale.id}')">
                    مشاهدة
                </button>
                <button class="btn btn-sm btn-warning" onclick="showEditSaleModal('${sale.id}')">
                    تعديل
                </button>
            </td>
        </tr>
    `).join('') : '<tr><td colspan="7" style="text-align: center;">لا توجد فواتير</td></tr>';
};

const toggleSelectAllSales = (checked) => {
    document.querySelectorAll('.sale-select-checkbox').forEach(cb => {
        cb.checked = checked;
    });
};

const printSelectedSales = () => {
    const selectedIds = Array.from(document.querySelectorAll('.sale-select-checkbox:checked')).map(cb => cb.value);
    if (selectedIds.length === 0) {
        showToast('اختر على الأقل فاتورة واحدة للطباعة', 'error');
        return;
    }

    const sales = Storage.get('sales') || [];
    const selectedSales = sales.filter(sale => selectedIds.includes(sale.id));
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showToast('تعذر فتح نافذة الطباعة. تأكد من السماح بالنوافذ المنبثقة.', 'error');
        return;
    }

    const html = selectedSales.map(sale => `
        <div style="margin-bottom: 32px; border-bottom: 1px dashed #d1d5db; padding-bottom:20px;">
            ${renderSaleInvoiceHtml(sale)}
        </div>
    `).join('');

    printWindow.document.write(`
        <html>
        <head>
            <meta charset="utf-8">
            <title>طباعة فواتير مختارة</title>
            <style>
                body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 24px; color: #111827; }
                .invoice-wrapper { max-width: 760px; margin: 0 auto; }
                .invoice-wrapper + .invoice-wrapper { page-break-before: always; }
            </style>
        </head>
        <body>
            ${html}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => {
        printWindow.print();
    };
};

const showSaleDetails = (saleId) => {
    const sales = Storage.get('sales') || [];
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    const customer = (Storage.get('customers') || []).find(c => c.id === sale.customerId);
    const settings = Storage.get('settings') || {};

    document.getElementById('modal-title').innerText = 'تفاصيل الفاتورة';
    document.getElementById('modal-body').innerHTML = `
        ${renderSaleInvoiceHtml(sale)}
        <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end;">
            <button class="btn btn-primary" onclick="printReceiptById('${sale.id}')">طباعة الفاتورة</button>
            <button class="btn btn-warning" onclick="showEditSaleModal('${sale.id}')">تعديل الفاتورة</button>
        </div>
    `;
    document.getElementById('modal-overlay').classList.remove('hidden');
};

const showEditSaleModal = (saleId) => {
    const sales = Storage.get('sales') || [];
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;
    const customers = Storage.get('customers') || [];
    const settings = Storage.get('settings') || {};

    document.getElementById('modal-title').innerText = 'تعديل الفاتورة';
    document.getElementById('modal-body').innerHTML = `
        <div style="display: grid; gap: 14px;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
                <div>
                    <h3 style="margin:0;">تعديل فاتورة ${sale.invoiceNumber || sale.id}</h3>
                    <p style="margin:4px 0 0;color:#64748b;">${formatDate(sale.createdAt, true)}</p>
                </div>
                <div style="text-align:right;">
                    <strong>${settings.companyName || ''}</strong><br>
                    <span style="color:#64748b;">${settings.companyPhone || ''}</span>
                </div>
            </div>
            <div style="padding:14px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc;display:grid;gap:12px;">
                <div style="display:flex;flex-wrap:wrap;gap:12px;">
                    <label style="display:flex;flex-direction:column;flex:1;min-width:200px;">
                        <span style="font-size:12px;color:#475569;margin-bottom:6px;">العميل</span>
                        <select id="edit-sale-customer">
                            <option value="">نقدي</option>
                            ${customers.map(c => `<option value="${c.id}" ${sale.customerId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                        </select>
                    </label>
                    <label style="display:flex;flex-direction:column;flex:1;min-width:200px;">
                        <span style="font-size:12px;color:#475569;margin-bottom:6px;">طريقة الدفع</span>
                        <select id="edit-sale-payment-method">
                            <option value="cash" ${sale.paymentMethod === 'cash' ? 'selected' : ''}>نقدي</option>
                            <option value="card" ${sale.paymentMethod === 'card' ? 'selected' : ''}>بطاقة</option>
                            <option value="transfer" ${sale.paymentMethod === 'transfer' ? 'selected' : ''}>تحويل</option>
                        </select>
                    </label>
                </div>
            </div>
            <div>
                <table id="edit-sale-items" style="width:100%;border-collapse:collapse;">
                    <thead>
                        <tr style="background:#eef2ff;color:#1e293b;text-align:right;">
                            <th style="padding:12px 10px;border:1px solid #e2e8f0;">المنتج</th>
                            <th style="padding:12px 10px;border:1px solid #e2e8f0;">الكمية</th>
                            <th style="padding:12px 10px;border:1px solid #e2e8f0;">السعر</th>
                            <th style="padding:12px 10px;border:1px solid #e2e8f0;">الإجمالي</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sale.items.map((item, index) => `
                            <tr>
                                <td style="padding:12px 10px;border:1px solid #e2e8f0;">${item.name}</td>
                                <td style="padding:12px 10px;border:1px solid #e2e8f0;">
                                    <input type="number" min="0.001" step="0.001" class="edit-sale-qty" data-index="${index}" value="${item.quantity}" style="width:100px;" onchange="updateSaleEditTotals('${sale.id}')">
                                </td>
                                <td style="padding:12px 10px;border:1px solid #e2e8f0;">
                                    <input type="number" min="0.01" step="0.01" class="edit-sale-price" data-index="${index}" value="${item.price}" style="width:100px;" onchange="updateSaleEditTotals('${sale.id}')">
                                </td>
                                <td style="padding:12px 10px;border:1px solid #e2e8f0;" class="edit-sale-line-total">${formatCurrency(item.price * item.quantity)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div style="display:grid;gap:8px;padding:16px;border:1px solid #e2e8f0;border-radius:16px;">
                <div style="display:flex;justify-content:space-between;"><span>المجموع</span><strong id="edit-sale-subtotal">${formatCurrency(sale.totals.subtotal)}</strong></div>
                <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
                    <span>الخصم</span>
                    <input type="number" id="edit-sale-discount" value="${sale.totals.discountAmount || 0}" min="0" step="0.01" style="width:120px;" onchange="updateSaleEditTotals('${sale.id}')">
                </div>
                <div style="display:flex;justify-content:space-between;"><span>الضريبة</span><strong id="edit-sale-tax">${formatCurrency(sale.totals.tax)}</strong></div>
                <div style="display:flex;justify-content:space-between;color:#111827;font-size:18px;font-weight:800;"><span>الإجمالي</span><strong id="edit-sale-total">${formatCurrency(sale.totals.total)}</strong></div>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end;">
                <button class="btn btn-primary" onclick="saveSaleEdits('${sale.id}')">حفظ التعديل</button>
                <button class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
            </div>
        </div>
    `;
    document.getElementById('modal-overlay').classList.remove('hidden');
};

const updateSaleEditTotals = (saleId) => {
    const rows = Array.from(document.querySelectorAll('#edit-sale-items tbody tr'));
    let subtotal = 0;

    rows.forEach(row => {
        const qtyInput = row.querySelector('.edit-sale-qty');
        const priceInput = row.querySelector('.edit-sale-price');
        const lineTotalCell = row.querySelector('.edit-sale-line-total');
        const quantity = parseFloat(qtyInput.value) || 0;
        const price = parseFloat(priceInput.value) || 0;
        const lineTotal = quantity * price;
        lineTotalCell.textContent = formatCurrency(lineTotal);
        subtotal += lineTotal;
    });

    const discountAmount = parseFloat(document.getElementById('edit-sale-discount').value) || 0;
    const settings = Storage.get('settings') || {};
    const taxRate = parseFloat(settings.taxRate) || 0;
    const taxable = Math.max(0, subtotal - discountAmount);
    const tax = parseFloat((taxable * (taxRate / 100)).toFixed(2));
    const total = parseFloat((taxable + tax).toFixed(2));

    document.getElementById('edit-sale-subtotal').innerText = formatCurrency(subtotal);
    document.getElementById('edit-sale-tax').innerText = formatCurrency(tax);
    document.getElementById('edit-sale-total').innerText = formatCurrency(total);
};

const saveSaleEdits = (saleId) => {
    const sales = Storage.get('sales') || [];
    const saleIndex = sales.findIndex(s => s.id === saleId);
    if (saleIndex === -1) return;

    const sale = sales[saleIndex];
    const editedItems = Array.from(document.querySelectorAll('#edit-sale-items tbody tr')).map(row => {
        const index = parseInt(row.querySelector('.edit-sale-qty').dataset.index, 10);
        const quantity = parseFloat(row.querySelector('.edit-sale-qty').value) || 0;
        const price = parseFloat(row.querySelector('.edit-sale-price').value) || 0;
        return {
            ...sale.items[index],
            quantity,
            price
        };
    });

    const discountAmount = parseFloat(document.getElementById('edit-sale-discount').value) || 0;
    const customerId = document.getElementById('edit-sale-customer').value || null;
    const paymentMethod = document.getElementById('edit-sale-payment-method').value;

    const products = Products.getAll();
    for (const editedItem of editedItems) {
        const originalItem = sale.items.find(i => i.productId === editedItem.productId);
        if (!originalItem) continue;
        const diff = editedItem.quantity - originalItem.quantity;
        const product = products.find(p => p.id === editedItem.productId);
        if (diff > 0 && product && product.stock < diff) {
            showToast(`المخزون غير كافٍ لتعديل كمية ${editedItem.name}`, 'error');
            return;
        }
    }

    editedItems.forEach(editedItem => {
        const originalItem = sale.items.find(i => i.productId === editedItem.productId);
        if (!originalItem) return;
        const diff = editedItem.quantity - originalItem.quantity;
        const product = Products.getAll().find(p => p.id === editedItem.productId);
        if (product && diff !== 0) {
            Products.updateStock(product.id, product.stock - diff);
        }
    });

    const subtotal = editedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const settings = Storage.get('settings') || {};
    const taxRate = parseFloat(settings.taxRate) || 0;
    const taxable = Math.max(0, subtotal - discountAmount);
    const tax = parseFloat((taxable * (taxRate / 100)).toFixed(2));
    const total = parseFloat((taxable + tax).toFixed(2));

    sale.items = editedItems;
    sale.customerId = customerId;
    sale.paymentMethod = paymentMethod;
    sale.totals = {
        subtotal,
        discountAmount,
        tax,
        total,
        discount: 0,
        pointsDiscount: sale.totals.pointsDiscount || 0
    };

    sales[saleIndex] = sale;
    Storage.set('sales', sales);

    closeModal();
    renderSalesTable();
    showToast('تم حفظ التعديل على الفاتورة', 'success');
};

// مساعدة تصفية المبيعات في التقارير
const getFilteredReportSales = () => {
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;
    const branchFilter = document.getElementById('report-branch-filter').value;
    const customerFilter = document.getElementById('report-customer-filter').value;

    return (Storage.get('sales') || []).filter(sale => {
        const saleDate = new Date(sale.createdAt);
        if (startDate && saleDate < new Date(`${startDate}T00:00:00`)) return false;
        if (endDate && saleDate > new Date(`${endDate}T23:59:59`)) return false;
        if (branchFilter && String(sale.branchId) !== branchFilter) return false;
        if (customerFilter && String(sale.customerId) !== customerFilter) return false;
        return true;
    });
};

const calculateSalesComparison = (startDate, endDate, sales) => {
    const currentStart = new Date(`${startDate}T00:00:00`);
    const currentEnd = new Date(`${endDate}T23:59:59`);
    const rangeMs = currentEnd.getTime() - currentStart.getTime() + 1;
    const prevEnd = new Date(currentStart.getTime() - 1000);
    const prevStart = new Date(prevEnd.getTime() - rangeMs + 1);
    const previousSales = (Storage.get('sales') || []).filter(sale => {
        const saleDate = new Date(sale.createdAt);
        return saleDate >= prevStart && saleDate <= prevEnd;
    });
    const currentTotal = sales.reduce((sum, s) => sum + s.totals.total, 0);
    const previousTotal = previousSales.reduce((sum, s) => sum + s.totals.total, 0);
    const change = previousTotal === 0 ? 100 : ((currentTotal - previousTotal) / previousTotal) * 100;
    return { currentTotal, previousTotal, change };
};

const getSalesByBranch = (sales) => {
    const branchMap = {};
    const branches = Storage.get('branches') || [];
    sales.forEach(sale => {
        const branchId = sale.branchId || 'none';
        if (!branchMap[branchId]) {
            branchMap[branchId] = { branchId, branchName: (branches.find(b => b.id === sale.branchId)?.name || 'غير محدد'), count: 0, total: 0 };
        }
        branchMap[branchId].count += 1;
        branchMap[branchId].total += sale.totals.total;
    });
    return Object.values(branchMap).sort((a, b) => b.total - a.total);
};

const formatPercent = (value) => {
    const amount = Number.isFinite(value) ? value : 0;
    const sign = amount > 0 ? '+' : '';
    return `${sign}${amount.toFixed(1)}%`;
};

const generateReports = () => {
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;
    const filteredSales = getFilteredReportSales();
    const branchSummary = getSalesByBranch(filteredSales);

    const salesReport = Reports.getSalesReport(startDate, endDate, filteredSales);
    const profitLossReport = Reports.getProfitLossReport(startDate, endDate, filteredSales);
    const topProducts = Reports.getTopProducts(10, filteredSales);
    const topCustomers = Reports.getTopCustomers(10, filteredSales);
    const comparison = calculateSalesComparison(startDate, endDate, filteredSales);
    const inventoryReport = Reports.getInventoryReport();

    document.getElementById('total-sales').textContent = formatCurrency(salesReport.totalSales);
    document.getElementById('sales-count').textContent = salesReport.salesCount;
    document.getElementById('avg-sale').textContent = formatCurrency(salesReport.averageSale);
    document.getElementById('net-profit').textContent = formatCurrency(profitLossReport.netProfit);
    document.getElementById('period-current').textContent = formatCurrency(comparison.currentTotal);
    document.getElementById('period-previous').textContent = formatCurrency(comparison.previousTotal);
    document.getElementById('period-change').textContent = formatPercent(comparison.change);
    document.getElementById('branch-count').textContent = branchSummary.length;

    document.getElementById('top-products-body').innerHTML = topProducts.length > 0 
        ? topProducts.map(p => `
            <tr>
                <td>${p.name}</td>
                <td>${p.quantity}</td>
                <td>${formatCurrency(p.revenue)}</td>
            </tr>
        `).join('')
        : '<tr><td colspan="3" style="text-align: center;">لا توجد بيانات</td></tr>';

    document.getElementById('top-customers-body').innerHTML = topCustomers.length > 0
        ? topCustomers.map(c => `
            <tr>
                <td>${c.name}</td>
                <td>${formatCurrency(c.totalSpent)}</td>
                <td>${c.purchaseCount}</td>
            </tr>
        `).join('')
        : '<tr><td colspan="3" style="text-align: center;">لا توجد بيانات</td></tr>';

    document.getElementById('branch-sales-body').innerHTML = branchSummary.length > 0
        ? branchSummary.map(branch => `
            <tr>
                <td>${branch.branchName}</td>
                <td>${branch.count}</td>
                <td>${formatCurrency(branch.total)}</td>
            </tr>
        `).join('')
        : '<tr><td colspan="3" style="text-align: center;">لا توجد بيانات</td></tr>';

    document.getElementById('profit-loss-body').innerHTML = `
        <tr>
            <td>إجمالي الإيرادات</td>
            <td>${formatCurrency(profitLossReport.revenue)}</td>
        </tr>
        <tr>
            <td>تكلفة البضاعة المباعة</td>
            <td>${formatCurrency(profitLossReport.costOfGoodsSold)}</td>
        </tr>
        <tr>
            <td>إجمالي الربح</td>
            <td>${formatCurrency(profitLossReport.grossProfit)}</td>
        </tr>
        <tr>
            <td>المشتريات</td>
            <td>${formatCurrency(profitLossReport.purchases)}</td>
        </tr>
        <tr class="total">
            <td>صافي الربح</td>
            <td>${formatCurrency(profitLossReport.netProfit)}</td>
        </tr>
    `;

    document.getElementById('inventory-report-body').innerHTML = `
        <tr>
            <td>إجمالي المنتجات</td>
            <td>${inventoryReport.totalProducts}</td>
        </tr>
        <tr>
            <td>إجمالي المخزون</td>
            <td>${inventoryReport.totalStock}</td>
        </tr>
        <tr>
            <td>قيمة المخزون (التكلفة)</td>
            <td>${formatCurrency(inventoryReport.totalValue)}</td>
        </tr>
        <tr>
            <td>قيمة المخزون (البيع)</td>
            <td>${formatCurrency(inventoryReport.totalRetailValue)}</td>
        </tr>
        <tr>
            <td>الربح المحتمل</td>
            <td>${formatCurrency(inventoryReport.potentialProfit)}</td>
        </tr>
        <tr>
            <td>منتجات منخفضة المخزون</td>
            <td class="text-warning">${inventoryReport.lowStock}</td>
        </tr>
        <tr>
            <td>منتجات نفذت</td>
            <td class="text-danger">${inventoryReport.outOfStock}</td>
        </tr>
    `;
    generateReports();
};

const printCurrentReport = () => {
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;
    const branchFilter = document.getElementById('report-branch-filter').value;
    const customerFilter = document.getElementById('report-customer-filter').value;
    const branchName = branchFilter ? (Storage.get('branches') || []).find(b => String(b.id) === branchFilter)?.name || 'غير محدد' : 'الكل';
    const customerName = customerFilter ? (Storage.get('customers') || []).find(c => String(c.id) === customerFilter)?.name || 'غير محدد' : 'الكل';
    const filteredSales = getFilteredReportSales();
    const salesReport = Reports.getSalesReport(startDate, endDate, filteredSales);
    const profitLossReport = Reports.getProfitLossReport(startDate, endDate, filteredSales);
    const topProducts = Reports.getTopProducts(10, filteredSales);
    const topCustomers = Reports.getTopCustomers(10, filteredSales);
    const comparison = calculateSalesComparison(startDate, endDate, filteredSales);
    const inventoryReport = Reports.getInventoryReport();

    const printHtml = `
        <!doctype html>
        <html lang="ar">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>تقرير المبيعات</title>
            <style>
                body { margin: 0; padding: 24px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f3f4f6; color: #111827; }
                .report-shell { max-width: 1200px; margin: auto; background: white; border-radius: 20px; padding: 32px; box-shadow: 0 20px 50px rgba(15,23,42,0.08); }
                .report-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; flex-wrap: wrap; margin-bottom: 28px; }
                .report-title { margin: 0; font-size: 32px; letter-spacing: 0.3px; color: #0f172a; }
                .report-meta { text-align: right; color: #475569; line-height: 1.7; }
                .report-meta div { margin-bottom: 6px; }
                .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 18px; margin-bottom: 28px; }
                .summary-card { background: #f8fafc; padding: 20px 22px; border-radius: 18px; border: 1px solid #e2e8f0; }
                .summary-card-title { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px; }
                .summary-card-value { font-size: 28px; color: #0f172a; font-weight: 700; }
                h2.section-title { font-size: 20px; color: #0f172a; margin: 32px 0 16px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
                th, td { padding: 14px 16px; border: 1px solid #e2e8f0; text-align: right; font-size: 14px; }
                th { background: #0f172a; color: white; font-weight: 700; }
                tbody tr:nth-child(even) { background: #f8fafc; }
                .text-muted { color: #64748b; }
                .highlight { font-weight: 700; color: #0f172a; }
                .footer { text-align: center; color: #64748b; font-size: 13px; margin-top: 16px; }
                @media print {
                    body { background: white; padding: 0; }
                    .report-shell { box-shadow: none; border-radius: 0; margin: 0; padding: 18px; }
                    .report-header, .summary-grid, table { page-break-inside: avoid; }
                    .footer { page-break-after: always; }
                }
            </style>
        </head>
        <body>
            <div class="report-shell">
                <div class="report-header">
                    <div>
                        <h1 class="report-title">تقرير المبيعات والأرباح</h1>
                        <p class="text-muted">سوبر ماركت بنا</p>
                    </div>
                    <div class="report-meta">
                        <div>الفترة من: <strong>${startDate || 'غير محدد'}</strong></div>
                        <div>إلى: <strong>${endDate || 'غير محدد'}</strong></div>
                        <div>الفرع: <strong>${branchName}</strong></div>
                        <div>العميل: <strong>${customerName}</strong></div>
                        <div>تاريخ الطباعة: <strong>${new Date().toLocaleDateString('ar-EG')}</strong></div>
                    </div>
                </div>

                <div class="summary-grid">
                    <div class="summary-card"><div class="summary-card-title">إجمالي المبيعات</div><div class="summary-card-value">${formatCurrency(salesReport.totalSales)}</div></div>
                    <div class="summary-card"><div class="summary-card-title">عدد الفواتير</div><div class="summary-card-value">${salesReport.salesCount}</div></div>
                    <div class="summary-card"><div class="summary-card-title">متوسط الفاتورة</div><div class="summary-card-value">${formatCurrency(salesReport.averageSale)}</div></div>
                    <div class="summary-card"><div class="summary-card-title">صافي الربح</div><div class="summary-card-value">${formatCurrency(profitLossReport.netProfit)}</div></div>
                </div>

                <h2 class="section-title">ملخص الأرباح والخسائر</h2>
                <table>
                    <tbody>
                        <tr><td>إجمالي الإيرادات</td><td>${formatCurrency(profitLossReport.revenue)}</td></tr>
                        <tr><td>تكلفة البضاعة المباعة</td><td>${formatCurrency(profitLossReport.costOfGoodsSold)}</td></tr>
                        <tr><td>إجمالي الربح</td><td>${formatCurrency(profitLossReport.grossProfit)}</td></tr>
                        <tr><td>المشتريات</td><td>${formatCurrency(profitLossReport.purchases)}</td></tr>
                        <tr><td class="highlight">صافي الربح</td><td class="highlight">${formatCurrency(profitLossReport.netProfit)}</td></tr>
                    </tbody>
                </table>

                <h2 class="section-title">مقارنة الفترة</h2>
                <table>
                    <tbody>
                        <tr><td>الفترة الحالية</td><td>${formatCurrency(comparison.currentTotal)}</td></tr>
                        <tr><td>الفترة السابقة</td><td>${formatCurrency(comparison.previousTotal)}</td></tr>
                        <tr><td>نسبة التغير</td><td>${formatPercent(comparison.change)}</td></tr>
                    </tbody>
                </table>

                <h2 class="section-title">الفروع حسب المبيعات</h2>
                <table>
                    <thead><tr><th>الفرع</th><th>عدد الفواتير</th><th>إجمالي المبيعات</th></tr></thead>
                    <tbody>
                        ${getSalesByBranch(filteredSales).map(branch => `
                            <tr>
                                <td>${branch.branchName}</td>
                                <td>${branch.count}</td>
                                <td>${formatCurrency(branch.total)}</td>
                            </tr>
                        `).join('') || '<tr><td colspan="3" class="text-muted">لا توجد بيانات</td></tr>'}
                    </tbody>
                </table>

                <h2 class="section-title">أكثر المنتجات مبيعاً</h2>
                <table>
                    <thead><tr><th>المنتج</th><th>الكمية</th><th>الإيراد</th></tr></thead>
                    <tbody>
                        ${topProducts.length > 0 ? topProducts.map(p => `
                            <tr>
                                <td>${p.name}</td>
                                <td>${p.quantity}</td>
                                <td>${formatCurrency(p.revenue)}</td>
                            </tr>
                        `).join('') : '<tr><td colspan="3" class="text-muted">لا توجد بيانات</td></tr>'}
                    </tbody>
                </table>

                <h2 class="section-title">أكثر العملاء نشاطاً</h2>
                <table>
                    <thead><tr><th>العميل</th><th>إجمالي المشتريات</th><th>عدد الفواتير</th></tr></thead>
                    <tbody>
                        ${topCustomers.length > 0 ? topCustomers.map(c => `
                            <tr>
                                <td>${c.name}</td>
                                <td>${formatCurrency(c.totalSpent)}</td>
                                <td>${c.purchaseCount}</td>
                            </tr>
                        `).join('') : '<tr><td colspan="3" class="text-muted">لا توجد بيانات</td></tr>'}
                    </tbody>
                </table>

                <h2 class="section-title">تقرير المخزون</h2>
                <table>
                    <tbody>
                        <tr><td>إجمالي المنتجات</td><td>${inventoryReport.totalProducts}</td></tr>
                        <tr><td>إجمالي المخزون</td><td>${inventoryReport.totalStock}</td></tr>
                        <tr><td>قيمة المخزون (التكلفة)</td><td>${formatCurrency(inventoryReport.totalValue)}</td></tr>
                        <tr><td>قيمة المخزون (البيع)</td><td>${formatCurrency(inventoryReport.totalRetailValue)}</td></tr>
                        <tr><td>الربح المحتمل</td><td>${formatCurrency(inventoryReport.potentialProfit)}</td></tr>
                    </tbody>
                </table>

                <div class="footer">تقرير تم إنشاؤه بواسطة سوبر ماركت بنا</div>
            </div>
            <script>
                window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };
            </script>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showToast('تعذر فتح نافذة الطباعة، تحقق من مانع الإعلانات', 'error');
        return;
    }
    printWindow.document.write(printHtml);
    printWindow.document.close();
};

const exportReportCsv = () => {
    const rows = getFilteredReportSales().map(sale => ({
        invoiceNumber: sale.invoiceNumber || sale.id,
        date: formatDate(sale.createdAt, true),
        customer: (Storage.get('customers') || []).find(c => c.id === sale.customerId)?.name || 'نقدي',
        branch: (Storage.get('branches') || []).find(b => b.id === sale.branchId)?.name || 'غير محدد',
        paymentMethod: sale.paymentMethod === 'cash' ? 'نقدي' : sale.paymentMethod === 'card' ? 'بطاقة' : 'تحويل',
        total: sale.totals.total
    }));
    const headers = ['invoiceNumber', 'date', 'customer', 'branch', 'paymentMethod', 'total'];
    downloadCsv(`sales_report_${new Date().toISOString().slice(0,10)}.csv`, rows, headers);
};

const exportReportExcel = () => {
    const rows = getFilteredReportSales();
    const htmlTable = `
        <table>
            <thead>
                <tr>
                    <th>رقم الفاتورة</th>
                    <th>التاريخ</th>
                    <th>العميل</th>
                    <th>الفرع</th>
                    <th>طريقة الدفع</th>
                    <th>الإجمالي</th>
                </tr>
            </thead>
            <tbody>
                ${rows.map(sale => `
                    <tr>
                        <td>${sale.invoiceNumber || sale.id}</td>
                        <td>${formatDate(sale.createdAt, true)}</td>
                        <td>${(Storage.get('customers') || []).find(c => c.id === sale.customerId)?.name || 'نقدي'}</td>
                        <td>${(Storage.get('branches') || []).find(b => b.id === sale.branchId)?.name || 'غير محدد'}</td>
                        <td>${sale.paymentMethod === 'cash' ? 'نقدي' : sale.paymentMethod === 'card' ? 'بطاقة' : 'تحويل'}</td>
                        <td>${sale.totals.total}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    downloadExcel(`sales_report_${new Date().toISOString().slice(0,10)}.xls`, htmlTable);
};

