from flask import Flask, render_template, request, redirect, session, url_for, flash, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

import pdfplumber
import os
import re
from werkzeug.utils import secure_filename
app = Flask(__name__)
app.secret_key = 'your-secret-key-here-change-in-production'


# basedir = os.path.abspath(os.path.dirname(__file__))
# app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:123My@localhost/widb'
# app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///wifi_management.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER


os.makedirs(UPLOAD_FOLDER, exist_ok=True)


db = SQLAlchemy(app)


class Account(db.Model):
    __tablename__ = 'accounts'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), nullable=False)
    password = db.Column(db.String(100), nullable=False)
    account_type = db.Column(db.String(50), nullable=False)  # Wfi, GB, MB
    status = db.Column(db.String(20), default='active')  # active, inactive, sold
    seller_id = db.Column(db.Integer, db.ForeignKey('sellers.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'password': self.password,
            'type': self.account_type,
            'status': self.status,
            'created_at': self.created_at.strftime('%Y/%m/%d') if self.created_at else None
        }

class Seller(db.Model):
    __tablename__ = 'sellers'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=False, unique=True)
    email = db.Column(db.String(120), nullable=False, unique=True)
    password_hash = db.Column(db.String(255), nullable=False)
    status = db.Column(db.String(20), default='active')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'phone': self.phone,
            'email': self.email,
            'status': self.status,
            'created_at': self.created_at.strftime('%Y/%m/%d') if self.created_at else None
        }

class Transaction(db.Model):
    __tablename__ = 'transactions'
    
    id = db.Column(db.Integer, primary_key=True)
    seller_id = db.Column(db.Integer, db.ForeignKey('sellers.id'), nullable=False)
    account_id = db.Column(db.Integer, db.ForeignKey('accounts.id'), nullable=False)
    amount = db.Column(db.Integer, nullable=False)  # مبلغ فروش
    commission = db.Column(db.Integer, nullable=False)  # کمیسیون
    status = db.Column(db.String(20), default='completed')  # completed, pending, cancelled
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Commission(db.Model):
    __tablename__ = 'commissions'
    
    id = db.Column(db.Integer, primary_key=True)
    seller_id = db.Column(db.Integer, db.ForeignKey('sellers.id'), nullable=False)
    transaction_id = db.Column(db.Integer, db.ForeignKey('transactions.id'), nullable=False)
    amount = db.Column(db.Integer, nullable=False)  # مبلغ کمیسیون
    status = db.Column(db.String(20), default='pending')  # pending, paid, rejected
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    paid_at = db.Column(db.DateTime, nullable=True)

class Withdrawal(db.Model):
    __tablename__ = 'withdrawals'
    
    id = db.Column(db.Integer, primary_key=True)
    seller_id = db.Column(db.Integer, db.ForeignKey('sellers.id'), nullable=False)
    amount = db.Column(db.Integer, nullable=False)
    bank_account = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected, completed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    processed_at = db.Column(db.DateTime, nullable=True)

