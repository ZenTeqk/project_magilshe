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
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated
from rest_framework import permissions, status

from cakery.file_upload_to_aws import put_image_to_s3

from cakery.check_instance import check_instance
from cakery.validators import validate_request

from cakery.common import custom_error_message, aws_domain_name
from customer import models as customer_model

from customer.serializers import customer_serializer, customer_address_serializer, profile_serializer

logger = logging.getLogger('cakery')


class SaveCustomerAddress(APIView):
    def post(self, request):
        try:
            print("")
            data = validate_request(request, request.data)

            address = data['address']

            if(address == None or address == ""):
                raise APIException('Address is Required')
            else:
                db_param = {
                    'customer' : customer_model.Customer.objects.get(id=request.user.id),
                    'title' : data['title'],
                    'address' : address,
                    'city' : data['city'],
                    'pincode' : data['pincode'],
                    'is_primary' : data['is_primary']
                }

                a_id = str(data['id'])

                if a_id and a_id.isdigit() and a_id != '0':
                    db_param['updated_by'] = request.user
                    db_param['updated_on'] = datetime.now()
                    customer_model.CustomerAddress.objects.filter(id=int(a_id)).update(**db_param)
                    ca = customer_model.CustomerAddress.objects.get(id=int(a_id))
                    response = customer_address_serializer(ca)
                    return Response({'message' : 'Address Updated Successfully','data' : response})
                else:
                    db_param['created_by'] = request.user
                    db_param['created_on'] = datetime.now()
                    ca = customer_model.CustomerAddress.objects.create(**db_param)
                    response = customer_address_serializer(ca)
                    return Response({'message' : 'Address Created Successfully','data' : response})

        except APIException as api_exception:
            raise APIException({'message': api_exception})

        except Exception as e:
            print("Save Customer Address Error - {}".format(e))
            logger.exception("Save Customer Address Error - {}".format(e))
            raise APIException({'message' : custom_error_message})


class GetAllCustomerData(APIView):
    def get(self, request):
        customer_data = []
        try:
            customer_data = [customer_serializer(ht) for ht in customer_model.Customer.objects.all()]
        except Exception as e:
            customer_data = []
        
        return Response({'data' : customer_data})


class GetMyProfile(APIView):
    def get(self, request):
        customer_data = {}
        try:
            customer_data = profile_serializer(customer_model.Customer.objects.get(id=request.user.id), request.user.id)
        except Exception as e:
            customer_data = {}
        
        return Response({'data' : customer_data})
    
class UpdateProfile(APIView):
    def post(self, request):
        try:
            
            data = validate_request(request, request.data)

            db_param = {
                "first_name" : data['name'],
            }

            if "image" in data:
                image = data['image']
                if (image != None and image != "null"):
                    file_name = str(uuid.uuid4())
                    ext = image.name.split('.')[-1]
                    if put_image_to_s3(image, "{}/customer/profile/{}.{}".format(aws_domain_name, file_name, ext)):
                        db_param["profile_picture_name"] = file_name
                        db_param["profile_picture_ext"] = ext

            s_id = data.get('id', None)

            if s_id and s_id.isdigit() and s_id != '0':
                customer_model.Customer.objects.filter(id=int(s_id)).update(**db_param)
                c_profile = customer_model.Customer.objects.get(id = int(s_id))
                response = profile_serializer(c_profile, request.user.id)
                return Response({'message' : 'Profile Updated Successfully','data' : response})
            else:                
                raise APIException({'message': "Unable to update"})
         
        
        except APIException as api_exception:
            logger.error("Profile Updated Error - {}".format(api_exception))
            raise APIException({'message': "Unable to update"})
        
        except Exception as e:
            logger.exception("Profile Updated Error - {}".format(e))
            raise APIException({'message' : "Unable to update"})
        
    
class GetCustomerAddressList(APIView):
    def get(self, request):
        address_data = {}
        try:
            address_data = [customer_address_serializer(ht) for ht in customer_model.CustomerAddress.objects.filter(customer=int(request.user.id)).all()]
        except Exception as e:
            address_data = {}
        
        return Response({'data' : address_data})



class GetMyAccess(APIView):
    """
    Minimal stand-in for a full RBAC system: every staff/superuser gets
    is_super_admin=True (unrestricted access), matching the old Admin app's
    flat "any staff can do anything" model. No Role/Permission tables exist
    yet -- role/permissions/permission_details are left empty until a real
    RBAC system is built.
    """
    def get(self, request):
        user = request.user
        name = (f"{user.first_name} {user.last_name}".strip() or user.username)
        return Response({
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "name": name,
            "role": None,
            "is_super_admin": bool(user.is_staff or user.is_superuser),
            "permissions": [],
            "permission_details": [],
        })




class GetCustomerFromPhone(APIView):
    def post(self, request):
        try:
            data = validate_request(request, request.data)
            phone = data['phone']

            if phone:

                if(customer_model.Customer.objects.filter(phone__iexact=phone).exists()):
                    customer = customer_model.Customer.objects.filter(phone__iexact=phone).last()
                    user = {
                        "id" : customer.id,
                        "name" : customer.first_name,
                        "phone" : customer.phone,
                        "email" : customer.email
                    }

                    if(customer_model.CustomerAddress.objects.filter(customer=int(customer.id)).exists()):
                        address_details = [customer_address_serializer(ht) for ht in customer_model.CustomerAddress.objects.filter(customer=int(customer.id)).all()]
                    else:
                        address_details = None
                    user['address_details'] = address_details
                else:
                    user = None
                
                return Response({'data' : user})


            else:
                raise APIException('Invalid Phone Number')

        except APIException as api_exception:
            logger.error("Get Customer From Phone Error - {}".format(api_exception))
            raise APIException({'message': "Unable to Get"})
        
        except Exception as e:
            logger.exception("Get Customer From Phone Error - {}".format(e))
            raise APIException({'message' : "Unable to Get"})
    

