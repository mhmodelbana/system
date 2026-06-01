// إدارة الموردين
const Suppliers = {
    // إضافة مورد
    add: (supplierData) => {
        const suppliers = Storage.get('suppliers') || [];
        const newSupplier = {
            id: generateId(),
            ...supplierData,
            createdAt: new Date().toISOString()
        };
        suppliers.push(newSupplier);
        Storage.set('suppliers', suppliers);
        return newSupplier;
    },

    // تحديث مورد
    update: (supplierId, supplierData) => {
        const suppliers = Storage.get('suppliers') || [];
        const index = suppliers.findIndex(s => s.id === supplierId);
        if (index !== -1) {
            suppliers[index] = { ...suppliers[index], ...supplierData };
            Storage.set('suppliers', suppliers);
            return suppliers[index];
        }
        return null;
    },

    // حذف مورد
    delete: (supplierId) => {
        const suppliers = Storage.get('suppliers') || [];
        const filteredSuppliers = suppliers.filter(s => s.id !== supplierId);
        Storage.set('suppliers', filteredSuppliers);
        return true;
    },

    // الحصول على جميع الموردين
    getAll: () => {
        return Storage.get('suppliers') || [];
    },

    // البحث عن مورد
    search: (query) => {
        const suppliers = Storage.get('suppliers') || [];
        const lowerQuery = query.toLowerCase();
        return suppliers.filter(s => 
            (s.name || '').toLowerCase().includes(lowerQuery) || 
            (s.phone || '').toLowerCase().includes(lowerQuery) ||
            (s.email || '').toLowerCase().includes(lowerQuery)
        );
    }
};

// عرض صفحة الموردين
const renderSuppliersPage = () => {
    const contentArea = document.getElementById('content-area');
    const suppliers = Suppliers.getAll();
    const purchases = Purchases.getAll();

    contentArea.innerHTML = `
        <div class="page-header">
            <div class="page-actions">
                <button class="btn btn-primary" onclick="showAddSupplierModal()">
                    <i class="fas fa-plus"></i>
                    إضافة مورد
                </button>
            </div>
        </div>

        <div class="cards-grid">
            <div class="card">
                <div class="card-icon primary">
                    <i class="fas fa-users"></i>
                </div>
                <div class="card-title">إجمالي الموردين</div>
                <div class="card-value">${suppliers.length}</div>
            </div>
            <div class="card">
                <div class="card-icon secondary">
                    <i class="fas fa-shopping-cart"></i>
                </div>
                <div class="card-title">إجمالي المشتريات</div>
                <div class="card-value">${purchases.length}</div>
            </div>
        </div>

        <div class="filters">
            <div class="filter-group">
                <label>بحث الموردين:</label>
                <input type="text" id="supplier-search" placeholder="الاسم أو الهاتف أو البريد" oninput="filterSuppliers()">
            </div>
        </div>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>الاسم</th>
                        <th>الهاتف</th>
                        <th>البريد الإلكتروني</th>
                        <th>العنوان</th>
                        <th>تاريخ الإضافة</th>
                        <th>الإجراءات</th>
                    </tr>
                </thead>
                <tbody id="suppliers-table-body">
                    ${renderSupplierRows(suppliers)}
                </tbody>
            </table>
        </div>
    `;
};

const renderSupplierRows = (suppliers) => {
    if (suppliers.length === 0) {
        return '<tr><td colspan="6" style="text-align: center;">لا توجد موردين</td></tr>';
    }

    return suppliers.map(supplier => `
        <tr>
            <td>${supplier.name}</td>
            <td>${supplier.phone}</td>
            <td>${supplier.email || '-'}</td>
            <td>${supplier.address || '-'}</td>
            <td>${new Date(supplier.createdAt).toLocaleDateString('ar-SA')}</td>
            <td>
                <button class="btn btn-sm btn-info" onclick="showEditSupplierModal('${supplier.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteSupplier('${supplier.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
};

const filterSuppliers = () => {
    const query = document.getElementById('supplier-search').value;
    const suppliers = query ? Suppliers.search(query) : Suppliers.getAll();
    document.getElementById('suppliers-table-body').innerHTML = renderSupplierRows(suppliers);
};

// عرض نافذة إضافة مورد
const showAddSupplierModal = () => {
    document.getElementById('modal-title').textContent = 'إضافة مورد جديد';
    document.getElementById('modal-body').innerHTML = `
        <form id="add-supplier-form">
            <div class="form-group">
                <label>اسم المورد *</label>
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
    
    document.getElementById('add-supplier-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const supplierData = Object.fromEntries(formData.entries());
        
        Suppliers.add(supplierData);
        closeModal();
        showToast('تم إضافة المورد بنجاح', 'success');
        renderSuppliersPage();
    });
};

// عرض نافذة تعديل مورد
const showEditSupplierModal = (supplierId) => {
    const supplier = Suppliers.getAll().find(s => s.id === supplierId);
    
    if (!supplier) return;
    
    document.getElementById('modal-title').textContent = 'تعديل المورد';
    document.getElementById('modal-body').innerHTML = `
        <form id="edit-supplier-form">
            <div class="form-group">
                <label>اسم المورد *</label>
                <input type="text" name="name" value="${supplier.name}" required>
            </div>
            <div class="form-group">
                <label>رقم الهاتف *</label>
                <input type="tel" name="phone" value="${supplier.phone}" required>
            </div>
            <div class="form-group">
                <label>البريد الإلكتروني</label>
                <input type="email" name="email" value="${supplier.email || ''}">
            </div>
            <div class="form-group">
                <label>العنوان</label>
                <textarea name="address" rows="3">${supplier.address || ''}</textarea>
            </div>
            <div class="form-group">
                <label>ملاحظات</label>
                <textarea name="notes" rows="3">${supplier.notes || ''}</textarea>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">حفظ التغييرات</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
            </div>
        </form>
    `;
    
    document.getElementById('modal-overlay').classList.remove('hidden');
    
    document.getElementById('edit-supplier-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const supplierData = Object.fromEntries(formData.entries());
        
        Suppliers.update(supplierId, supplierData);
        closeModal();
        showToast('تم تحديث المورد بنجاح', 'success');
        renderSuppliersPage();
    });
};

// حذف مورد
const deleteSupplier = (supplierId) => {
    if (confirm('هل أنت متأكد من حذف هذا المورد؟')) {
        Suppliers.delete(supplierId);
        showToast('تم حذف المورد بنجاح', 'success');
        renderSuppliersPage();
    }
};