class Customer(db.Model):
    __tablename__ = 'customers'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=False, unique=True)
    email = db.Column(db.String(120), nullable=True)
    account_id = db.Column(db.Integer, db.ForeignKey('accounts.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class UsageLog(db.Model):
    __tablename__ = 'usage_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    account_id = db.Column(db.Integer, db.ForeignKey('accounts.id'), nullable=False)
    data_used = db.Column(db.Float, nullable=False)  # مقدار داده مصرف شده به مگابایت
    time_used = db.Column(db.Integer, nullable=False)  # زمان مصرف به دقیقه
    hour_of_day = db.Column(db.Integer)  # ساعت روز (0-23)
    date = db.Column(db.Date, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Notification(db.Model):
    __tablename__ = 'notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(20), default='info')  # info, warning, urgent, success
    target_type = db.Column(db.String(20))  # all, sellers, customers, specific_user
    target_id = db.Column(db.Integer)  # برای ارسال به کاربر خاص
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime)  # تاریخ انقضای اعلان
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'message': self.message,
            'type': self.type,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
            'expires_at': self.expires_at.strftime('%Y-%m-%d %H:%M:%S') if self.expires_at else None
        }
class UserNotification(db.Model):
    __tablename__ = 'user_notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)
    user_type = db.Column(db.String(20), nullable=False)  # seller, customer
    notification_id = db.Column(db.Integer, db.ForeignKey('notifications.id'), nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    read_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Report(db.Model):
    __tablename__ = 'reports'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    report_type = db.Column(db.String(50), nullable=False)  # sales, usage, financial, performance
    generated_by = db.Column(db.Integer)  # admin id
    file_path = db.Column(db.String(500))  # مسیر فایل گزارش
    file_format = db.Column(db.String(10))  # pdf, csv, excel
    generated_at = db.Column(db.DateTime, default=datetime.utcnow)
    filters = db.Column(db.Text)  # فیلترهای استفاده شده

class LoyaltyProgram(db.Model):
    __tablename__ = 'loyalty_programs'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    points_per_purchase = db.Column(db.Integer, default=1)  # امتیاز به ازای هر خرید
    points_per_gb = db.Column(db.Integer, default=10)  # امتیاز به ازای هر گیگابایت مصرف
    min_purchase_amount = db.Column(db.Integer, default=0)  # حداقل مبلغ خرید برای دریافت امتیاز
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'points_per_purchase': self.points_per_purchase,
            'points_per_gb': self.points_per_gb,
            'is_active': self.is_active
        }
class CustomerLoyalty(db.Model):
    __tablename__ = 'customer_loyalty'
    
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)
    program_id = db.Column(db.Integer, db.ForeignKey('loyalty_programs.id'), nullable=False)
    total_points = db.Column(db.Integer, default=0)
    current_points = db.Column(db.Integer, default=0)  # امتیاز قابل استفاده
    total_purchases = db.Column(db.Integer, default=0)  # تعداد خریدها
    total_spent = db.Column(db.Integer, default=0)  # مجموع خریدها
    level = db.Column(db.String(50), default='bronze')  # سطح مشتری
    last_activity = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class LoyaltyReward(db.Model):
    __tablename__ = 'loyalty_rewards'
    
    id = db.Column(db.Integer, primary_key=True)
    program_id = db.Column(db.Integer, db.ForeignKey('loyalty_programs.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    points_required = db.Column(db.Integer, nullable=False)  # امتیاز مورد نیاز
    discount_percentage = db.Column(db.Integer, default=0)  # درصد تخفیف
    free_data_gb = db.Column(db.Integer, default=0)  # گیگابایت رایگان
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class LoyaltyTransaction(db.Model):
    __tablename__ = 'loyalty_transactions'
    
    id = db.Column(db.Integer, primary_key=True)
    customer_loyalty_id = db.Column(db.Integer, db.ForeignKey('customer_loyalty.id'), nullable=False)
    transaction_type = db.Column(db.String(20), nullable=False)  # earn, redeem, expire
    points = db.Column(db.Integer, nullable=False)  # امتیاز (مثبت برای کسب، منفی برای استفاده)
    description = db.Column(db.Text)
    reference_id = db.Column(db.Integer)  # شناسه مرجع (مثلاً transaction_id)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class PaymentGateway(db.Model):
    __tablename__ = 'payment_gateways'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)  # زرین‌پال، سامان، ملت و غیره
    gateway_type = db.Column(db.String(50), nullable=False)  # zarinpal, saman, mellat
    merchant_id = db.Column(db.String(200))  # شناسه پذیرنده
    api_key = db.Column(db.String(500))  # کلید API (رمزگذاری شده)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    def to_dict(self):
            return {
                'id': self.id,
                'name': self.name,
                'gateway_type': self.gateway_type,
                'is_active': self.is_active
            }
class Payment(db.Model):
    __tablename__ = 'payments'
    
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'))
    seller_id = db.Column(db.Integer, db.ForeignKey('sellers.id'))
    gateway_id = db.Column(db.Integer, db.ForeignKey('payment_gateways.id'))
    amount = db.Column(db.Integer, nullable=False)  # مبلغ به ریال
    currency = db.Column(db.String(10), default='IRR')
    payment_type = db.Column(db.String(20), nullable=False)  # purchase, recharge, commission
    reference_id = db.Column(db.String(100))  # شناسه مرجع از درگاه
    authority = db.Column(db.String(100))  # کد مرجع پرداخت
    status = db.Column(db.String(20), default='pending')  # pending, success, failed, cancelled
    description = db.Column(db.Text)
    paid_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Wallet(db.Model):
    __tablename__ = 'wallets'
    
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), unique=True)
    seller_id = db.Column(db.Integer, db.ForeignKey('sellers.id'), unique=True)
    balance = db.Column(db.Integer, default=0)  # موجودی به ریال
    currency = db.Column(db.String(10), default='IRR')
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)
    def to_dict(self):
        return {
            'id': self.id,
            'balance': self.balance,
            'currency': self.currency,
            'last_updated': self.last_updated.strftime('%Y-%m-%d %H:%M:%S') if self.last_updated else None
        }
