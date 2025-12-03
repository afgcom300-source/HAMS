// نمایش بخش‌های مختلف
function showSection(sectionId) {
    // مخفی کردن تمام بخش‌ها
    document.querySelectorAll('.seller-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // نمایش بخش انتخاب شده
    document.getElementById(sectionId).classList.add('active');
    
    // به‌روزرسانی منوی سایدبار
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.classList.remove('active');
    });
    event.target.classList.add('active');
}

// مدیریت مودال‌ها
function showSellModal() {
    loadAvailableAccounts();
    document.getElementById('sellModal').style.display = 'block';
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

// بارگذاری داده‌های اولیه
document.addEventListener('DOMContentLoaded', function() {
    loadSellerInfo();
    loadDashboardStats();
    loadRecentSales();
    loadAccounts();
});

// بارگذاری اطلاعات فروشنده
function loadSellerInfo() {
    // داده‌های نمونه
    document.getElementById('seller-name').textContent = 'علی محمدی';
    document.getElementById('profile-name').value = 'علی محمدی';
    document.getElementById('profile-phone').value = '09123456789';
    document.getElementById('profile-email').value = 'ali@example.com';
}

// بارگذاری آمار داشبورد
function loadDashboardStats() {
    // داده‌های نمونه
    document.getElementById('available-accounts').textContent = '25';
    document.getElementById('today-sales').textContent = '3';
    document.getElementById('commission-balance').textContent = '150,000';
    document.getElementById('total-sales-count').textContent = '42';
    
    // به‌روزرسانی آمار کمیسیون
    document.getElementById('current-commission').textContent = '150,000 افغانی';
    document.getElementById('total-received').textContent = '850,000 افغانی';
    document.getElementById('total-commission').textContent = '1,200,000 افغانی';
}

// بارگذاری آخرین فروش‌ها
function loadRecentSales() {
    // داده‌های نمونه
    const sales = [
        {customer: 'رضا حسینی', amount: '50,000', accountType: 'Wfi', time: '2 ساعت پیش'},
        {customer: 'محمد زمان محمدی ', amount: '35,000', accountType: 'GB', time: '5 ساعت پیش'},
        {customer: 'سید گلشاه کریمی', amount: '25,000', accountType: 'MB', time: '1 روز پیش'}
    ];
    
    const salesList = document.getElementById('recent-sales-list');
    salesList.innerHTML = '';
    
    sales.forEach(sale => {
        const saleItem = `
            <div class="sale-item">
                <div>
                    <div class="customer-name">${sale.customer}</div>
                    <div class="account-type">${sale.accountType}</div>
                </div>
                <div class="sale-details">
                    <div class="amount">${sale.amount} افغانی</div>
                    <div class="time">${sale.time}</div>
                </div>
          </div>
        `;
        salesList.innerHTML += saleItem;
    });
}

// بارگذاری اکانت‌ها
function loadAccounts() {
    // داده‌های نمونه
    const accounts = [
        {id: 1, username: 'user001', password: 'pass123', type: 'Wfi', status: 'فعال'},
        {id: 2, username: 'user002', password: 'pass456', type: 'GB', status: 'فعال'},
        {id: 3, username: 'user003', password: 'pass789', type: 'MB', status: 'فعال'},
        {id: 4, username: 'user004', password: 'pass000', type: 'Wfi', status: 'فعال'}
    ];
    
    const accountsGrid = document.getElementById('accounts-grid');
    accountsGrid.innerHTML = '';
    
    accounts.forEach(account => {
        const accountCard = `
            <div class="account-card">
                <span class="account-type">${account.type}</span>
                <div class="account-username">${account.username}</div>
                <div class="account-password">${account.password}</div>
                <span class="account-status ${account.status === 'فعال' ? 'active' : 'inactive'}">${account.status}</span>
                <button class="sell-btn" onclick="showSellModalForAccount(${account.id})">ثبت فروش</button>
            </div>
        `;
        accountsGrid.innerHTML += accountCard;
    });
    
    // بارگذاری اکانت‌ها در مودال فروش
    loadAvailableAccounts();
}

// بارگذاری اکانت‌های موجود برای فروش
function loadAvailableAccounts() {
    // داده‌های نمونه
    const accounts = [
        {id: 1, username: 'user001', type: 'Wfi'},
        {id: 2, username: 'user002', type: 'GB'},
        {id: 3, username: 'user003', type: 'MB'}
    ];
    
    const accountSelect = document.getElementById('account-select');
    accountSelect.innerHTML = '<option value="">انتخاب کنید...</option>';
    
    accounts.forEach(account => {
        const option = `<option value="${account.id}">${account.username} (${account.type})</option>`;
        accountSelect.innerHTML += option;
    });
}

// نمایش مودال فروش برای اکانت خاص
function showSellModalForAccount(accountId) {
    loadAvailableAccounts();
    document.getElementById('sellModal').style.display = 'block';
    // انتخاب اکانت در dropdown
    document.getElementById('account-select').value = accountId;
}

// ثبت فروش جدید
document.getElementById('sellForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const saleData = {
        customerName: document.getElementById('customer-name').value,
        accountId: document.getElementById('account-select').value,
        price: document.getElementById('sale-price').value,
        notes: document.getElementById('notes').value
    };
    
    // اینجا باید با سرور تماس بگیرید
    console.log('Registering sale:', saleData);
    alert('فروش با موفقیت ثبت شد!');
    closeModal('sellModal');
    
    // بارگذاری مجدد داده‌ها
    loadDashboardStats();
    loadRecentSales();
});

