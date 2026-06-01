// إدارة الفروع
const Branches = {
    // إضافة فرع
    add: (branchData) => {
        const branches = Storage.get('branches') || [];
        const newBranch = {
            id: generateId(),
            ...branchData,
            createdAt: new Date().toISOString()
        };
        branches.push(newBranch);
        Storage.set('branches', branches);
        return newBranch;
    },

    // تحديث فرع
    update: (branchId, branchData) => {
        const branches = Storage.get('branches') || [];
        const index = branches.findIndex(b => b.id === branchId);
        if (index !== -1) {
            branches[index] = { ...branches[index], ...branchData };
            Storage.set('branches', branches);
            return branches[index];
        }
        return null;
    },

    // حذف فرع
    delete: (branchId) => {
        const branches = Storage.get('branches') || [];
        const filteredBranches = branches.filter(b => b.id !== branchId);
        Storage.set('branches', filteredBranches);
        return true;
    },

    // الحصول على جميع الفروع
    getAll: () => {
        return Storage.get('branches') || [];
    },

    // الحصول على فرع
    getById: (branchId) => {
        const branches = Storage.get('branches') || [];
        return branches.find(b => b.id === branchId);
    }
};

// عرض صفحة الفروع
const renderBranchesPage = () => {
    if (!Auth.hasPermission('branches')) {
        showToast('ليس لديك صلاحية للوصول لهذه الصفحة', 'error');
        return;
    }

    const contentArea = document.getElementById('content-area');
    const branches = Branches.getAll();

    contentArea.innerHTML = `
        <div class="page-header">
            <div class="page-actions">
                <button class="btn btn-primary" onclick="showAddBranchModal()">
                    <i class="fas fa-plus"></i>
                    إضافة فرع
                </button>
            </div>
        </div>

        <div class="filters">
            <div class="filter-group">
                <label>بحث الفروع:</label>
                <input type="text" id="branch-search" placeholder="اسم الفرع أو المدير" oninput="filterBranches()">
            </div>
        </div>

        <div id="branches-cards" class="cards-grid">
            ${renderBranchCards(branches)}
        </div>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>الاسم</th>
                        <th>العنوان</th>
                        <th>الهاتف</th>
                        <th>المدير</th>
                        <th>عدد المنتجات</th>
                        <th>الإجراءات</th>
                    </tr>
                </thead>
                <tbody id="branches-table-body">
                    ${renderBranchRows(branches)}
                </tbody>
            </table>
        </div>
    `;
};

const renderBranchCards = (branches) => {
    if (branches.length === 0) {
        return '<div class="card"><div class="card-title">لا توجد فروع</div></div>';
    }

    return branches.map(branch => {
        const branchProducts = Products.getAll().filter(p => p.branchId === branch.id);
        const branchSales = Storage.get('sales')?.filter(s => s.branchId === branch.id) || [];
        const branchRevenue = branchSales.reduce((sum, s) => sum + (s.totals?.total || 0), 0);
        return `
            <div class="card">
                <div class="card-icon primary">
                    <i class="fas fa-building"></i>
                </div>
                <div class="card-title">${branch.name}</div>
                <div class="card-value">${formatCurrency(branchRevenue)}</div>
                <p style="margin-top: 10px; font-size: 14px; color: var(--secondary-color);">
                    <i class="fas fa-boxes"></i> ${branchProducts.length} منتج
                </p>
                <p style="font-size: 14px; color: var(--secondary-color);">
                    <i class="fas fa-receipt"></i> ${branchSales.length} مبيعات
                </p>
            </div>
        `;
    }).join('');
};

