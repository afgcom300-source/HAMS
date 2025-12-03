import requests
import hashlib
import uuid
from datetime import datetime

class PaymentGateway:
    def __init__(self, merchant_id, api_key):
        self.merchant_id = merchant_id
        self.api_key = api_key

class ZarinPalGateway(PaymentGateway):
    def __init__(self, merchant_id, api_key, sandbox=False):
        super().__init__(merchant_id, api_key)
        self.base_url = "https://sandbox.zarinpal.com/pg/v4.1" if sandbox else "https://api.zarinpal.com/pg/v4.1"
        self.payment_url = "https://sandbox.zarinpal.com/pg/StartPay/" if sandbox else "https://www.zarinpal.com/pg/StartPay/"
    
    def request_payment(self, amount, description, callback_url, mobile=None, email=None):
        """درخواست پرداخت از زرین‌پال"""
        url = f"{self.base_url}/Json/request.json"
        
        data = {
            "merchant_id": self.merchant_id,
            "amount": amount,
            "description": description,
            "callback_url": callback_url
        }
        
        if mobile:
            data["mobile"] = mobile
        if email:
            data["email"] = email
        
        try:
            response = requests.post(url, json=data, timeout=10)
            result = response.json()
            
            if result["data"]["code"] == 100:
                authority = result["data"]["authority"]
                payment_url = f"{self.payment_url}{authority}"
                return {
                    "success": True,
                    "authority": authority,
                    "payment_url": payment_url,
                    "message": "درخواست پرداخت با موفقیت ایجاد شد"
                }
            else:
                return {
                    "success": False,
                    "error_code": result["data"]["code"],
                    "message": result["errors"]["message"]
                }
        except Exception as e:
            return {
                "success": False,
                "message": f"خطا در اتصال به زرین‌پال: {str(e)}"
            }
    
    def verify_payment(self, authority, amount):
        """تایید پرداخت از زرین‌پال"""
        url = f"{self.base_url}/Json/verify.json"
        
        data = {
            "merchant_id": self.merchant_id,
            "authority": authority,
            "amount": amount
        }
        
        try:
            response = requests.post(url, json=data, timeout=10)
            result = response.json()
            
            if result["data"]["code"] == 100:
                return {
                    "success": True,
                    "ref_id": result["data"]["ref_id"],
                    "message": "پرداخت با موفقیت تایید شد"
                }
            elif result["data"]["code"] == 101:
                return {
                    "success": False,
                    "message": "پرداخت قبلا تایید شده است"
                }
            else:
                return {
                    "success": False,
                    "error_code": result["data"]["code"],
                    "message": result["errors"]["message"]
                }
        except Exception as e:
            return {
                "success": False,
                "message": f"خطا در تایید پرداخت: {str(e)}"
            }

class SamanGateway(PaymentGateway):
    def __init__(self, merchant_id, api_key):
        super().__init__(merchant_id, api_key)
        self.base_url = "https://sep.shaparak.ir"
    
    def request_payment(self, amount, description, callback_url, **kwargs):
        """درخواست پرداخت از درگاه سامان"""
        # پیاده‌سازی ساده برای نمایش
        return {
            "success": True,
            "token": str(uuid.uuid4()),
            "payment_url": f"{self.base_url}/payment?token={str(uuid.uuid4())}",
            "message": "درخواست پرداخت ایجاد شد"
        }
    
    def verify_payment(self, token, amount):
        """تایید پرداخت از درگاه سامان"""
        # پیاده‌سازی ساده برای نمایش
        return {
            "success": True,
            "ref_id": str(uuid.uuid4()),
            "message": "پرداخت تایید شد"
        }

# کلاس مدیریت درگاه‌های پرداخت
class PaymentManager:
    def __init__(self):
        self.gateways = {}
    
    def register_gateway(self, name, gateway_instance):
        """ثبت درگاه پرداخت"""
        self.gateways[name] = gateway_instance
    
    def get_gateway(self, name):
        """دریافت درگاه پرداخت"""
        return self.gateways.get(name)
    
    def process_payment(self, gateway_name, amount, description, callback_url, **kwargs):
        """پردازش پرداخت"""
        gateway = self.get_gateway(gateway_name)
        if not gateway:
            return {"success": False, "message": "درگاه پرداخت یافت نشد"}
        
        return gateway.request_payment(amount, description, callback_url, **kwargs)
    
    def verify_payment(self, gateway_name, **kwargs):
        """تایید پرداخت"""
        gateway = self.get_gateway(gateway_name)
        if not gateway:
            return {"success": False, "message": "درگاه پرداخت یافت نشد"}
        
        return gateway.verify_payment(**kwargs)

# ایجاد نمونه مدیریت پرداخت
payment_manager = PaymentManager()