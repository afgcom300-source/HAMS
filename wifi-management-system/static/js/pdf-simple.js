// سیستم استخراج ساده - بدون هیچ کتابخانه خارجی
class SimplePDFParser {
    constructor() {
        this.accounts = [];
    }

    async parseFile(file) {
        try {
            console.log('شروع پردازش فایل...', file.name);
            this.showLoading('در حال پردازش فایل...');
            
            // خواندن فایل به صورت متن
            const text = await this.readFileAsText(file);
            console.log('متن خوانده شده:', text.substring(0, 500));
            
            // تجزیه اکانت‌ها
            this.accounts = this.extractAccounts(text);
            
            this.hideLoading();
            
            if (this.accounts.length === 0) {
                this.showError('هیچ اکانتی پیدا نشد. محتوای فایل: ' + text.substring(0, 200));
                return [];
            }
            
            return this.accounts;
            
        } catch (error) {
            console.error('خطا در پردازش فایل:', error);
            this.hideLoading();
            this.showError(`خطا: ${error.message}`);
            return [];
        }
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                console.log('✅ فایل با موفقیت خوانده شد');
                resolve(e.target.result);
            };
            reader.onerror = (e) => {
                console.error('❌ خطا در خواندن فایل:', e);
                reject(new Error('خطا در خواندن فایل'));
            };
            reader.readAsText(file);
        });
    }

    extractAccounts(text) {
        console.log('🔍 استخراج اکانت‌ها...');
        const accounts = [];
        
        // الگوی فایل شما:
        // "user name" -> username -> "password" -> password -> "3GB" -> "0000 Afn"
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        
        console.log('خطوط فایل:', lines);
        
        for (let i = 0; i < lines.length - 4; i++) {
            // اگر خط "user name" باشد
            if (lines[i].toLowerCase().includes('user name')) {
                const username = lines[i + 1]; // خط بعدی: نام کاربری
                
                // پیدا کردن خط "password"
                let passwordIndex = -1;
                for (let j = i + 2; j < Math.min(i + 6, lines.length); j++) {
                    if (lines[j].toLowerCase().includes('password')) {
                        passwordIndex = j;
                        break;
                    }
                }
                
                if (passwordIndex !== -1 && passwordIndex + 1 < lines.length) {
                    const password = lines[passwordIndex + 1]; // خط بعد از password
                    
                    // پیدا کردن نوع بسته (3GB)
                    let packageType = '3GB';
                    for (let j = i + 2; j < Math.min(i + 8, lines.length); j++) {
                        if (lines[j].includes('GB') || lines[j].includes('MB')) {
                            packageType = lines[j];
                            break;
                        }
                    }
                    
                    // پیدا کردن قیمت
                    let price = '0000 Afn';
                    for (let j = i + 2; j < Math.min(i + 8, lines.length); j++) {
                        if (lines[j].includes('Afn')) {
                            price = lines[j];
                            break;
                        }
                    }
                    
                    // اعتبارسنجی
                    if (this.isValidAccount(username, password)) {
                        accounts.push({
                            username: username,
                            password: password,
                            type: packageType,
                            price: price,
                            location: 'برچی',
                            status: 'available'
                        });
                        
                        console.log(`✅ اکانت پیدا شد: ${username} / ${password}`);
                    }
                }
            }
        }
        
        console.log(`🎯 تعداد اکانت‌های استخراج شده: ${accounts.length}`);
        return accounts;
    }

    isValidAccount(username, password) {
        if (!username || !password) return false;
        
        // الگوی فایل شما: حرف + 4 رقم + حرف (مثال: a8338g)
        const pattern = /^[a-z][0-9]{4}[a-z]$/i;
        return pattern.test(username) && pattern.test(password);
    }

    showLoading(message) {
        this.hideLoading();
        
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading';
        loadingDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 2rem;
            border-radius: 1rem;
            z-index: 10000;
            text-align: center;
            min-width: 300px;
        `;
        loadingDiv.innerHTML = `
            <div style="font-size: 2rem; margin-bottom: 1rem;">⏳</div>
            <div style="font-size: 1.1rem;">${message}</div>
        `;
        
        document.body.appendChild(loadingDiv);
    }

    hideLoading() {
        const loadingDiv = document.getElementById('loading');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }

    showError(message) {
        alert(`❌ ${message}`);
    }
}

// ایجاد پارسر
const simpleParser = new SimplePDFParser();

// تابع اصلی
async function parseFile() {
    const fileInput = document.getElementById('pdfFile');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('📁 لطفاً یک فایل انتخاب کنید.');
        return;
    }
    
    console.log('📄 فایل انتخاب شده:', file.name);
    
    try {
        const accounts = await simpleParser.parseFile(file);
        displayResults(accounts);
    } catch (error) {
        console.error('Error:', error);
        alert('❌ خطا: ' + error.message);
    }
}

// نمایش نتایج
function displayResults(accounts) {
    const container = document.getElementById('accountsList');
    
    if (!accounts || accounts.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #666;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">🔍</div>
                <h3 style="margin-bottom: 1rem;">هیچ اکانتی یافت نشد</h3>
                <p>ممکن است فایل ساختار متفاوتی داشته باشد.</p>
                <button class="btn btn-primary" onclick="showManualEntry()">
                    ✍️ ورود دستی
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = accounts.map((account, index) => `
        <div class="account-card">
            <div class="account-header">
                <strong>👤 ${account.username}</strong>
                <span class="account-type">${account.type}</span>
            </div>
            <div class="account-details">
                <div class="account-detail">
                    <span class="detail-label">🔑 رمز عبور:</span>
                    <span class="detail-value">${account.password}</span>
                </div>
                <div class="account-detail">
                    <span class="detail-label">💰 قیمت:</span>
                    <span class="detail-value">${account.price}</span>
                </div>
                <div class="account-detail">
                    <span class="detail-label">📍 موقعیت:</span>
                    <span class="detail-value">${account.location}</span>
                </div>
            </div>
            <div class="action-buttons">
                <button class="btn btn-sm btn-success" onclick="saveAccount(${index})">
                    💾 ذخیره
                </button>
            </div>
        </div>
    `).join('');
    
    // نمایش خلاصه
    const summary = document.createElement('div');
    summary.innerHTML = `
        <div style="background: #10b981; color: white; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0; text-align: center;">
            <strong>✅ موفق! ${accounts.length} اکانت استخراج شد</strong>
        </div>
    `;
    container.insertBefore(summary, container.firstChild);
}

function saveAccount(index) {
    const account = simpleParser.accounts[index];
    if (account) {
        // ذخیره در localStorage
        let savedAccounts = JSON.parse(localStorage.getItem('wifiAccounts') || '[]');
        savedAccounts.push({
            ...account,
            id: Date.now(),
            createdAt: new Date().toISOString()
        });
        localStorage.setItem('wifiAccounts', JSON.stringify(savedAccounts));
        
        alert(`✅ اکانت "${account.username}" ذخیره شد.`);
    }
}

function showManualEntry() {
    const manualHTML = `
        <div style="background: white; padding: 2rem; border-radius: 1rem;">
            <h3>✍️ ورود دستی اکانت</h3>
            <div class="form-group">
                <label>نام کاربری:</label>
                <input type="text" id="manualUsername" class="form-control" placeholder="a8338g">
            </div>
            <div class="form-group">
                <label>رمز عبور:</label>
                <input type="text" id="manualPassword" class="form-control" placeholder="k9131q">
            </div>
            <button class="btn btn-primary" onclick="addManualAccount()">افزودن</button>
        </div>
    `;
    document.getElementById('accountsList').innerHTML = manualHTML;
}

function addManualAccount() {
    const username = document.getElementById('manualUsername').value;
    const password = document.getElementById('manualPassword').value;
    
    if (!username || !password) {
        alert('لطفاً نام کاربری و رمز عبور را وارد کنید.');
        return;
    }
    
    const account = {
        username: username,
        password: password,
        type: '3GB',
        price: '0000 Afn',
        location: 'برچی',
        status: 'available'
    };
    
    simpleParser.accounts = [account];
    displayResults([account]);
    saveAccount(0);
}

console.log('✅ Simple PDF Parser loaded!');