class RechargeRequest(db.Model):
    __tablename__ = 'recharge_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)
    amount = db.Column(db.Integer, nullable=False)  # مبلغ به ریال
    payment_id = db.Column(db.Integer, db.ForeignKey('payments.id'))
    status = db.Column(db.String(20), default='pending')  # pending, processing, completed, failed
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)

class ConsumptionPattern(db.Model):
    __tablename__ = 'consumption_patterns'
    
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)
    day_of_week = db.Column(db.Integer)  # 0-6 (شنبه-جمعه)
    hour_of_day = db.Column(db.Integer)  # 0-23
    average_consumption = db.Column(db.Float)  # میانگین مصرف به مگابایت
    peak_consumption = db.Column(db.Float)  # حداکثر مصرف
    frequency = db.Column(db.Integer, default=1)  # تعداد دفعات
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class PredictionModel(db.Model):
    __tablename__ = 'prediction_models'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    model_type = db.Column(db.String(50), nullable=False)  # linear_regression, neural_network
    accuracy = db.Column(db.Float)  # دقت مدل
    last_trained = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class PredictionResult(db.Model):
    __tablename__ = 'prediction_results'
    
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)
    model_id = db.Column(db.Integer, db.ForeignKey('prediction_models.id'), nullable=False)
    predicted_consumption = db.Column(db.Float)  # مصرف پیش‌بینی شده
    actual_consumption = db.Column(db.Float)  # مصرف واقعی (برای آموزش مدل)
    prediction_date = db.Column(db.Date, nullable=False)
    confidence = db.Column(db.Float)  # اطمینان پیش‌بینی (0-1)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class AlertPrediction(db.Model):
    __tablename__ = 'alert_predictions'
    
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)
    alert_type = db.Column(db.String(50), nullable=False)  # data_end, time_end, high_usage
    predicted_date = db.Column(db.Date, nullable=False)
    probability = db.Column(db.Float)  # احتمال وقوع (0-1)
    threshold_value = db.Column(db.Float)  # مقدار آستانه
    current_value = db.Column(db.Float)  # مقدار فعلی
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class SupportCategory(db.Model):
    __tablename__ = 'support_categories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    priority = db.Column(db.Integer, default=1)  # 1-5 (کم-زیاد)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'priority': self.priority,
            'is_active': self.is_active
        }
class SupportTicket(db.Model):
    __tablename__ = 'support_tickets'
    
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'))
    seller_id = db.Column(db.Integer, db.ForeignKey('sellers.id'))
    category_id = db.Column(db.Integer, db.ForeignKey('support_categories.id'))
    subject = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    priority = db.Column(db.String(20), default='medium')  # low, medium, high, urgent
    status = db.Column(db.String(20), default='open')  # open, in_progress, resolved, closed
    assigned_to = db.Column(db.Integer)  # ادمین مسئول
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = db.Column(db.DateTime)

class TicketMessage(db.Model):
    __tablename__ = 'ticket_messages'
    
    id = db.Column(db.Integer, primary_key=True)
    ticket_id = db.Column(db.Integer, db.ForeignKey('support_tickets.id'), nullable=False)
    sender_id = db.Column(db.Integer, nullable=False)  # ID فرستنده
    sender_type = db.Column(db.String(20), nullable=False)  # customer, seller, admin
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class SupportFAQ(db.Model):
    __tablename__ = 'support_faqs'
    
    id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(db.Integer, db.ForeignKey('support_categories.id'))
    question = db.Column(db.String(500), nullable=False)
    answer = db.Column(db.Text, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Admin(db.Model):
    __tablename__ = 'admins'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), default='support')  # support, admin, super_admin
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

