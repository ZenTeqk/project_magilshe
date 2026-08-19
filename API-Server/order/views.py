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

from customer.models import CustomerAddress, Customer

from order.models import CakeOrder
from order.serializers import cake_order_serialier
from cart.models import Cart
from .serializers import CakeOrderSerializer, CartSerializer

from delivery_person.models import DeliveryPerson

logger = logging.getLogger('cakery')

class MyCakeOrderListView(APIView):
    # Customer self-service, not staff/admin — RBAC's "operations" mapping on the
    # order/ prefix would otherwise 403 every regular customer (empty permission set).
    permission_classes = [IsAuthenticated]

    def get(self, request, format=None):
        print("FROM FAYAS")
        orders = CakeOrder.objects.select_related('customer', 'delivery_partner', 'delivery_address').filter(customer=request.user.id)
        order_data = []

        for order in orders:
            serialized_order = CakeOrderSerializer(order).data
            cart_items = []

            if order.cart_id_list and isinstance(order.cart_id_list, list):
                cart_items = Cart.objects.filter(id__in=order.cart_id_list)
                serialized_cart_items = CartSerializer(cart_items, many=True).data
                serialized_order['cart_items'] = serialized_cart_items
            else:
                serialized_order['cart_items'] = []

            order_data.append(serialized_order)

        return Response({"data": order_data, "status":status.HTTP_200_OK})
    
class CakeOrderListView(APIView):
    def get(self, request, format=None):
        orders = CakeOrder.objects.select_related('customer', 'delivery_partner', 'delivery_address').all()
        order_data = []

        for order in orders:
            serialized_order = CakeOrderSerializer(order).data
            cart_items = []

            if order.cart_id_list and isinstance(order.cart_id_list, list):
                cart_items = Cart.objects.filter(id__in=order.cart_id_list)
                serialized_cart_items = CartSerializer(cart_items, many=True).data
                serialized_order['cart_items'] = serialized_cart_items
            else:
                serialized_order['cart_items'] = []

            order_data.append(serialized_order)

        return Response({"data": order_data, "status":status.HTTP_200_OK})

class CakeOrderDetailView(APIView):
    def get(self, request, pk, format=None):
        try:
            order = CakeOrder.objects.select_related('customer', 'delivery_partner', 'delivery_address').get(pk=pk)
        except CakeOrder.DoesNotExist:
            return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        serialized_order = CakeOrderSerializer(order).data

        if order.cart_id_list and isinstance(order.cart_id_list, list):
            cart_items = Cart.objects.filter(id__in=order.cart_id_list)
            serialized_cart_items = CartSerializer(cart_items, many=True).data
            serialized_order['cart_items'] = serialized_cart_items
        else:
            serialized_order['cart_items'] = []

        return Response({"data": serialized_order, "status":status.HTTP_200_OK})
    

class SaveCakeOrder(APIView):
    # Customer checkout — same reasoning as MyCakeOrderListView above.
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        try:
            data = validate_request(request, request.data)

            for ht in data['cart_id_list']:
                Cart.objects.filter(id=int(ht)).update(status=False)

            db_param = {
                "cart_id_list" : data['cart_id_list'],
                "total_amount" : data['total_amount'],
                "total_qty" : data['total_qty'],
                "order_time" : datetime.now(),
                "delivery_time" : data['delivery_date_time'],
                "delivery_person_name" : data['delivery_person_name'],
                "delivery_person_phone" : data['delivery_person_phone'],
                "delivery_address" : CustomerAddress.objects.get(id=int(data['customer_address_id'])),
                "tracking_link" : data['tracking_link'],
            }

            if "is_manual_order" in data:
                db_param['is_manual_order'] = data['is_manual_order']
            else:
               
                 db_param['is_manual_order'] = False

            if "customer_id" in data:
                db_param['customer'] = Customer.objects.get(id=int(data['customer_id']))
            else:
                db_param['customer'] = request.user

            c_id = str(data['id'])

            if c_id and c_id.isdigit() and c_id != '0':
                db_param['updated_on'] = datetime.now()
                CakeOrder.objects.filter(id=int(c_id)).update(**db_param)
                cake_order = CakeOrder.objects.get(id=int(c_id))
                response = cake_order_serialier(cake_order)
                return Response({'message' : 'Order Updated Successfully', 'data' : response})
            else:
                db_param['created_on'] = datetime.now()
                cake_order = CakeOrder.objects.create(**db_param)
                response = cake_order_serialier(cake_order)
                return Response({'message' : 'Order Placed Successfully', 'data' : response})

        except APIException as api_exception:
            raise APIException({'message': api_exception})

        except Exception as e:
            logger.exception("Save Cake Order Error - {}".format(e))
            raise APIException({'message' : 'Save Cake Order Error - {}'.format(e)})


class GetAllCakeOrder(APIView):
    def get(self, request):
        order_data = []
        try:
            order_data = [cake_order_serialier(ht) for ht in CakeOrder.objects.all()]
        except Exception as e:
            logger.exception('Get All Cake Order Error - {}'.format(e))
            order_data = []
        
        return Response({'data' : order_data})


class GetMyCakeOrder(APIView):
    # Customer self-service — same reasoning as MyCakeOrderListView above.
    permission_classes = [IsAuthenticated]

    def get(self, request):
        order_data = []
        try:
            order_data = [cake_order_serialier(ht) for ht in CakeOrder.objects.filter(customer=request.user.id).order_by('-id')]
            print(order_data)
        except Exception as e:
            logger.exception('Get My Cake Order Error - {}'.format(e))
            order_data = []
        
        return Response({'data' : order_data})
    

class GetIndividualOrder(APIView):
    def get(self, request, id):
        order_data = None
        try:
            cake_order = CakeOrder.objects.get(id=int(id))
            if not cake_order == None:
                order_data = cake_order_serialier(CakeOrder.objects.get(id=int(id)))
            else:
                order_data = None
        except Exception as e:
            logger.exception('Get Individual Cake Order Error - {}'.format(e))
            order_data = None

        return Response({'data' : order_data})


class OrderStatusUpdate(APIView):
    # Also called from the public Website (not just Admin) — same reasoning
    # as MyCakeOrderListView above.
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            print("")
            data = validate_request(request, request.data)
            db_param = {
                "delivery_status" : data['delivery_status']
            }

            if "tracking_link" in data:
                db_param['tracking_link'] = data['tracking_link']

            
            if "delivery_partner" in data:
                db_param['delivery_partner'] = DeliveryPerson.objects.get(id=int(data['delivery_partner_id']))

            
            CakeOrder.objects.filter(id=int(data['cake_order_id'])).update(**db_param)

            return Response({'message' : 'Order Status Updated'})


        except Exception as e:
            logger.exception('Order Status Update Error - {}'.format(e))
            print('Order Status Update Error - {}'.format(e))
            raise APIException({'message' : 'Order Status Update Error - {}'.format(e)})
        




class GetCustomerOrderBasedOnDateRange(APIView):
    def get(self, request):
        data = []
        try:
            customer_id = request.GET.get('customer_id', None)
            from_date = request.GET.get('from_date', None)
            to_date = request.GET.get('to_date', None)

            if customer_id:
                cake_order = CakeOrder.objects.filter(customer=int(customer_id)).all()

                if from_date != None and to_date != None:
                    cake_order = CakeOrder.objects.filter(customer=int(customer_id), order_time__date__gte=from_date, order_time__date__lte=to_date).all()

                data = [cake_order_serialier(ht) for ht in cake_order]

        except Exception as e:
            logger.exception(f"Get Customer Order Based On Date Range Error - {str(e)}")
            data = []

        return Response({'data' : data})
