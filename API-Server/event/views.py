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
from rest_framework.exceptions import APIException, NotFound, ValidationError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated
from rest_framework import permissions, status

from cakery.file_upload_to_aws import put_image_to_s3
from cakery.uploads import validate_image_upload

from cakery.check_instance import check_instance
from cakery.validators import validate_request

from cakery.common import custom_error_message, aws_domain_name
from customer.rbac import effective_permissions

from event.models import Event, EventOrder, EventOrderItems
from event.serializers import event_serializer, event_order_serializer

from cake.models import CakePrice

logger = logging.getLogger('cakery')

EVENT_ORDER_VIEW_PERMISSION = "marketing.view"
EVENT_ORDER_EDIT_PERMISSION = "marketing.edit"


def _has_permission(user, code):
    return code in effective_permissions(user)


def _parse_positive_int(value, field_name):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise ValidationError({field_name: "Invalid value."})
    if parsed <= 0:
        raise ValidationError({field_name: "Invalid value."})
    return parsed

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
                        try:
                            ext = validate_image_upload(image)
                        except ValueError as error:
                            return Response({"message": str(error)}, status=400)
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

                event_order = EventOrder.objects.create(**event_order_db_param)

                for cpd in cake_price_details:
                    cpd_db_param = {
                        "event_order" : event_order,
                        "qty" : cpd['qty'],
                        "cake_price" : CakePrice.objects.get(id = int(cpd['id']))
                    }

                    EventOrderItems.objects.create(**cpd_db_param)

                return Response({'message' : 'Event Order Placed Successfully!', 'data' : event_order_serializer(event_order)})
        except Exception as e:
            logger.exception("Post Event Data Error - {}".format(e))
            raise APIException({'message' : custom_error_message})





class GetAllEventOrder(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = []
        try:
            if not _has_permission(request.user, EVENT_ORDER_VIEW_PERMISSION):
                return Response(
                    {'message': 'You do not have permission to perform this action.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            data = [event_order_serializer(obj) for obj in EventOrder.objects.filter(status=True).all()]
        except Exception as e:
            logger.exception(f"Get All Event Order Data Error - {e}")
            raise APIException({'message' : custom_error_message})

        return Response({'data' : data})
    



class GetIndividualEventOrderData(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        try:
            if not _has_permission(request.user, EVENT_ORDER_VIEW_PERMISSION):
                return Response(
                    {'message': 'You do not have permission to perform this action.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            event_order_id = _parse_positive_int(id, 'id')
            event_order = EventOrder.objects.filter(id=event_order_id, status=True).first()
            if event_order is None:
                return Response({'message': 'Event order not found.'}, status=status.HTTP_404_NOT_FOUND)
            data = event_order_serializer(event_order)
        except ValidationError:
            raise
        except Exception as e:
            logger.exception(f"Get Individual Event Order Data Error - {e}")
            raise APIException({'message' : custom_error_message})

        return Response({'data' : data})
    



class UpdateEventOrder(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            if not _has_permission(request.user, EVENT_ORDER_EDIT_PERMISSION):
                return Response(
                    {'message': 'You do not have permission to perform this action.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            data = validate_request(request, request.data)
            order_status = data.get('order_status', None)
            order_id = data.get('id', None)

            if not order_status:
                raise ValidationError({'order_status': 'Order status missing.'})

            if not order_id:
                raise ValidationError({'id': 'Order id missing.'})
            
            event_order = EventOrder.objects.filter(id=_parse_positive_int(order_id, 'id'), status=True)

            if event_order.exists():            
                event_order.update(order_status=_parse_positive_int(order_status, 'order_status'))
            else:
                return Response({'message': 'Event order not found.'}, status=status.HTTP_404_NOT_FOUND)

            return Response({'message' : 'Status Updated Successfully!', 'data' : event_order_serializer(event_order.first())})
        except ValidationError:
            raise
        except Exception as e:
            logger.exception(f"Update Event Order Error - {e}")
            raise APIException({'message' : custom_error_message})