with app.app_context():
    db.create_all()


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_wifi_accounts_advanced(pdf_path):
    """استخراج پیشرفته اکانت‌های وای‌فای"""
    accounts = []
    
    patterns = [
        r'User:\s*(\w+)\s*Pass:\s*(\w+)',
        r'Username:\s*(\w+)\s*Password:\s*(\w+)',
        r'(\w+)@(\w+)',
        r'(\w+)\s+(\w+)',  # الگوی ساده‌تر
    ]
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    lines = text.split('\n')
                    for line in lines:
                        # جستجو در الگوهای مختلف
                        for pattern in patterns:
                            matches = re.findall(pattern, line, re.IGNORECASE)
                            for match in matches:
                                if isinstance(match, tuple) and len(match) >= 2:
                                    username, password = match[0], match[1]
                                elif isinstance(match, str):
                                    username = match
                                    password = ''
                                else:
                                    continue
                                
                                # تشخیص نوع اکانت
                                account_type = 'Unknown'
                                if 'hi' in line.lower() or 'high' in line.lower():
                                    account_type = 'Wfi'
                                elif 'gb' in line.lower():
                                    account_type = 'GB'
                                elif 'mb' in line.lower():
                                    account_type = 'MB'
                                
                                accounts.append({
                                    'username': username.strip(),
                                    'password': password.strip(),
                                    'account_type': account_type,
                                    'status': 'active'
                                })
                                break
    except Exception as e:
        print(f"Error extracting PDF: {e}")
    
    return accounts

# users routes
@app.route('/admin')
def admin():
    return render_template('admin.html')

@app.route('/seller')
def seller():
    return render_template('seller.html')

@app.route('/customer')
def customer():
    return render_template('customer.html')

# apps route
@app.route('/')
def index():
    return render_template('index.html')
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        role = request.form.get('userType')
        username = request.form.get('username')
        password = request.form.get('password')
        phone = request.form.get('phone')
        
        print(f"Login attempt - Role: {role}, Username: {username}, Phone: {phone}")

        if role == 'admin':
            admin = Admin.query.filter_by(name=username).first()
            if admin and check_password_hash(admin.password_hash, password):
                session['user_id'] = admin.id
                session['user_type'] = 'admin'
                session['user_name'] = admin.name
                flash('ورود مدیر موفقیت‌آمیز بود', 'success')
                return redirect(url_for('admin'))
            else:
                flash('نام کاربری یا رمز عبور اشتباه است', 'danger')
                
        elif role == 'seller':
            seller = Seller.query.filter_by(phone=phone).first()
            if seller and check_password_hash(seller.password_hash, password):
                session['user_id'] = seller.id
                session['user_type'] = 'seller'
                session['user_name'] = seller.name
                flash('ورود فروشنده موفقیت‌آمیز بود', 'success')
                return redirect(url_for('seller'))
            else:
                flash('شماره تماس یا رمز عبور اشتباه است', 'danger')
                
        elif role == 'customer':
            # ابتدا مشتری را با نام کاربری پیدا می‌کنیم
            customer = Customer.query.filter_by(name=username).first()
            if customer:
                # سپس اکانت مرتبط با مشتری را پیدا می‌کنیم
                account = Account.query.get(customer.account_id)
                if account and account.password == password:
                    session['user_id'] = customer.id
                    session['user_type'] = 'customer'
                    session['user_name'] = customer.name
                    flash('ورود مشتری موفقیت‌آمیز بود', 'success')
                    return redirect(url_for('customer'))
                else:
                    flash('رمز عبور اشتباه است', 'danger')
            else:
                flash('مشتری یافت نشد', 'danger')
        else:
            flash('نقش کاربری معتبر نیست', 'danger')
    
    return render_template('login.html')

@app.route('/register_seller', methods=['GET', 'POST'])
def register_seller():
    if request.method == 'POST':
        name = request.form.get('name')
        phone = request.form.get('phone')
        email = request.form.get('email')
        password = request.form.get('password')

        seller = Seller(name=name, phone=phone,email=email, password_hash=password)
        db.session.add(seller)
        db.session.commit()

        flash('فروشنده با موفقیت ثبت شد')
        return redirect(url_for('login'))

    return render_template('seller_register.html')




