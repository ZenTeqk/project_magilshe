from django.shortcuts import render

# Create your views here.
import logging
import base64
import sys
from datetime import datetime, timedelta , time , date
from json import JSONEncoder
import json
import uuid
from django.views.decorators.csrf import csrf_exempt
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

from cart.serializers import cart_serializer, my_cart_serializer
from cart.models import Cart
from cake import models as cake_model
from kg.models import Kg
from customer.models import Customer
from occasion.models import Occasion


logger = logging.getLogger('cakery')

class GetMyCart(APIView):
    def get(self, request):
        cart_data = []
        try:
            CartObj = Cart.objects.filter(customer=request.user.id, status=True)\
                                  .select_related('cake_price__cake__sub_category__main_category', 'customer', 'occasion')\
                                  .prefetch_related('cake_price__kg', 'cake_price__cake__cakeimages_set', 'customer__customeraddress_set')

            cart_data = [my_cart_serializer(ht) for ht in CartObj]

        except Exception as e:
            cart_data = []
            logger.error("Get Cart Data Error - %s", e, exc_info=True)
            print("Get Cart Data Error - {}".format(e))

        return Response({'data': cart_data})


class GetCart(APIView):
    def get(self, request):
        cart_data = []
        try:
            
            CartObj = Cart.objects.filter(customer=2, status=True).all()

            cart_data = [cart_serializer(ht) for ht in CartObj]

        except Exception as e:
            cart_data = []
            logger.error("Get Cart Data Error - %s", e, exc_info=True)
            print("Get Cart Data Error - {}".format(e))

        return Response({'data' : cart_data})


class GetAllCart(APIView):
    def get(self, request):
        cart_data = []
        try:
            CartObj = Cart.objects.filter(status=True).all()
            cart_data = [cart_serializer(ht) for ht in CartObj]
        except Exception as e:
            cart_data = []
            print("Get All Cart Data Error - {}".format(e))
            logger.exception("Get All Cart Data Error - {}".format(e))

        return Response({'data' : cart_data})


class CreateCart(APIView):
    @transaction.atomic
    def post(self, request):
        try:
            data = validate_request(request, request.data)

            db_param = {
                "cake_price" : cake_model.CakePrice.objects.get(id=int(data['cake_price'])),
                "customer" : request.user,
                "price" : data["price"],
                "qty" : data["qty"],
                "greeting_text" : data["greeting_text"],
            }

            c_id = str(data['id'])

            if c_id and c_id.isdigit() and c_id != '0':
                db_param['updated_on'] = datetime.now()
                Cart.objects.filter(id=int(c_id)).update(**db_param)
                cart = Cart.objects.get(id=int(c_id))
                response = cart_serializer(cart)
                return Response({'message' : 'Cart Updated Successfully !!!!!', 'data' : response})

            else:
                occ_db_param = {
                    "type" : data['type'],
                    "date" : data['date'],
                    "person_name" : data['person_name']
                }

                if "is_subscribed" in data:
                    occ_db_param['person_phone'] = data['person_phone']

                occasion = Occasion.objects.create(**occ_db_param)

                db_param['created_on'] = datetime.now()
                db_param['occasion'] = occasion
                cart = Cart.objects.create(**db_param)
                response = cart_serializer(cart)
                return Response({'message' : 'Cart Added Successfully !!!!!', 'data' : response})

        except Exception as e:
            print("Create Cart Error - {}".format(e))
            logger.exception("Create Cart Error - {}".format(e))
            raise APIException({'message' : e})
        

class DeleteCartItem(APIView):
    @transaction.atomic
    def delete(self, request, id):
        try:
            cartId = id            
            Cart.objects.filter(id=int(cartId)).delete()

            CartObj = Cart.objects.filter(customer=request.user.id, status=True).all()
            cart_data = [cart_serializer(ht) for ht in CartObj]
            return Response({'message' : 'Cart Item Removed Successfully!', 'data': cart_data})
        except Exception as e:
            raise APIException({'message' : custom_error_message})
        



class AddManualCart(APIView):
    @transaction.atomic
    def post(self, request):
        try:
            data = validate_request(request, request.data)

            print(f"Payload = {data}")

            cart_list = data['cart_list']
            customer = Customer.objects.get(id=int(data['customer_id']))

            response = []

            for ht in cart_list:

                occ_db_param = {
                    "type" : ht['type'],
                    "date" : ht['date'],
                    "person_name" : ht['person_name']
                }

                if "is_subscribed" in ht:
                    occ_db_param['person_phone'] = ht['person_phone']

                occasion = Occasion.objects.create(**occ_db_param)

                cart_db_param = {
                    "cake_price" : cake_model.CakePrice.objects.get(id=int(ht['cake_price'])),
                    "customer" : customer,
                    "price" : ht["price"],
                    "qty" : ht["qty"],
                    "greeting_text" : ht["greeting_text"],
                    "occasion" : occasion,
                    "created_on" : datetime.now()
                }

                cart = Cart.objects.create(**cart_db_param)

                response.append(cart.id)

            return Response({'data' : response})


        except APIException as api_exception:
            raise APIException({'message': api_exception})    


        except Exception as e:
            logger.exception(f"Ad Manual Cart Error - {str(e)}")
            raise APIException({'message' : custom_error_message})