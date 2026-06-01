// نقطة البيع
const POS = {
    cart: [],
    currentCustomer: null,
    discount: 0,
    discountType: 'percent',
    pointsDiscountAmount: 0,

    // إضافة منتج للسلة
    addToCart: (productId, quantity = 1) => {
        const product = Products.getAll().find(p => p.id === productId);
        if (!product) return { success: false, message: 'المنتج غير موجود' };
        
        if (product.stock < quantity) {
            return { success: false, message: 'المخزون غير كافٍ' };
        }
        
        const existingItem = POS.cart.find(item => item.productId === productId);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            POS.cart.push({
                productId: product.id,
                name: product.name,
                price: product.price,
                quantity: quantity,
                barcode: product.barcode
            });
        }
        
        return { success: true };
    },

    // تحديث كمية منتج في السلة
    updateCartItem: (productId, quantity) => {
        const item = POS.cart.find(item => item.productId === productId);
        if (item) {
            if (quantity <= 0) {
                POS.cart = POS.cart.filter(i => i.productId !== productId);
            } else {
                const product = Products.getAll().find(p => p.id === productId);
                if (product && product.stock < quantity) {
                    return { success: false, message: 'المخزون غير كافٍ' };
                }
                item.quantity = quantity;
            }
        }
        return { success: true };
    },

    // إزالة منتج من السلة
    removeFromCart: (productId) => {
        POS.cart = POS.cart.filter(item => item.productId !== productId);
    },

    // إفراغ السلة
    clearCart: () => {
        POS.cart = [];
        POS.currentCustomer = null;
        POS.discount = 0;
        POS.discountType = 'percent';
        POS.pointsDiscountAmount = 0;
    },

    // حساب المجموع
    calculateTotal: () => {
        const subtotal = POS.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const discountAmount = POS.discountType === 'fixed'
            ? Math.min(subtotal, POS.discount || 0)
            : subtotal * ((POS.discount || 0) / 100);
        const pointsDiscount = POS.pointsDiscountAmount || 0;
        const totalBeforeTax = subtotal - discountAmount - pointsDiscount;
        
        const settings = Storage.get('settings') || {};
        let taxRate = parseFloat(settings.taxRate);
        if (Number.isNaN(taxRate) || taxRate < 0) taxRate = 0;
        const tax = parseFloat((Math.max(0, totalBeforeTax) * (taxRate / 100)).toFixed(2));
        const grandTotal = parseFloat((Math.max(0, totalBeforeTax) + tax).toFixed(2));
        
        return {
            subtotal,
            discountAmount,
            pointsDiscount,
            discount: POS.discount,
            tax,
            taxRate,
            total: grandTotal
        };
    },

    // إتمام البيع
    completeSale: (paymentMethod, paidAmount) => {
        const totals = POS.calculateTotal();
        const change = paidAmount - totals.total;
        
        if (change < 0) {
            return { success: false, message: 'المبلغ المدفوع غير كافٍ' };
        }
        
        // إنشاء فاتورة برقم يومي يبدأ من 1 كل يوم
        const sales = Storage.get('sales') || [];
        const today = new Date().toISOString().split('T')[0];
        const todaySales = sales.filter(sale => sale.createdAt && sale.createdAt.startsWith(today));
        const invoiceNumber = todaySales.length + 1;

        const sale = {
            id: generateId(),
            invoiceNumber: invoiceNumber,
            items: [...POS.cart],
            totals: totals,
            paymentMethod: paymentMethod,
            paidAmount: paidAmount,
            change: change,
            customerId: POS.currentCustomer ? POS.currentCustomer.id : null,
            userId: Auth.currentUser.id,
            branchId: Auth.currentUser.branchId,
            createdAt: new Date().toISOString()
        };
        
        // حفظ الفاتورة
        sales.push(sale);
        Storage.set('sales', sales);
        
        // تحديث المخزون
        POS.cart.forEach(item => {
            const product = Products.getAll().find(p => p.id === item.productId);
            if (product) {
                Products.updateStock(product.id, product.stock - item.quantity);
            }
        });
        
        // إضافة نقاط للعميل
        if (POS.currentCustomer) {
            const customers = Storage.get('customers') || [];
            const customer = customers.find(c => c.id === POS.currentCustomer.id);
            if (customer) {
                customer.points += Math.floor(totals.total / 10); // نقطة لكل 10 ريال
                Storage.set('customers', customers);
            }
        }
        
        // مسح السلة
        POS.clearCart();
        
        return { success: true, sale };
    },

    // البحث عن منتج بالباركود
    searchByBarcode: (barcode) => {
        return Products.getByBarcode(barcode);
    }
};

