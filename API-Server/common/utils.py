# import requests
import random

from django.conf import settings

# def send_otp(mobile_number):
#     otp = random.randint(100000, 999999)
#     template_id = "66c62370d6fc057a546bf012"

#     url = f'https://api.msg91.com/api/v5/otp?authkey={settings.MSG91_API_KEY}&template_id={template_id}&mobile={settings.MSG91_COUNTRY_CODE}{mobile_number}&OTP={otp}'

#     response = requests.get(url)

#     print("url", url)
#     print("response", response)
#     print("Response Content:", response.content)

#     if response.status_code == 200:
#         return otp
#     else:
#         return None
    
# def send_otp_sms(mobile_number):
#     otp = random.randint(100000, 999999)  # Generate a 6-digit OTP
#     message = f'Your OTP is {otp}. Please do not share it with anyone.'

#     # Using MSG91 SMS API for custom message content
#     url = "https://api.msg91.com/api/v2/sendsms"

#     payload = {
#         "sender": settings.MSG91_SENDER_ID,
#         "route": settings.MSG91_ROUTE,
#         "country": settings.MSG91_COUNTRY_CODE,
#         "sms": [
#             {
#                 "message": message,
#                 "to": [mobile_number]
#             }
#         ]
#     }

#     headers = {
#         'authkey': settings.MSG91_API_KEY,
#         'Content-Type': "application/json"
#     }

#     response = requests.post(url, json=payload, headers=headers)

#     # Check response status
#     if response.status_code == 200:
#         return otp
#     else:
#         return None
