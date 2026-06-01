// إدارة العملاء
const Customers = {
    // إضافة عميل
    add: (customerData) => {
        const customers = Storage.get('customers') || [];
        const newCustomer = {
            id: generateId(),
            ...customerData,
            points: 0,
            createdAt: new Date().toISOString()
        };
        customers.push(newCustomer);
        Storage.set('customers', customers);
        return newCustomer;
    },

    // تحديث عميل
    update: (customerId, customerData) => {
        const customers = Storage.get('customers') || [];
        const index = customers.findIndex(c => c.id === customerId);
        if (index !== -1) {
            customers[index] = { ...customers[index], ...customerData };
            Storage.set('customers', customers);
            return customers[index];
        }
        return null;
    },

    // حذف عميل
    delete: (customerId) => {
        const customers = Storage.get('customers') || [];
        const filteredCustomers = customers.filter(c => c.id !== customerId);
        Storage.set('customers', filteredCustomers);
        return true;
    },

    // الحصول على جميع العملاء
    getAll: () => {
        return Storage.get('customers') || [];
    },

    // البحث عن عميل
    search: (query) => {
        const customers = Storage.get('customers') || [];
        const lowerQuery = query.toLowerCase();
        return customers.filter(c => 
            (c.name || '').toLowerCase().includes(lowerQuery) || 
            (c.phone || '').toLowerCase().includes(lowerQuery) ||
            (c.email || '').toLowerCase().includes(lowerQuery)
        );
    },

    // إضافة نقاط لعميل
    addPoints: (customerId, points) => {
        const customers = Storage.get('customers') || [];
        const customer = customers.find(c => c.id === customerId);
        if (customer) {
            customer.points += points;
            Storage.set('customers', customers);
            return customer;
        }
        return null;
    },

    // استبدال النقاط
    redeemPoints: (customerId, points) => {
        const customers = Storage.get('customers') || [];
        const customer = customers.find(c => c.id === customerId);
        if (customer && customer.points >= points) {
            customer.points -= points;
            Storage.set('customers', customers);
            return customer;
        }
        return null;
    }
};

// عرض صفحة العملاء
const renderCustomersPage = () => {
    const contentArea = document.getElementById('content-area');
    const customers = Customers.getAll();
    const totalPoints = customers.reduce((sum, customer) => sum + (customer.points || 0), 0);

    contentArea.innerHTML = `
        <div class="page-header">
            <div class="page-actions">
                <button class="btn btn-primary" onclick="showAddCustomerModal()">
                    <i class="fas fa-plus"></i>
                    إضافة عميل
                </button>
            </div>
        </div>

        <div class="cards-grid">
            <div class="card">
                <div class="card-icon primary">
                    <i class="fas fa-users"></i>
                </div>
                <div class="card-title">إجمالي العملاء</div>
                <div class="card-value">${customers.length}</div>
            </div>
            <div class="card">
                <div class="card-icon secondary">
                    <i class="fas fa-star"></i>
                </div>
                <div class="card-title">إجمالي النقاط</div>
                <div class="card-value">${totalPoints}</div>
            </div>
        </div>

        <div class="filters">
            <div class="filter-group">
                <label>بحث العملاء:</label>
                <input type="text" id="customer-search" placeholder="الاسم أو الهاتف أو البريد" oninput="filterCustomers()">
            </div>
        </div>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>الاسم</th>
                        <th>الهاتف</th>
                        <th>البريد الإلكتروني</th>
                        <th>النقاط</th>
                        <th>تاريخ التسجيل</th>
                        <th>الإجراءات</th>
                    </tr>
                </thead>
                <tbody id="customers-table-body">
                    ${renderCustomerRows(customers)}
                </tbody>
            </table>
        </div>
    `;
};

