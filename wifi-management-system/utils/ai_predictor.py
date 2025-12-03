import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, r2_score
from datetime import datetime, timedelta
import pandas as pd
from models.usage_log import UsageLog
from models.customer import Customer
from models.ai_prediction import ConsumptionPattern, PredictionModel, PredictionResult, AlertPrediction

class AIPredictor:
    def __init__(self):
        self.models = {}
        self.scalers = {}
        
    def prepare_data(self, customer_id, days_back=30):
        """آماده‌سازی داده‌ها برای آموزش مدل"""
        # دریافت داده‌های مصرف مشتری
        usage_logs = UsageLog.query.filter(
            UsageLog.account_id.in_(
                db.session.query(Customer.account_id).filter(Customer.id == customer_id)
            ),
            UsageLog.date >= datetime.now().date() - timedelta(days=days_back)
        ).all()
        
        if not usage_logs:
            return None, None
            
        # تبدیل داده‌ها به DataFrame
        data = []
        for log in usage_logs:
            data.append({
                'day_of_week': log.date.weekday(),
                'hour_of_day': log.hour_of_day,
                'data_used': log.data_used,
                'date': log.date
            })
        
        df = pd.DataFrame(data)
        
        # ایجاد ویژگی‌های اضافی
        df['day_sin'] = np.sin(2 * np.pi * df['day_of_week'] / 7)
        df['day_cos'] = np.cos(2 * np.pi * df['day_of_week'] / 7)
        df['hour_sin'] = np.sin(2 * np.pi * df['hour_of_day'] / 24)
        df['hour_cos'] = np.cos(2 * np.pi * df['hour_of_day'] / 24)
        
        # ویژگی‌های ورودی و خروجی
        X = df[['day_sin', 'day_cos', 'hour_sin', 'hour_cos']].values
        y = df['data_used'].values
        
        return X, y
    
    def train_linear_regression(self, customer_id):
        """آموزش مدل رگرسیون خطی"""
        X, y = self.prepare_data(customer_id)
        if X is None:
            return None, 0
            
        # استانداردسازی داده‌ها
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        # آموزش مدل
        model = LinearRegression()
        model.fit(X_scaled, y)
        
        # محاسبه دقت
        y_pred = model.predict(X_scaled)
        accuracy = r2_score(y, y_pred)
        
        # ذخیره مدل و اسکیلر
        model_key = f"lr_{customer_id}"
        self.models[model_key] = model
        self.scalers[model_key] = scaler
        
        return model, accuracy
    
    def train_random_forest(self, customer_id):
        """آموزش مدل Random Forest"""
        X, y = self.prepare_data(customer_id)
        if X is None:
            return None, 0
            
        # استانداردسازی داده‌ها
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        # آموزش مدل
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(X_scaled, y)
        
        # محاسبه دقت
        y_pred = model.predict(X_scaled)
        accuracy = r2_score(y, y_pred)
        
        # ذخیره مدل و اسکیلر
        model_key = f"rf_{customer_id}"
        self.models[model_key] = model
        self.scalers[model_key] = scaler
        
        return model, accuracy
    
    def predict_consumption(self, customer_id, target_date, target_hour, model_type='lr'):
        """پیش‌بینی مصرف برای تاریخ و ساعت خاص"""
        model_key = f"{model_type}_{customer_id}"
        
        # بررسی وجود مدل
        if model_key not in self.models:
            # آموزش مدل اگر وجود نداشت
            if model_type == 'lr':
                model, accuracy = self.train_linear_regression(customer_id)
            else:
                model, accuracy = self.train_random_forest(customer_id)
            
            if model is None:
                return None, 0
        
        model = self.models[model_key]
        scaler = self.scalers[model_key]
        
        # آماده‌سازی داده‌های ورودی
        day_of_week = target_date.weekday()
        day_sin = np.sin(2 * np.pi * day_of_week / 7)
        day_cos = np.cos(2 * np.pi * day_of_week / 7)
        hour_sin = np.sin(2 * np.pi * target_hour / 24)
        hour_cos = np.cos(2 * np.pi * target_hour / 24)
        
        X = np.array([[day_sin, day_cos, hour_sin, hour_cos]])
        X_scaled = scaler.transform(X)
        
        # پیش‌بینی
        prediction = model.predict(X_scaled)[0]
        
        # محاسبه اطمینان (ساده‌سازی شده)
        confidence = min(0.9, max(0.5, 0.7 + np.random.normal(0, 0.1)))
        
        return max(0, prediction), confidence
    
    def predict_data_end(self, customer_id):
        """پیش‌بینی تاریخ اتمام حجم اینترنت"""
        # دریافت اطلاعات فعلی مشتری
        customer = Customer.query.get(customer_id)
        if not customer:
            return None, 0
        
        account = customer.account
        if not account:
            return None, 0
        
        # محاسبه حجم باقی‌مانده
        total_data = 20 * 1024  # فرض: 20 گیگابایت
        used_data = 5 * 1024    # فرض: 5 گیگابایت استفاده شده
        remaining_data = total_data - used_data
        
        if remaining_data <= 0:
            return datetime.now().date(), 1.0
        
        # پیش‌بینی مصرف روزانه
        daily_consumption = 0
        for hour in range(24):
            pred, conf = self.predict_consumption(customer_id, datetime.now().date(), hour)
            daily_consumption += pred
        
        if daily_consumption <= 0:
            return None, 0
        
        # محاسبه تعداد روزهای باقی‌مانده
        days_left = remaining_data / (daily_consumption / 1024)  # تبدیل به گیگابایت
        end_date = datetime.now().date() + timedelta(days=int(days_left))
        
        # محاسبه احتمال
        probability = min(0.95, max(0.1, 0.8 - (days_left * 0.01)))
        
        return end_date, probability
    
    def predict_high_usage_alert(self, customer_id, threshold=1000):
        """پیش‌بینی هشدار مصرف بالا"""
        # پیش‌بینی مصرف ۲۴ ساعت آینده
        current_date = datetime.now().date()
        total_predicted = 0
        
        for hour in range(24):
            pred, conf = self.predict_consumption(customer_id, current_date, hour)
            total_predicted += pred
        
        # بررسی آستانه
        if total_predicted > threshold:
            probability = min(0.99, total_predicted / (threshold * 2))
            return True, probability, total_predicted
        
        return False, 0, total_predicted