// فیلتر فروش‌ها
function filterSales() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    // داده‌های نمونه
    const sales = [
        {id: 1, customer: 'رضا حسینی', type: 'Wfi', amount: '50,000', commission: '5,000', date: '1403/01/15', status: 'تکمیل شده'},
        {id: 2, customer: 'محمد صوفی', type: 'GB', amount: '35,000', commission: '3,500', date: '1403/01/16', status: 'تکمیل شده'}
    ];
    
    const tbody = document.getElementById('sales-table-body');
    tbody.innerHTML = '';
    
    sales.forEach((sale, index) => {
        const row = `
            <tr>
                <td>${index + 1}</td>
                <td>${sale.customer}</td>
                <td>${sale.type}</td>
                <td>${sale.amount}</td>
                <td>${sale.commission}</td>
                <td>${sale.date}</td>
                <td><span class="status completed">${sale.status}</span></td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// درخواست تسویه حساب
function requestWithdraw() {
    const amount = document.getElementById('withdraw-amount').value;
    const bankAccount = document.getElementById('bank-account').value;
    
    if (!amount || !bankAccount) {
        alert('لطفاً تمام فیلدها را پر کنید');
        return;
    }
    
    // اینجا باید با سرور تماس بگیرید
    console.log('Withdraw request:', {amount, bankAccount});
    alert('درخواست تسویه با موفقیت ثبت شد!');
    
    // بارگذاری مجدد تاریخچه
    loadWithdrawHistory();
}

// بارگذاری تاریخچه تسویه‌ها
function loadWithdrawHistory() {
    // داده‌های نمونه
    const history = [
        {id: 1, amount: '100,000', date: '1403/01/10', status: 'تکمیل شده'},
        {id: 2, amount: '50,000', date: '1403/01/05', status: 'در انتظار'}
    ];
    
    const historyList = document.getElementById('withdraw-history-list');
    historyList.innerHTML = '';
    
    history.forEach(item => {
        const historyItem = `
            <div class="history-item">
                <div>
                    <div class="amount">${item.amount} افغانی</div>
                    <div class="date">${item.date}</div>
                </div>
                <span class="status ${item.status.includes('تکمیل') ? 'completed' : 'pending'}">${item.status}</span>
            </div>
        `;
        historyList.innerHTML += historyItem;
    });
}
// بارگذاری اعلان‌های فروشنده
function loadSellerNotifications() {
    fetch('/api/seller/notifications')
    .then(response => response.json())
    .then(notifications => {
        const notificationsList = document.getElementById('seller-notifications-list');
        if (notificationsList) {
            notificationsList.innerHTML = '';
            
            if (notifications.length === 0) {
                notificationsList.innerHTML = '<div class="no-notifications">اعلانی وجود ندارد</div>';
                return;
            }
            
            notifications.forEach(notif => {
                const notifClass = `type-${notif.type}`;
                const notifItem = `
                    <div class="notification-item ${notifClass} ${notif.is_read ? 'read' : ''}" 
                         onclick="markNotificationAsRead(${notif.id}, ${notif.user_notification_id})">
                        <div class="notification-icon">
                            ${notif.type === 'info' ? 'ℹ️' : 
                              notif.type === 'warning' ? '⚠️' : 
                              notif.type === 'urgent' ? '🚨' : '✅'}
                        </div>
                        <div class="notification-content">
                            <h4>${notif.title}</h4>
                            <p>${notif.message}</p>
                            <div class="notification-time">${notif.created_at}</div>
                        </div>
                    </div>
                `;
                notificationsList.innerHTML += notifItem;
            });
        }
    })
    .catch(error => {
        console.error('Error loading notifications:', error);
    });
}

// علامت‌گذاری اعلان به عنوان خوانده شده
function markNotificationAsRead(notifId, userNotifId) {
    fetch(`/api/notifications/${notifId}/read`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            user_id: 1, // باید از session بگیرید
            user_type: 'seller'
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // به‌روزرسانی UI
            event.target.closest('.notification-item').classList.add('read');
            loadSellerNotifications(); // بارگذاری مجدد
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

// اضافه کردن این تابع به بارگذاری اولیه
document.addEventListener('DOMContentLoaded', function() {
    // ... کدهای قبلی ...

// به‌روزرسانی پروفایل
function updateProfile() {
    const name = document.getElementById('profile-name').value;
    const phone = document.getElementById('profile-phone').value;
    const email = document.getElementById('profile-email').value;
    const password = document.getElementById('profile-password').value;
    
    // اینجا باید با سرور تماس بگیرید
    console.log('Updating profile:', {name, phone, email, password});
    alert('اطلاعات پروفایل با موفقیت به‌روزرسانی شد!');
}

// نمایش بخش اکانت‌ها
function showAccountsSection() {
    showSection('accounts');
}

// نمایش بخش کمیسیون
function showCommissionSection() {
    showSection('commission');
}

// استایل برای وضعیت‌ها
const style = document.createElement('style');
style.textContent = `
    .status {
        padding: 0.25rem 0.5rem;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 500;
    }
    .status.completed {
        background: #10b981;
        color: white;
    }
    .status.pending {
        background: #f59e0b;
        color: white;
    }
`;
document.head.appendChild(style);

// فیلتر اکانت‌ها
document.getElementById('account-type-filter').addEventListener('change', filterAccounts);
document.getElementById('search-account').addEventListener('input', filterAccounts);

function filterAccounts() {
    const typeFilter = document.getElementById('account-type-filter').value;
    const searchFilter = document.getElementById('search-account').value.toLowerCase();
    
    // اینجا باید فیلتر واقعی اعمال شود
    console.log('Filtering accounts:', {type: typeFilter, search: searchFilter});
}
    loadSellerNotifications();
});