# مدیریت اکانت‌ها 
@app.route('/upload-pdf', methods=['POST'])
def upload_pdf():
    if 'pdf_file' not in request.files:
        return jsonify({'success': False, 'message': 'فایلی انتخاب نشده است'})
    
    file = request.files['pdf_file']
    
    if file.filename == '':
        return jsonify({'success': False, 'message': 'فایلی انتخاب نشده است'})
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        extracted_accounts = extract_wifi_accounts_advanced(filepath)
        saved_count = 0
        for acc_data in extracted_accounts:
            account = Account(
                username=acc_data['username'],
                password=acc_data['password'],
                account_type=acc_data['account_type'],
                status=acc_data['status']
            )
            db.session.add(account)
            saved_count += 1
        
        db.session.commit()
        
        return jsonify({
            'success': True, 
            'message': f'{saved_count} اکانت با موفقیت ذخیره شد!',
            'accounts_count': saved_count
        })
    
    return jsonify({'success': False, 'message': 'فقط فایل‌های PDF مجاز هستند'})

@app.route('/api/accounts')
def get_accounts():
    """دریافت لیست اکانت‌ها برای AJAX"""
    accounts = Account.query.all()
    return jsonify([acc.to_dict() for acc in accounts])

@app.route('/api/sellers')
def get_sellers():
    """دریافت لیست فروشندگان برای AJAX"""
    sellers = Seller.query.all()
    return jsonify([seller.to_dict() for seller in sellers])

# ==================== APIهای فروشنده ====================

@app.route('/api/seller/accounts')
def get_seller_accounts():
    # در اینجا باید بر اساس session فروشنده فیلتر کنید
    accounts = Account.query.filter_by(status='active').all()
    return jsonify([acc.to_dict() for acc in accounts])

@app.route('/api/sales', methods=['POST'])
def register_sale():
    data = request.get_json()
    
    # ایجاد تراکنش
    transaction = Transaction(
        seller_id=data.get('seller_id', 1),  # باید از session بگیرید
        account_id=data.get('account_id'),
        amount=data.get('amount'),
        commission=int(data.get('amount') * 0.1)  # 10% کمیسیون
    )
    
    db.session.add(transaction)
    
    # ایجاد رکورد کمیسیون
    commission = Commission(
        seller_id=data.get('seller_id', 1),
        transaction_id=transaction.id,
        amount=transaction.commission,
        status='pending'
    )
    
    db.session.add(commission)
    
    # به‌روزرسانی وضعیت اکانت
    account = Account.query.get(data.get('account_id'))
    if account:
        account.status = 'sold'
        account.seller_id = data.get('seller_id', 1)
    
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'فروش با موفقیت ثبت شد'})

@app.route('/api/seller/sales')
def get_seller_sales():
    # در اینجا باید بر اساس session فروشنده فیلتر کنید
    transactions = Transaction.query.filter_by(seller_id=1).all()  # موقت
    
    sales_data = []
    for trans in transactions:
        account = Account.query.get(trans.account_id)
        sales_data.append({
            'id': trans.id,
            'customer_name': f'مشتری {trans.id}',  # باید اطلاعات مشتری اضافه شود
            'account_type': account.account_type if account else 'نامشخص',
            'amount': trans.amount,
            'commission': trans.commission,
            'date': trans.created_at.strftime('%Y/%m/%d') if trans.created_at else None,
            'status': 'تکمیل شده'
        })
    
    return jsonify(sales_data)

@app.route('/api/withdrawals', methods=['POST'])
def request_withdrawal():
    data = request.get_json()
    
    withdrawal = Withdrawal(
        seller_id=data.get('seller_id', 1),
        amount=data.get('amount'),
        bank_account=data.get('bank_account'),
        status='pending'
    )
    
    db.session.add(withdrawal)
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'درخواست تسویه با موفقیت ثبت شد'})

@app.route('/api/seller/stats')
def get_seller_stats():
    seller_id = 1  # باید از session بگیرید
    
    total_accounts = Account.query.filter_by(seller_id=seller_id).count()
    available_accounts = Account.query.filter_by(seller_id=seller_id, status='active').count()
    total_sales = Transaction.query.filter_by(seller_id=seller_id).count()
    
    # محاسبه کمیسیون
    commissions = Commission.query.filter_by(seller_id=seller_id, status='pending').all()
    commission_balance = sum(c.amount for c in commissions)
    
    today_sales = Transaction.query.filter_by(seller_id=seller_id)\
        .filter(Transaction.created_at >= datetime.today().date()).count()
    
    return jsonify({
        'total_accounts': total_accounts,
        'available_accounts': available_accounts,
        'total_sales': total_sales,
        'commission_balance': commission_balance,
        'today_sales': today_sales
    })

