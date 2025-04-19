from django.shortcuts import render

# Create your views here.
import logging
import base64
import sys
from datetime import datetime, timedelta , time , date
from json import JSONEncoder
import json
import uuid

from django.conf import settings
from django.shortcuts import render , redirect
from django.views import View
from django.http import HttpResponse, JsonResponse
from django.contrib.auth.models import Group
from django.utils.decorators import method_decorator
from django.contrib import messages
from django.views.generic import View
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.db import transaction
from cakery.common import StrongRandomPasswordGenerator, generate_username


from django.shortcuts import render
from django.core.files.storage import FileSystemStorage


from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import APIException, NotFound
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated
from rest_framework import permissions, status

from cakery.file_upload_to_aws import put_image_to_s3
from cakery.validators import validate_request
from cakery.check_instance import check_instance
from cakery.common import custom_error_message

from customer import models as customer_model
# from common.utils import send_otp
from authentication.models import OTP
import requests

logger = logging.getLogger('cakery')

from authentication.token_generator import get_tokens_for_user
import random

import random
import requests
from .models import OTP
# import requests
# Create your views here.



class UserLogin(APIView):
    permission_classes = []
    authentication_classes = []

    @transaction.atomic
    def post(self, request):
        try:
            data = check_instance(request.data)
            username = data['username']
            password = data['password']

            try:
                userdetail = customer_model.Customer.objects.get(email=username)
                username = userdetail.username
            except customer_model.Customer.DoesNotExist:
                raise APIException('User not found')
            except Exception as e:
                logger.exception("Login Error - {}".format(e))
                raise APIException('Something went wrong. Please contact the administrator')

            user = authenticate(username=username, password=password)
            if user is not None:
                if user.is_active:
                    user.save()
                    login(request, user)
                    tokens = get_tokens_for_user(user)

                    return Response({'message': 'Logged in successfully', 'tokens': tokens})
                else:
                    raise APIException('User account is inactive')
            else:
                raise APIException('Incorrect password')

        except APIException as api_exception:
            raise APIException({'message': str(api_exception)})

        except Exception as e:
            logger.exception("Login Error - {}".format(e))
            raise APIException({'message': 'An unexpected error occurred. Please try again later.'})


class UserLogout(APIView):
    def post(self , request):
        try:

            data = validate_request(request, request.data)

            refresh_token = data['refresh_token']

            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except TokenError as e:
                logger.error('Invalid Refresh Token While Logout - {}'.format(refresh_token))

            logout(request) 
            return Response({'message' : "Logout Success"})
        except Exception as e:
            # Handle exceptions if necessary
            print("E === ",e)
            raise APIException({'message' : e})
            

class UserSignup(APIView):
    permission_classes = []
    authentication_classes = []
    def post(self, request):
        try:
            data = check_instance(request.data)
            email = data['email']
            if email:
                if(customer_model.Customer.objects.filter(email__iexact=data['email']).exists()):
                    raise APIException('Username Already Taken')
                else:
                    user = customer_model.Customer.objects.create_user(username = data['email'],password=data['password'])
                    user.first_name = data['name']
                    user.email = data['email']
                    user.phone = data['phone']
                    user.save()
            else:
                raise APIException('Invalid Username')
            return Response({'message' : 'Signedup Success'})

        except APIException as api_exception:
            raise APIException({'message': api_exception})

        except Exception as e:
            print("User Sign Up Error - {}".format(e))
            raise APIException({'message' : e})