// عرض صفحة نقطة البيع
const renderPOSPage = () => {
    const contentArea = document.getElementById('content-area');
    const products = Products.getAll();
    const customers = Storage.get('customers') || [];

    contentArea.innerHTML = `
        <div class="pos-container">
            <div class="pos-products">
                <div class="pos-search">
                    <input type="text" id="pos-search-input" placeholder="ابحث بالاسم أو الباركود..." oninput="searchPOSProducts()">
                    <select id="pos-category-filter" onchange="searchPOSProducts()">
                        <option value="">الكل</option>
                        ${Products.getCategories().map(c => `<option value="${c}">${c}</option>`).join('')}
                    </select>
                </div>
                <div class="products-grid" id="pos-products-grid">
                    ${renderPOSProducts(products)}
                </div>
            </div>
            <div class="pos-cart">
                <div class="cart-header">
                    <h3>سلة المشتريات</h3>
                    <button class="btn btn-sm btn-danger" onclick="clearCart()">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="cart-items" id="cart-items">
                    ${renderCartItems()}
                </div>
                <div class="cart-customer">
                    <div class="customer-select-wrap">
                        <select id="customer-select" onchange="selectCustomer()">
                            <option value="">عميل نقدي</option>
                            ${customers.map(c => `<option value="${c.id}">${c.name} (${c.points} نقطة)</option>`).join('')}
                        </select>
                        <div id="customer-card" class="hidden" style="margin-top:10px;"></div>
                    </div>
                </div>
                <div class="cart-discount">
                    <label style="font-size:12px;color:#475569;margin-bottom:6px;display:block;">نوع الخصم</label>
                    <select id="discount-type" onchange="updateDiscountLabel()">
                        <option value="percent">نسبة %</option>
                        <option value="fixed">قيمة ثابتة</option>
                    </select>
                    <input type="number" id="discount-input" placeholder="0" value="0" step="0.01" style="margin-top:8px;">
                    <span id="discount-unit" style="margin-top:8px;display:block;color:#475569;">%</span>
                    <button class="apply-discount-btn" onclick="applyDiscount()">تطبيق</button>
                </div>
                <div class="cart-discount" style="margin-top: 12px;">
                    <label style="font-size:12px;color:#475569;margin-bottom:6px;display:block;">اسم الفاتورة المعلقة</label>
                    <input type="text" id="held-sale-name" placeholder="اسم أو ملاحظة للحفظ" style="width:100%;"> 
                </div>
                <div class="cart-summary">
                    <div class="cart-summary-row">
                        <span>المجموع:</span>
                        <span id="subtotal">${formatCurrency(0)}</span>
                    </div>
                    <div class="cart-summary-row">
                        <span>الخصم:</span>
                        <span id="discount-amount">${formatCurrency(0)}</span>
                    </div>
                    <div class="cart-summary-row">
                        <span>الضريبة:</span>
                        <span id="tax">${formatCurrency(0)}</span>
                    </div>
                    <div class="cart-summary-row total">
                        <span>الإجمالي:</span>
                        <span id="total">${formatCurrency(0)}</span>
                    </div>
                </div>
                <div class="cart-actions">
                    <button class="btn btn-primary" onclick="showPaymentModal()">
                        <i class="fas fa-credit-card"></i>
                        إتمام البيع
                    </button>
                    <button class="btn btn-secondary" onclick="holdCurrentSale()" title="حفظ الفاتورة المعلقة">
                        <i class="fas fa-pause-circle"></i>
                        حفظ مؤقت
                    </button>
                    <button class="btn btn-info" onclick="showHeldSalesModal()" title="استرجاع الفواتير المعلقة">
                        <i class="fas fa-history"></i>
                        الفواتير المعلقة
                    </button>
                    <button class="btn btn-warning" onclick="redeemPoints()" title="استبدال نقاط العميل">
                        <i class="fas fa-gift"></i>
                        استبدال نقاط
                    </button>
                </div>
            </div>
        </div>
    `;

    // إضافة مستمع الباركود
    document.getElementById('pos-search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const barcode = e.target.value;
            const product = POS.searchByBarcode(barcode);
            if (product) {
                POS.addToCart(product.id);
                updateCartDisplay();
                e.target.value = '';
            } else {
                showToast('المنتج غير موجود', 'error');
            }
        }
    });

    // اختصارات لوحة المفاتيح: F2 للبحث، F4 للدفع، F8 للحفظ المؤقت
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F2') {
            const el = document.getElementById('pos-search-input');
            if (el) { el.focus(); el.select(); e.preventDefault(); }
        }
        if (e.key === 'F4') {
            showPaymentModal();
            e.preventDefault();
        }
        if (e.key === 'F8') {
            holdCurrentSale();
            e.preventDefault();
        }
    });
};