# مدیریت مشتریان
@app.route('/api/customer/status')
def get_customer_status():
    account_id = 1  
    account = Account.query.get(account_id)
    if not account:
        return jsonify({'error': 'Account not found'}), 404
    total_data = 20
    used_data = 5 
    remaining_data = total_data - used_data
    expire_date = datetime(2024, 3, 13) 
    today = datetime.now()
    remaining_days = (expire_date - today).days
    
    return jsonify({
        'remaining_data': f'{remaining_data} گیگابایت',
        'remaining_time': f'{remaining_days} روز',
        'paid_amount': '۵۰,۰۰۰ افغانی',
        'data_percentage': (used_data / total_data) * 100,
        'time_percentage': ((30 - remaining_days) / 30) * 100 if remaining_days <= 30 else 0
    })

@app.route('/api/customer/usage')
def get_customer_usage():
    account_id = 1  # موقت
    
    # داده‌های نمونه برای نمودارها
    daily_usage = [
        {'day': 'شنبه', 'usage': 2.5},
        {'day': 'یکشنبه', 'usage': 3.2},
        {'day': 'دوشنبه', 'usage': 1.8},
        {'day': 'سه‌شنبه', 'usage': 4.1},
        {'day': 'چهارشنبه', 'usage': 2.9},
        {'day': 'پنجشنبه', 'usage': 3.5},
        {'day': 'جمعه', 'usage': 2.2}
    ]
    
    hourly_usage = [
        {'hour': '۰-۴', 'usage': 150},
        {'hour': '۴-۸', 'usage': 320},
        {'hour': '۸-۱۲', 'usage': 450},
        {'hour': '۱۲-۱۶', 'usage': 680},
        {'hour': '۱۶-۲۰', 'usage': 420},
        {'hour': '۲۰-۲۴', 'usage': 280}
    ]
    
    return jsonify({
        'daily_usage': daily_usage,
        'hourly_usage': hourly_usage
    })

@app.route('/api/customer/account')
def get_customer_account():
    account_id = 1  # موقت
    
    account = Account.query.get(account_id)
    if not account:
        return jsonify({'error': 'Account not found'}), 404
    
    seller = Seller.query.get(account.seller_id) if account.seller_id else None
    
    return jsonify({
        'username': account.username,
        'password': '••••••••',
        'account_type': account.account_type,
        'start_date': '1403/01/01',
        'expire_date': '1403/02/01',
        'seller_name': seller.name if seller else 'نامشخص'
    })


@app.route('/admin/notifications')
def admin_notifications():
    return render_template('admin_notifications.html')

@app.route('/api/admin/notifications', methods=['POST'])
def send_notification():
    data = request.get_json()
    
    notification = Notification(
        title=data.get('title'),
        message=data.get('message'),
        type=data.get('type', 'info'),
        target_type=data.get('target_type', 'all'),
        target_id=data.get('target_id'),
        expires_at=datetime.strptime(data.get('expires_at'), '%Y-%m-%d') if data.get('expires_at') else None
    )
    
    db.session.add(notification)
    db.session.commit()

    if data.get('target_type') == 'sellers':
        sellers = Seller.query.all()
        for seller in sellers:
            user_notif = UserNotification(
                user_id=seller.id,
                user_type='seller',
                notification_id=notification.id
            )
            db.session.add(user_notif)
    elif data.get('target_type') == 'customers':
        customers = Customer.query.all()
        for customer in customers:
            user_notif = UserNotification(
                user_id=customer.id,
                user_type='customer',
                notification_id=notification.id
            )
            db.session.add(user_notif)
    elif data.get('target_type') == 'specific':
        # برای کاربر خاص
        user_notif = UserNotification(
            user_id=data.get('target_id'),
            user_type=data.get('user_type'),
            notification_id=notification.id
        )
        db.session.add(user_notif)
    else:
        # برای همه کاربران
        sellers = Seller.query.all()
        customers = Customer.query.all()
        
        for seller in sellers:
            user_notif = UserNotification(
                user_id=seller.id,
                user_type='seller',
                notification_id=notification.id
            )
            db.session.add(user_notif)
            
        for customer in customers:
            user_notif = UserNotification(
                user_id=customer.id,
                user_type='customer',
                notification_id=notification.id
            )
            db.session.add(user_notif)
    
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'اعلان با موفقیت ارسال شد'})

@app.route('/api/admin/notifications')
def get_admin_notifications():
    notifications = Notification.query.order_by(Notification.created_at.desc()).all()
    return jsonify([notif.to_dict() for notif in notifications])