const renderBranchRows = (branches) => {
    if (branches.length === 0) {
        return '<tr><td colspan="6" style="text-align: center;">لا توجد فروع</td></tr>';
    }

    return branches.map(branch => {
        const branchProducts = Products.getAll().filter(p => p.branchId === branch.id);
        return `
            <tr>
                <td>${branch.name}</td>
                <td>${branch.address}</td>
                <td>${branch.phone}</td>
                <td>${branch.manager || '-'}</td>
                <td>${branchProducts.length}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="showEditBranchModal('${branch.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteBranch('${branch.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
};

const filterBranches = () => {
    const query = document.getElementById('branch-search').value.toLowerCase();
    const branches = Branches.getAll().filter(branch =>
        (branch.name || '').toLowerCase().includes(query) ||
        (branch.manager || '').toLowerCase().includes(query)
    );

    document.getElementById('branches-cards').innerHTML = renderBranchCards(branches);
    document.getElementById('branches-table-body').innerHTML = renderBranchRows(branches);
};

// عرض نافذة إضافة فرع
const showAddBranchModal = () => {
    document.getElementById('modal-title').textContent = 'إضافة فرع جديد';
    document.getElementById('modal-body').innerHTML = `
        <form id="add-branch-form">
            <div class="form-group">
                <label>اسم الفرع *</label>
                <input type="text" name="name" required>
            </div>
            <div class="form-group">
                <label>العنوان *</label>
                <input type="text" name="address" required>
            </div>
            <div class="form-group">
                <label>الهاتف *</label>
                <input type="tel" name="phone" required>
            </div>
            <div class="form-group">
                <label>المدير</label>
                <input type="text" name="manager">
            </div>
            <div class="form-group">
                <label>البريد الإلكتروني</label>
                <input type="email" name="email">
            </div>
            <div class="form-group">
                <label>ساعات العمل</label>
                <input type="text" name="workingHours" placeholder="مثال: 9 ص - 9 م">
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
    
    document.getElementById('add-branch-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const branchData = Object.fromEntries(formData.entries());
        
        Branches.add(branchData);
        closeModal();
        showToast('تم إضافة الفرع بنجاح', 'success');
        renderBranchesPage();
    });
};

// عرض نافذة تعديل فرع
const showEditBranchModal = (branchId) => {
    const branch = Branches.getAll().find(b => b.id === branchId);
    
    if (!branch) return;
    
    document.getElementById('modal-title').textContent = 'تعديل الفرع';
    document.getElementById('modal-body').innerHTML = `
        <form id="edit-branch-form">
            <div class="form-group">
                <label>اسم الفرع *</label>
                <input type="text" name="name" value="${branch.name}" required>
            </div>
            <div class="form-group">
                <label>العنوان *</label>
                <input type="text" name="address" value="${branch.address}" required>
            </div>
            <div class="form-group">
                <label>الهاتف *</label>
                <input type="tel" name="phone" value="${branch.phone}" required>
            </div>
            <div class="form-group">
                <label>المدير</label>
                <input type="text" name="manager" value="${branch.manager || ''}">
            </div>
            <div class="form-group">
                <label>البريد الإلكتروني</label>
                <input type="email" name="email" value="${branch.email || ''}">
            </div>
            <div class="form-group">
                <label>ساعات العمل</label>
                <input type="text" name="workingHours" value="${branch.workingHours || ''}" placeholder="مثال: 9 ص - 9 م">
            </div>
            <div class="form-group">
                <label>ملاحظات</label>
                <textarea name="notes" rows="3">${branch.notes || ''}</textarea>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">حفظ التغييرات</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
            </div>
        </form>
    `;
    
    document.getElementById('modal-overlay').classList.remove('hidden');
    
    document.getElementById('edit-branch-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const branchData = Object.fromEntries(formData.entries());
        
        Branches.update(branchId, branchData);
        closeModal();
        showToast('تم تحديث الفرع بنجاح', 'success');
        renderBranchesPage();
    });
};

// حذف فرع
const deleteBranch = (branchId) => {
    // التحقق من وجود منتجات أو مستخدمين في الفرع
    const branchProducts = Products.getAll().filter(p => p.branchId === branchId);
    const branchUsers = Auth.getUsers().filter(u => u.branchId === branchId);
    
    if (branchProducts.length > 0 || branchUsers.length > 0) {
        showToast('لا يمكن حذف الفرع لأنه يحتوي على منتجات أو مستخدمين', 'error');
        return;
    }
    
    if (confirm('هل أنت متأكد من حذف هذا الفرع؟')) {
        Branches.delete(branchId);
        showToast('تم حذف الفرع بنجاح', 'success');
        renderBranchesPage();
    }
};

