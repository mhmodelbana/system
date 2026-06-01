// إدارة LocalStorage
const Storage = {
    // حفظ البيانات
    set: (key, data) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('خطأ في حفظ البيانات:', error);
            return false;
        }
    },

    // استرجاع البيانات
    get: (key) => {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('خطأ في استرجاع البيانات:', error);
            return null;
        }
    },

    // حذف البيانات
    remove: (key) => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('خطأ في حذف البيانات:', error);
            return false;
        }
    },

    // مسح جميع البيانات
    clear: () => {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('خطأ في مسح البيانات:', error);
            return false;
        }
    },

    // النسخ الاحتياطي
    backup: () => {
        try {
            const backup = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                backup[key] = JSON.parse(localStorage.getItem(key));
            }
            return JSON.stringify(backup);
        } catch (error) {
            console.error('خطأ في النسخ الاحتياطي:', error);
            return null;
        }
    },

    // استعادة النسخة الاحتياطية
    restore: (backupData) => {
        try {
            const backup = JSON.parse(backupData);
            Object.keys(backup).forEach(key => {
                localStorage.setItem(key, JSON.stringify(backup[key]));
            });
            return true;
        } catch (error) {
            console.error('خطأ في استعادة النسخة الاحتياطية:', error);
            return false;
        }
    }
};

// تهيئة البيانات الافتراضية
const initializeData = () => {
    const isDemoProduct = (product) => {
        return typeof product.name === 'string' && /منتج تجريبي|demo|example/i.test(product.name);
    };

    const isDemoSupplier = (supplier) => {
        return typeof supplier.name === 'string' && /مورد تجريبي|demo|example/i.test(supplier.name)
            || typeof supplier.email === 'string' && /supplier@example\.com/i.test(supplier.email);
    };

    const isDemoCustomer = (customer) => {
        return typeof customer.name === 'string' && /عميل تجريبي|demo|example/i.test(customer.name)
            || typeof customer.email === 'string' && /customer@example\.com/i.test(customer.email);
    };

    // تنظيف بيانات التجربة القديمة إذا كانت موجودة
    const existingProducts = Storage.get('products');
    if (Array.isArray(existingProducts)) {
        const filteredProducts = existingProducts.filter(product => !isDemoProduct(product));
        if (filteredProducts.length !== existingProducts.length) {
            Storage.set('products', filteredProducts);
        }
    }

    const existingSuppliers = Storage.get('suppliers');
    if (Array.isArray(existingSuppliers)) {
        const filteredSuppliers = existingSuppliers.filter(supplier => !isDemoSupplier(supplier));
        if (filteredSuppliers.length !== existingSuppliers.length) {
            Storage.set('suppliers', filteredSuppliers);
        }
    }

    const existingCustomers = Storage.get('customers');
    if (Array.isArray(existingCustomers)) {
        const filteredCustomers = existingCustomers.filter(customer => !isDemoCustomer(customer));
        if (filteredCustomers.length !== existingCustomers.length) {
            Storage.set('customers', filteredCustomers);
        }
    }

    const existingUsers = Storage.get('users');
    if (Array.isArray(existingUsers)) {
        const filteredUsers = existingUsers.filter(user => !(user.username === 'cashier' && user.password === 'cashier123'));
        if (filteredUsers.length !== existingUsers.length) {
            Storage.set('users', filteredUsers);
        }
    }

    // المستخدمين الافتراضيين
    if (!Storage.get('users')) {
        const defaultUsers = [
            {
                id: 1,
                username: 'admin',
                password: 'admin123',
                name: 'المدير العام',
                role: 'admin',
                permissions: ['all'],
                branchId: null,
                createdAt: new Date().toISOString()
            }
        ];
        Storage.set('users', defaultUsers);
    }

    // الفروع الافتراضية
    if (!Storage.get('branches')) {
        const defaultBranches = [
            {
                id: 1,
                name: 'الفرع الرئيسي',
                address: 'القاهرة، مصر',
                phone: '01000000000',
                manager: 'المدير العام',
                createdAt: new Date().toISOString()
            }
        ];
        Storage.set('branches', defaultBranches);
    }

    // المنتجات الافتراضية
    if (!Storage.get('products')) {
        Storage.set('products', []);
    }

    // الموردين الافتراضيين
    if (!Storage.get('suppliers')) {
        Storage.set('suppliers', []);
    }

    // العملاء الافتراضيين
    if (!Storage.get('customers')) {
        Storage.set('customers', []);
    }

    // المبيعات
    if (!Storage.get('sales')) {
        Storage.set('sales', []);
    }

    // المشتريات
    if (!Storage.get('purchases')) {
        Storage.set('purchases', []);
    }

    // العروض والخصومات
    if (!Storage.get('discounts')) {
        Storage.set('discounts', []);
    }

    // الإعدادات
    if (!Storage.get('settings')) {
        const defaultSettings = {
            currency: 'ج.م',
            taxRate: 0,
            lowStockAlert: true,
            barcodePrefix: '100',
            receiptFooter: 'شكراً لتعاملكم معنا',
            companyName: 'سوبر ماركت بنا',
            companyAddress: 'القاهرة، مصر',
            companyPhone: '01000000000',
            companyLogo: ''
        };
        Storage.set('settings', defaultSettings);
    }
};

// توليد معرف فريد
const generateId = () => {
    return Date.now() + Math.random().toString(36).substr(2, 9);
};

// تهيئة النظام
initializeData();
