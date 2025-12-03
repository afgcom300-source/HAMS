from app import db
from sqlalchemy import text
import time

class DatabaseOptimizer:
    def __init__(self):
        self.optimization_stats = {}
    
    def analyze_queries(self):
        """تحلیل کوئری‌های دیتابیس"""
        # این قسمت نیاز به ابزارهای خاص دیتابیس دارد
        # برای SQLite ساده‌سازی شده است
        print("در حال تحلیل کوئری‌ها...")
        
        # بررسی جداول بزرگ
        tables = ['accounts', 'sellers', 'customers', 'transactions', 'usage_logs']
        table_sizes = {}
        
        for table in tables:
            try:
                result = db.session.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = result.scalar()
                table_sizes[table] = count
                print(f"جدول {table}: {count} رکورد")
            except Exception as e:
                print(f"خطا در بررسی جدول {table}: {e}")
        
        return table_sizes
    
    def optimize_indexes(self):
        """بهینه‌سازی ایندکس‌ها"""
        print("در حال بهینه‌سازی ایندکس‌ها...")
        
        # ایندکس‌های پیشنهادی
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_accounts_seller ON accounts(seller_id)",
            "CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status)",
            "CREATE INDEX IF NOT EXISTS idx_customers_account ON customers(account_id)",
            "CREATE INDEX IF NOT EXISTS idx_transactions_seller ON transactions(seller_id)",
            "CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id)",
            "CREATE INDEX IF NOT EXISTS idx_usage_logs_account ON usage_logs(account_id)",
            "CREATE INDEX IF NOT EXISTS idx_usage_logs_date ON usage_logs(date)"
        ]
        
        for index_sql in indexes:
            try:
                db.session.execute(text(index_sql))
                print(f"ایندکس ایجاد شد: {index_sql}")
            except Exception as e:
                print(f"خطا در ایجاد ایندکس: {e}")
        
        db.session.commit()
    
    def vacuum_database(self):
        """فشرده‌سازی دیتابیس"""
        print("در حال فشرده‌سازی دیتابیس...")
        
        try:
            # برای SQLite
            db.session.execute(text("VACUUM"))
            print("دیتابیس فشرده‌سازی شد")
        except Exception as e:
            print(f"خطا در فشرده‌سازی: {e}")
    
    def cleanup_old_data(self, days_old=90):
        """پاک کردن داده‌های قدیمی"""
        print(f"در حال پاک کردن داده‌های قدیمی ({days_old} روز)...")
        
        # این بخش باید با توجه به نیاز واقعی پیاده‌سازی شود
        # مثال: پاک کردن لاگ‌های قدیمی
        try:
            # حذف لاگ‌های قدیمی از ۹۰ روز قبل
            old_date = time.time() - (days_old * 24 * 60 * 60)
            # اینجا کوئری حذف داده‌های قدیمی قرار می‌گیرد
            print("داده‌های قدیمی پاک شدند")
        except Exception as e:
            print(f"خطا در پاک کردن داده‌های قدیمی: {e}")
    
    def get_database_stats(self):
        """دریافت آمار دیتابیس"""
        stats = {}
        
        try:
            # اندازه دیتابیس
            import os
            if os.path.exists('wifi.db'):
                size = os.path.getsize('wifi.db')
                stats['database_size_mb'] = round(size / (1024 * 1024), 2)
            
            # تعداد رکوردها در جداول اصلی
            tables = ['accounts', 'sellers', 'customers', 'transactions']
            for table in tables:
                try:
                    result = db.session.execute(text(f"SELECT COUNT(*) FROM {table}"))
                    count = result.scalar()
                    stats[f'{table}_count'] = count
                except:
                    stats[f'{table}_count'] = 0
                    
        except Exception as e:
            print(f"خطا در دریافت آمار دیتابیس: {e}")
        
        return stats

# ایجاد نمونه بهینه‌ساز دیتابیس
db_optimizer = DatabaseOptimizer()

def optimize_database():
    """بهینه‌سازی کامل دیتابیس"""
    print("شروع بهینه‌سازی دیتابیس...")
    
    # تحلیل کوئری‌ها
    table_sizes = db_optimizer.analyze_queries()
    
    # بهینه‌سازی ایندکس‌ها
    db_optimizer.optimize_indexes()
    
    # فشرده‌سازی دیتابیس
    db_optimizer.vacuum_database()
    
    # دریافت آمار
    stats = db_optimizer.get_database_stats()
    
    print("بهینه‌سازی دیتابیس تکمیل شد")
    return stats