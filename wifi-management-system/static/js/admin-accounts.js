// مدیریت اکانت‌ها در پنل ادمین - نسخه پیشرفته
class AdminAccountsManager {
    constructor() {
        this.extractedAccounts = [];
        this.savedAccounts = JSON.parse(localStorage.getItem('wifiAccounts') || '[]');
        this.accountsCache = new Map();
        this.statsCache = new Map();
        this.initialize();
    }
    
    initialize() {
        this.loadSavedAccounts();
        this.setupEventListeners();
        this.setupDragAndDrop();
    }
    
    setupEventListeners() {
        // Event listener برای فایل آپلود
        const fileInput = document.getElementById('textFile');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileSelect(e.target.files[0]);
            });
        }
        
        // Event listener برای فرم آپلود
        const uploadForm = document.getElementById('uploadForm');
        if (uploadForm) {
            uploadForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFileUpload();
            });
        }
    }
    
    setupDragAndDrop() {
        const dropZone = document.getElementById('dropZone');
        if (!dropZone) return;
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        });
    }
    
    handleFileSelect(file) {
        if (!file) return;
        
        const fileInfo = document.getElementById('fileInfo');
        const processBtn = document.getElementById('processFileBtn');
        
        if (fileInfo) {
            fileInfo.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 1.2em;">📄</span>
                    <div>
                        <strong>${file.name}</strong>
                        <div style="font-size: 0.9em; color: #666;">${this.formatFileSize(file.size)}</div>
                    </div>
                </div>
            `;
        }
        
        if (processBtn) {
            processBtn.disabled = false;
            processBtn.textContent = '🔍 پردازش فایل';
            processBtn.onclick = () => this.processFile(file);
        }
    }
    
    handleFileUpload() {
        const fileInput = document.getElementById('textFile');
        if (!fileInput || !fileInput.files[0]) {
            this.showMessage('لطفاً یک فایل انتخاب کنید', 'warning');
            return;
        }
        
        this.processFile(fileInput.files[0]);
    }
    
    async processFile(file) {
        if (!this.validateFile(file)) {
            this.showMessage('فایل نامعتبر است', 'error');
            return;
        }
        
        this.showLoading('در حال پردازش فایل...');
        
        try {
            const accounts = await this.parseTextFile(file);
            
            if (accounts.length === 0) {
                this.showMessage('هیچ اکانتی در فایل یافت نشد', 'warning');
                return;
            }
            
            this.displayExtractedAccounts(accounts);
            this.showMessage(`✅ ${accounts.length} اکانت استخراج شد`, 'success');
            
        } catch (error) {
            console.error('Error processing file:', error);
            this.showMessage(`خطا در پردازش فایل: ${error.message}`, 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    validateFile(file) {
        if (!file) return false;
        
        const validTypes = ['.txt', '.csv', '.text'];
        const fileName = file.name.toLowerCase();
        
        return validTypes.some(type => fileName.endsWith(type));
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // استخراج اکانت‌ها از فایل متنی
    parseTextFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const text = e.target.result;
                    const accounts = this.advancedExtractAccountsFromText(text);
                    resolve(accounts);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('خطا در خواندن فایل'));
            reader.readAsText(file, 'UTF-8');
        });
    }
    
    // الگوی استخراج پیشرفته
    advancedExtractAccountsFromText(text) {
        console.log('🔍 شروع استخراج پیشرفته اکانت‌ها...');
        const accounts = [];
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        
        // الگوهای مختلف برای شناسایی اکانت‌ها
        const patterns = {
            username: /(?:username|user|نام کاربری)[:\s]*([a-z]\d{4}[a-z])/gi,
            password: /(?:password|pass|رمز)[:\s]*([a-z]\d{4}[a-z])/gi,
            package: /(\d+)\s*(?:GB|گیگ|گیگابایت)/gi,
            price: /(\d+)\s*(?:Afn|افغانی|ریال)/gi
        };
        
        let currentAccount = {};
        let inAccountSection = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // تشخیص شروع بخش اکانت
            if (!inAccountSection && this.isAccountStart(line)) {
                inAccountSection = true;
                currentAccount = { id: Date.now() + i };
            }
            
            // استخراج اطلاعات از خط
            if (inAccountSection) {
                this.extractAccountInfo(line, currentAccount);
                
                // اگر خط بعدی شروع بخش جدید است یا این خط پایان بخش است
                if (this.isAccountEnd(line) || this.isNextAccountStart(lines[i + 1])) {
                    if (this.validateAccount(currentAccount)) {
                        this.finalizeAccount(currentAccount);
                        accounts.push({ ...currentAccount });
                    }
                    currentAccount = {};
                    inAccountSection = false;
                }
            }
        }
        
        // پردازش اکانت آخر
        if (inAccountSection && this.validateAccount(currentAccount)) {
            this.finalizeAccount(currentAccount);
            accounts.push(currentAccount);
        }
        
        console.log(`✅ ${accounts.length} اکانت استخراج شد`);
        return accounts;
    }
    
    isAccountStart(line) {
        const startPatterns = [
            /username/i,
            /نام کاربری/i,
            /اکانت/i,
            /user:/i,
            /مشخصات/i
        ];
        return startPatterns.some(pattern => pattern.test(line));
    }
    
    isAccountEnd(line) {
        const endPatterns = [
            /---/,
            /===/,
            /\.\.\./,
            /پایان/i,
            /end/i
        ];
        return endPatterns.some(pattern => pattern.test(line));
    }
    
    isNextAccountStart(nextLine) {
        return nextLine && this.isAccountStart(nextLine);
    }
    
    extractAccountInfo(line, account) {
        // استخراج username
        const usernameMatch = line.match(/(?:username|user|نام کاربری)[:\s]*([a-z]\d{4}[a-z])/i);
        if (usernameMatch && !account.username) {
            account.username = usernameMatch[1];
            account.confidence = (account.confidence || 0) + 30;
        }
        
        // استخراج password
        const passwordMatch = line.match(/(?:password|pass|رمز)[:\s]*([a-z]\d{4}[a-z])/i);
        if (passwordMatch && !account.password) {
            account.password = passwordMatch[1];
            account.confidence = (account.confidence || 0) + 30;
        }
        
        // استخراج package
        const packageMatch = line.match(/(\d+)\s*(?:GB|گیگ|گیگابایت)/i);
        if (packageMatch && !account.type) {
            account.type = packageMatch[1] + 'GB';
            account.confidence = (account.confidence || 0) + 20;
        }
        
        // استخراج price
        const priceMatch = line.match(/(\d+)\s*(?:Afn|افغانی|ریال)/i);
        if (priceMatch && !account.price) {
            account.price = priceMatch[1] + ' Afn';
            account.confidence = (account.confidence || 0) + 20;
        }
    }
    
    validateAccount(account) {
        if (!account.username || !account.password) return false;
        
        // اعتبارسنجی فرمت username و password
        const isValidFormat = /^[a-z]\d{4}[a-z]$/i.test(account.username) &&
                            /^[a-z]\d{4}[a-z]$/i.test(account.password);
        
        // حداقل اطمینان 50 درصد
        const hasMinimumConfidence = (account.confidence || 0) >= 50;
        
        return isValidFormat && hasMinimumConfidence;
    }
    
    finalizeAccount(account) {
        // تنظیم مقادیر پیش‌فرض
        if (!account.type) account.type = '3GB';
        if (!account.price) account.price = '0000 Afn';
        if (!account.location) account.location = 'برچی';
        if (!account.status) account.status = 'available';
        
        account.extractedAt = new Date().toISOString();
        account.confidence = Math.min(account.confidence || 0, 100);
        
        // تنظیم ID نهایی
        if (!account.id) {
            account.id = 'acc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
    }
    
    // نمایش اکانت‌های استخراج شده
    displayExtractedAccounts(accounts) {
        this.extractedAccounts = accounts;
        const container = document.getElementById('extractedAccounts');
        
        if (!container) return;
        
        if (accounts.length === 0) {
            container.innerHTML = `
                <div class="no-accounts">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
                    <h3>هیچ اکانتی یافت نشد</h3>
                    <p>لطفاً فایل دیگری را امتحان کنید</p>
                </div>
            `;
            this.toggleSaveAllButton(false);
            return;
        }
        
        container.innerHTML = accounts.map(account => this.createAccountCard(account)).join('');
        this.toggleSaveAllButton(true);
        this.showExtractionSummary(accounts.length);
        
        // افزودن event listener برای دکمه‌ها
        this.bindAccountCardEvents();
    }
    
    createAccountCard(account) {
        const confidencePercent = account.confidence || 0;
        const confidenceColor = confidencePercent >= 80 ? '#10b981' :
                              confidencePercent >= 60 ? '#f59e0b' : '#ef4444';
        
        return `
            <div class="account-card" data-account-id="${account.id}">
                <div class="account-header">
                    <div class="account-title">
                        <strong>👤 ${account.username}</strong>
                        <span class="account-type ${account.type.toLowerCase()}">${account.type}</span>
                    </div>
                    <div class="confidence-badge" style="background: ${confidenceColor}">
                        ${confidencePercent}% اطمینان
                    </div>
                </div>
                
                <div class="account-details">
                    <div class="account-detail">
                        <span class="detail-label">🔑 رمز عبور:</span>
                        <span class="detail-value password-value" data-password="${account.password}">
                            ${'*'.repeat(8)}
                            <button class="btn-show" onclick="adminAccounts.togglePassword(this)">👁️</button>
                        </span>
                    </div>
                    
                    <div class="account-detail">
                        <span class="detail-label">💰 قیمت:</span>
                        <span class="detail-value price">${account.price}</span>
                    </div>
                    
                    <div class="account-detail">
                        <span class="detail-label">📍 موقعیت:</span>
                        <span class="detail-value">${account.location}</span>
                    </div>
                    
                    <div class="account-detail">
                        <span class="detail-label">📅 تاریخ استخراج:</span>
                        <span class="detail-value">${this.formatDate(account.extractedAt)}</span>
                    </div>
                </div>
                
                <div class="account-footer">
                    <div class="account-actions">
                        <button class="btn-action btn-save" onclick="adminAccounts.saveAccount('${account.id}')">
                            💾 ذخیره
                        </button>
                        <button class="btn-action btn-edit" onclick="adminAccounts.editAccount('${account.id}')">
                            ✏️ ویرایش
                        </button>
                        <button class="btn-action btn-assign" onclick="adminAccounts.assignAccount('${account.id}')">
                            👥 تخصیص
                        </button>
                        <button class="btn-action btn-preview" onclick="adminAccounts.previewAccount('${account.id}')">
                            👁️ پیش‌نمایش
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    bindAccountCardEvents() {
        // اضافه کردن event listener برای دکمه‌ها
        document.querySelectorAll('.account-card .btn-action').forEach(button => {
            const action = button.textContent.trim();
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const accountId = button.closest('.account-card').dataset.accountId;
                this.handleAccountAction(accountId, action);
            });
        });
    }
    
    handleAccountAction(accountId, action) {
        const account = this.extractedAccounts.find(acc => acc.id == accountId);
        if (!account) return;
        
        switch(action) {
            case '💾 ذخیره':
                this.saveAccount(accountId);
                break;
            case '✏️ ویرایش':
                this.editAccount(accountId);
                break;
            case '👥 تخصیص':
                this.assignAccount(accountId);
                break;
            case '👁️ پیش‌نمایش':
                this.previewAccount(accountId);
                break;
        }
    }
    
    togglePassword(button) {
        const passwordSpan = button.previousElementSibling;
        if (!passwordSpan) return;
        
        const password = passwordSpan.parentElement.dataset.password;
        if (!password) return;
        
        if (passwordSpan.textContent.includes('*')) {
            passwordSpan.textContent = password;
            button.textContent = '🙈';
        } else {
            passwordSpan.textContent = '*'.repeat(8);
            button.textContent = '👁️';
        }
    }
    
    toggleSaveAllButton(show) {
        const saveAllBtn = document.getElementById('saveAllBtn');
        if (saveAllBtn) {
            saveAllBtn.style.display = show ? 'block' : 'none';
        }
    }
    
    showExtractionSummary(count) {
        const resultsDiv = document.getElementById('uploadResults');
        if (!resultsDiv) return;
        
        resultsDiv.innerHTML = `
            <div class="extraction-summary success">
                <div class="summary-icon">✅</div>
                <div class="summary-content">
                    <strong>استخراج موفق</strong>
                    <p>${count} اکانت از فایل استخراج شد</p>
                    <small>برای ذخیره اکانت‌ها، دکمه "ذخیره همه" را بزنید یا تک تک ذخیره کنید</small>
                </div>
            </div>
        `;
    }
    
    // ذخیره یک اکانت
    saveAccount(accountId) {
        const account = this.extractedAccounts.find(acc => acc.id == accountId);
        if (!account) {
            this.showMessage('اکانت یافت نشد', 'error');
            return;
        }
        
        // بررسی تکراری نبودن
        const isDuplicate = this.savedAccounts.some(acc => acc.username === account.username);
        
        if (isDuplicate) {
            this.showMessage(`اکانت "${account.username}" قبلاً ذخیره شده است.`, 'warning');
            return;
        }
        
        // اضافه کردن به لیست ذخیره شده
        this.savedAccounts.push(account);
        localStorage.setItem('wifiAccounts', JSON.stringify(this.savedAccounts));
        
        // بروزرسانی UI
        this.markAccountAsSaved(accountId);
        this.updateStats();
        this.showMessage(`✅ اکانت "${account.username}" ذخیره شد.`, 'success');
    }
    
    markAccountAsSaved(accountId) {
        const accountElement = document.querySelector(`[data-account-id="${accountId}"]`);
        if (accountElement) {
            accountElement.classList.add('saved');
            accountElement.querySelector('.account-actions').innerHTML = `
                <span class="saved-badge">✅ ذخیره شد</span>
            `;
        }
    }
    
    // ذخیره همه اکانت‌ها
    async saveAllAccounts() {
        if (this.extractedAccounts.length === 0) {
            this.showMessage('هیچ اکانتی برای ذخیره وجود ندارد.', 'warning');
            return;
        }
        
        this.showLoading('در حال ذخیره اکانت‌ها...');
        
        let savedCount = 0;
        let skippedCount = 0;
        const results = [];
        
        for (const account of this.extractedAccounts) {
            const isDuplicate = this.savedAccounts.some(acc => acc.username === account.username);
            
            if (!isDuplicate) {
                this.savedAccounts.push(account);
                savedCount++;
                results.push({ username: account.username, status: 'saved' });
                
                // بروزرسانی UI
                this.markAccountAsSaved(account.id);
            } else {
                skippedCount++;
                results.push({ username: account.username, status: 'skipped' });
            }
        }
        
        // ذخیره در localStorage
        localStorage.setItem('wifiAccounts', JSON.stringify(this.savedAccounts));
        
        this.hideLoading();
        this.updateStats();
        
        // نمایش نتایج
        this.showSaveResults(savedCount, skippedCount, results);
    }
    
    showSaveResults(savedCount, skippedCount, results) {
        const summary = `
            <div class="save-results">
                <h4>نتایج ذخیره‌سازی</h4>
                <div class="result-stats">
                    <div class="stat saved">✅ ${savedCount} اکانت جدید ذخیره شد</div>
                    <div class="stat skipped">⚠️ ${skippedCount} اکانت تکراری نادیده گرفته شد</div>
                </div>
                
                ${savedCount > 0 ? `
                    <div class="saved-list">
                        <h5>اکانت‌های ذخیره شده:</h5>
                        <ul>
                            ${results.filter(r => r.status === 'saved').map(r => 
                                `<li>${r.username}</li>`
                            ).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
        
        this.showMessage(summary, 'info', 10000); // نمایش برای 10 ثانیه
    }
    
    // ویرایش اکانت
    editAccount(accountId) {
        const account = this.extractedAccounts.find(acc => acc.id == accountId);
        if (!account) return;
        
        const newUsername = prompt('نام کاربری جدید:', account.username);
        const newPassword = prompt('رمز عبور جدید:', account.password);
        
        if (newUsername !== null && newPassword !== null) {
            // اعتبارسنجی فرمت جدید
            if (!/^[a-z]\d{4}[a-z]$/i.test(newUsername) || !/^[a-z]\d{4}[a-z]$/i.test(newPassword)) {
                this.showMessage('فرمت username/password نامعتبر است', 'error');
                return;
            }
            
            account.username = newUsername;
            account.password = newPassword;
            
            // بروزرسانی نمایش
            this.displayExtractedAccounts(this.extractedAccounts);
            this.showMessage('✅ اکانت ویرایش شد', 'success');
        }
    }
    
    // تخصیص اکانت به فروشنده
    assignAccount(accountId) {
        const account = this.extractedAccounts.find(acc => acc.id == accountId);
        if (!account) return;
        
        const sellers = this.getSellersList();
        if (sellers.length === 0) {
            this.showMessage('ابتدا فروشنده اضافه کنید', 'warning');
            return;
        }
        
        const sellerOptions = sellers.map(seller => 
            `<option value="${seller.id}">${seller.name} - ${seller.phone}</option>`
        ).join('');
        
        const assignModal = `
            <div class="assign-modal">
                <h3>تخصیص اکانت به فروشنده</h3>
                <p>اکانت: <strong>${account.username}</strong></p>
                
                <div class="form-group">
                    <label>انتخاب فروشنده:</label>
                    <select id="sellerSelect" class="form-control">
                        <option value="">انتخاب کنید...</option>
                        ${sellerOptions}
                    </select>
                </div>
                
                <div class="modal-actions">
                    <button class="btn-primary" onclick="adminAccounts.confirmAssignment('${accountId}')">تخصیص</button>
                    <button class="btn-secondary" onclick="adminAccounts.closeAssignModal()">لغو</button>
                </div>
            </div>
        `;
        
        this.showModal(assignModal, 'تخصیص اکانت');
    }
    
    getSellersList() {
        // در حالت واقعی باید از API بگیرید
        return [
            { id: 1, name: 'علی محمدی', phone: '09123456789' },
            { id: 2, name: 'مریم رضوی', phone: '09356789012' }
        ];
    }
    
    confirmAssignment(accountId) {
        const sellerSelect = document.getElementById('sellerSelect');
        const sellerId = sellerSelect.value;
        
        if (!sellerId) {
            this.showMessage('لطفاً فروشنده را انتخاب کنید', 'warning');
            return;
        }
        
        const account = this.extractedAccounts.find(acc => acc.id == accountId);
        if (account) {
            account.assignedTo = sellerId;
            account.assignedAt = new Date().toISOString();
            
            this.showMessage(`✅ اکانت "${account.username}" به فروشنده تخصیص داده شد`, 'success');
            this.closeAssignModal();
        }
    }
    
    closeAssignModal() {
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
            modal.remove();
        }
    }
    
    // پیش‌نمایش اکانت
    previewAccount(accountId) {
        const account = this.extractedAccounts.find(acc => acc.id == accountId);
        if (!account) return;
        
        const previewModal = `
            <div class="preview-modal">
                <h3>پیش‌نمایش اکانت</h3>
                
                <div class="preview-content">
                    <div class="preview-field">
                        <label>نام کاربری:</label>
                        <span class="preview-value">${account.username}</span>
                    </div>
                    
                    <div class="preview-field">
                        <label>رمز عبور:</label>
                        <span class="preview-value">${account.password}</span>
                    </div>
                    
                    <div class="preview-field">
                        <label>نوع بسته:</label>
                        <span class="preview-value">${account.type}</span>
                    </div>
                    
                    <div class="preview-field">
                        <label>قیمت:</label>
                        <span class="preview-value">${account.price}</span>
                    </div>
                    
                    <div class="preview-field">
                        <label>موقعیت:</label>
                        <span class="preview-value">${account.location}</span>
                    </div>
                    
                    <div class="preview-field">
                        <label>وضعیت:</label>
                        <span class="preview-value available">● قابل استفاده</span>
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button class="btn-primary" onclick="adminAccounts.copyAccountDetails('${accountId}')">
                        📋 کپی مشخصات
                    </button>
                    <button class="btn-secondary" onclick="adminAccounts.closePreview()">بستن</button>
                </div>
            </div>
        `;
        
        this.showModal(previewModal, 'پیش‌نمایش اکانت');
    }
    
    copyAccountDetails(accountId) {
        const account = this.extractedAccounts.find(acc => acc.id == accountId);
        if (!account) return;
        
        const text = `Username: ${account.username}\nPassword: ${account.password}\nType: ${account.type}\nPrice: ${account.price}`;
        
        navigator.clipboard.writeText(text).then(() => {
            this.showMessage('✅ مشخصات اکانت کپی شد', 'success');
        }).catch(err => {
            console.error('Failed to copy: ', err);
            this.showMessage('❌ خطا در کپی کردن', 'error');
        });
    }
    
    closePreview() {
        this.closeAssignModal();
    }
    
    // آپدیت آمار
    updateStats() {
        const totalAccounts = this.savedAccounts.length;
        const availableAccounts = this.savedAccounts.filter(acc => acc.status === 'available').length;
        const assignedAccounts = this.savedAccounts.filter(acc => acc.assignedTo).length;
        
        // آپدیت داشبورد
        this.updateDashboardStats(totalAccounts, availableAccounts, assignedAccounts);
        
        // ذخیره در کش
        this.statsCache.set('accounts_stats', {
            total: totalAccounts,
            available: availableAccounts,
            assigned: assignedAccounts,
            updatedAt: Date.now()
        });
    }
    
    updateDashboardStats(total, available, assigned) {
        const statsElements = document.querySelectorAll('.stat-value');
        if (statsElements[0]) {
            statsElements[0].textContent = total.toLocaleString();
        }
        if (statsElements[1]) {
            statsElements[1].textContent = available.toLocaleString();
        }
        
        // می‌توانید عناصر اضافی هم اضافه کنید
        const assignedElement = document.getElementById('assigned-accounts');
        if (assignedElement) {
            assignedElement.textContent = assigned.toLocaleString();
        }
    }
    
    // بارگذاری اکانت‌های ذخیره شده
    loadSavedAccounts() {
        try {
            this.savedAccounts = JSON.parse(localStorage.getItem('wifiAccounts') || '[]');
            console.log(`📊 ${this.savedAccounts.length} اکانت ذخیره شده بارگذاری شد`);
            this.updateStats();
        } catch (error) {
            console.error('Error loading saved accounts:', error);
            this.savedAccounts = [];
            localStorage.setItem('wifiAccounts', '[]');
        }
    }
    
    // نمایش اکانت‌های ذخیره شده
    displaySavedAccounts() {
        const container = document.getElementById('savedAccountsList');
        if (!container) return;
        
        if (this.savedAccounts.length === 0) {
            container.innerHTML = `
                <div class="no-saved-accounts">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📭</div>
                    <h3>هیچ اکانت ذخیره شده‌ای وجود ندارد</h3>
                    <p>اکانت‌های استخراج شده را ذخیره کنید تا اینجا نمایش داده شوند</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.savedAccounts.map((account, index) => `
            <div class="saved-account-item">
                <div class="account-info">
                    <div class="account-index">${index + 1}</div>
                    <div class="account-details">
                        <div class="account-username">👤 ${account.username}</div>
                        <div class="account-meta">
                            <span class="meta-item">${account.type}</span>
                            <span class="meta-item">${account.price}</span>
                            <span class="meta-item">${account.location}</span>
                            ${account.assignedTo ? '<span class="meta-item assigned">👥 تخصیص داده شده</span>' : ''}
                        </div>
                    </div>
                </div>
                <div class="account-actions">
                    <button class="btn-action" onclick="adminAccounts.copySavedAccount('${account.id}')">📋</button>
                    <button class="btn-action" onclick="adminAccounts.deleteSavedAccount('${account.id}')">🗑️</button>
                </div>
            </div>
        `).join('');
    }
    
    copySavedAccount(accountId) {
        const account = this.savedAccounts.find(acc => acc.id == accountId);
        if (!account) return;
        
        const text = `${account.username}:${account.password}`;
        navigator.clipboard.writeText(text).then(() => {
            this.showMessage('✅ اکانت کپی شد', 'success');
        });
    }
    
    deleteSavedAccount(accountId) {
        if (confirm('آیا از حذف این اکانت مطمئن هستید؟')) {
            this.savedAccounts = this.savedAccounts.filter(acc => acc.id != accountId);
            localStorage.setItem('wifiAccounts', JSON.stringify(this.savedAccounts));
            
            this.updateStats();
            this.displaySavedAccounts();
            this.showMessage('✅ اکانت حذف شد', 'success');
        }
    }
    
    // جستجو در اکانت‌ها
    searchAccounts(query) {
        if (!query.trim()) {
            return this.extractedAccounts;
        }
        
        const searchTerm = query.toLowerCase();
        return this.extractedAccounts.filter(account => 
            account.username.toLowerCase().includes(searchTerm) ||
            account.type.toLowerCase().includes(searchTerm) ||
            account.location.toLowerCase().includes(searchTerm)
        );
    }
    
    // فیلتر اکانت‌ها
    filterAccounts(filters) {
        let filtered = [...this.extractedAccounts];
        
        if (filters.type) {
            filtered = filtered.filter(acc => acc.type === filters.type);
        }
        
        if (filters.location) {
            filtered = filtered.filter(acc => acc.location === filters.location);
        }
        
        if (filters.status) {
            filtered = filtered.filter(acc => acc.status === filters.status);
        }
        
        return filtered;
    }
    
    // اکسپورت اکانت‌ها
    exportAccounts(format = 'json') {
        if (this.savedAccounts.length === 0) {
            this.showMessage('هیچ اکانتی برای اکسپورت وجود ندارد', 'warning');
            return;
        }
        
        let content, mimeType, fileName;
        
        switch (format) {
            case 'csv':
                content = this.convertToCSV(this.savedAccounts);
                mimeType = 'text/csv';
                fileName = `wifi_accounts_${new Date().toISOString().split('T')[0]}.csv`;
                break;
            case 'txt':
                content = this.convertToTXT(this.savedAccounts);
                mimeType = 'text/plain';
                fileName = `wifi_accounts_${new Date().toISOString().split('T')[0]}.txt`;
                break;
            default: // json
                content = JSON.stringify(this.savedAccounts, null, 2);
                mimeType = 'application/json';
                fileName = `wifi_accounts_${new Date().toISOString().split('T')[0]}.json`;
        }
        
        this.downloadFile(content, fileName, mimeType);
        this.showMessage(`✅ اکانت‌ها با فرمت ${format} اکسپورت شدند`, 'success');
    }
    
    convertToCSV(accounts) {
        const headers = ['Username', 'Password', 'Type', 'Price', 'Location', 'Status'];
        const rows = accounts.map(acc => [
            acc.username,
            acc.password,
            acc.type,
            acc.price,
            acc.location,
            acc.status
        ]);
        
        return [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');
    }
    
    convertToTXT(accounts) {
        return accounts.map(acc => 
            `Username: ${acc.username}\nPassword: ${acc.password}\nType: ${acc.type}\nPrice: ${acc.price}\nLocation: ${acc.location}\nStatus: ${acc.status}\n---\n`
        ).join('\n');
    }
    
    downloadFile(content, fileName, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }
    
    // نمایش مودال
    showModal(content, title = '') {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.innerHTML = `
            <div class="modal-container">
                ${title ? `<div class="modal-header"><h3>${title}</h3></div>` : ''}
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;
        
        document.body.appendChild(modalOverlay);
        
        // بستن مودال با کلیک خارج
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.remove();
            }
        });
    }
    
    // نمایش پیام
    showMessage(message, type = 'info', duration = 3000) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;
        messageDiv.innerHTML = message;
        
        // استایل‌های پیام
        if (!document.querySelector('#message-styles')) {
            const style = document.createElement('style');
            style.id = 'message-styles';
            style.textContent = `
                .message {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 12px 20px;
                    border-radius: 8px;
                    color: white;
                    font-weight: 500;
                    z-index: 9999;
                    max-width: 400px;
                    animation: slideInRight 0.3s ease;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }
                .message-success { background: #10b981; }
                .message-error { background: #ef4444; }
                .message-warning { background: #f59e0b; }
                .message-info { background: #3b82f6; }
                @keyframes slideInRight {
                    from { right: -400px; opacity: 0; }
                    to { right: 20px; opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(messageDiv);
        
        // حذف خودکار
        setTimeout(() => {
            if (messageDiv.parentElement) {
                messageDiv.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => {
                    if (messageDiv.parentElement) {
                        messageDiv.remove();
                    }
                }, 300);
            }
        }, duration);
    }
    
    // نمایش loading
    showLoading(message = 'در حال پردازش...') {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-overlay';
        loadingDiv.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-message">${message}</div>
        `;
        
        // استایل‌های loading
        if (!document.querySelector('#loading-styles')) {
            const style = document.createElement('style');
            style.id = 'loading-styles';
            style.textContent = `
                .loading-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(255, 255, 255, 0.9);
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    z-index: 9998;
                }
                .loading-spinner {
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #3b82f6;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    animation: spin 1s linear infinite;
                    margin-bottom: 16px;
                }
                .loading-message {
                    color: #4b5563;
                    font-weight: 500;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(loadingDiv);
    }
    
    hideLoading() {
        const loadingDiv = document.querySelector('.loading-overlay');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }
    
    // فرمت تاریخ
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('fa-IR');
    }
}

// ایجاد instance
const adminAccounts = new AdminAccountsManager();

// توابع عمومی برای استفاده در HTML
function parseTextFile() {
    const fileInput = document.getElementById('textFile');
    if (!fileInput) return;
    
    const file = fileInput.files[0];
    if (!file) {
        adminAccounts.showMessage('لطفاً یک فایل متنی انتخاب کنید.', 'warning');
        return;
    }
    
    adminAccounts.processFile(file);
}

function saveAllAccounts() {
    adminAccounts.saveAllAccounts();
}

function exportAccounts(format) {
    adminAccounts.exportAccounts(format);
}

function searchAccounts() {
    const searchInput = document.getElementById('accountSearch');
    if (!searchInput) return;
    
    const results = adminAccounts.searchAccounts(searchInput.value);
    adminAccounts.displayExtractedAccounts(results);
}

function filterAccounts() {
    const typeFilter = document.getElementById('typeFilter')?.value;
    const locationFilter = document.getElementById('locationFilter')?.value;
    
    const filters = {
        type: typeFilter || null,
        location: locationFilter || null
    };
    
    const results = adminAccounts.filterAccounts(filters);
    adminAccounts.displayExtractedAccounts(results);
}

// راه‌اندازی اولیه
document.addEventListener('DOMContentLoaded', function() {
    // بارگذاری اکانت‌های ذخیره شده
    adminAccounts.loadSavedAccounts();
    
    // نمایش اکانت‌های ذخیره شده (اگر بخش مربوطه وجود دارد)
    const savedAccountsSection = document.getElementById('savedAccountsSection');
    if (savedAccountsSection) {
        adminAccounts.displaySavedAccounts();
    }
    
    // تنظیم event listener برای جستجو
    const searchInput = document.getElementById('accountSearch');
    if (searchInput) {
        searchInput.addEventListener('input', searchAccounts);
    }
    
    // تنظیم event listener برای فیلترها
    const filterInputs = document.querySelectorAll('.filter-select');
    filterInputs.forEach(input => {
        input.addEventListener('change', filterAccounts);
    });
});