@app.route('/api/seller/notifications')
def get_seller_notifications():
    seller_id = 1  # باید از session بگیرید
    
    # پیدا کردن اعلان‌های مخصوص این فروشنده
    user_notifications = UserNotification.query.filter_by(
        user_id=seller_id,
        user_type='seller'
    ).join(Notification).order_by(Notification.created_at.desc()).all()
    
    notifications = []
    for user_notif in user_notifications:
        notif_data = user_notif.notification.to_dict()
        notif_data['is_read'] = user_notif.is_read
        notif_data['user_notification_id'] = user_notif.id
        notifications.append(notif_data)
    
    return jsonify(notifications)

@app.route('/api/customer/notifications')
def get_customer_notifications():
    customer_id = 1  # باید از session بگیرید
    
    # پیدا کردن اعلان‌های مخصوص این مشتری
    user_notifications = UserNotification.query.filter_by(
        user_id=customer_id,
        user_type='customer'
    ).join(Notification).order_by(Notification.created_at.desc()).all()
    
    notifications = []
    for user_notif in user_notifications:
        notif_data = user_notif.notification.to_dict()
        notif_data['is_read'] = user_notif.is_read
        notif_data['user_notification_id'] = user_notif.id
        notifications.append(notif_data)
    
    return jsonify(notifications)

@app.route('/api/notifications/<int:notif_id>/read', methods=['POST'])
def mark_notification_as_read(notif_id):
    user_id = request.json.get('user_id')
    user_type = request.json.get('user_type')
    
    user_notif = UserNotification.query.filter_by(
        user_id=user_id,
        user_type=user_type,
        notification_id=notif_id
    ).first()
    
    if user_notif:
        user_notif.is_read = True
        user_notif.read_at = datetime.utcnow()
        db.session.commit()
        return jsonify({'success': True})
    
    return jsonify({'success': False, 'message': 'اعلان یافت نشد'}), 404

@app.route('/api/admin/notifications/<int:notif_id>', methods=['DELETE'])
def delete_notification(notif_id):
    notification = Notification.query.get(notif_id)
    if notification:
        UserNotification.query.filter_by(notification_id=notif_id).delete()
        db.session.delete(notification)
        db.session.commit()
        return jsonify({'success': True, 'message': 'اعلان حذف شد'})
    
    return jsonify({'success': False, 'message': 'اعلان یافت نشد'}), 404


@app.route('/admin/reports')
def admin_reports():
    return render_template('admin_reports.html')

@app.route('/api/admin/reports/types')
def get_report_types():
    report_types = [
        {'id': 'sales', 'name': 'گزارش فروش', 'icon': '💰'},
        {'id': 'usage', 'name': 'گزارش مصرف', 'icon': '📊'},
        {'id': 'financial', 'name': 'گزارش مالی', 'icon': '💳'},
        {'id': 'performance', 'name': 'گزارش عملکرد', 'icon': '📈'},
        {'id': 'commission', 'name': 'گزارش کمیسیون', 'icon': '💸'},
        {'id': 'customer', 'name': 'گزارش مشتریان', 'icon': '👥'}
    ]
    return jsonify(report_types)


@app.route('/admin/loyalty')
def admin_loyalty():
    return render_template('admin_loyalty.html')

@app.route('/customer/loyalty')
def customer_loyalty():
    return render_template('customer_loyalty.html')


@app.route('/customer/payment')
def customer_payment():
    return render_template('customer_payment.html')

@app.route('/admin/payments')
def admin_payments():
    return render_template('admin_payments.html')

@app.route('/api/payment/gateways')
def get_payment_gateways():
    gateways = PaymentGateway.query.filter_by(is_active=True).all()
    return jsonify([gateway.to_dict() for gateway in gateways])


@app.route('/customer/ai')
def customer_ai():
    return render_template('customer_ai.html')

@app.route('/admin/ai')
def admin_ai():
    return render_template('admin_ai.html')


@app.route('/customer/support')
def customer_support():
    return render_template('customer_support.html')

@app.route('/seller/support')
def seller_support():
    return render_template('seller_support.html')

@app.route('/admin/support')
def admin_support():
    return render_template('admin_support.html')

@app.route('/api/support/categories')
def get_support_categories():
    categories = SupportCategory.query.filter_by(is_active=True).all()
    return jsonify([cat.to_dict() for cat in categories])

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)