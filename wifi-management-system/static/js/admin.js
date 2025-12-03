// نمایش بخش‌های مختلف
function showSection(sectionId) {
    // مخفی کردن تمام بخش‌ها
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // نمایش بخش انتخاب شده
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // به‌روزرسانی منوی سایدبار
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active');
        }
    });
    
    // بارگذاری داده‌های مربوط به بخش
    loadSectionData(sectionId);
}

// بارگذاری داده‌های بخش
function loadSectionData(sectionId) {
    switch(sectionId) {
        case 'dashboard':
            loadDashboardStats();
            break;
        case 'accounts':
            loadAccounts();
            break;
        case 'sellers':
            loadSellers();
            break;
        case 'notifications':
            loadNotifications();
            break;
        case 'reports':
            loadReports();
            break;
        case 'loyalty':
            loadLoyaltyStats();
            break;
        case 'payments':
            loadPaymentStats();
            break;
        case 'ai':
            loadAIStats();
            break;
        case 'support':
            loadSupportStats();
            break;
    }
}

// مدیریت مودال‌ها
function showUploadModal() {
    document.getElementById('uploadModal').style.display = 'block';
}

function showAddSellerModal() {
    document.getElementById('addSellerModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// بستن مودال با کلیک خارج از آن
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// آپلود فایل PDF
document.getElementById('uploadForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData();
    const fileInput = document.getElementById('pdf_file');
    formData.append('pdf_file', fileInput.files[0]);
    
    // نمایش loading
    const resultDiv = document.getElementById('uploadResult');
    resultDiv.innerHTML = '<div class="alert-info">⏳ در حال آپلود و پردازش فایل...</div>';
    
    fetch('/upload-pdf', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            resultDiv.innerHTML = `<div class="alert-success">✅ ${data.accounts_count} اکانت با موفقیت استخراج شد!</div>`;
            loadAccounts(); // بارگذاری مجدد لیست اکانت‌ها
        } else {
            resultDiv.innerHTML = `<div class="alert-error">❌ خطا در آپلود فایل: ${data.message || 'خطای ناشناخته'}</div>`;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        resultDiv.innerHTML = '<div class="alert-error">❌ خطا در اتصال به سرور</div>';
    });
});

// افزودن فروشنده جدید
document.getElementById('addSellerForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const sellerData = {
        name: document.getElementById('seller-name').value,
        phone: document.getElementById('seller-phone').value,
        email: document.getElementById('seller-email').value,
        password: document.getElementById('seller-password').value,
        commission_rate: document.getElementById('seller-commission')?.value || 10
    };
    
    // نمایش loading
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '⏳ در حال ثبت...';
    submitBtn.disabled = true;
    
    fetch('/api/admin/sellers', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(sellerData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('✅ فروشنده با موفقیت اضافه شد!', 'success');
            closeModal('addSellerModal');
            document.getElementById('addSellerForm').reset();
            loadSellers(); // بارگذاری مجدد لیست فروشندگان
        } else {
            showToast(`❌ خطا: ${data.message}`, 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('❌ خطا در اتصال به سرور', 'error');
    })
    .finally(() => {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    });
});

// بارگذاری داده‌های اولیه
document.addEventListener('DOMContentLoaded', function() {
    // مدیریت routing برای هش‌ها
    if (window.location.hash) {
        const sectionId = window.location.hash.substring(1);
        showSection(sectionId);
    } else {
        showSection('dashboard');
    }
    
    // تنظیم event listener برای هش‌های URL
    window.addEventListener('hashchange', function() {
        const sectionId = window.location.hash.substring(1);
        showSection(sectionId);
    });
    
    // بارگذاری آمار داشبورد
    loadDashboardStats();
    
    // تنظیم event listener برای دکمه خروج
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            adminSecurity.logout();
        });
    }
});

// سیستم مدیریت کش
const adminCache = {
    cache: new Map(),
    expiryTimes: new Map(),
    defaultTTL: 300000, // 5 دقیقه
    
    set(key, value, ttl = this.defaultTTL) {
        this.cache.set(key, value);
        this.expiryTimes.set(key, Date.now() + ttl);
        return value;
    },
    
    get(key) {
        const expiry = this.expiryTimes.get(key);
        if (expiry && Date.now() > expiry) {
            this.delete(key);
            return null;
        }
        return this.cache.get(key) || null;
    },
    
    delete(key) {
        this.cache.delete(key);
        this.expiryTimes.delete(key);
    },
    
    clear() {
        this.cache.clear();
        this.expiryTimes.clear();
    }
};

