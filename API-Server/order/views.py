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
from rest_framework.exceptions import APIException, NotFound, ValidationError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated
from rest_framework import permissions, status

from cakery.file_upload_to_aws import put_image_to_s3

from cakery.check_instance import check_instance
from cakery.validators import validate_request

from cakery.common import custom_error_message, aws_domain_name

from customer.models import CustomerAddress, Customer
from customer.rbac import effective_permissions

from order.models import CakeOrder
from order.serializers import cake_order_serialier
from cart.models import Cart
from cart.pricing import refresh_cart_authoritative_price
from .serializers import CakeOrderSerializer, CartSerializer

from delivery_person.models import DeliveryPerson

logger = logging.getLogger('cakery')

LEGACY_ORDER_STATUSES = {1, 2, 3, 4, 5, 6, 7, 8, 9}
CUSTOMER_CANCELLABLE_STATUSES = {1, 2, 3}
CUSTOMER_CANCEL_REQUEST_STATUS = 7
FINAL_ORDER_STATUSES = {6, 8, 9}
STAFF_ORDER_STATUS_TRANSITIONS = {
    1: {2, 7, 8, 9},
    2: {3, 7, 8, 9},
    3: {4, 7, 8, 9},
    4: {5, 8, 9},
    5: {6, 8, 9},
    7: {8, 9},
}
ORDER_STATUS_MANAGEMENT_PERMISSION = "operations.process"
ORDER_DETAIL_VIEW_PERMISSION = "operations.view"


def _parse_positive_int(value, field_name):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise ValidationError({field_name: "Invalid value."})
    if parsed <= 0:
        raise ValidationError({field_name: "Invalid value."})
    return parsed


def _parse_legacy_order_status(value):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise ValidationError({"delivery_status": "Invalid delivery status."})
    if parsed not in LEGACY_ORDER_STATUSES:
        raise ValidationError({"delivery_status": "Invalid delivery status."})
    return parsed


def _is_order_status_staff_authorized(user):
    return ORDER_STATUS_MANAGEMENT_PERMISSION in effective_permissions(user)


def _is_order_detail_staff_authorized(user):
    return ORDER_DETAIL_VIEW_PERMISSION in effective_permissions(user)


