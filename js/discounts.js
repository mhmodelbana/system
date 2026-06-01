// إدارة العروض والخصومات
const Discounts = {
    // إضافة عرض/خصم
    add: (discountData) => {
        const discounts = Storage.get('discounts') || [];
        const newDiscount = {
            id: generateId(),
            ...discountData,
            createdAt: new Date().toISOString()
        };
        discounts.push(newDiscount);
        Storage.set('discounts', discounts);
        return newDiscount;
    },

    // تحديث عرض/خصم
    update: (discountId, discountData) => {
        const discounts = Storage.get('discounts') || [];
        const index = discounts.findIndex(d => d.id === discountId);
        if (index !== -1) {
            discounts[index] = { ...discounts[index], ...discountData };
            Storage.set('discounts', discounts);
            return discounts[index];
        }
        return null;
    },

    // حذف عرض/خصم
    delete: (discountId) => {
        const discounts = Storage.get('discounts') || [];
        const filteredDiscounts = discounts.filter(d => d.id !== discountId);
        Storage.set('discounts', filteredDiscounts);
        return true;
    },

    // الحصول على جميع العروض
    getAll: () => {
        return Storage.get('discounts') || [];
    },

    // الحصول على العروض النشطة
    getActive: () => {
        const discounts = Storage.get('discounts') || [];
        const now = new Date();
        return discounts.filter(d => {
            const startDate = new Date(d.startDate);
            const endDate = new Date(d.endDate);
            return d.active && now >= startDate && now <= endDate;
        });
    },

    // تطبيق الخصم على منتج
    applyToProduct: (productId, originalPrice) => {
        const discounts = Discounts.getActive();
        const productDiscounts = discounts.filter(d => 
            d.type === 'product' && d.productId === productId
        );
        
        if (productDiscounts.length > 0) {
            const discount = productDiscounts[0];
            if (discount.discountType === 'percentage') {
                return originalPrice * (1 - discount.value / 100);
            } else {
                return originalPrice - discount.value;
            }
        }
        
        return originalPrice;
    },

    // حساب نقاط الولاء
    calculateLoyaltyPoints: (purchaseAmount) => {
        const settings = Storage.get('settings') || {};
        const pointsPerRiyal = settings.loyaltyPointsPerRiyal || 0.1;
        return Math.floor(purchaseAmount * pointsPerRiyal);
    }
};