# ایجاد نمونه پیش‌بین
ai_predictor = AIPredictor()

# توابع کمکی برای آموزش گروهی
def train_all_models():
    """آموزش مدل‌ها برای همه مشتریان"""
    customers = Customer.query.all()
    results = []
    
    for customer in customers:
        try:
            # آموزش مدل‌های مختلف
            lr_model, lr_accuracy = ai_predictor.train_linear_regression(customer.id)
            rf_model, rf_accuracy = ai_predictor.train_random_forest(customer.id)
            
            results.append({
                'customer_id': customer.id,
                'lr_accuracy': lr_accuracy,
                'rf_accuracy': rf_accuracy
            })
        except Exception as e:
            print(f"Error training models for customer {customer.id}: {e}")
    
    return results

def generate_predictions_for_all():
    """تولید پیش‌بینی‌ها برای همه مشتریان"""
    customers = Customer.query.all()
    predictions = []
    
    for customer in customers:
        try:
            # پیش‌بینی اتمام حجم
            end_date, probability = ai_predictor.predict_data_end(customer.id)
            
            if end_date:
                alert = AlertPrediction(
                    customer_id=customer.id,
                    alert_type='data_end',
                    predicted_date=end_date,
                    probability=probability,
                    threshold_value=20 * 1024,  # 20 گیگابایت
                    current_value=5 * 1024      # 5 گیگابایت استفاده شده
                )
                db.session.add(alert)
                predictions.append(alert.to_dict())
            
            # پیش‌بینی هشدار مصرف بالا
            is_high, prob, predicted_usage = ai_predictor.predict_high_usage_alert(customer.id)
            
            if is_high:
                alert = AlertPrediction(
                    customer_id=customer.id,
                    alert_type='high_usage',
                    predicted_date=datetime.now().date(),
                    probability=prob,
                    threshold_value=1000,
                    current_value=predicted_usage
                )
                db.session.add(alert)
                predictions.append(alert.to_dict())
                
        except Exception as e:
            print(f"Error generating predictions for customer {customer.id}: {e}")
    
    db.session.commit()
    return predictions