from django.shortcuts import render

# Create your views here.
import logging
import base64
import sys
from datetime import datetime, timedelta , time , date
from django.utils import timezone
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

from tag import models as tag_model
from tag.serializers import tag_serializer

class TagOperations(APIView):

    def get(self, request):
        tag_data = []
        try:
            TagObj = tag_model.Tag.objects.all()
            tag_data = [tag_serializer(ht) for ht in TagObj]

        except Exception as e:
            tag_data = []
        
        return Response({'data' : tag_data})
    
    def post(self, request):
        try:
            data = validate_request(request, request.data)

            db_param = {
                "tag" : data['tag'],
            }
            
            m_id_get = data.get('id', None)
            m_id = str(m_id_get) if m_id_get is not None else ''

            if m_id and m_id.isdigit() and m_id != '0':
                db_param['updated_by'] = request.user
                db_param['updated_on'] = datetime.now()
                tag_model.Tag.objects.filter(id=int(m_id)).update(**db_param)
                tag = tag_model.Tag.objects.get(id = int(m_id))
                response = tag_serializer(tag)
                return Response({'message' : 'Tag Updated Successfully','data' : response})
            else:
                db_param['created_by'] = request.user
                db_param['created_on'] = datetime.now()
                tag = tag_model.Tag.objects.create(**db_param)
                response = tag_serializer(tag)
                return Response({'message' : 'Tag Created Successfully','data' : response})


        except Exception as e:
            raise APIException({'message': 'An error occurred. Please try again later.'})