// عرض منتجات نقطة البيع
const renderPOSProducts = (products) => {
    return products.map(product => `
        <div class="product-card" onclick="addToCart('${product.id}')">
            <h4>${product.name}</h4>
            <p class="barcode">${product.barcode}</p>
            <p class="price">${formatCurrency(product.price)}</p>
            <p class="stock ${product.stock <= product.minStock ? 'text-danger' : ''}">
                المخزون: ${product.stock}
            </p>
        </div>
    `).join('');
};

// عرض عناصر السلة
const renderCartItems = () => {
    if (POS.cart.length === 0) {
        return '<p style="text-align: center; color: #999;">السلة فارغة</p>';
    }

    return POS.cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <p>${formatCurrency(item.price)} × <input type="number" min="0.001" step="0.001" value="${item.quantity}" onchange="setCartQuantity('${item.productId}', this.value)" style="width:90px;"> </p>
            </div>
            <div class="cart-item-actions">
                <button onclick="updateCartQuantity('${item.productId}', -1)">-</button>
                <button onclick="updateCartQuantity('${item.productId}', 1)">+</button>
                <button onclick="removeFromCart('${item.productId}')" style="color: red;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `).join('');
};

// تحديث عرض السلة
const updateCartDisplay = () => {
    document.getElementById('cart-items').innerHTML = renderCartItems();
    
    const totals = POS.calculateTotal();
    document.getElementById('subtotal').textContent = formatCurrency(totals.subtotal);
    document.getElementById('discount-amount').textContent = formatCurrency(totals.discountAmount);
    document.getElementById('tax').textContent = formatCurrency(totals.tax);
    document.getElementById('total').textContent = formatCurrency(totals.total);

    const discountInput = document.getElementById('discount-input');
    const discountTypeEl = document.getElementById('discount-type');
    if (discountInput) discountInput.value = POS.discount || 0;
    if (discountTypeEl) discountTypeEl.value = POS.discountType || 'percent';
    updateDiscountLabel();
};

// البحث في المنتجات
const searchPOSProducts = () => {
    const search = (document.getElementById('pos-search-input') || {}).value || '';
    const category = (document.getElementById('pos-category-filter') || {}).value || '';
    let products = Products.getAll();

    if (search.trim()) {
        products = Products.search(search.trim());
    }

    if (category) {
        products = products.filter(p => p.category === category);
    }

    document.getElementById('pos-products-grid').innerHTML = renderPOSProducts(products);
};

// إضافة للسلة
const addToCart = (productId) => {
    const result = POS.addToCart(productId);
    if (result.success) {
        updateCartDisplay();
    } else {
        showToast(result.message, 'error');
    }
};

// تحديث كمية السلة
const updateCartQuantity = (productId, change) => {
    const item = POS.cart.find(i => i.productId === productId);
    if (item) {
        const result = POS.updateCartItem(productId, item.quantity + change);
        if (result.success) {
            updateCartDisplay();
        } else {
            showToast(result.message, 'error');
        }
    }
};