// عرض صفحة العروض والخصومات
const renderDiscountsPage = () => {
    const contentArea = document.getElementById('content-area');
    const discounts = Discounts.getAll();
    const products = Products.getAll();

    contentArea.innerHTML = `
        <div class="page-header">
            <div class="page-actions">
                <button class="btn btn-primary" onclick="showAddDiscountModal()">
                    <i class="fas fa-plus"></i>
                    إضافة عرض
                </button>
            </div>
        </div>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>اسم العرض</th>
                        <th>النوع</th>
                        <th>قيمة الخصم</th>
                        <th>تاريخ البداية</th>
                        <th>تاريخ النهاية</th>
                        <th>الحالة</th>
                        <th>الإجراءات</th>
                    </tr>
                </thead>
                <tbody>
                    ${discounts.length > 0 ? discounts.map(discount => `
                        <tr>
                            <td>${discount.name}</td>
                            <td>
                                ${discount.type === 'product' ? 'منتج' : discount.type === 'category' ? 'فئة' : 'عام'}
                            </td>
                            <td>
                                ${discount.discountType === 'percentage' 
                                    ? discount.value + '%' 
                                    : formatCurrency(discount.value)}
                            </td>
                            <td>${new Date(discount.startDate).toLocaleDateString('ar-SA')}</td>
                            <td>${new Date(discount.endDate).toLocaleDateString('ar-SA')}</td>
                            <td>
                                <span class="badge ${discount.active ? 'badge-success' : 'badge-secondary'}">
                                    ${discount.active ? 'نشط' : 'غير نشط'}
                                </span>
                            </td>
                            <td>
                                <button class="btn btn-sm btn-info" onclick="showEditDiscountModal('${discount.id}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm ${discount.active ? 'btn-warning' : 'btn-success'}" 
                                        onclick="toggleDiscount('${discount.id}')">
                                    <i class="fas fa-${discount.active ? 'pause' : 'play'}"></i>
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="deleteDiscount('${discount.id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('') : '<tr><td colspan="7" style="text-align: center;">لا توجد عروض</td></tr>'}
                </tbody>
            </table>
        </div>
    `;
};

// عرض نافذة إضافة عرض
const showAddDiscountModal = () => {
    const products = Products.getAll();
    const categories = Products.getCategories();

    document.getElementById('modal-title').textContent = 'إضافة عرض جديد';
    document.getElementById('modal-body').innerHTML = `
        <form id="add-discount-form">
            <div class="form-group">
                <label>اسم العرض *</label>
                <input type="text" name="name" required>
            </div>
            <div class="form-group">
                <label>نوع العرض *</label>
                <select name="type" required onchange="toggleDiscountType(this.value)">
                    <option value="general">عام</option>
                    <option value="product">منتج محدد</option>
                    <option value="category">فئة</option>
                </select>
            </div>
            <div class="form-group" id="product-select-group" style="display: none;">
                <label>المنتج</label>
                <select name="productId">
                    ${products.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group" id="category-select-group" style="display: none;">
                <label>الفئة</label>
                <select name="category">
                    ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>نوع الخصم *</label>
                <select name="discountType" required>
                    <option value="percentage">نسبة مئوية</option>
                    <option value="fixed">مبلغ ثابت</option>
                </select>
            </div>
            <div class="form-group">
                <label>قيمة الخصم *</label>
                <input type="number" name="value" required min="0" step="0.01">
            </div>
            <div class="form-group">
                <label>تاريخ البداية *</label>
                <input type="date" name="startDate" required>
            </div>
            <div class="form-group">
                <label>تاريخ النهاية *</label>
                <input type="date" name="endDate" required>
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" name="active" checked>
                    نشط
                </label>
            </div>
            <div class="form-group">
                <label>الوصف</label>
                <textarea name="description" rows="3"></textarea>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">إضافة</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
            </div>
        </form>
    `;
    
    document.getElementById('modal-overlay').classList.remove('hidden');
    
    document.getElementById('add-discount-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const discountData = Object.fromEntries(formData.entries());
        discountData.value = parseFloat(discountData.value);
        discountData.active = formData.get('active') === 'on';
        
        Discounts.add(discountData);
        closeModal();
        showToast('تم إضافة العرض بنجاح', 'success');
        renderDiscountsPage();
    });
};

// تبديل نوع الخصم
const toggleDiscountType = (type) => {
    const productGroup = document.getElementById('product-select-group');
    const categoryGroup = document.getElementById('category-select-group');
    
    productGroup.style.display = type === 'product' ? 'block' : 'none';
    categoryGroup.style.display = type === 'category' ? 'block' : 'none';
};

// عرض نافذة تعديل عرض
const showEditDiscountModal = (discountId) => {
    const discount = Discounts.getAll().find(d => d.id === discountId);
    const products = Products.getAll();
    const categories = Products.getCategories();
    
    if (!discount) return;
    
    document.getElementById('modal-title').textContent = 'تعديل العرض';
    document.getElementById('modal-body').innerHTML = `
        <form id="edit-discount-form">
            <div class="form-group">
                <label>اسم العرض *</label>
                <input type="text" name="name" value="${discount.name}" required>
            </div>
            <div class="form-group">
                <label>نوع العرض *</label>
                <select name="type" required onchange="toggleDiscountType(this.value)">
                    <option value="general" ${discount.type === 'general' ? 'selected' : ''}>عام</option>
                    <option value="product" ${discount.type === 'product' ? 'selected' : ''}>منتج محدد</option>
                    <option value="category" ${discount.type === 'category' ? 'selected' : ''}>فئة</option>
                </select>
            </div>
            <div class="form-group" id="product-select-group" style="display: ${discount.type === 'product' ? 'block' : 'none'};">
                <label>المنتج</label>
                <select name="productId">
                    ${products.map(p => `<option value="${p.id}" ${discount.productId === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group" id="category-select-group" style="display: ${discount.type === 'category' ? 'block' : 'none'};">
                <label>الفئة</label>
                <select name="category">
                    ${categories.map(c => `<option value="${c}" ${discount.category === c ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>نوع الخصم *</label>
                <select name="discountType" required>
                    <option value="percentage" ${discount.discountType === 'percentage' ? 'selected' : ''}>نسبة مئوية</option>
                    <option value="fixed" ${discount.discountType === 'fixed' ? 'selected' : ''}>مبلغ ثابت</option>
                </select>
            </div>
            <div class="form-group">
                <label>قيمة الخصم *</label>
                <input type="number" name="value" value="${discount.value}" required min="0" step="0.01">
            </div>
            <div class="form-group">
                <label>تاريخ البداية *</label>
                <input type="date" name="startDate" value="${discount.startDate.split('T')[0]}" required>
            </div>
            <div class="form-group">
                <label>تاريخ النهاية *</label>
                <input type="date" name="endDate" value="${discount.endDate.split('T')[0]}" required>
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" name="active" ${discount.active ? 'checked' : ''}>
                    نشط
                </label>
            </div>
            <div class="form-group">
                <label>الوصف</label>
                <textarea name="description" rows="3">${discount.description || ''}</textarea>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">حفظ التغييرات</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
            </div>
        </form>
    `;
    
    document.getElementById('modal-overlay').classList.remove('hidden');
    
    document.getElementById('edit-discount-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const discountData = Object.fromEntries(formData.entries());
        discountData.value = parseFloat(discountData.value);
        discountData.active = formData.get('active') === 'on';
        
        Discounts.update(discountId, discountData);
        closeModal();
        showToast('تم تحديث العرض بنجاح', 'success');
        renderDiscountsPage();
    });
};

// تبديل حالة العرض
const toggleDiscount = (discountId) => {
    const discount = Discounts.getAll().find(d => d.id === discountId);
    if (discount) {
        Discounts.update(discountId, { active: !discount.active });
        showToast(`تم ${discount.active ? 'إيقاف' : 'تفعيل'} العرض`, 'success');
        renderDiscountsPage();
    }
};

// حذف عرض
const deleteDiscount = (discountId) => {
    if (confirm('هل أنت متأكد من حذف هذا العرض؟')) {
        Discounts.delete(discountId);
        showToast('تم حذف العرض بنجاح', 'success');
        renderDiscountsPage();
    }
};

