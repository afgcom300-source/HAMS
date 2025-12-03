import time
import functools
from flask import request, jsonify
from collections import defaultdict
import threading
from datetime import datetime, timedelta

class PerformanceOptimizer:
    def __init__(self):
        self.cache = {}
        self.cache_times = {}
        self.request_counts = defaultdict(int)
        self.response_times = defaultdict(list)
        self.lock = threading.Lock()
        
    def cache_result(self, key, result, ttl=300):  # TTL به ثانیه
        """کش کردن نتایج"""
        with self.lock:
            self.cache[key] = result
            self.cache_times[key] = time.time() + ttl
    
    def get_cached_result(self, key):
        """دریافت نتیجه کش شده"""
        with self.lock:
            if key in self.cache:
                if time.time() < self.cache_times[key]:
                    return self.cache[key]
                else:
                    # حذف کش منقضی شده
                    del self.cache[key]
                    del self.cache_times[key]
        return None
    
    def clear_cache(self, key=None):
        """پاک کردن کش"""
        with self.lock:
            if key:
                if key in self.cache:
                    del self.cache[key]
                    del self.cache_times[key]
            else:
                self.cache.clear()
                self.cache_times.clear()
    
    def get_cache_stats(self):
        """دریافت آمار کش"""
        with self.lock:
            return {
                'cache_size': len(self.cache),
                'cached_keys': list(self.cache.keys())
            }

# ایجاد نمونه بهینه‌ساز
performance_optimizer = PerformanceOptimizer()

# دکوراتور برای کش کردن نتایج API
def cached(ttl=300):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # ایجاد کلید کش
            cache_key = f"{func.__name__}:{str(args)}:{str(kwargs)}"
            
            # بررسی کش
            cached_result = performance_optimizer.get_cached_result(cache_key)
            if cached_result is not None:
                return cached_result
            
            # اجرای تابع و کش کردن نتیجه
            result = func(*args, **kwargs)
            performance_optimizer.cache_result(cache_key, result, ttl)
            
            return result
        return wrapper
    return decorator

# دکوراتور برای اندازه‌گیری عملکرد
def measure_performance(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        endpoint = request.endpoint if request else func.__name__
        
        try:
            result = func(*args, **kwargs)
            execution_time = time.time() - start_time
            
            # ثبت آمار
            with performance_optimizer.lock:
                performance_optimizer.response_times[endpoint].append(execution_time)
                performance_optimizer.request_counts[endpoint] += 1
            
            return result
        except Exception as e:
            execution_time = time.time() - start_time
            print(f"Error in {endpoint}: {str(e)} (took {execution_time:.4f}s)")
            raise e
    return wrapper

# دکوراتور برای محدودیت نرخ درخواست
def rate_limit(max_requests=100, window=60):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            client_ip = request.remote_addr if request else 'unknown'
            endpoint = request.endpoint if request else func.__name__
            key = f"{client_ip}:{endpoint}"
            
            current_time = time.time()
            
            with performance_optimizer.lock:
                # پاک کردن درخواست‌های قدیمی
                if key not in performance_optimizer.response_times:
                    performance_optimizer.response_times[key] = []
                
                # حذف درخواست‌های قدیمی از پنجره زمانی
                performance_optimizer.response_times[key] = [
                    req_time for req_time in performance_optimizer.response_times[key]
                    if current_time - req_time < window
                ]
                
                # بررسی محدودیت
                if len(performance_optimizer.response_times[key]) >= max_requests:
                    return jsonify({
                        'success': False,
                        'message': 'درخواست بیش از حد مجاز'
                    }), 429
                
                # ثبت درخواست جدید
                performance_optimizer.response_times[key].append(current_time)
            
            return func(*args, **kwargs)
        return wrapper
    return decorator