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

from delivery_person.models import DeliveryPerson
from delivery_person.serializers import delivery_person_serializer
from delivery_person.models import DeliveryPlatform, ExternalDeliveryPerson
from delivery_person.serializers import DeliveryStaffSerializer, DeliveryPlatformSerializer, ExternalDeliveryPersonSerializer
from rest_framework import viewsets
from rest_framework.decorators import action
from django.db.models import Count
from crm.models import CRMDelivery


logger = logging.getLogger('cakery')


class AddDeliveryPerson(APIView):

    def post(self, request):
        try:
            data = validate_request(request, request.data)

            db_param = {
                "name" : data['name'],
                "email" : data['email'],
                "phone" : data['phone'],
                "dob" : data['dob'],
                "address" : data['address']
            }
            
            m_id_get = data.get('id', None)
            m_id = str(m_id_get) if m_id_get is not None else ''

            if m_id and m_id.isdigit() and m_id != '0':
                db_param['updated_by'] = request.user
                db_param['updated_on'] = datetime.now()
                DeliveryPerson.objects.filter(id=int(m_id)).update(**db_param)
                dp = DeliveryPerson.objects.get(id = int(m_id))
                response = delivery_person_serializer(dp)
                return Response({'message' : 'Delivery Person Updated Successfully','data' : response})
            else:
                db_param['created_by'] = request.user
                db_param['created_on'] = datetime.now()
                dp = DeliveryPerson.objects.create(**db_param)
                response = delivery_person_serializer(dp)
                return Response({'message' : 'Delivery Person Created Successfully','data' : response})


        except Exception as e:
            print("Create Delivery Person Error - {}".format(e))
            raise APIException({'message' : custom_error_message})
        



class GetDeliveryPerson(APIView):
    def get(self, request):
        dp_data = []
        try:
            print("")
            dp_data = [delivery_person_serializer(ht) for ht in DeliveryPerson.objects.filter(status=True).all()]
        except Exception as e:
            dp_data = []
            logger.exception("Get Delivery Person Data Error - {}".format(e))

        return Response({'data' : dp_data})


def performance_payload(deliveries):
    total = deliveries.count()
    completed = deliveries.filter(delivery_status="Delivered Successfully").count()
    failed = deliveries.filter(delivery_status__in=("Delivery Failed", "Damaged During Delivery")).count()
    pending = deliveries.filter(delivery_status__in=("Pending", "Out for Delivery")).count()
    return {"total": total, "completed": completed, "failed": failed, "pending": pending,
            "completion_rate": round(completed * 100 / total, 1) if total else 0}


class DeliveryStaffViewSet(viewsets.ModelViewSet):
    queryset = DeliveryPerson.objects.all().order_by("name")
    serializer_class = DeliveryStaffSerializer
    def perform_create(self, serializer): serializer.save(created_by=self.request.user)
    def perform_update(self, serializer): serializer.save(updated_by=self.request.user)
    @action(detail=True, methods=["get"])
    def performance(self, request, pk=None):
        person = self.get_object(); deliveries = CRMDelivery.objects.filter(delivery_person=person).select_related("order")
        return Response({"person": self.get_serializer(person).data, "metrics": performance_payload(deliveries),
                         "deliveries": list(deliveries.values("id", "delivery_no", "order__order_no", "order__customer_name", "delivery_status", "delivery_type", "created_on", "porter_amount")[:100])})


class DeliveryPlatformViewSet(viewsets.ModelViewSet):
    queryset = DeliveryPlatform.objects.annotate(driver_count=Count("drivers")).order_by("name")
    serializer_class = DeliveryPlatformSerializer


class ExternalDeliveryPersonViewSet(viewsets.ModelViewSet):
    queryset = ExternalDeliveryPerson.objects.select_related("platform").all().order_by("name")
    serializer_class = ExternalDeliveryPersonSerializer
    def get_queryset(self):
        queryset = super().get_queryset(); platform = self.request.query_params.get("platform")
        return queryset.filter(platform_id=platform) if platform else queryset
    @action(detail=True, methods=["get"])
    def performance(self, request, pk=None):
        person = self.get_object(); deliveries = CRMDelivery.objects.filter(external_delivery_person=person).select_related("order")
        return Response({"person": self.get_serializer(person).data, "metrics": performance_payload(deliveries),
                         "deliveries": list(deliveries.values("id", "delivery_no", "order__order_no", "order__customer_name", "delivery_status", "delivery_type", "created_on", "porter_amount")[:100])})


    
