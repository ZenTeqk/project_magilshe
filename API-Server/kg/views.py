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
from rest_framework.exceptions import APIException, ValidationError, NotFound
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated
from rest_framework import permissions, status
from cakery.file_upload_to_aws import put_image_to_s3

from cakery.check_instance import check_instance
from cakery.validators import validate_request

from cakery.common import custom_error_message, aws_domain_name

from kg import models as kg_model
from kg.serializers import kg_serializer
from unit import models as unit_model

from .models import Kg
from .serializers import KgSerializer, GetKgSerializer

logger = logging.getLogger('cakery')

class SubUnitView(APIView):

    def get(self, request):
        try:
            queryset = Kg.objects.all()
            serializer = GetKgSerializer(queryset, many=True)
            return Response({'data': serializer.data, 'message': "Success"}, status=status.HTTP_200_OK)
        
        except Exception as e:
            print(f"Error in GET Kg - {e}")
            return Response({'message': 'An error occurred while processing your request.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @transaction.atomic
    def post(self, request):
        data = validate_request(request, request.data)
        serializer = KgSerializer(data=data, context={'request': request})

        try:
            if serializer.is_valid(raise_exception=True):
                kg_instance = serializer.save(created_by=request.user)
                response_serializer = GetKgSerializer(kg_instance, context={'request': request})
                return Response({'data': response_serializer.data}, status=status.HTTP_201_CREATED)


        except ValidationError as e:
            errors = e.detail
            formatted_errors = [f"{key} - {', '.join(val)}" for key, val in errors.items()]
            return Response({"message": ', '.join(formatted_errors)}, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            print(f"Error in POST Kg - {e}")
            return Response({'message': 'An error occurred while processing your request.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


    @transaction.atomic
    def put(self, request, pk):
        try:
            kg_instance = Kg.objects.get(pk=pk)
        except Kg.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = KgSerializer(kg_instance, data=request.data, partial=True)
        try:
            if serializer.is_valid(raise_exception=True):
                serializer.save(updated_by=request.user, updated_on=timezone.now())
                response_serializer = GetKgSerializer(kg_instance, context={'request': request})
                return Response({'data':response_serializer.data}, status=status.HTTP_200_OK)
        except ValidationError as e:
            errors = e.detail
            formatted_errors = [f"{key}: {', '.join(val)}" for key, val in errors.items()]
            return Response({"message": ', '.join(formatted_errors)}, status=status.HTTP_400_BAD_REQUEST)


class KgListOperations(APIView):

    def get(self, request):
        kg_data = []

        try:
            KgObj = kg_model.Kg.objects.all()            
            kg_data = [kg_serializer(ht) for ht in KgObj]

        except Exception as e:
            kg_data = []
        
        return Response({'data' : kg_data})
    
    def post(self, request):
        try:
            with transaction.atomic():
                data = validate_request(request, request.data)

                kg_value = data['kg']
                description_value = data['description']
                unit_value = data.get('unit', None)

                db_param = {
                    "kg": kg_value,
                    "description": description_value
                }

                if unit_value:
                    db_param["unit"] = unit_model.unit.objects.get(id=int(unit_value))

                m_id_get = data.get('id', None)
                m_id = str(m_id_get) if m_id_get is not None else ''

                # Check for duplicates excluding the current ID
                if m_id and m_id.isdigit() and m_id != '0':
                    existing_entries = kg_model.Kg.objects.exclude(id=int(m_id))
                else:
                    existing_entries = kg_model.Kg.objects.all()

                if existing_entries.filter(kg=kg_value, unit=db_param.get("unit", None)).exists():
                    return Response({'message': 'Kg with this value, description, and unit already exists'}, status=400)

                if m_id and m_id.isdigit() and m_id != '0':
                    db_param['updated_by'] = request.user
                    db_param['updated_on'] = timezone.now()
                    kg_model.Kg.objects.filter(id=int(m_id)).update(**db_param)
                    kg = kg_model.Kg.objects.get(id=int(m_id))
                    response = kg_serializer(kg)
                    return Response({'message': 'Kg Updated Successfully', 'data': response})
                else:
                    db_param['created_by'] = request.user
                    db_param['created_on'] = timezone.now()
                    kg = kg_model.Kg.objects.create(**db_param)
                    response = kg_serializer(kg)
                    return Response({'message': 'Kg Created Successfully', 'data': response})

        except Exception as e:
            logger.exception(f"Create KG Error - ",e)
            print("Create Main Category Error - {}".format(e))
            raise APIException({'message': 'An error occurred during the operation.'})
