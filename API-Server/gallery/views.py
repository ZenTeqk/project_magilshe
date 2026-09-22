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

from gallery.models import Gallery as GalleryModel

from gallery.serializers import gallery_serializer


class AddGalleryImages(APIView):
    @transaction.atomic
    def post(self, request):
        try:
            # data = validate_request(request, request.data)
            if not request.user:
                raise APIException('You Are Not Authorized')

            image_files = request.FILES.getlist('images')
            
            if not image_files:
                raise APIException('No images provided')
            
            galleryList = []
            for file in image_files:
                image = file

                if (image != None and image != "null"):
                    file_name = str(uuid.uuid4())
                    try:
                        ext = validate_image_upload(image)
                    except ValueError as error:
                        return Response({"message": str(error)}, status=400)

                    if put_image_to_s3(image, "{}/gallery/{}.{}".format(aws_domain_name, file_name, ext)):
                        ck_db_param = {
                            "image_name" : file_name,
                            "image_ext" : ext,
                            "description": ""
                        }

                        ck_db_param['created_by'] = request.user
                        ck_db_param['created_on'] = datetime.now()
                        galleryitem = GalleryModel.objects.create(**ck_db_param)
                        galleryList.append(galleryitem)

            response = [gallery_serializer(ht) for ht in galleryList]

            return Response({'message' : 'Gallery images Added Successfully!', 'data' : response})
    
        
        except APIException as api_exception:
            raise api_exception
        
        except Exception as e:
            raise APIException({'message' : custom_error_message})
        
class DeleteGalleryImage(APIView):
    @transaction.atomic
    def delete(self, request, id):
        try:
            imageId = id
            GalleryModel.objects.filter(id=int(imageId)).delete()
            return Response({'message' : 'Gallery image Deleted Successfully!'})    
        except Exception as e:
            raise APIException({'message' : custom_error_message})
        
class GetGalleryImages(APIView):
    permission_classes = []
    authentication_classes = []
    def get(self, request):
        gallery_data = []
        try:            
            GalleryObj = GalleryModel.objects.all()
            response = [gallery_serializer(ht) for ht in GalleryObj]
            gallery_data = response            
        except Exception as e:
            gallery_data = []
            print("Get Gallery Images Error - {}".format(e))
        
        return Response({'data' : gallery_data})
