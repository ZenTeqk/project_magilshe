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
from cakery.uploads import validate_image_upload

from cakery.check_instance import check_instance
from cakery.validators import validate_request

from cakery.common import custom_error_message, aws_domain_name

from configuration.models import Configuration, TermsAndConditions, PrivacyPolicy

from configuration.serializers import configuration_serializer
from .serializers import ConfigurationSerializer, TermsAndConditionsSerializer, PrivacyPolicySerializer

logger = logging.getLogger('cakery')

class SaveConfiguration(APIView):
    def post(self, request):
        try:
            data = validate_request(request, request.data)
                        
            meta = data['meta']
            
            if isinstance(meta, str):
                meta = json.loads(meta)           


            db_param = {
                "name" : data['name'],
                "mobile" : data['mobile'],
                "email" : data['email'],
                "website" : data['website'],
                "gst_number" : data['gst_number'],
                "food_license_number" : data['food_license_number'],
                "company_address" : data['company_address'],
                "map_iframe_link" : data['map_iframe_link'],
                "description" : data['description'],
                "return_policy" : data['return_policy'],
                "greeting_text" : data['greeting_text'],
                "meta" : meta,
            }

            if "image" in data:
                image = data['image']
                if (image != None and image != "null"):
                    file_name = str(uuid.uuid4())
                    try:
                        ext = validate_image_upload(image)
                    except ValueError as error:
                        return Response({"image": str(error)}, status=status.HTTP_400_BAD_REQUEST)
                    if put_image_to_s3(image, "{}/logo/{}.{}".format(aws_domain_name, file_name, ext)):
                        db_param["image_name"] = file_name
                        db_param["image_ext"] = ext


            if(Configuration.objects.exists()):
                m_id = Configuration.objects.first().id
                db_param['updated_by'] = request.user
                db_param['updated_on'] = datetime.now()
                Configuration.objects.filter(id=int(m_id)).update(**db_param)
                configuration = Configuration.objects.get(id=int(m_id))
                response = configuration_serializer(configuration)
                return Response({'message' : 'Configuration Updated Successfully','data' : response})
               
            else:
                db_param['created_by'] = request.user
                db_param['created_on'] = datetime.now()
                configuration = Configuration.objects.create(**db_param)
                response = configuration_serializer(configuration)
                return Response({'message' : 'Configuration Created Successfully','data' : response})

        except Exception as e:
            logger.exception("Save Configuration Error - {}".format(e))
            raise APIException({'message' : custom_error_message})

class GetConfiguration(APIView):
    def get(self, request):
        config_data = None
        try:
            if Configuration.objects.exists():
                config_data = configuration_serializer(Configuration.objects.first())
            else:
                config_data = None
        except Exception as e:
            config_data = None
            logger.exception("Get Configuration Data Error - {}".format(e))
        
        return Response({'data' : config_data})
    
