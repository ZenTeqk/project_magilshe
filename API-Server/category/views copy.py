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

from category import models as category_model
from category.serializers import main_category_serializer, sub_category_serializer

logger = logging.getLogger("cakery")


class MainCategoryOperations(APIView):

    def get(self, request):
        main_category_data = []

        try:
            MainCategoryObj = category_model.MainCategory.objects.all()
            main_category_data = [main_category_serializer(ht) for ht in MainCategoryObj]

        except Exception as e:
            print("Get Main Category Data Error - {}".format(e))
            main_category_data = []
        
        return Response({'data' : main_category_data})
    
    def post(self, request):
        try:
            data = validate_request(request, request.data)

            db_param = {
                "name" : data['name'],
                "description" : data['description']
            }

            if "image" in data:
                image = data['image']
                if (image != None and image != "null"):
                    print("Image  = ",image," Image Name = ",image.name)
                    file_name = str(uuid.uuid4())
                    ext = image.name.split('.')[-1]
                    if put_image_to_s3(image, "{}/category/main/image/{}.{}".format(aws_domain_name, file_name, ext)):
                        db_param["image_name"] = file_name
                        db_param["image_ext"] = ext

            m_id = data.get('id', None)

            if m_id and m_id.isdigit() and m_id != '0':
                db_param['updated_by'] = request.user
                db_param['updated_on'] = datetime.now()
                category_model.MainCategory.objects.filter(id=int(m_id)).update(**db_param)
                m_category = category_model.MainCategory.objects.get(id = int(m_id))
                response = main_category_serializer(m_category)
                return Response({'message' : 'Category Updated Successfully','data' : response})
            else:
                db_param['created_by'] = request.user
                db_param['created_on'] = datetime.now()
                m_category = category_model.MainCategory.objects.create(**db_param)
                response = main_category_serializer(m_category)
                return Response({'message' : 'Category Created Successfully','data' : response})


        except Exception as e:
            raise APIException({'message' : custom_error_message})



class GetSubCategoryData(APIView):
    permission_classes = []
    authentication_classes = []
    def get(self, request):
        sub_category_data = []
        try:            
            SubCategoryObj = category_model.SubCategory.objects.all()
            sub_category_data = [sub_category_serializer(ht) for ht in SubCategoryObj]

        except Exception as e:
            print("Get Sub Category Data Error - {}".format(e))
            sub_category_data = []

        
        return Response({'data' : sub_category_data})


class SubCategoryOperations(APIView):
    def get(self, request):
        sub_category_data = []
        try:            
            SubCategoryObj = category_model.SubCategory.objects.all()
            sub_category_data = [sub_category_serializer(ht) for ht in SubCategoryObj]

        except Exception as e:
            print("Get Sub Category Data Error - {}".format(e))
            sub_category_data = []
        
        return Response({'data' : sub_category_data})
    
    def post(self, request):
        try:
            print(f"Req User = {request.user}")
            data = validate_request(request, request.data)
            print("DATA = ",data)

            db_param = {
                "name" : data['name'],
                "description" : data['description'],
                "main_category" : category_model.MainCategory.objects.get(id = int(data['main_category']))
            }

            if "image" in data:
                image = data['image']
                if (image != None and image != "null"):
                    print("Image  = ",image," Image Name = ",image.name)
                    file_name = str(uuid.uuid4())
                    ext = image.name.split('.')[-1]
                    if put_image_to_s3(image, "{}/category/sub/image/{}.{}".format(aws_domain_name, file_name, ext)):
                        db_param["image_name"] = file_name
                        db_param["image_ext"] = ext

            s_id = data.get('id', None)

            if s_id and s_id.isdigit() and s_id != '0':
                db_param['updated_by'] = request.user
                db_param['updated_on'] = datetime.now()
                category_model.SubCategory.objects.filter(id=int(s_id)).update(**db_param)
                s_category = category_model.SubCategory.objects.get(id = int(s_id))
                response = sub_category_serializer(s_category)
                return Response({'message' : 'Category Updated Successfully','data' : response})
            else:
                db_param['created_by'] = request.user
                db_param['created_on'] = datetime.now()
                s_category = category_model.SubCategory.objects.create(**db_param)
                response = sub_category_serializer(s_category)
                return Response({'message' : 'Category Created Successfully','data' : response})


        except Exception as e:
            print("Create Sub Category Error - {}".format(e))
            logger.exception("Create Sub Category Error - {}".format(e))
            raise APIException({'message' : custom_error_message})