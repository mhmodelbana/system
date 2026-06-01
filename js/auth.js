// إدارة المصادقة والصلاحيات
const Auth = {
    currentUser: null,

    // تسجيل الدخول
    login: (username, password) => {
        const users = Storage.get('users') || [];
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            Auth.currentUser = user;
            Storage.set('currentUser', user);
            return { success: true, user };
        }
        
        return { success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
    },

    // تسجيل الخروج
    logout: () => {
        Auth.currentUser = null;
        Storage.remove('currentUser');
    },

    // التحقق من تسجيل الدخول
    checkAuth: () => {
        const user = Storage.get('currentUser');
        if (user) {
            Auth.currentUser = user;
            return true;
        }
        return false;
    },

    // التحقق من الصلاحية
    hasPermission: (permission) => {
        if (!Auth.currentUser) return false;
        if (Auth.currentUser.role === 'admin') return true;
        if (Auth.currentUser.permissions.includes('all')) return true;
        return Auth.currentUser.permissions.includes(permission);
    },

    // إضافة مستخدم جديد
    addUser: (userData) => {
        const users = Storage.get('users') || [];
        const newUser = {
            id: generateId(),
            ...userData,
            createdAt: new Date().toISOString()
        };
        users.push(newUser);
        Storage.set('users', users);
        return newUser;
    },

    // تحديث مستخدم
    updateUser: (userId, userData) => {
        const users = Storage.get('users') || [];
        const index = users.findIndex(u => u.id === userId);
        if (index !== -1) {
            users[index] = { ...users[index], ...userData };
            Storage.set('users', users);
            return users[index];
        }
        return null;
    },

    // حذف مستخدم
    deleteUser: (userId) => {
        const users = Storage.get('users') || [];
        const filteredUsers = users.filter(u => u.id !== userId);
        Storage.set('users', filteredUsers);
        return true;
    },

    // الحصول على جميع المستخدمين
    getUsers: () => {
        return Storage.get('users') || [];
    },

    // تغيير كلمة المرور
    changePassword: (userId, oldPassword, newPassword) => {
        const users = Storage.get('users') || [];
        const user = users.find(u => u.id === userId);
        
        if (user && user.password === oldPassword) {
            user.password = newPassword;
            Storage.set('users', users);
            return { success: true };
        }
        
        return { success: false, message: 'كلمة المرور الحالية غير صحيحة' };
    }
};

// تهيئة تسجيل الدخول
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');
    const loginScreen = document.getElementById('login-screen');
    const mainScreen = document.getElementById('main-screen');

    // التحقق من تسجيل الدخول عند التحميل
    if (Auth.checkAuth()) {
        loginScreen.classList.add('hidden');
        mainScreen.classList.remove('hidden');
        document.getElementById('current-user-name').textContent = Auth.currentUser.name;
    }

    // معالجة تسجيل الدخول
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            const result = Auth.login(username, password);
            
            if (result.success) {
                loginScreen.classList.add('hidden');
                mainScreen.classList.remove('hidden');
                document.getElementById('current-user-name').textContent = result.user.name;
                showToast('تم تسجيل الدخول بنجاح', 'success');
                loadPage('dashboard');
            } else {
                showToast(result.message, 'error');
            }
        });
    }

    // معالجة تسجيل الخروج
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            Auth.logout();
            loginScreen.classList.remove('hidden');
            mainScreen.classList.add('hidden');
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
            showToast('تم تسجيل الخروج', 'info');
        });
    }
});
