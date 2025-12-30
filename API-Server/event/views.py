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

from event.models import Event, EventOrder, EventOrderItems
from event.serializers import event_serializer, event_order_serializer

from cake.models import CakePrice

logger = logging.getLogger('cakery')

class SaveEvent(APIView):
    def post(self, request):
        try:
            with transaction.atomic():
                data = validate_request(request, request.data)
                
                if "status" in data:
                    status = True if data['status'] == 'true' else False
                else:
                    status = True

                db_param = {
                    "name" : data['name'],
                    "place" : data['place'],
                    "start" : data['start'],
                    "end" : data['end'],
                    "description" : data['description'],
                    "status" : status
                }

                cake_id_list = data['cake_id_list']

                if isinstance(data['cake_id_list'], list):
                    cake_id_list = data['cake_id_list']
                elif isinstance(data['cake_id_list'], str) and data['cake_id_list'] != "":
                    cake_id_list = [int(item) for item in (data['cake_id_list']).split(",")]
                else:
                    cake_id_list = []

                db_param['cake_id_list'] = cake_id_list

                print(f"DB PAram - {db_param}")
                
                if "image" in data:
                    image = data['image']
                    if (image != None and image != "null"):
                        file_name = str(uuid.uuid4())
                        ext = image.name.split('.')[-1]
                        if put_image_to_s3(image, "{}/event/{}.{}".format(aws_domain_name, file_name, ext)):
                            db_param["image_name"] = file_name
                            db_param["image_ext"] = ext
                
                b_id = data.get('id', "0")
                
                if b_id and b_id.isdigit() and b_id != '0':
                    db_param['updated_by'] = request.user
                    db_param['updated_on'] = datetime.now()
                    Event.objects.filter(id=int(b_id)).update(**db_param)
                    event = Event.objects.get(id = int(b_id))
                    response = event_serializer(event)
                    return Response({'message' : 'Event Updated Successfully!', 'data' : response})
                else:
                    db_param['created_by'] = request.user
                    db_param['created_on'] = datetime.now()
                    event = Event.objects.create(**db_param)
                    response = event_serializer(event)
                    return Response({'message' : 'Event Created Successfully!', 'data' : response})
            
        except Exception as e:
            logger.exception("Post Event Data Error - {}".format(e))
            raise APIException({'message' : custom_error_message})
        



class GetEventData(APIView):
    permission_classes = []
    authentication_classes = []
    def get(self, request):
        data = []
        try:
            data = [event_serializer(e) for e in Event.objects.filter(status=True).all()]
        except Exception as e:
            data = []
            logger.exception("Get Event Data Error - {}".format(e))
        return Response({'data' : data})
    



class GetIndividualEvent(APIView):
    permission_classes = []
    authentication_classes = []
    def get(self, request, id):
        data = None
        try:
            if id:
                event = Event.objects.filter(id=id, status=True).first()
                if event:
                    data = event_serializer(event)
        except Exception as e:
            data = None
            logger.exception("Get Event Data Error - {}".format(e))
        return Response({'data' : data})
    





class SaveEventOrder(APIView):
    permission_classes = []
    authentication_classes = []
    def post(self, request):
        try:
            with transaction.atomic():
                data = check_instance(request.data)

                cake_price_details = data.get('cake_price_details', [])

                print(f"Cake Price Details = {cake_price_details}")

                if(len(cake_price_details) < 1):
                    raise Exception('Need Atleast One Cake Price')

                event_order_db_param = {
                    "name" : data['name'],
                    "phone" : data['phone'],
                    "email" : data['email'],
                    "address" : data['address'],
                    "notes" : data['notes'],
                    "total_amount" : data['total_amount'],
                    "ordered_time" : datetime.now()
                }

                print(f"Event DB Param - {event_order_db_param}")

                event_order = EventOrder.objects.create(**event_order_db_param)

                for cpd in cake_price_details:
                    cpd_db_param = {
                        "event_order" : event_order,
                        "qty" : cpd['qty'],
                        "cake_price" : CakePrice.objects.get(id = int(cpd['id']))
                    }

                    EventOrderItems.objects.create(**cpd_db_param)

                    print(f"CPD DB PAram - {cpd_db_param}")

                return Response({'message' : 'Event Order Placed Successfully!', 'data' : event_order_serializer(event_order)})
        except Exception as e:
            logger.exception("Post Event Data Error - {}".format(e))
            raise APIException({'message' : custom_error_message})





class GetAllEventOrder(APIView):
    permission_classes = []
    authentication_classes = []

    def get(self, request):
        data = []
        try:
            data = [event_order_serializer(obj) for obj in EventOrder.objects.filter(status=True).all()]
        except Exception as e:
            logger.exception(f"Get All Event Order Data Error - {e}")
            data = []

        return Response({'data' : data})
    



class GetIndividualEventOrderData(APIView):
    permission_classes = []
    authentication_classes = []

    def get(self, request, id):
        data = None
        try:
            if id:
                event_order = EventOrder.objects.filter(id=id, status=True).first()
                if event_order:
                    data = event_order_serializer(event_order)
        except Exception as e:
            logger.exception(f"Get Individual Event Order Data Error - {e}")
            data = None

        return Response({'data' : data})
    



class UpdateEventOrder(APIView):
    def post(self, request):
        try:
            data = validate_request(request, request.data)
            order_status = data.get('order_status', None)
            order_id = data.get('id', None)

            if not order_status:
                raise APIException('Order Status Missing')

            if not order_id:
                raise APIException('Order Id Missing')
            
            event_order = EventOrder.objects.filter(id=int(order_id))

            if event_order.exists():            
                event_order.update(order_status=int(order_status))
            else:
                raise APIException('Invalid Order ID')            

            return Response({'message' : 'Status Updated Successfully!', 'data' : event_order_serializer(event_order.first())})
        except Exception as e:
            logger.exception(f"Update Event Order Error - {e}")
            raise APIException({'message' : custom_error_message})