// تعيين كمية مباشرة
const setCartQuantity = (productId, value) => {
    const parsed = parseFloat(String(value).replace(',', '.'));
    const qty = Number.isNaN(parsed) ? 0 : parsed;
    const result = POS.updateCartItem(productId, qty);
    if (result.success) {
        updateCartDisplay();
    } else {
        showToast(result.message, 'error');
    }
};

// إزالة من السلة
const removeFromCart = (productId) => {
    POS.removeFromCart(productId);
    updateCartDisplay();
};

// مسح السلة
const clearCart = () => {
    if (confirm('هل تريد مسح السلة؟')) {
        POS.clearCart();
        updateCartDisplay();
    }
};

// اختيار العميل
const selectCustomer = () => {
    const customerId = document.getElementById('customer-select').value;
    const customers = Storage.get('customers') || [];
    if (customerId) {
        POS.currentCustomer = customers.find(c => c.id == customerId) || null;
    } else {
        POS.currentCustomer = null;
    }

    // update customer card UI
    const card = document.getElementById('customer-card');
    if (card) {
        if (POS.currentCustomer) {
            card.classList.remove('hidden');
            card.innerHTML = `
                <div style="display:flex;align-items:center;gap:10px;">
                    <div style="width:44px;height:44px;border-radius:50%;background:var(--lighter-color);display:flex;align-items:center;justify-content:center;font-weight:800;color:var(--primary-dark)">` + (POS.currentCustomer.name ? POS.currentCustomer.name.charAt(0) : '') + `</div>
                    <div style="flex:1">
                        <div style="font-weight:800;color:var(--text-primary)">${POS.currentCustomer.name}</div>
                        <div style="font-size:12px;color:var(--text-secondary)">${POS.currentCustomer.points || 0} نقطة</div>
                    </div>
                    <button class="btn btn-sm" onclick="clearSelectedCustomer()" style="background:transparent;border:1px solid var(--border-color);">إلغاء</button>
                </div>
            `;
        } else {
            card.classList.add('hidden');
            card.innerHTML = '';
        }
    }
};

const clearSelectedCustomer = () => {
    const sel = document.getElementById('customer-select');
    if (sel) sel.value = '';
    POS.currentCustomer = null;
    const card = document.getElementById('customer-card');
    if (card) { card.classList.add('hidden'); card.innerHTML = ''; }
    updateCartDisplay();
};

// استبدال نقاط العميل بقيمة خصم ثابت
const redeemPoints = () => {
    if (!POS.currentCustomer) {
        showToast('الرجاء اختيار عميل أولاً', 'error');
        return;
    }
    const customers = Storage.get('customers') || [];
    const customer = customers.find(c => c.id === POS.currentCustomer.id);
    if (!customer || !(customer.points > 0)) {
        showToast('لا توجد نقاط للاستبدال', 'error');
        return;
    }

    // تحويل كل نقطة إلى 0.1 وحدة عملة
    const value = (customer.points || 0) * 0.1;
    POS.pointsDiscountAmount = parseFloat(value.toFixed(2));
    customer.points = 0;
    Storage.set('customers', customers);
    POS.currentCustomer = customer;
    showToast('تم استبدال النقاط بقيمة ' + formatCurrency(POS.pointsDiscountAmount), 'success');
    updateCartDisplay();
};

// حفظ الفاتورة الحالية مؤقتًا
const holdCurrentSale = () => {
    if (POS.cart.length === 0) {
        showToast('لا توجد عناصر لحفظها', 'error');
        return;
    }

    const heldSales = Storage.get('heldSales') || [];
    const saleName = document.getElementById('held-sale-name')?.value?.trim();
    const snapshot = {
        id: generateId(),
        name: saleName || `فاتورة ${formatDate(new Date().toISOString(), true)}`,
        cart: JSON.parse(JSON.stringify(POS.cart)),
        customerId: POS.currentCustomer ? POS.currentCustomer.id : null,
        discount: POS.discount,
        discountType: POS.discountType,
        pointsDiscountAmount: POS.pointsDiscountAmount || 0,
        createdAt: new Date().toISOString()
    };
    heldSales.push(snapshot);
    Storage.set('heldSales', heldSales);

    POS.clearCart();
    updateCartDisplay();
    const heldSaleNameInput = document.getElementById('held-sale-name');
    if (heldSaleNameInput) heldSaleNameInput.value = '';
    showToast('تم حفظ الفاتورة مؤقتاً', 'success');
};

