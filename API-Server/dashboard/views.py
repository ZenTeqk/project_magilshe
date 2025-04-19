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

from order.models import CakeOrder
from customer.models import Customer
from occasion.models import Occasion
from cart.models import Cart
from cake.models import Cake

from order.serializers import cake_order_serialier
from occasion.serializers import occasion_serializer
from cake.serializers import cake_serializer

logger = logging.getLogger('cakery')


class GetOrderStatusCount(APIView):
    def get(self, request):        
        try:
            print("GET ")
            today = datetime.now().date()
            print(f"Today Date = ",today)
            date_10_days_later = (datetime.today() + timedelta(days=10)).strftime("%Y-%m-%d")
            count = {
                "total_order" : CakeOrder.objects.count(),
                "today_order" : CakeOrder.objects.filter(order_time__date = today).count(),
                "total_delivered" : CakeOrder.objects.filter(delivery_status = 6).count(),
                "today_delivered" : CakeOrder.objects.filter(delivery_time__date = today, delivery_status = 6).count(),
                "total_pending" : CakeOrder.objects.filter(delivery_status = 1).count(),
                "today_pending" : CakeOrder.objects.filter(delivery_time__date = today, delivery_status = 1).count(),
                "total_users" : Customer.objects.filter(is_superuser=False, is_staff=False).count(),
            }
            
            
            today_order_cake_list_obj = CakeOrder.objects.filter(order_time__date = today).values('cart_id_list')
            
            today_order_cake_id_list = []
            
            for toc in today_order_cake_list_obj:
                cart_id_list = toc['cart_id_list']
                
                for cil in cart_id_list:
                    if not Cart.objects.get(id=int(cil)).cake_price is None:
                        cake = Cart.objects.get(id=int(cil)).cake_price.cake
                        if not cake is None:
                            today_order_cake_id_list.append(Cart.objects.get(id=int(cil)).cake_price.cake.id)
             
            
            today_order_cake_id_list = list(set(today_order_cake_id_list))   
            
            
            
            today_preparing_cake_list_obj = CakeOrder.objects.filter(order_time__date = today, delivery_status = 4).values('cart_id_list')
            
            today_preparing_cake_id_list = []
            
            for toc in today_preparing_cake_list_obj:
                cart_id_list = toc['cart_id_list']
                
                for cil in cart_id_list:
                    if not Cart.objects.get(id=int(cil)).cake_price is None:
                        cake = Cart.objects.get(id=int(cil)).cake_price.cake
                        if not cake is None:
                            today_preparing_cake_id_list.append(Cart.objects.get(id=int(cil)).cake_price.cake.id)
             
            
            today_preparing_cake_id_list = list(set(today_preparing_cake_id_list))             
                       
            data = {
                "recent_10_orders" : [cake_order_serialier(ht) for ht in CakeOrder.objects.order_by("-id")[:10]],
                "recent_10_deliveries" : [cake_order_serialier(ht) for ht in CakeOrder.objects.filter(delivery_status = 6).order_by("-id")[:10]],
                "upcoming_occasions" : [occasion_serializer(ht) for ht in Occasion.objects.filter(date__gte=today,date__lte=date_10_days_later).all()],
                "today_ordered_cake_list_list" : [cake_serializer(Cake.objects.get(id=int(ht))) for ht in today_order_cake_id_list],
                "today_preparing_cake_list" : [cake_serializer(Cake.objects.get(id=int(ht))) for ht in today_preparing_cake_id_list],
            }
            
        except Exception as e:
            count = {
                "total_order" : 0,
                "today_order" : 0,
                "total_delivered" : 0,
                "today_delivered" : 0,
                "total_pending" : 0,
                "today_pending" : 0,
                "total_users" : 0,
            }
            
            print("EXCEPTION")
            
            data = {
                "recent_10_orders" : [],
                "recent_10_deliveries" : [],
                "upcoming_occasions" : [],
                "today_ordered_cake_list_list" : [],
                "today_preparing_cake_list" : [],
            }
            
            logger.exception(f"Get Order Status Count Error - {str(e)}")
            
        
        context = {
            'count' : count,
            'data' : data
        }
            
        return Response(context)