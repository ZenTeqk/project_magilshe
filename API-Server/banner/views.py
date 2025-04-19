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
from django.db.models import Q


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

from banner.models import Banner
from banner.serializers import banner_serializer

logger = logging.getLogger('cakery')

class BannerApiView(APIView):
    def get(self, request):
        data = []
        try:
            data = [banner_serializer(banner) for banner in Banner.objects.filter(status=True).all()]
        except Exception as e:
            data = []
            logger.exception("Get Banner Data Error - {}".format(e))
        return Response({'data' : data})


    def post(self, request):
        try:
            data = validate_request(request, request.data)
            
            if "status" in data:
                status = True if data['status'] == 'true' else False
            else:
                status = True

            db_param = {
                "main_text" : data['main_text'],
                "sub_text" : data['sub_text'],
                "status" : status
            }
            
            if "image" in data:
                image = data['image']
                if (image != None and image != "null"):
                    file_name = str(uuid.uuid4())
                    ext = image.name.split('.')[-1]
                    if put_image_to_s3(image, "{}/banner/{}.{}".format(aws_domain_name, file_name, ext)):
                        db_param["image_name"] = file_name
                        db_param["image_ext"] = ext
            
            b_id = data.get('id', "0")
            
            if b_id and b_id.isdigit() and b_id != '0':
                db_param['updated_by'] = request.user
                db_param['updated_on'] = datetime.now()
                Banner.objects.filter(id=int(b_id)).update(**db_param)
                banner = Banner.objects.get(id = int(b_id))
                response = banner_serializer(banner)
                return Response({'message' : 'Banner Updated Successfully!', 'data' : response})
            else:
                db_param['created_by'] = request.user
                db_param['created_on'] = datetime.now()
                banner = Banner.objects.create(**db_param)
                response = banner_serializer(banner)
                return Response({'message' : 'Banner Created Successfully!', 'data' : response})
            
        except Exception as e:
            logger.exception("Post Banner Data Error - {}".format(e))
            raise APIException({'message' : custom_error_message})
        



class GetBannerData(APIView):
    permission_classes = []
    authentication_classes = []
    def get(self, request):
        data = []
        try:
            data = [banner_serializer(banner) for banner in Banner.objects.filter(status=True).all()]
        except Exception as e:
            data = []
            logger.exception("Get Banner Data Error - {}".format(e))
        return Response({'data' : data})