class OTPRequestView(APIView):
    # Disable authentication and permissions for this endpoint
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        # Retrieve the phone number from the request
        try:
            import http.client

            phone_number = request.data.get('phone_number')           

            # Send OTP via MSG91
            conn = http.client.HTTPSConnection("control.msg91.com")
            payload = json.dumps({"Message": "Hello"})
            headers = {'Content-Type': "application/JSON"}

            endpoint = f"/api/v5/otp?otp_expiry=1&template_id={settings.MSG91_TEMPLATE_ID}&mobile=91{phone_number}&authkey={settings.MSG91_API_KEY}&realTimeResponse=1"
            conn.request("POST", endpoint, payload, headers)

            # Get response
            res = conn.getresponse()
            status_code = res.status
            response_data = res.read().decode("utf-8")

            # Check if HTTP request was successful
            if status_code != 200:
                raise APIException(f"HTTP Request failed with status code: {status_code}")

            # Parse the response body
            response_json = json.loads(response_data)
            if response_json.get("type") != "success":
                raise APIException(f"Failed to send OTP: {response_json.get('message', 'Unknown error')}")

            # Extract OTP (if returned in the response)
            otp = response_json.get("otp")
            if not otp:
                raise APIException("OTP not returned in response")

            # Save user and OTP to database
            user, _ = customer_model.Customer.objects.get_or_create(username=phone_number)
            OTP.objects.create(user=user, otp=otp)
            print("OTP sent and saved successfully!")

            # Construct MSG91 API details
            # api_url = "https://api.msg91.com/api/v5/otp"
            # headers = {
            #     "authkey": settings.MSG91_API_KEY,
            #     "Content-Type": "application/json",
            # }
            # payload = {
            #     "mobile": f"91{phone_number}",  # Add country code prefix
            #     "otp": otp,
            #     "template_id": "66c621ced6fc05662367bf25"
            # }
            

            # # Send OTP using MSG91 API
            # response = requests.post(api_url, headers=headers, json=payload)

            # # Log request and response for debugging
            # print(f"MSG91 Request: {payload}")
            # print(f"MSG91 Response: {response.json()}")

            # # Handle API response
            # if response.status_code == 200 and response.json().get("type") == "success":
            #     # Save OTP to the database
            #     user, _ = customer_model.Customer.objects.get_or_create(username=phone_number)
            #     OTP.objects.create(user=user, otp=otp)

            #     return Response({"message": "OTP sent successfully!"}, status=status.HTTP_200_OK)
            # else:
            #     # Handle failure from MSG91 API
            #     raise APIException("Failed To Send OTP")
        
        except APIException as api_exception:
            raise APIException({'message': api_exception})
        
        except Exception as e:
            # Handle unexpected errors
            print(f"Error in OTPRequestView: {str(e)}")
            logger.exception(f"Error in OTPRequestView: {str(e)}")
            raise APIException({'message' : e})



class OTPVerifyView(APIView):
    permission_classes = []
    authentication_classes = []
    def post(self, request):
        phone_number = request.data.get('phone_number')
        otp = request.data.get('otp')

        if not phone_number or not otp:
            raise APIException("Phone number and OTP are required")

        try:
            user = customer_model.Customer.objects.get(username=phone_number)
            otp_entry = OTP.objects.filter(user=user, otp=otp).last()

            if otp_entry and otp_entry.is_valid():
                otp_entry.delete()  # Invalidate OTP after use
                return Response({"message": "Login successful!"}, status=status.HTTP_200_OK)
            raise APIException("Invalid or expired OTP")

        
        except APIException as api_exception:
            raise APIException({'message': api_exception})


        except Exception as e:
            logger.exception(f"OTP Verify Error - {str(e)}")
            raise APIException({"message": "User not found"})




def send_otp_view(request):
    mobile_number = request.GET.get('mobile_number')

    # if mobile_number:
    #     otp = random.randint(100000, 999999)

    #     payload = {
    #         "template_id": "66c62370d6fc057a546bf012",
    #         "mobile": mobile_number,
    #         "authkey": settings.MSG91_API_KEY,
    #         "otp": otp,
    #         "realTimeResponse": "1"
    #     }

    #     headers = {
    #         'Content-Type': 'application/json'
    #     }

    #     try:
    #         # Make the POST request
    #         response = requests.post(
    #             "https://control.msg91.com/api/v5/otp",
    #             json=payload,
    #             headers=headers
    #         )

    #         if response.status_code == 200:
    #             return JsonResponse({'status': 'success', 'message': 'OTP sent successfully'})
    #         else:
    #             return JsonResponse({'status': 'error', 'message': response.json()})
    #     except requests.RequestException as e:
    #         return JsonResponse({'status': 'error', 'message': str(e)})

    # else:
    #     return JsonResponse({'status': 'error', 'message': 'Mobile number is required'})



def validate_otp_view(request):
    user_otp = request.GET.get('otp')
    saved_otp = request.session.get('otp')

    if user_otp and saved_otp:
        if user_otp == saved_otp:
            return JsonResponse({'status': 'success', 'message': 'OTP validated successfully'})
        else:
            return JsonResponse({'status': 'error', 'message': 'Invalid OTP'})
    else:
        return JsonResponse({'status': 'error', 'message': 'OTP is required'})