// بارگذاری آمار داشبورد
function loadDashboardStats() {
    // چک کردن کش
    const cachedStats = adminCache.get('dashboard_stats');
    if (cachedStats) {
        updateDashboardStats(cachedStats);
        return;
    }
    
    // داده‌های نمونه (در حالت واقعی باید از API بگیرید)
    const sampleStats = {
        total_accounts: 150,
        total_sellers: 25,
        total_sales: 89,
        revenue: 2450000,
        active_users: 120,
        pending_tickets: 5
    };
    
    adminCache.set('dashboard_stats', sampleStats);
    updateDashboardStats(sampleStats);
}

function updateDashboardStats(stats) {
    document.getElementById('total-accounts').textContent = stats.total_accounts || 0;
    document.getElementById('total-sellers').textContent = stats.total_sellers || 0;
    document.getElementById('total-sales').textContent = stats.total_sales || 0;
    document.getElementById('revenue').textContent = stats.revenue ? stats.revenue.toLocaleString() : 0;
    document.getElementById('active-users').textContent = stats.active_users || 0;
    document.getElementById('pending-tickets').textContent = stats.pending_tickets || 0;
}

// بارگذاری لیست اکانت‌ها
function loadAccounts() {
    const tbody = document.getElementById('accounts-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="7" class="loading">⏳ در حال بارگذاری...</td></tr>';
    
    // در حالت واقعی باید از API بگیرید
    setTimeout(() => {
        const accounts = [
            {id: 1, username: 'user001', password: 'pass123', type: 'Wfi', status: 'فعال', date: '1403/01/15', location: 'برچی'},
            {id: 2, username: 'user002', password: 'pass456', type: 'GB', status: 'فعال', date: '1403/01/16', location: 'برچی'},
            {id: 3, username: 'user003', password: 'pass789', type: 'MB', status: 'غیرفعال', date: '1403/01/17', location: 'شهر نو'}
        ];
        
        displayAccountsTable(accounts);
    }, 500);
}

function displayAccountsTable(accounts) {
    const tbody = document.getElementById('accounts-table-body');
    tbody.innerHTML = '';
    
    if (accounts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="no-data">داده‌ای برای نمایش وجود ندارد</td></tr>';
        return;
    }
    
    accounts.forEach((account, index) => {
        const row = `
            <tr>
                <td>${index + 1}</td>
                <td>${account.username}</td>
                <td>
                    <span class="password-field" data-password="${account.password}">
                        ${'*'.repeat(8)}
                    </span>
                    <button class="btn-show-password" onclick="togglePassword(this)">👁️</button>
                </td>
                <td>${account.type}</td>
                <td>${account.location || 'نامشخص'}</td>
                <td><span class="status ${account.status === 'فعال' ? 'active' : 'inactive'}">${account.status}</span></td>
                <td>${account.date}</td>
                <td>
                    <button class="btn-edit" onclick="editAccount(${account.id})">ویرایش</button>
                    <button class="btn-delete" onclick="deleteAccount(${account.id})">حذف</button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// بارگذاری لیست فروشندگان
function loadSellers() {
    const tbody = document.getElementById('sellers-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="7" class="loading">⏳ در حال بارگذاری...</td></tr>';
    
    // در حالت واقعی باید از API بگیرید
    setTimeout(() => {
        const sellers = [
            {id: 1, name: 'علی محمدی', phone: '09123456789', email: 'ali@example.com', date: '1403/01/10', status: 'فعال', commission: '15%'},
            {id: 2, name: 'مریم رضوی', phone: '09356789012', email: 'maryam@example.com', date: '1403/01/12', status: 'فعال', commission: '12%'}
        ];
        
        displaySellersTable(sellers);
    }, 500);
}

function displaySellersTable(sellers) {
    const tbody = document.getElementById('sellers-table-body');
    tbody.innerHTML = '';
    
    if (sellers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="no-data">فروشنده‌ای یافت نشد</td></tr>';
        return;
    }
    
    sellers.forEach((seller, index) => {
        const row = `
            <tr>
                <td>${index + 1}</td>
                <td>${seller.name}</td>
                <td>${seller.phone}</td>
                <td>${seller.email}</td>
                <td>${seller.commission || '0%'}</td>
                <td>${seller.date}</td>
                <td><span class="status ${seller.status === 'فعال' ? 'active' : 'inactive'}">${seller.status}</span></td>
                <td>
                    <button class="btn-view" onclick="viewSeller(${seller.id})">مشاهده</button>
                    <button class="btn-edit" onclick="editSeller(${seller.id})">ویرایش</button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// بارگذاری آمار وفاداری
function loadLoyaltyStats() {
    const cachedStats = adminCache.get('loyalty_stats');
    if (cachedStats) {
        updateLoyaltyStats(cachedStats);
        return;
    }
    
    fetch('/api/admin/loyalty/stats')
        .then(response => response.json())
        .then(stats => {
            adminCache.set('loyalty_stats', stats);
            updateLoyaltyStats(stats);
        })
        .catch(error => {
            console.error('Error loading loyalty stats:', error);
            // نمایش داده‌های نمونه در صورت خطا
            const sampleStats = {
                total_points: 15420,
                active_customers: 127,
                redeemed_rewards: 45,
                avg_points: 121
            };
            updateLoyaltyStats(sampleStats);
        });
}

function updateLoyaltyStats(stats) {
    const totalPoints = document.getElementById('total-points');
    const activeCustomers = document.getElementById('active-customers');
    const redeemedRewards = document.getElementById('redeemed-rewards');
    const avgPoints = document.getElementById('avg-points');
    
    if (totalPoints) totalPoints.textContent = stats.total_points || 0;
    if (activeCustomers) activeCustomers.textContent = stats.active_customers || 0;
    if (redeemedRewards) redeemedRewards.textContent = stats.redeemed_rewards || 0;
    if (avgPoints) avgPoints.textContent = stats.avg_points || 0;
}

// بارگذاری آمار پرداخت‌ها
function loadPaymentStats() {
    const cachedStats = adminCache.get('payment_stats');
    if (cachedStats) {
        updatePaymentStats(cachedStats);
        return;
    }
    
    fetch('/api/admin/payments/stats')
        .then(response => response.json())
        .then(stats => {
            adminCache.set('payment_stats', stats);
            updatePaymentStats(stats);
        })
        .catch(error => {
            console.error('Error loading payment stats:', error);
            const sampleStats = {
                total_payments: 142,
                successful_payments: 128,
                total_revenue: 24500000,
                today_payments: 8
            };
            updatePaymentStats(sampleStats);
        });
}

function updatePaymentStats(stats) {
    const totalPayments = document.getElementById('total-payments');
    const successfulPayments = document.getElementById('successful-payments');
    const totalRevenue = document.getElementById('total-revenue');
    const todayPayments = document.getElementById('today-payments');
    
    if (totalPayments) totalPayments.textContent = stats.total_payments || 0;
    if (successfulPayments) successfulPayments.textContent = stats.successful_payments || 0;
    if (totalRevenue) totalRevenue.textContent = stats.total_revenue ? stats.total_revenue.toLocaleString() : 0;
    if (todayPayments) todayPayments.textContent = stats.today_payments || 0;
}

// بارگذاری آمار هوش مصنوعی
function loadAIStats() {
    const cachedStats = adminCache.get('ai_stats');
    if (cachedStats) {
        updateAIStats(cachedStats);
        return;
    }
    
    fetch('/api/admin/ai/stats')
        .then(response => response.json())
        .then(stats => {
            adminCache.set('ai_stats', stats);
            updateAIStats(stats);
        })
        .catch(error => {
            console.error('Error loading AI stats:', error);
            const sampleStats = {
                total_models: 3,
                active_models: 2,
                total_predictions: 1560,
                average_accuracy: 87
            };
            updateAIStats(sampleStats);
        });
}

function updateAIStats(stats) {
    const totalModels = document.getElementById('total-models');
    const activeModels = document.getElementById('active-models');
    const totalPredictions = document.getElementById('total-predictions');
    const avgAccuracy = document.getElementById('avg-accuracy');
    
    if (totalModels) totalModels.textContent = stats.total_models || 0;
    if (activeModels) activeModels.textContent = stats.active_models || 0;
    if (totalPredictions) totalPredictions.textContent = stats.total_predictions || 0;
    if (avgAccuracy) avgAccuracy.textContent = stats.average_accuracy ? `${stats.average_accuracy}%` : '0%';
}

// بارگذاری آمار پشتیبانی
function loadSupportStats() {
    const cachedStats = adminCache.get('support_stats');
    if (cachedStats) {
        updateSupportStats(cachedStats);
        return;
    }
    
    fetch('/api/admin/support/stats')
        .then(response => response.json())
        .then(stats => {
            adminCache.set('support_stats', stats);
            updateSupportStats(stats);
        })
        .catch(error => {
            console.error('Error loading support stats:', error);
            const sampleStats = {
                total_tickets: 42,
                open_tickets: 8,
                in_progress_tickets: 12,
                resolved_tickets: 22,
                urgent_tickets: 3
            };
            updateSupportStats(sampleStats);
        });
}

function updateSupportStats(stats) {
    const totalTickets = document.getElementById('total-tickets');
    const openTickets = document.getElementById('open-tickets');
    const inProgressTickets = document.getElementById('in-progress-tickets');
    const resolvedTickets = document.getElementById('resolved-tickets');
    const urgentTickets = document.getElementById('urgent-tickets');
    
    if (totalTickets) totalTickets.textContent = stats.total_tickets || 0;
    if (openTickets) openTickets.textContent = stats.open_tickets || 0;
    if (inProgressTickets) inProgressTickets.textContent = stats.in_progress_tickets || 0;
    if (resolvedTickets) resolvedTickets.textContent = stats.resolved_tickets || 0;
    if (urgentTickets) urgentTickets.textContent = stats.urgent_tickets || 0;
}

// بارگذاری اعلان‌ها
function loadNotifications() {
    const container = document.getElementById('notifications-container');
    if (!container) return;
    
    fetch('/api/admin/notifications')
        .then(response => response.json())
        .then(notifications => {
            displayNotifications(notifications);
        })
        .catch(error => {
            console.error('Error loading notifications:', error);
            container.innerHTML = '<div class="no-data">خطا در بارگذاری اعلان‌ها</div>';
        });
}

function displayNotifications(notifications) {
    const container = document.getElementById('notifications-container');
    if (!container) return;
    
    if (!notifications || notifications.length === 0) {
        container.innerHTML = '<div class="no-data">اعلانی وجود ندارد</div>';
        return;
    }
    
    container.innerHTML = notifications.map(notif => `
        <div class="notification-item">
            <div class="notification-content">
                <h4>${notif.title}</h4>
                <p>${notif.message}</p>
                <div class="notification-meta">
                    تاریخ: ${notif.created_at} | 
                    مخاطب: ${notif.target_type === 'all' ? 'همه' : 
                            notif.target_type === 'sellers' ? 'فروشندگان' :
                            notif.target_type === 'customers' ? 'مشتریان' : 'کاربر خاص'}
                    ${notif.expires_at ? ` | انقضا: ${notif.expires_at}` : ''}
                </div>
            </div>
            <div class="notification-actions">
                <span class="notification-type type-${notif.type}">${getNotificationTypeText(notif.type)}</span>
                <button class="btn-delete" onclick="deleteNotification(${notif.id})">حذف</button>
            </div>
        </div>
    `).join('');
}

// بارگذاری گزارش‌ها
function loadReports() {
    // این تابع گزارش‌ها را بارگذاری می‌کند
    console.log('بارگذاری گزارش‌ها...');
}

// توابع عملیاتی
function editAccount(id) {
    showToast(`ویرایش اکانت شماره ${id}`, 'info');
    // در اینجا مودال ویرایش را نمایش دهید
}

function deleteAccount(id) {
    if (confirm('آیا از حذف این اکانت مطمئن هستید؟')) {
        fetch(`/api/admin/accounts/${id}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast('✅ اکانت با موفقیت حذف شد', 'success');
                loadAccounts(); // بارگذاری مجدد
            } else {
                showToast(`❌ خطا: ${data.message}`, 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('❌ خطا در اتصال به سرور', 'error');
        });
    }
}

function viewSeller(id) {
    showToast(`مشاهده اطلاعات فروشنده شماره ${id}`, 'info');
    // در اینجا مودال مشاهده را نمایش دهید
}

function editSeller(id) {
    showToast(`ویرایش فروشنده شماره ${id}`, 'info');
    // در اینجا مودال ویرایش را نمایش دهید
}

function deleteNotification(id) {
    if (confirm('آیا از حذف این اعلان مطمئن هستید؟')) {
        fetch(`/api/admin/notifications/${id}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast('✅ اعلان حذف شد', 'success');
                loadNotifications(); // بارگذاری مجدد
            } else {
                showToast(`❌ خطا: ${data.message}`, 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('❌ خطا در اتصال به سرور', 'error');
        });
    }
}

function togglePassword(button) {
    const passwordField = button.previousElementSibling;
    const password = passwordField.getAttribute('data-password');
    
    if (passwordField.textContent.includes('*')) {
        passwordField.textContent = password;
        button.textContent = '🙈';
    } else {
        passwordField.textContent = '*'.repeat(8);
        button.textContent = '👁️';
    }
}

function saveSettings() {
    const settings = {
        theme: document.getElementById('theme')?.value || 'light',
        language: document.getElementById('language')?.value || 'fa',
        notifications: document.getElementById('notifications')?.checked || false
    };
    
    localStorage.setItem('admin_settings', JSON.stringify(settings));
    showToast('✅ تنظیمات با موفقیت ذخیره شد!', 'success');
}

// سیستم نمایش نوتیفیکیشن
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    // استایل‌های CSS
    if (!document.querySelector('#toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            .toast {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                padding: 12px 24px;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: space-between;
                min-width: 300px;
                max-width: 90%;
                animation: slideIn 0.3s ease;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .toast-success { background: #10b981; }
            .toast-error { background: #ef4444; }
            .toast-warning { background: #f59e0b; }
            .toast-info { background: #3b82f6; }
            .toast button {
                background: none;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                margin-left: 10px;
                padding: 0;
            }
            @keyframes slideIn {
                from { top: -100px; opacity: 0; }
                to { top: 20px; opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    // حذف خودکار بعد از 5 ثانیه
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

// مدیر امنیت
const adminSecurity = {
    token: localStorage.getItem('admin_token'),
    
    validateSession() {
        if (!this.token) {
            this.redirectToLogin();
            return false;
        }
        
        // در اینجا باید اعتبارسنجی توکن انجام شود
        return true;
    },
    
    logout() {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_refresh_token');
        localStorage.removeItem('admin_user');
        this.redirectToLogin();
    },
    
    redirectToLogin() {
        window.location.href = '/admin/login';
    },
    
    getAuthHeaders() {
        return this.token ? {
            'Authorization': `Bearer ${this.token}`
        } : {};
    }
};

// توابع کمکی
function getNotificationTypeText(type) {
    const types = {
        'info': 'اطلاعاتی',
        'warning': 'هشدار',
        'urgent': 'اهمیت بالا',
        'success': 'موفقیت'
    };
    return types[type] || type;
}

function getPriorityText(priority) {
    const priorities = {
        'low': 'کم',
        'medium': 'متوسط',
        'high': 'زیاد',
        'urgent': 'فوری'
    };
    return priorities[priority] || priority;
}

function getStatusText(status) {
    const statuses = {
        'open': 'باز',
        'in_progress': 'در حال پیگیری',
        'resolved': 'حل شده',
        'closed': 'بسته شده'
    };
    return statuses[status] || status;
}

// ایجاد نمودارها
function initCharts() {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;
    
    try {
        new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور'],
                datasets: [{
                    label: 'فروش ماهانه (میلیون ریال)',
                    data: [12, 19, 3, 5, 2, 3],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.1,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            font: {
                                family: 'Vazirmatn, sans-serif'
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value + 'M';
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error initializing chart:', error);
    }
}

// راه‌اندازی نمودارها بعد از بارگذاری کامل صفحه
if (document.readyState === 'complete') {
    initCharts();
} else {
    window.addEventListener('load', initCharts);
}

// استایل برای وضعیت‌ها و اعلان‌ها
const adminStyles = document.createElement('style');
adminStyles.textContent = `
    .status {
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 500;
        display: inline-block;
    }
    .status.active {
        background: #10b981;
        color: white;
    }
    .status.inactive {
        background: #ef4444;
        color: white;
    }
    .status.pending {
        background: #f59e0b;
        color: white;
    }
    
    .alert-success {
        background: #10b981;
        color: white;
        padding: 1rem;
        border-radius: 6px;
        margin: 1rem 0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    .alert-error {
        background: #ef4444;
        color: white;
        padding: 1rem;
        border-radius: 6px;
        margin: 1rem 0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    .alert-info {
        background: #3b82f6;
        color: white;
        padding: 1rem;
        border-radius: 6px;
        margin: 1rem 0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    .alert-warning {
        background: #f59e0b;
        color: white;
        padding: 1rem;
        border-radius: 6px;
        margin: 1rem 0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .loading {
        text-align: center;
        padding: 2rem;
        color: #6b7280;
    }
    
    .no-data {
        text-align: center;
        padding: 2rem;
        color: #9ca3af;
    }
    
    .password-field {
        font-family: monospace;
        letter-spacing: 2px;
    }
    
    .btn-show-password {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 14px;
        margin-right: 8px;
        padding: 2px 6px;
        border-radius: 4px;
        background: #f3f4f6;
    }
    
    .btn-show-password:hover {
        background: #e5e7eb;
    }
    
    .table-responsive {
        overflow-x: auto;
    }
`;
document.head.appendChild(adminStyles);