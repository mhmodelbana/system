// إدارة المستخدمين
const Users = {
    // الحصول على جميع المستخدمين
    getAll: () => {
        return Storage.get('users') || [];
    },

    // إضافة مستخدم
    add: (userData) => {
        return Auth.addUser(userData);
    },

    // تحديث مستخدم
    update: (userId, userData) => {
        return Auth.updateUser(userId, userData);
    },

    // حذف مستخدم
    delete: (userId) => {
        return Auth.deleteUser(userId);
    }
};

// عرض صفحة المستخدمين
const renderUsersPage = () => {
    if (!Auth.hasPermission('users')) {
        showToast('ليس لديك صلاحية للوصول لهذه الصفحة', 'error');
        return;
    }

    const contentArea = document.getElementById('content-area');
    const users = Users.getAll();
    const branches = Storage.get('branches') || [];

    contentArea.innerHTML = `
        <div class="page-header">
            <div class="page-actions">
                <button class="btn btn-primary" onclick="showAddUserModal()">
                    <i class="fas fa-user-plus"></i>
                    إضافة مستخدم
                </button>
            </div>
        </div>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>الاسم</th>
                        <th>اسم المستخدم</th>
                        <th>الدور</th>
                        <th>الفرع</th>
                        <th>الصلاحيات</th>
                        <th>تاريخ الإنشاء</th>
                        <th>الإجراءات</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(user => `
                        <tr>
                            <td>${user.name}</td>
                            <td>${user.username}</td>
                            <td>
                                <span class="badge ${user.role === 'admin' ? 'badge-primary' : 'badge-secondary'}">
                                    ${user.role === 'admin' ? 'مدير' : user.role === 'cashier' ? 'كاشير' : 'موظف'}
                                </span>
                            </td>
                            <td>${user.branchId ? branches.find(b => b.id === user.branchId)?.name || 'غير محدد' : 'الكل'}</td>
                            <td>
                                ${user.permissions.includes('all') ? 'الكل' : user.permissions.join(', ')}
                            </td>
                            <td>${new Date(user.createdAt).toLocaleDateString('ar-SA')}</td>
                            <td>
                                <button class="btn btn-sm btn-info" onclick="showEditUserModal('${user.id}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                                ${user.id !== Auth.currentUser.id ? `
                                    <button class="btn btn-sm btn-danger" onclick="deleteUser('${user.id}')">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                ` : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
};

// عرض نافذة إضافة مستخدم
const showAddUserModal = () => {
    const branches = Storage.get('branches') || [];
    
    document.getElementById('modal-title').textContent = 'إضافة مستخدم جديد';
    document.getElementById('modal-body').innerHTML = `
        <form id="add-user-form">
            <div class="form-group">
                <label>الاسم الكامل *</label>
                <input type="text" name="name" required>
            </div>
            <div class="form-group">
                <label>اسم المستخدم *</label>
                <input type="text" name="username" required>
            </div>
            <div class="form-group">
                <label>كلمة المرور *</label>
                <input type="password" name="password" required>
            </div>
            <div class="form-group">
                <label>الدور *</label>
                <select name="role" required onchange="togglePermissions(this.value)">
                    <option value="admin">مدير</option>
                    <option value="cashier">كاشير</option>
                    <option value="employee">موظف</option>
                </select>
            </div>
            <div class="form-group">
                <label>الفرع</label>
                <select name="branchId">
                    <option value="">الكل</option>
                    ${branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group" id="permissions-group" style="display: none;">
                <label>الصلاحيات:</label>
                <div class="checkboxes">
                    <label>
                        <input type="checkbox" name="permissions" value="pos"> نقطة البيع
                    </label>
                    <label>
                        <input type="checkbox" name="permissions" value="products"> إدارة المنتجات
                    </label>
                    <label>
                        <input type="checkbox" name="permissions" value="inventory"> إدارة المخزون
                    </label>
                    <label>
                        <input type="checkbox" name="permissions" value="reports"> التقارير
                    </label>
                    <label>
                        <input type="checkbox" name="permissions" value="users"> إدارة المستخدمين
                    </label>
                    <label>
                        <input type="checkbox" name="permissions" value="settings"> الإعدادات
                    </label>
                </div>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">إضافة</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
            </div>
        </form>
    `;
    
    document.getElementById('modal-overlay').classList.remove('hidden');
    
    document.getElementById('add-user-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const userData = Object.fromEntries(formData.entries());
        
        // جمع الصلاحيات
        const permissions = [];
        document.querySelectorAll('input[name="permissions"]:checked').forEach(cb => {
            permissions.push(cb.value);
        });
        
        if (userData.role === 'admin') {
            userData.permissions = ['all'];
        } else {
            userData.permissions = permissions;
        }
        
        Users.add(userData);
        closeModal();
        showToast('تم إضافة المستخدم بنجاح', 'success');
        renderUsersPage();
    });
};

// تبديل عرض الصلاحيات
const togglePermissions = (role) => {
    const permissionsGroup = document.getElementById('permissions-group');
    if (role === 'admin') {
        permissionsGroup.style.display = 'none';
    } else {
        permissionsGroup.style.display = 'block';
    }
};

// عرض نافذة تعديل مستخدم
const showEditUserModal = (userId) => {
    const user = Users.getAll().find(u => u.id === userId);
    const branches = Storage.get('branches') || [];
    
    if (!user) return;
    
    document.getElementById('modal-title').textContent = 'تعديل المستخدم';
    document.getElementById('modal-body').innerHTML = `
        <form id="edit-user-form">
            <div class="form-group">
                <label>الاسم الكامل *</label>
                <input type="text" name="name" value="${user.name}" required>
            </div>
            <div class="form-group">
                <label>اسم المستخدم *</label>
                <input type="text" name="username" value="${user.username}" required>
            </div>
            <div class="form-group">
                <label>كلمة المرور (اتركها فارغة للإبقاء)</label>
                <input type="password" name="password">
            </div>
            <div class="form-group">
                <label>الدور *</label>
                <select name="role" required onchange="togglePermissions(this.value)">
                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>مدير</option>
                    <option value="cashier" ${user.role === 'cashier' ? 'selected' : ''}>كاشير</option>
                    <option value="employee" ${user.role === 'employee' ? 'selected' : ''}>موظف</option>
                </select>
            </div>
            <div class="form-group">
                <label>الفرع</label>
                <select name="branchId">
                    <option value="">الكل</option>
                    ${branches.map(b => `<option value="${b.id}" ${user.branchId === b.id ? 'selected' : ''}>${b.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group" id="permissions-group" style="display: ${user.role === 'admin' ? 'none' : 'block'};">
                <label>الصلاحيات:</label>
                <div class="checkboxes">
                    <label>
                        <input type="checkbox" name="permissions" value="pos" ${user.permissions.includes('pos') ? 'checked' : ''}> نقطة البيع
                    </label>
                    <label>
                        <input type="checkbox" name="permissions" value="products" ${user.permissions.includes('products') ? 'checked' : ''}> إدارة المنتجات
                    </label>
                    <label>
                        <input type="checkbox" name="permissions" value="inventory" ${user.permissions.includes('inventory') ? 'checked' : ''}> إدارة المخزون
                    </label>
                    <label>
                        <input type="checkbox" name="permissions" value="reports" ${user.permissions.includes('reports') ? 'checked' : ''}> التقارير
                    </label>
                    <label>
                        <input type="checkbox" name="permissions" value="users" ${user.permissions.includes('users') ? 'checked' : ''}> إدارة المستخدمين
                    </label>
                    <label>
                        <input type="checkbox" name="permissions" value="settings" ${user.permissions.includes('settings') ? 'checked' : ''}> الإعدادات
                    </label>
                </div>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">حفظ التغييرات</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
            </div>
        </form>
    `;
    
    document.getElementById('modal-overlay').classList.remove('hidden');
    
    document.getElementById('edit-user-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const userData = Object.fromEntries(formData.entries());
        
        // جمع الصلاحيات
        const permissions = [];
        document.querySelectorAll('input[name="permissions"]:checked').forEach(cb => {
            permissions.push(cb.value);
        });
        
        if (userData.role === 'admin') {
            userData.permissions = ['all'];
        } else {
            userData.permissions = permissions;
        }
        
        // إذا لم يتم تغيير كلمة المرور، احذفها من البيانات
        if (!userData.password) {
            delete userData.password;
        }
        
        Users.update(userId, userData);
        closeModal();
        showToast('تم تحديث المستخدم بنجاح', 'success');
        renderUsersPage();
    });
};

// حذف مستخدم
const deleteUser = (userId) => {
    if (confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
        Users.delete(userId);
        showToast('تم حذف المستخدم بنجاح', 'success');
        renderUsersPage();
    }
};
