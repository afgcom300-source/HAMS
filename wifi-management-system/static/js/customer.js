// بارگذاری داده‌های اولیه
document.addEventListener('DOMContentLoaded', function() {
    loadCustomerInfo();
    loadAccountStatus();
    loadUsageCharts();
    loadAlerts();
    loadAccountDetails();
});

// بارگذاری اطلاعات مشتری
function loadCustomerInfo() {
    // داده‌های نمونه
    document.getElementById('customer-name').textContent = 'رضا حسینی';
    document.getElementById('account-info').textContent = 'اکانت Wfi - user001';
}

// بارگذاری وضعیت اکانت
function loadAccountStatus() {
    // داده‌های نمونه
    document.getElementById('remaining-data').textContent = '۱۵ گیگابایت';
    document.getElementById('remaining-time').textContent = '۱۲ روز';
    document.getElementById('paid-amount').textContent = '۵۰,۰۰۰ افغانی';
    
    // به‌روزرسانی نوارهای پیشرفت
    document.getElementById('data-progress').style.width = '75%';
    document.getElementById('time-progress').style.width = '40%';
}

// بارگذاری نمودارهای مصرف
function loadUsageCharts() {
    // نمودار مصرف روزانه
    const dailyCtx = document.getElementById('dailyUsageChart').getContext('2d');
    new Chart(dailyCtx, {
        type: 'line',
        data: {
            labels: ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'],
            datasets: [{
                label: 'مصرف روزانه (GB)',
                data: [2.5, 3.2, 1.8, 4.1, 2.9, 3.5, 2.2],
                borderColor: '#7c3aed',
                backgroundColor: 'rgba(124, 58, 237, 0.1)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // نمودار مصرف بر اساس ساعت
    const hourlyCtx = document.getElementById('hourlyUsageChart').getContext('2d');
    new Chart(hourlyCtx, {
        type: 'bar',
        data: {
            labels: ['۰-۴', '۴-۸', '۸-۱۲', '۱۲-۱۶', '۱۶-۲۰', '۲۰-۲۴'],
            datasets: [{
                label: 'مصرف ساعتی (MB)',
                data: [150, 320, 450, 680, 420, 280],
                backgroundColor: '#8b5cf6',
                borderColor: '#7c3aed',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// فیلتر داده‌های مصرف
function filterUsageData() {
    const timeRange = document.getElementById('time-range').value;
    console.log('Filtering usage data for:', timeRange);
    // اینجا باید داده‌های واقعی بارگذاری شوند
}

// بارگذاری اعلان‌ها
function loadAlerts() {
    // داده‌های نمونه
    const alerts = [
        {
            id: 1,
            type: 'warning',
            icon: '⚠️',
            title: 'هشدار مصرف',
            message: '۷۵٪ از حجم اینترنت شما مصرف شده است',
            time: '۲ ساعت پیش',
            urgent: false
        },
        {
            id: 2,
            type: 'urgent',
            icon: '🚨',
            title: 'اخطار مهم',
            message: 'اکانت شما تا ۳ روز دیگر منقضی می‌شود',
            time: '۱ روز پیش',
            urgent: true
        },
        {
            id: 3,
            type: 'success',
            icon: '✅',
            title: 'پرداخت تأیید شد',
            message: 'پرداخت شما با موفقیت انجام شد',
            time: '۳ روز پیش',
            urgent: false
        }
    ];

    const alertsList = document.getElementById('alerts-list');
    alertsList.innerHTML = '';

    alerts.forEach(alert => {
        const alertClass = alert.urgent ? 'urgent' : (alert.type === 'success' ? 'success' : 'warning');
        const alertItem = `
            <div class="alert-item ${alertClass}">
                <div class="alert-icon">${alert.icon}</div>
                <div class="alert-content">
                    <h4>${alert.title}</h4>
                    <p>${alert.message}</p>
                    <div class="alert-time">${alert.time}</div>
                </div>
            </div>
        `;
        alertsList.innerHTML += alertItem;
    });
}

// بارگذاری جزئیات اکانت
function loadAccountDetails() {
    // داده‌های نمونه
    document.getElementById('username').textContent = 'user001';
    document.getElementById('password').textContent = '••••••••';
    document.getElementById('account-type').textContent = 'Wfi';
    document.getElementById('start-date').textContent = '1403/01/01';
    document.getElementById('expire-date').textContent = '1403/02/01';
    document.getElementById('seller-name').textContent = 'علی محمدی';
}
// بارگذاری اعلان‌های مشتری
function loadCustomerNotifications() {
    fetch('/api/customer/notifications')
    .then(response => response.json())
    .then(notifications => {
        const alertsList = document.getElementById('alerts-list');
        if (alertsList) {
            alertsList.innerHTML = '';
            
            if (notifications.length === 0) {
                alertsList.innerHTML = '<div class="no-notifications">اعلانی وجود ندارد</div>';
                return;
            }
            
            notifications.forEach(notif => {
                const alertClass = notif.type === 'urgent' ? 'urgent' : 
                                 notif.type === 'success' ? 'success' : 'warning';
                const alertIcon = notif.type === 'urgent' ? '🚨' : 
                                notif.type === 'success' ? '✅' : '⚠️';
                
                const alertItem = `
                    <div class="alert-item ${alertClass} ${notif.is_read ? 'read' : ''}" 
                         onclick="markCustomerNotificationAsRead(${notif.id}, ${notif.user_notification_id})">
                        <div class="alert-icon">${alertIcon}</div>
                        <div class="alert-content">
                            <h4>${notif.title}</h4>
                            <p>${notif.message}</p>
                            <div class="alert-time">${notif.created_at}</div>
                        </div>
                    </div>
                `;
                alertsList.innerHTML += alertItem;
            });
        }
    })
    .catch(error => {
        console.error('Error loading notifications:', error);
    });
}

// علامت‌گذاری اعلان مشتری به عنوان خوانده شده
function markCustomerNotificationAsRead(notifId, userNotifId) {
    fetch(`/api/notifications/${notifId}/read`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            user_id: 1, // باید از session بگیرید
            user_type: 'customer'
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // به‌روزرسانی UI
            event.target.closest('.alert-item').classList.add('read');
            loadCustomerNotifications(); // بارگذاری مجدد
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

// اضافه کردن این تابع به بارگذاری اولیه
document.addEventListener('DOMContentLoaded', function() {

// نمایش/پنهان کردن رمز عبور
let passwordVisible = false;
function togglePassword() {
    const passwordElement = document.getElementById('password');
    const button = event.target;
    
    if (passwordVisible) {
        passwordElement.textContent = '••••••••';
        button.textContent = 'نمایش';
        passwordVisible = false;
    } else {
        passwordElement.textContent = 'pass123';
        button.textContent = 'پنهان';
        passwordVisible = true;
    }
}

// خروج از سیستم
function logout() {
    if (confirm('آیا از خروج مطمئن هستید؟')) {
        window.location.href = '/';
    }
}

// پیش‌بینی اتمام حجم
function predictDataEnd() {
    // الگوریتم ساده برای پیش‌بینی
    const dailyUsage = [2.5, 3.2, 1.8, 4.1, 2.9, 3.5, 2.2];
    const averageDaily = dailyUsage.reduce((a, b) => a + b, 0) / dailyUsage.length;
    const remainingData = 15; // گیگابایت
    
    const daysLeft = Math.floor(remainingData / averageDaily);
    return daysLeft;
}

// پیش‌بینی اتمام زمان
function predictTimeEnd() {
    // محاسبه روزهای باقی‌مانده تا انقضا
    const expireDate = new Date('2024-03-13'); // تاریخ نمونه
    const today = new Date();
    const timeDiff = expireDate.getTime() - today.getTime();
    const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return daysLeft > 0 ? daysLeft : 0;
}

// به‌روزرسانی پیش‌بینی‌ها
function updatePredictions() {
    const dataDays = predictDataEnd();
    const timeDays = predictTimeEnd();
    
    console.log(`حجم تا ${dataDays} روز دیگر تمام می‌شود`);
    console.log(`زمان تا ${timeDays} روز دیگر تمام می‌شود`);
}

// بارگذاری داده‌های واقعی از سرور (AJAX)
async function loadRealData() {
    try {
        // درخواست به سرور برای دریافت اطلاعات واقعی
        const response = await fetch('/api/customer/status');
        const data = await response.json();
        
        // به‌روزرسانی UI با داده‌های واقعی
        updateUIWithRealData(data);
    } catch (error) {
        console.error('Error loading real data:', error);
    }
}

function updateUIWithRealData(data) {
    // به‌روزرسانی UI با داده‌های دریافتی از سرور
    document.getElementById('remaining-data').textContent = data.remainingData;
    document.getElementById('remaining-time').textContent = data.remainingTime;
    document.getElementById('paid-amount').textContent = data.paidAmount;
}

setInterval(() => {
    loadAccountStatus();
    loadAlerts();
}, 30000);

    // ... کدهای قبلی ...
    loadCustomerNotifications();
});