const renderCustomerRows = (customers) => {
    if (customers.length === 0) {
        return '<tr><td colspan="6" style="text-align: center;">لا يوجد عملاء</td></tr>';
    }

    return customers.map(customer => `
        <tr>
            <td>${customer.name}</td>
            <td>${customer.phone}</td>
            <td>${customer.email || '-'}</td>
            <td>
                <span class="badge badge-primary">${customer.points || 0}</span>
            </td>
            <td>${new Date(customer.createdAt).toLocaleDateString('ar-SA')}</td>
            <td>
                <button class="btn btn-sm btn-info" onclick="showEditCustomerModal('${customer.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-success" onclick="showPointsModal('${customer.id}')">
                    <i class="fas fa-star"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteCustomer('${customer.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
};

const filterCustomers = () => {
    const query = document.getElementById('customer-search').value;
    const customers = query ? Customers.search(query) : Customers.getAll();
    document.getElementById('customers-table-body').innerHTML = renderCustomerRows(customers);
};

// عرض نافذة إضافة عميل
const showAddCustomerModal = () => {
    document.getElementById('modal-title').textContent = 'إضافة عميل جديد';
    document.getElementById('modal-body').innerHTML = `
        <form id="add-customer-form">
            <div class="form-group">
                <label>اسم العميل *</label>
                <input type="text" name="name" required>
            </div>
            <div class="form-group">
                <label>رقم الهاتف *</label>
                <input type="tel" name="phone" required>
            </div>
            <div class="form-group">
                <label>البريد الإلكتروني</label>
                <input type="email" name="email">
            </div>
            <div class="form-group">
                <label>العنوان</label>
                <textarea name="address" rows="3"></textarea>
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
    
    document.getElementById('add-customer-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const customerData = Object.fromEntries(formData.entries());
        
        Customers.add(customerData);
        closeModal();
        showToast('تم إضافة العميل بنجاح', 'success');
        renderCustomersPage();
    });
};

// عرض نافذة تعديل عميل
const showEditCustomerModal = (customerId) => {
    const customer = Customers.getAll().find(c => c.id === customerId);
    
    if (!customer) return;
    
    document.getElementById('modal-title').textContent = 'تعديل العميل';
    document.getElementById('modal-body').innerHTML = `
        <form id="edit-customer-form">
            <div class="form-group">
                <label>اسم العميل *</label>
                <input type="text" name="name" value="${customer.name}" required>
            </div>
            <div class="form-group">
                <label>رقم الهاتف *</label>
                <input type="tel" name="phone" value="${customer.phone}" required>
            </div>
            <div class="form-group">
                <label>البريد الإلكتروني</label>
                <input type="email" name="email" value="${customer.email || ''}">
            </div>
            <div class="form-group">
                <label>العنوان</label>
                <textarea name="address" rows="3">${customer.address || ''}</textarea>
            </div>
            <div class="form-group">
                <label>ملاحظات</label>
                <textarea name="notes" rows="3">${customer.notes || ''}</textarea>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">حفظ التغييرات</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
            </div>
        </form>
    `;
    
    document.getElementById('modal-overlay').classList.remove('hidden');
    
    document.getElementById('edit-customer-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const customerData = Object.fromEntries(formData.entries());
        
        Customers.update(customerId, customerData);
        closeModal();
        showToast('تم تحديث العميل بنجاح', 'success');
        renderCustomersPage();
    });
};

// عرض نافذة إدارة النقاط
const showPointsModal = (customerId) => {
    const customer = Customers.getAll().find(c => c.id === customerId);
    
    if (!customer) return;
    
    document.getElementById('modal-title').textContent = 'إدارة نقاط العميل';
    document.getElementById('modal-body').innerHTML = `
        <div class="form-group">
            <label>العميل:</label>
            <p>${customer.name}</p>
        </div>
        <div class="form-group">
            <label>النقاط الحالية:</label>
            <p class="points-display">${customer.points}</p>
        </div>
        <div class="form-group">
            <label>إضافة/خصم نقاط:</label>
            <input type="number" id="points-amount" placeholder="أدخل الرقم (موجب للإضافة، سالب للخصم)">
        </div>
        <div class="form-actions">
            <button class="btn btn-primary" onclick="updateCustomerPoints('${customerId}')">تحديث</button>
            <button class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
        </div>
    `;
    
    document.getElementById('modal-overlay').classList.remove('hidden');
};

// تحديث نقاط العميل
const updateCustomerPoints = (customerId) => {
    const points = parseInt(document.getElementById('points-amount').value);
    
    if (isNaN(points)) {
        showToast('الرجاء إدخال رقم صحيح', 'error');
        return;
    }
    
    if (points > 0) {
        Customers.addPoints(customerId, points);
        showToast(`تم إضافة ${points} نقطة بنجاح`, 'success');
    } else if (points < 0) {
        const result = Customers.redeemPoints(customerId, Math.abs(points));
        if (result) {
            showToast(`تم خصم ${Math.abs(points)} نقطة بنجاح`, 'success');
        } else {
            showToast('النقاط غير كافية', 'error');
            return;
        }
    }
    
    closeModal();
    renderCustomersPage();
};

// حذف عميل
const deleteCustomer = (customerId) => {
    if (confirm('هل أنت متأكد من حذف هذا العميل؟')) {
        Customers.delete(customerId);
        showToast('تم حذف العميل بنجاح', 'success');
        renderCustomersPage();
    }
};