// عرض نافذة الفواتير المعلقة
const showHeldSalesModal = () => {
    const heldSales = Storage.get('heldSales') || [];
    document.getElementById('modal-title').textContent = 'الفواتير المعلقة';
    document.getElementById('modal-body').innerHTML = `
        <div class="held-sales-list">
            ${heldSales.length > 0 ? heldSales.map(s => `
                <div class="held-sale-item">
                    <div>
                        <div style="font-weight:700">${s.name || `فاتورة ${s.id}`}</div>
                        <div style="font-size:12px;color:var(--text-muted)">${formatDate(s.createdAt, true)}</div>
                    </div>
                    <div style="display:flex;gap:8px">
                        <button class="btn btn-sm btn-success" onclick="recallHeldSale('${s.id}')">استرجاع</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteHeldSale('${s.id}')">حذف</button>
                    </div>
                </div>
            `).join('') : '<div style="text-align:center;color:var(--text-muted)">لا توجد فواتير محفوظة</div>'}
        </div>
    `;
    document.getElementById('modal-overlay').classList.remove('hidden');
};

// استرجاع فاتورة معلقه
const recallHeldSale = (heldId) => {
    const heldSales = Storage.get('heldSales') || [];
    const idx = heldSales.findIndex(s => s.id === heldId);
    if (idx === -1) return;
    const s = heldSales[idx];

    POS.cart = JSON.parse(JSON.stringify(s.cart));
    POS.currentCustomer = s.customerId ? (Storage.get('customers') || []).find(c => c.id === s.customerId) : null;
    POS.discount = s.discount || 0;
    POS.discountType = s.discountType || 'percent';
    POS.pointsDiscountAmount = s.pointsDiscountAmount || 0;

    // remove held
    heldSales.splice(idx, 1);
    Storage.set('heldSales', heldSales);

    closeModal();
    updateCartDisplay();
    showToast('تم استرجاع الفاتورة', 'success');
};

// حذف فاتورة معلقة
const deleteHeldSale = (heldId) => {
    let heldSales = Storage.get('heldSales') || [];
    heldSales = heldSales.filter(s => s.id !== heldId);
    Storage.set('heldSales', heldSales);
    showHeldSalesModal();
};

// تطبيق الخصم
const applyDiscount = () => {
    POS.discountType = document.getElementById('discount-type').value;
    POS.discount = parseFloat(document.getElementById('discount-input').value) || 0;
    updateCartDisplay();
};

const updateDiscountLabel = () => {
    const discountType = document.getElementById('discount-type').value;
    const unitLabel = document.getElementById('discount-unit');
    unitLabel.textContent = discountType === 'fixed' ? 'جنيه' : '%';
};

// عرض نافذة الدفع
const showPaymentModal = () => {
    if (POS.cart.length === 0) {
        showToast('السلة فارغة', 'error');
        return;
    }

    const totals = POS.calculateTotal();
    
    document.getElementById('modal-title').textContent = 'إتمام البيع';
    document.getElementById('modal-body').innerHTML = `
        <div class="payment-summary">
            <div class="cart-summary-row">
                <span>الإجمالي:</span>
                <span>${formatCurrency(totals.total)}</span>
            </div>
        </div>
        <div class="form-group">
            <label>طريقة الدفع:</label>
            <select id="payment-method">
                <option value="cash">نقدي</option>
                <option value="card">بطاقة</option>
                <option value="transfer">تحويل بنكي</option>
            </select>
        </div>
        <div class="form-group">
            <label>المبلغ المدفوع:</label>
            <input type="number" id="paid-amount" value="${totals.total.toFixed(2)}" step="0.01">
        </div>
        <div class="form-group">
            <label>المتبقي:</label>
            <p id="change-amount">${formatCurrency(0)}</p>
        </div>
        <div class="form-actions">
            <button class="btn btn-primary" onclick="processPayment()">دفع</button>
            <button class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
        </div>
    `;
    
    document.getElementById('modal-overlay').classList.remove('hidden');
    
    // تحديث المتبقي
    document.getElementById('paid-amount').addEventListener('input', (e) => {
        const paid = parseFloat(e.target.value) || 0;
        const change = paid - totals.total;
        document.getElementById('change-amount').textContent = formatCurrency(change);
    });
};