def _validate_order_status_transition(order, requested_status, is_staff_authorized):
    current_status = order.delivery_status
    if current_status == requested_status:
        raise ValidationError({"delivery_status": "Order is already in this status."})
    if current_status in FINAL_ORDER_STATUSES:
        raise ValidationError({"delivery_status": "This order can no longer be updated."})

    if is_staff_authorized:
        allowed_statuses = STAFF_ORDER_STATUS_TRANSITIONS.get(current_status, set())
        if requested_status not in allowed_statuses:
            raise ValidationError({"delivery_status": "This status transition is not allowed."})
        return

    if current_status not in CUSTOMER_CANCELLABLE_STATUSES or requested_status != CUSTOMER_CANCEL_REQUEST_STATUS:
        raise ValidationError({"delivery_status": "This status transition is not allowed."})

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

            raw_cart_ids = data.get('cart_id_list') or []
            try:
                cart_ids = [int(cart_id) for cart_id in raw_cart_ids]
            except (TypeError, ValueError):
                raise ValidationError({'cart_id_list': 'Invalid cart list.'})
            if not cart_ids:
                raise ValidationError({'cart_id_list': 'Select at least one cart item.'})
            if len(set(cart_ids)) != len(cart_ids):
                raise ValidationError({'cart_id_list': 'Duplicate cart items are not allowed.'})

            carts = list(
                Cart.objects.select_for_update()
                .select_related('cake_price__cake', 'customer')
                .filter(id__in=cart_ids, customer=request.user, status=True)
            )
            if len(carts) != len(cart_ids):
                raise ValidationError({'cart_id_list': 'One or more cart items are invalid or no longer available.'})

            cart_by_id = {cart.id: cart for cart in carts}
            ordered_carts = [cart_by_id[cart_id] for cart_id in cart_ids]
            order_total = 0
            order_qty = 0
            for cart in ordered_carts:
                refresh_cart_authoritative_price(cart)
                cart.save(update_fields=('price', 'qty', 'updated_on'))
                order_total += cart.price * cart.qty
                order_qty += cart.qty

            try:
                delivery_address = CustomerAddress.objects.get(
                    id=int(data['customer_address_id']),
                    customer=request.user,
                )
            except (CustomerAddress.DoesNotExist, TypeError, ValueError):
                raise ValidationError({'customer_address_id': 'Invalid delivery address.'})

            db_param = {
                "cart_id_list" : cart_ids,
                "total_amount" : order_total,
                "total_qty" : order_qty,
                "order_time" : datetime.now(),
                "delivery_time" : data['delivery_date_time'],
                "delivery_person_name" : data.get('delivery_person_name', ''),
                "delivery_person_phone" : data.get('delivery_person_phone', ''),
                "delivery_address" : delivery_address,
                "tracking_link" : data.get('tracking_link', ''),
            }

            if "is_manual_order" in data:
                db_param['is_manual_order'] = data['is_manual_order']
            else:
               
                 db_param['is_manual_order'] = False

            db_param['customer'] = request.user

            c_id = str(data.get('id', 0))

            if c_id and c_id.isdigit() and c_id != '0':
                db_param['updated_on'] = datetime.now()
                updated = CakeOrder.objects.filter(id=int(c_id), customer=request.user).update(**db_param)
                if not updated:
                    return Response({'message': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)
                cake_order = CakeOrder.objects.get(id=int(c_id), customer=request.user)
                response = cake_order_serialier(cake_order)
                return Response({'message' : 'Order Updated Successfully', 'data' : response})
            else:
                db_param['created_on'] = datetime.now()
                cake_order = CakeOrder.objects.create(**db_param)
                Cart.objects.filter(id__in=cart_ids, customer=request.user, status=True).update(status=False)
                response = cake_order_serialier(cake_order)
                return Response({'message' : 'Order Placed Successfully', 'data' : response})

        except ValidationError:
            raise
        except APIException as api_exception:
            raise APIException({'message': api_exception})

        except Exception as e:
            logger.exception("Save Cake Order Error - {}".format(e))
            raise APIException({'message' : custom_error_message})


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
    # Customer self-service for a single own order; staff access is checked
    # object-aware inside the view using the existing operations.view permission.
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        try:
            cake_order_id = _parse_positive_int(id, 'id')
            if _is_order_detail_staff_authorized(request.user):
                cake_order = CakeOrder.objects.filter(id=cake_order_id).first()
            else:
                cake_order = CakeOrder.objects.filter(id=cake_order_id, customer=request.user).first()

            if cake_order is None:
                return Response({'message': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

            order_data = cake_order_serialier(cake_order)
        except ValidationError:
            raise
        except Exception as e:
            logger.exception('Get Individual Cake Order Error - {}'.format(e))
            raise APIException({'message' : custom_error_message})

        return Response({'data' : order_data})


class OrderStatusUpdate(APIView):
    # Also called from the public Website (not just Admin) — same reasoning
    # as MyCakeOrderListView above.
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            data = validate_request(request, request.data)
            if 'cake_order_id' not in data:
                raise ValidationError({'cake_order_id': 'This field is required.'})
            if 'delivery_status' not in data:
                raise ValidationError({'delivery_status': 'This field is required.'})

            cake_order_id = _parse_positive_int(data.get('cake_order_id'), 'cake_order_id')
            requested_status = _parse_legacy_order_status(data.get('delivery_status'))
            is_staff_authorized = _is_order_status_staff_authorized(request.user)

            if is_staff_authorized:
                cake_order = CakeOrder.objects.filter(id=cake_order_id).first()
            else:
                cake_order = CakeOrder.objects.filter(id=cake_order_id, customer=request.user).first()

            if cake_order is None:
                return Response({'message': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

            has_staff_only_fields = any(key in data for key in ('tracking_link', 'delivery_partner', 'delivery_partner_id'))
            if has_staff_only_fields and not is_staff_authorized:
                return Response(
                    {'message': 'You do not have permission to perform this action.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

            _validate_order_status_transition(cake_order, requested_status, is_staff_authorized)

            cake_order.delivery_status = requested_status
            update_fields = ['delivery_status', 'updated_on']

            if "tracking_link" in data:
                cake_order.tracking_link = data['tracking_link']
                update_fields.append('tracking_link')

            if "delivery_partner" in data or "delivery_partner_id" in data:
                delivery_partner_id = _parse_positive_int(data.get('delivery_partner_id'), 'delivery_partner_id')
                try:
                    cake_order.delivery_partner = DeliveryPerson.objects.get(id=delivery_partner_id)
                except DeliveryPerson.DoesNotExist:
                    raise ValidationError({'delivery_partner_id': 'Invalid delivery partner.'})
                update_fields.append('delivery_partner')

            cake_order.save(update_fields=update_fields)

            return Response({'message' : 'Order Status Updated'})

        except ValidationError:
            raise
        except Exception as e:
            logger.exception('Order Status Update Error - {}'.format(e))
            raise APIException({'message' : custom_error_message})
        




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
