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

logger = logging.getLogger('cakery')

from occasion.models import Occasion
from occasion.serializers import occasion_serializer


class Occasions(APIView):
    def get(self, request):
        occasion_data = []
        try:
            print("")
            occasion_data = [occasion_serializer(ht) for ht in Occasion.objects.all()]
        except Exception as e:
            occasion_data = []
            logger.exception(f"Get Occasion error - {e}")

        return Response({'data' : occasion_data})


    def post(self, request):
        try:
            print("")
            data = validate_request(request, request.data)

            db_param = {
                "type" : data.get('type'),
                "date" : data.get('date'),
                "person_name" : data.get('person_name'),
                "person_phone" : data.get('person_phone'),
            }

            c_id = str(data['id'])

            if c_id and c_id.isdigit() and c_id != '0':
                db_param['updated_on'] = datetime.now()
                Occasion.objects.filter(id=int(c_id)).update(**db_param)
                occasion = Occasion.objects.get(id=int(c_id))
                response = occasion_serializer(occasion)
                return Response({'message' : 'Occassion Updated Successfully', 'data' : response})
            else:
                db_param['created_on'] = datetime.now()
                occasion = Occasion.objects.create(**db_param)
                response = occasion_serializer(occasion)
                return Response({'message' : 'Occassion Placed Successfully', 'data' : response})

        except Exception as e:
            logger.exception(f"Save Occasion Error - {e}")
            raise APIException({'message' : custom_error_message})