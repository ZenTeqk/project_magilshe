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
from customer.serializers import customer_serializer
# from common.utils import send_otp
from authentication.models import OTP
import requests

logger = logging.getLogger('cakery')

from authentication.token_generator import get_tokens_for_user

import http.client
import re
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
            print("SIGNUP")
            data = check_instance(request.data)
            phone = data['phone']
            email = data['email']
            if phone:
                if(customer_model.Customer.objects.filter(phone__iexact=phone).exists()):
                    raise APIException('Phone Number Already Taken')
                elif(customer_model.Customer.objects.filter(email__iexact=email).exists()):
                    raise APIException('Email Already Taken')
                else:
                    if "password" in data:
                        password = data['password']
                    else:
                        password = None
                    user = customer_model.Customer.objects.create_user(username = phone,password=password)
                    user.first_name = data['name']
                    user.email = email
                    user.phone = phone
                    user.save()
            else:
                raise APIException('Invalid Username')
            return Response({'message' : 'Signedup Success'})

        except APIException as api_exception:
            raise APIException({'message': api_exception})

        except Exception as e:
            print("User Sign Up Error - {}".format(e))
            logger.exception(f"Signup Error - {str(e)}")
            raise APIException({'message' : e})



class OTPRequestView(APIView):
    # Disable authentication and permissions for this endpoint
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        # Retrieve the phone number from the request
        try:
            with transaction.atomic():
                # customer_model.Customer.objects.create_user(username="8973332888",password="test@123",email="test@test.com")
                data = check_instance(request.data)
                username = data['username']

                # Regex for email
                email_regex = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
                phone_regex = r'^\d{10}$'

                if re.match(email_regex, username):
                    try:
                        print("MAIL MAIL MAIL")
                        userdetail = customer_model.Customer.objects.get(email=username)
                        username = userdetail.username 
                        if customer_model.Customer.objects.filter(username = username).exists():
                            user = customer_model.Customer.objects.get(username = username)
                            if user.is_active:
                                user.save()
                                login(request, user)
                                tokens = get_tokens_for_user(user)

                                return Response({'message': 'Logged in successfully','login_redirect' : True , 'tokens': tokens})
                            else:
                                raise APIException('User account is inactive')
                        else:
                            raise APIException('Not a Valid User')
                    except customer_model.Customer.DoesNotExist:
                        raise APIException("Invalid Username")
                elif re.match(phone_regex, username):
                    try:
                        print("PHONE PHONE PHONE")
                        userdetail = customer_model.Customer.objects.get(username=username)
                        if customer_model.Customer.objects.filter(username = username).exists():
                            if "skip_otp" in data and data['skip_otp'] == True:
                                password = data['password']
                                user = authenticate(username=username, password=password)
                                if user is not None:
                                    if user.is_active:
                                        login(request, user)
                                        tokens = get_tokens_for_user(user)
                                        return Response({'message': 'Logged in successfully','login_redirect' : True , 'tokens': tokens})
                                    else:
                                        raise APIException('User account is inactive')
                                else:
                                    raise APIException('Invalid Password')
                            else:
                                user = customer_model.Customer.objects.get(username = username)
                                if user.is_active:
                                    otp = random.randint(100000, 999999)                              

                                    # Send OTP via MSG91
                                    conn = http.client.HTTPSConnection("control.msg91.com")
                                    payload = json.dumps({"OTP": otp})
                                    headers = {'Content-Type': "application/JSON"}

                                    endpoint = f"/api/v5/otp?otp_expiry=1&template_id={settings.MSG91_TEMPLATE_ID}&mobile=91{username}&authkey={settings.MSG91_API_KEY}&realTimeResponse=1"
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


                                    # Save user and OTP to database
                                    
                                    OTP.objects.create(user=user, otp=otp)
                                    print("OTP sent and saved successfully!")

                                    return Response({"message": "OTP sent successfully!",'login_redirect' : False }, status=200)
                                else:
                                    raise APIException('User account is inactive')
                        else:
                            raise APIException('Invalid Username')
                    except customer_model.Customer.DoesNotExist:
                        raise APIException("Invalid Username")
                else:
                    raise APIException("Invalid Username")
            
        
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
        username = request.data.get('username')
        otp = request.data.get('otp')

        if not username or not otp:
            raise APIException("Username and OTP are required")

        try:
            try:
                user = customer_model.Customer.objects.get(username=username)
                otp_entry = OTP.objects.filter(user=user, otp=otp).last()

                if otp_entry and otp_entry.is_valid():
                    otp_entry.delete()  # Invalidate OTP after use
                    user.save()
                    login(request, user)
                    tokens = get_tokens_for_user(user)

                    return Response({'message': 'Logged in successfully','login_redirect' : True , 'tokens': tokens})
                raise APIException("Invalid or expired OTP")
            except customer_model.Customer.DoesNotExist:
                raise APIException("Invalid Username")

        
        except APIException as api_exception:
            raise APIException({'message': api_exception})


        except Exception as e:
            logger.exception(f"OTP Verify Error - {str(e)}")
            raise APIException({"message": str(e)})




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
    


class CreateManualCustomer(APIView):
    def post(self, request):
        try:
            print("Create Manual Customer API")
            data = validate_request(request, request.data)

            if "customer_id" in data:
                user = customer_model.Customer.objects.get(id=int(data['customer_id']))
                if "address" in data:
                    ad_db_param = {
                        "customer" : user,
                        'title' : "Home",
                        'address' : data['address'],
                        'city' : data['city'],
                        'pincode' : data['pincode'],
                        'is_primary' : True
                    }

                    customer_model.CustomerAddress.objects.create(**ad_db_param)

                    response = customer_serializer(user)

                    return Response({'message' : 'Customer Updated Successfully', 'data' : response})
                else:
                    raise APIException('Address Required')

            else:            
                if "phone" in data:
                    phone = data['phone']
                    email = data['email']
                    if(customer_model.Customer.objects.filter(phone__iexact=data['phone']).exists()):
                        raise APIException('Phone Already Taken')
                    elif(customer_model.Customer.objects.filter(email__iexact=email).exists()):
                        raise APIException('Email Already Taken')
                    else:
                        user = customer_model.Customer.objects.create_user(username = data['phone'],password="Welcome@321")
                        user.first_name = data['name']
                        user.email = data['email']
                        user.phone = phone
                        user.save()

                        if "address" in data:
                            ad_db_param = {
                                "customer" : user,
                                'title' : "Home",
                                'address' : data['address'],
                                'city' : data['city'],
                                'pincode' : data['pincode'],
                                'is_primary' : True
                            }


                            customer_model.CustomerAddress.objects.create(**ad_db_param)



                        response = customer_serializer(user)

                        return Response({'message' : 'Customer Created Successfully', 'data' : response})

                else:
                    raise APIException('Phone Number Required')

        except APIException as api_exception:
            raise APIException({'message': api_exception})

        except Exception as e:
            logger.exception(f"Create Manual Customer Error - {e}")
            raise APIException({'message' : custom_error_message})