class ConfigurationSettings(APIView):

    permission_classes = []
    authentication_classes = []
    def get(self, request):
        config_data = None
        try:
            if Configuration.objects.exists():
                config_data = configuration_serializer(Configuration.objects.first())
            else:
                config_data = None
        except Exception as e:
            config_data = None
            logger.exception("Get Configuration Data Error - {}".format(e))
        
        return Response({'data' : config_data})
    
    def post(self, request):
        try:
            data = validate_request(request, request.data)

            db_param = {
                "name" : data['name'],
                "mobile" : data['mobile'],
                "email" : data['email'],
                "website" : data['website'],
                "gst_number" : data['gst_number'],
                "food_license_number" : data['food_license_number'],
                "company_address" : data['company_address'],
                "map_iframe_link" : data['map_iframe_link'],
                "description" : data['description'],
                "return_policy" : data['return_policy'],
                "greeting_text" : data['greeting_text'],
                "meta" : data['meta'],
            }

            if "image" in data:
                image = data['image']
                if (image != None and image != "null"):
                    file_name = str(uuid.uuid4())
                    try:
                        ext = validate_image_upload(image)
                    except ValueError as error:
                        return Response({"image": str(error)}, status=status.HTTP_400_BAD_REQUEST)
                    if put_image_to_s3(image, "{}/logo/{}.{}".format(aws_domain_name, file_name, ext)):
                        db_param["image_name"] = file_name
                        db_param["image_ext"] = ext


            if(Configuration.objects.exists()):
                m_id = Configuration.objects.first().id
                db_param['updated_by'] = request.user
                db_param['updated_on'] = datetime.now()
                Configuration.objects.filter(id=int(m_id)).update(**db_param)
                configuration = Configuration.objects.get(id=int(m_id))
                response = configuration_serializer(configuration)
                return Response({'message' : 'Configuration Updated Successfully','data' : response})
               
            else:
                db_param['created_by'] = request.user
                db_param['created_on'] = datetime.now()
                configuration = Configuration.objects.create(**db_param)
                response = configuration_serializer(configuration)
                return Response({'message' : 'Configuration Created Successfully','data' : response})

        except Exception as e:
            logger.exception("Save Configuration Error - {}".format(e))
            raise APIException({'message' : custom_error_message})

class ConfigurationView(APIView):
    def get(self, request):
        config = Configuration.objects.first()
        if config:
            serializer = ConfigurationSerializer(config)
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response({"detail": "Configuration not found"}, status=status.HTTP_404_NOT_FOUND)

    def put(self, request):
        data = request.data
        config = Configuration.objects.first()

        if config is None:
            config = Configuration.objects.create()

        db_param = {}
        if "image" in data:
            image = data['image']
            if (image != None and image != "null"):
                file_name = str(uuid.uuid4())
                try:
                    ext = validate_image_upload(image)
                except ValueError as error:
                    return Response({"image": str(error)}, status=status.HTTP_400_BAD_REQUEST)
                if put_image_to_s3(image, "{}/logo/{}.{}".format(aws_domain_name, file_name, ext)):
                    db_param["image_name"] = file_name
                    db_param["image_ext"] = ext

        serializer = ConfigurationSerializer(config, data={**data, **db_param}, partial=True)
        
        if serializer.is_valid():
            serializer.save(updated_by=request.user)
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UpdateTermsAndConditions(APIView):

    permission_classes = []
    authentication_classes = []
    def get(self, request):
        try:
            terms = TermsAndConditions.objects.latest('updated_at')
            serializer = TermsAndConditionsSerializer(terms)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except TermsAndConditions.DoesNotExist:
            return Response({"error": "Terms and Conditions not found."}, status=status.HTTP_404_NOT_FOUND)

    def put(self, request):
        try:
            data = validate_request(request, request.data)
            terms = TermsAndConditions.objects.latest('updated_at')
            serializer = TermsAndConditionsSerializer(terms, data=data)
        except TermsAndConditions.DoesNotExist:
            serializer = TermsAndConditionsSerializer(data=data)

        if serializer.is_valid():
            with transaction.atomic():
                serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class UpdatePrivacyPolicy(APIView):

    permission_classes = []
    authentication_classes = []
    def get(self, request):
        try:
            terms = PrivacyPolicy.objects.latest('updated_at')
            serializer = PrivacyPolicySerializer(terms)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except PrivacyPolicy.DoesNotExist:
            return Response({"error": "Terms and Conditions not found."}, status=status.HTTP_404_NOT_FOUND)

    def put(self, request):
        try:
            data = validate_request(request, request.data)
            terms = PrivacyPolicy.objects.latest('updated_at')
            serializer = PrivacyPolicySerializer(terms, data=data)
        except PrivacyPolicy.DoesNotExist:
            serializer = PrivacyPolicySerializer(data=data)

        if serializer.is_valid():
            with transaction.atomic():
                serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