// معالجة الدفع
const processPayment = () => {
    const paymentMethod = document.getElementById('payment-method').value;
    const paidAmount = parseFloat(document.getElementById('paid-amount').value);

    if (isNaN(paidAmount)) {
        showToast('الرجاء إدخال المبلغ المدفوع بشكل صحيح', 'error');
        return;
    }
    
    const result = POS.completeSale(paymentMethod, paidAmount);
    
    if (result.success) {
        closeModal();
        showToast('تم إتمام البيع بنجاح', 'success');
        updateCartDisplay();
        printReceipt(result.sale);
    } else {
        showToast(result.message, 'error');
    }
};

// طباعة الإيصال
const printReceiptById = (saleId) => {
    const sales = Storage.get('sales') || [];
    const sale = sales.find(s => s.id === saleId);
    if (sale) {
        printReceipt(sale);
    } else {
        showToast('الفاتورة غير موجودة للطباعة', 'error');
    }
};
window.printReceiptById = printReceiptById;

const printReceipt = (sale) => {
    const settings = Storage.get('settings') || {};
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showToast('تعذر فتح نافذة الطباعة. تأكد من السماح بالنوافذ المنبثقة.', 'error');
        return;
    }

    const contentHtml = typeof renderSaleInvoiceHtml === 'function'
        ? renderSaleInvoiceHtml(sale)
        : `<div><h3>فاتورة رقم ${sale.invoiceNumber || sale.id}</h3></div>`;

    printWindow.document.write(`
        <html>
        <head>
            <title>فاتورة ${sale.invoiceNumber || sale.id}</title>
            <meta charset="utf-8">
            <style>
                body { font-family: 'Cairo', sans-serif; background: #f5f7fb; padding: 24px; color: #111827; }
                .receipt { width: 100%; max-width: 760px; margin: 0 auto; background: white; border-radius: 24px; padding: 24px; box-shadow: 0 18px 45px rgba(15, 23, 42, 0.12); }
                .header { text-align: center; margin-bottom: 18px; }
                .header h2 { margin: 0 0 8px; font-size: 28px; letter-spacing: 0.8px; }
                .header p { margin: 4px 0; font-size: 13px; color: #475569; }
                .divider { height: 1px; background: linear-gradient(90deg, transparent, #e5e7eb, transparent); margin: 18px 0; }
                table { width: 100%; border-collapse: collapse; margin-top: 12px; }
                th, td { padding: 12px 10px; border: 1px solid #e5e7eb; font-size: 13px; }
                th { background: #eef2ff; color: #1e293b; text-align: right; }
                td { text-align: right; }
                tbody tr:nth-child(even) { background: #f8fafc; }
                .summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; font-size: 12px; color: #475569; }
                .totals { margin-top: 18px; padding-top: 14px; border-top: 1px solid #e5e7eb; font-size: 13px; }
                .totals .row { display: flex; justify-content: space-between; margin-bottom: 10px; }
                .totals .row.total { font-size: 16px; font-weight: 800; color: #111827; }
                .footer { text-align: center; margin-top: 18px; color: #64748b; font-size: 12px; line-height: 1.6; }
                .footer strong { color: #111827; }
                @media print { body { padding: 0; } .receipt { box-shadow: none; border-radius: 0; } }
            </style>
        </head>
        <body>
            <div class="receipt">
                ${contentHtml}
                <div class="footer">
                    <p>${settings.receiptFooter || 'شكراً لتعاملكم معنا'}</p>
                </div>
            </div>
        </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
    };
};
window.printReceipt = printReceipt;

