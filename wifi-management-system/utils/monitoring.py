import psutil
import time
from datetime import datetime
import threading
import json
import os

class SystemMonitor:
    def __init__(self, log_file='monitoring.log'):
        self.log_file = log_file
        self.is_monitoring = False
        self.monitoring_thread = None
        self.metrics = {
            'cpu_usage': [],
            'memory_usage': [],
            'disk_usage': [],
            'network_io': [],
            'response_times': []
        }
    
    def start_monitoring(self, interval=60):
        """شروع مانیتورینگ سیستم"""
        if self.is_monitoring:
            return
        
        self.is_monitoring = True
        self.monitoring_thread = threading.Thread(target=self._monitor_loop, args=(interval,))
        self.monitoring_thread.daemon = True
        self.monitoring_thread.start()
        
        print("مانیتورینگ سیستم شروع شد...")
    
    def stop_monitoring(self):
        """توقف مانیتورینگ سیستم"""
        self.is_monitoring = False
        if self.monitoring_thread:
            self.monitoring_thread.join()
        print("مانیتورینگ سیستم متوقف شد.")
    
    def _monitor_loop(self, interval):
        """حلقه مانیتورینگ"""
        while self.is_monitoring:
            try:
                # جمع‌آوری متریک‌ها
                metrics = self._collect_metrics()
                
                # ذخیره متریک‌ها
                self._save_metrics(metrics)
                
                # لاگ کردن
                self._log_metrics(metrics)
                
                time.sleep(interval)
            except Exception as e:
                print(f"خطا در مانیتورینگ: {e}")
                time.sleep(interval)
    
    def _collect_metrics(self):
        """جمع‌آوری متریک‌های سیستم"""
        metrics = {
            'timestamp': datetime.now().isoformat(),
            'cpu_percent': psutil.cpu_percent(interval=1),
            'memory_percent': psutil.virtual_memory().percent,
            'memory_available': psutil.virtual_memory().available / (1024**3),  # گیگابایت
            'disk_percent': psutil.disk_usage('/').percent,
            'disk_free': psutil.disk_usage('/').free / (1024**3),  # گیگابایت
            'network_sent': psutil.net_io_counters().bytes_sent / (1024**2),  # مگابایت
            'network_recv': psutil.net_io_counters().bytes_recv / (1024**2),  # مگابایت
            'process_count': len(psutil.pids())
        }
        
        return metrics
    
    def _save_metrics(self, metrics):
        """ذخیره متریک‌ها در فایل"""
        try:
            # اضافه کردن به متریک‌های داخلی
            for key, value in metrics.items():
                if key in self.metrics and isinstance(value, (int, float)):
                    self.metrics[key].append(value)
                    # نگه داشتن فقط ۱۰۰۰ نمونه آخر
                    if len(self.metrics[key]) > 1000:
                        self.metrics[key] = self.metrics[key][-1000:]
            
            # ذخیره در فایل JSON
            log_entry = {
                'timestamp': metrics['timestamp'],
                'system_metrics': metrics
            }
            
            # خواندن داده‌های موجود
            log_data = []
            if os.path.exists(self.log_file):
                try:
                    with open(self.log_file, 'r') as f:
                        log_data = json.load(f)
                except:
                    log_data = []
            
            # اضافه کردن داده جدید
            log_data.append(log_entry)
            
            # نگه داشتن فقط ۱۰۰۰ نمونه آخر
            if len(log_data) > 1000:
                log_data = log_data[-1000:]
            
            # ذخیره در فایل
            with open(self.log_file, 'w') as f:
                json.dump(log_data, f, indent=2)
                
        except Exception as e:
            print(f"خطا در ذخیره متریک‌ها: {e}")
    
    def _log_metrics(self, metrics):
        """لاگ کردن متریک‌ها"""
        print(f"[{metrics['timestamp']}] "
              f"CPU: {metrics['cpu_percent']:.1f}% | "
              f"Memory: {metrics['memory_percent']:.1f}% | "
              f"Disk: {metrics['disk_percent']:.1f}%")
    
    def get_system_health(self):
        """دریافت وضعیت سلامت سیستم"""
        cpu_avg = sum(self.metrics['cpu_percent'][-10:]) / len(self.metrics['cpu_percent'][-10:]) if self.metrics['cpu_percent'] else 0
        mem_avg = sum(self.metrics['memory_percent'][-10:]) / len(self.metrics['memory_percent'][-10:]) if self.metrics['memory_percent'] else 0
        disk_avg = sum(self.metrics['disk_percent'][-10:]) / len(self.metrics['disk_percent'][-10:]) if self.metrics['disk_percent'] else 0
        
        health_status = {
            'cpu_health': 'Good' if cpu_avg < 80 else 'Warning' if cpu_avg < 90 else 'Critical',
            'memory_health': 'Good' if mem_avg < 80 else 'Warning' if mem_avg < 90 else 'Critical',
            'disk_health': 'Good' if disk_avg < 80 else 'Warning' if disk_avg < 90 else 'Critical',
            'average_cpu': round(cpu_avg, 2),
            'average_memory': round(mem_avg, 2),
            'average_disk': round(disk_avg, 2)
        }
        
        return health_status
    
    def generate_report(self):
        """تولید گزارش مانیتورینگ"""
        health = self.get_system_health()
        
        report = f"""
=== گزارش مانیتورینگ سیستم ===
زمان: {datetime.now().strftime('%Y/%m/%d %H:%M:%S')}

وضعیت سلامت:
  CPU: {health['cpu_health']} ({health['average_cpu']}%)
  Memory: {health['memory_health']} ({health['average_memory']}%)
  Disk: {health['disk_health']} ({health['average_disk']}%)

آمار اخیر:
  تعداد نمونه‌های جمع‌آوری شده: {len(self.metrics['cpu_percent'])}
  مصرف CPU حداکثر: {max(self.metrics['cpu_percent']) if self.metrics['cpu_percent'] else 0:.1f}%
  مصرف حافظه حداکثر: {max(self.metrics['memory_percent']) if self.metrics['memory_percent'] else 0:.1f}%
        """
        
        return report

# ایجاد نمونه مانیتور
system_monitor = SystemMonitor()

def start_system_monitoring():
    """شروع مانیتورینگ سیستم"""
    system_monitor.start_monitoring(interval=30)  # هر ۳۰ ثانیه یکبار

def stop_system_monitoring():
    """توقف مانیتورینگ سیستم"""
    system_monitor.stop_monitoring()

def get_system_status():
    """دریافت وضعیت سیستم"""
    return system_monitor.get_system_health()

def generate_system_report():
    """تولید گزارش سیستم"""
    return system_monitor.generate_report()