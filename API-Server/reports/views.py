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
from django.db.models.functions import ExtractMonth, ExtractDay
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

logger = logging.getLogger('cakery')

from order.models import CakeOrder
from order.serializers import cake_order_serialier

from occasion.models import Occasion
from occasion.serializers import occasion_serializer

class GetOrderReport(APIView):
    def get(self, request):
        report_data = []
        try:
            
            if "from_date" in request.query_params and "to_date" in request.query_params:
                print("Query Params ....")
                from_date = request.query_params['from_date']
                to_date = request.query_params['to_date']
                report_data = [cake_order_serialier(ht) for ht in CakeOrder.objects.filter(order_time__date__gte=from_date,order_time__date__lte=to_date).all()]
            else:
                print("today ...")
                today = datetime.now().date()
                report_data = [cake_order_serialier(ht) for ht in CakeOrder.objects.filter(order_time__date=today).all()]
        except Exception as e:
            report_data = []
            logger.exception(f"Get Order Report Error - {e}")
        
        return Response({'data' : report_data})




class GetDeliveryPersonReport(APIView):
    def get(self, request):
        report_data = []
        try:
            print("")
            if "dp_id" in request.query_params:
                dp_id = request.query_params['dp_id']
                today = datetime.now().date()
                OrderObj = CakeOrder.objects.filter(delivery_partner=int(dp_id)).all()

                if "from_date" in request.query_params and "to_date" in request.query_params:
                    from_date = request.query_params['from_date']
                    to_date = request.query_params['to_date']
                    OrderObj = OrderObj.filter(order_time__date__gte=from_date, order_time__date__lte=to_date).all()
                else:
                    OrderObj = OrderObj.filter(order_time__date=today).all()

                report_data = [cake_order_serialier(ht) for ht in OrderObj]
                
        except Exception as e:
            report_data = []
            logger.exception(f"Get Order Report Error - {e}")

        return Response({'data' : report_data})



class GetOccasionReport(APIView):
    report_data = []
    def get(self, request):
        try:            

            if "from_date" in request.query_params and "to_date" in request.query_params:
                from_date = request.query_params['from_date']
                to_date = request.query_params['to_date']

                from_month = int(from_date.split("-")[1])
                from_day = int(from_date.split("-")[2])

                to_month = int(to_date.split("-")[1])
                to_day = int(to_date.split("-")[2])

                queryset = Occasion.objects.annotate(
                    month=ExtractMonth('date'),
                    day=ExtractDay('date')
                )

                # Create the filter conditions
                if from_month <= to_month:
                    # Range within the same year (e.g., from 12-01 to 12-31)
                    filtered_objects = queryset.filter(
                        Q(month__gt=from_month) | 
                        (Q(month=from_month) & Q(day__gte=from_day)),
                        Q(month__lt=to_month) | 
                        (Q(month=to_month) & Q(day__lte=to_day))
                    ).all()
                else:
                    # Range spanning across years (e.g., from 12-15 to 01-10)
                    filtered_objects = queryset.filter(
                        (Q(month__gt=from_month) | 
                        (Q(month=from_month) & Q(day__gte=from_day))) |
                        (Q(month__lt=to_month) | 
                        (Q(month=to_month) & Q(day__lte=to_day)))
                    ).all()   


                report_data = [occasion_serializer(ht) for ht in filtered_objects]  

            else:
                report_data = [occasion_serializer(ht) for ht in Occasion.objects.all()] 

        except Exception as e:
            report_data = []
            logger.exception(f"Get Occasion Report Error - {e}")

        return Response({'data' : report_data})