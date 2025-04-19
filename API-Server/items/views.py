from django.shortcuts import render

# Create your views here.
import logging
import base64
import sys
from datetime import datetime

from django.db import transaction

from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import APIException, NotFound
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated
from rest_framework import permissions, status

from cakery.validators import validate_request

from django.forms.models import model_to_dict
# from items import models as items_model
from .models import Items
from .serializers import ItemsSerializer, GetItemsSerializer
from rest_framework.pagination import PageNumberPagination

# Create your views here.
class ItemSearchView(APIView):

    def get(self, request):
        try:
            search_query = request.query_params.get('name', '')
            items = Items.objects.filter(name__icontains=search_query, is_deleted=False)
            serializer = GetItemsSerializer(items, many=True)
            return Response({'message': 'Items Retrieved Successfully', 'data': serializer.data})

        except Exception as e:
            print(f"Retrieve Items Error - {e}")
            raise APIException({'message': 'An error occurred while retrieving the items.'})

class ProductOperations(APIView):

    def get(self, request):
        try:
            items = Items.objects.filter(is_deleted=False)

            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 5))

            paginator = PageNumberPagination()
            paginator.page_size = page_size
            paginated_items = paginator.paginate_queryset(items, request)

            total_length = items.count()

            serializer = GetItemsSerializer(paginated_items, many=True)

            return paginator.get_paginated_response({
                'message': 'Items Retrieved Successfully',
                'data': serializer.data,
                'total_length': total_length
            })

        except Exception as e:
            print(f"Retrieve Items Error - {e}")
            raise APIException({'message': 'An error occurred while retrieving the items.'})


    @transaction.atomic
    def post(self, request):
        try:
            data = validate_request(request, request.data)
            data['created_at'] = datetime.now()
            
            serializer = ItemsSerializer(data=data)
            if serializer.is_valid():
                item = serializer.save()
                return Response({
                    'message': 'Item Created Successfully',
                    'data': GetItemsSerializer(item).data
                }, status=status.HTTP_201_CREATED)
            
            return Response({
                'message': 'Validation Error',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            print(f"Create Item Error - {e}")
            raise APIException({'message': 'An error occurred while processing your request.'})

    @transaction.atomic
    def put(self, request, pk):
        try:
            data = validate_request(request, request.data)
            data['updated_at'] = datetime.now()
            
            try:
                item = Items.objects.get(id=pk)
            except Items.DoesNotExist:
                return Response({'message': 'Item not found.'}, status=status.HTTP_404_NOT_FOUND)
            
            serializer = ItemsSerializer(item, data=data, partial=True)
            if serializer.is_valid():
                updated_item = serializer.save()
                return Response({
                    'message': 'Item Updated Successfully',
                    'data': GetItemsSerializer(updated_item).data
                })
            
            return Response({
                'message': 'Validation Error',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            print(f"Update Item Error - {e}")
            raise APIException({'message': 'An error occurred while processing your request.'})
