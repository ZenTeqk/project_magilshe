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


from cake import models as cake_model
from category import models as category_model
from kg.models import Kg as KGModel
from unit import models as unit_model
from cake.serializers import cake_serializer, offer_serializer, getAWSUrl
from django.utils import timezone
from rest_framework import generics, filters
from rest_framework.pagination import PageNumberPagination
from .serializers import CakeSerializer
from .models import Cake
from django.shortcuts import get_object_or_404

logger = logging.getLogger('cakery')

class CakePagination(PageNumberPagination):
    page_size = 3

class CustomPagination(PageNumberPagination):
    page_size_query_param = 'page_size'

class CakeListView(generics.ListAPIView):
    queryset = Cake.objects.filter(status=True).all().order_by('id')
    serializer_class = CakeSerializer
    pagination_class = CakePagination
    filter_backends = (filters.SearchFilter,)
    search_fields = ['name', 'description', 'seo_text']

    permission_classes = []
    authentication_classes = []
    def get(self, request, *args, **kwargs):
        try:
            queryset = self.filter_queryset(Cake.objects.filter(status=True).all().order_by('id'))
            
            page_size = request.query_params.get('page_size', 10)
            paginator = CustomPagination()
            paginator.page_size = page_size

            result_page = paginator.paginate_queryset(queryset, request)
            if result_page is not None:
                serializer = self.get_serializer(result_page, many=True)
                return paginator.get_paginated_response(serializer.data)
            
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)

        except Exception as e:
            return Response(
                {"detail": "An unexpected error occurred."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class CakeDetailView(generics.RetrieveAPIView):
    queryset = Cake.objects.filter(status=True).all()
    serializer_class = CakeSerializer

    permission_classes = []
    authentication_classes = []
    def get(self, request, *args, **kwargs):
        try:
            cake_id = self.kwargs.get('id')
            cake = get_object_or_404(Cake, id=cake_id)
            serializer = self.get_serializer(cake)
            return Response({'data' : serializer.data, 'status': "success"})
        except Exception as e:
            return Response(
                {
                    "detail": "An unexpected error occurred.", 
                    "message": "No Data found in this ID", 
                    "status" :status.HTTP_500_INTERNAL_SERVER_ERROR
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# Optimize - End 

class GetCakeList(APIView):
    permission_classes = []
    authentication_classes = []
    def get(self ,request):
        cake_data = []
        try:
            # order = request.query_params['sort']
            if "search" in request.query_params:
                searchKey = request.query_params['search']
                CakeObj = cake_model.Cake.objects.filter(status=True,name__icontains=searchKey).all()
                cake_data = [cake_serializer(ht) for ht in  CakeObj]
            elif "category" in request.query_params:
                categoryKey = request.query_params['category']
                CakeObj = cake_model.Cake.objects.filter(status=True,sub_category=categoryKey).all()
                cake_data = [cake_serializer(ht) for ht in  CakeObj]

            else:
                CakeObj = cake_model.Cake.objects.filter(status=True).all()
                cake_data = [cake_serializer(ht) for ht in  CakeObj]
        except Exception as e:
            cake_data = []
            print("Get Cake List Error - {}".format(e))
            logger.exception("Get Cake List Error - {}".format(e))

        
        return Response({'data' : cake_data})
    
class GetCakeData(APIView):
    permission_classes = []
    authentication_classes = []
    def get(self, request, id):
        try:
            cakeID = id
            if cakeID:
                if(cake_model.Cake.objects.filter(id=int(cakeID), status=True).exists()):
                    cake_data = cake_serializer(cake_model.Cake.objects.get(id=int(cakeID)))
                else:
                    raise APIException("Cake Not Found")

        except Exception as e:
            cake_data = []
            print("Get Cake For Id {} Error ".format(e))
        
        return Response({'data' : cake_data})

class CreateCake(APIView):
    @transaction.atomic

    def post(self, request):
        try:
            data = validate_request(request, request.data)

            if isinstance(data['tag'], list):
                tag = data['tag']
            elif isinstance(data['tag'], str) and data['tag'] != "":
                tag = [int(item) for item in (data['tag']).split(",")]
            else:
                tag = []

            db_param = {
                "name" : data['name'],                
                "description" : data['description'],
                "tag" : tag,
                "sub_category" : category_model.SubCategory.objects.get(id=int(data['sub_category'])),
                "seo_url" : data['seo_url'],
                "seo_text" : data['seo_text'],
                "meta_title" : data['meta_title'],
                "meta_description" : data['meta_description'],
                "slug" : data['slug'],
                "content" : data['content']
            }

            if "price" in data:
                db_param["price"] = data['price']

            if "unit" in data:
                db_param["unit"] = unit_model.unit.objects.get(id=int(data['unit']))

            def upload_cake_image(cake_id):
                try:
                    cake = cake_model.Cake.objects.get(id=int(cake_id))
                    image_data = request.POST.getlist('image_data[]')  
                    image_files = request.FILES.getlist('image_list[]')

                    if image_data:
                        for index, img in enumerate(image_data):
                            img = json.loads(img)
                            img_id = img['id']
                            if img['is_deleted'] == True:
                                cake_model.CakeImages.objects.filter(id=int(img_id)).delete()
                            else:
                                if str(img_id) == '0':
                                    index_id = img['index']
                                    image = image_files[index_id]
                                    print("index_id", index_id)
                                    print("image", image)
                                    if (image != None and image != "null"):
                                        file_name = str(uuid.uuid4())
                                        ext = image.name.split('.')[-1]
                                        if put_image_to_s3(image, "{}/cake/{}/{}.{}".format(aws_domain_name, str(cake_id), file_name, ext)):
                                            
                                            ck_db_param = {
                                                "cake" : cake,
                                                "image_name" : file_name,
                                                "image_ext" : ext
                                            }

                                            if(str(img_id) == '0'):
                                                ck_db_param['created_by'] = request.user
                                                ck_db_param['created_on'] = datetime.now()
                                                cake_model.CakeImages.objects.create(**ck_db_param)
                                            else:
                                                ck_db_param['updated_by'] = request.user
                                                ck_db_param['updated_on'] = datetime.now()
                                                cake_model.CakeImages.objects.filter(id=int(img_id)).update(**ck_db_param)

                except Exception as e:
                    print("Upload Cake Image Error - {}".format(e))
                    raise APIException(custom_error_message)

            def save_cake_price(cake_id):
                try:
                    cake = cake_model.Cake.objects.get(id=int(cake_id))
                    kg_data = request.POST.getlist('kg_list[]')
                    
                    if kg_data:
                        for index, kgd in enumerate(kg_data):
                            kgData = json.loads(kgd)
                            
                            if kgData['is_deleted'] == True:
                                cake_model.CakePrice.objects.filter(id=int(kgData['id'])).delete()
                            else:
                                
                                kg_db_param = {
                                    "cake" : cake,
                                    "kg" : KGModel.objects.get(id=int(kgData['kg_id'])),
                                    "price" : float(kgData['kg_price'])
                                }
                                
                                cp_id_get = kgData.get('id', None)
                                cp_id = str(cp_id_get) if cp_id_get is not None else ''

                                if cp_id and cp_id.isdigit() and cp_id != '0':
                                    kg_db_param['updated_by'] = request.user
                                    kg_db_param['updated_on'] = datetime.now()
                                    cake_model.CakePrice.objects.filter(id=int(cp_id)).update(**kg_db_param)
                                else:
                                    kg_db_param['created_by'] = request.user
                                    kg_db_param['created_on'] = datetime.now()
                                    
                                    cake_model.CakePrice.objects.create(**kg_db_param)
                                    


                except Exception as e:
                    print("Save Cake Price Error - {}".format(e))
                    raise APIException(custom_error_message)
            
            c_id_get = data.get('id', None)
            c_id = str(c_id_get) if c_id_get is not None else ''

            if c_id and c_id.isdigit() and c_id != '0':
                db_param['updated_by'] = request.user
                db_param['updated_on'] = datetime.now()
                cake_model.Cake.objects.filter(id=int(c_id)).update(**db_param)
                upload_cake_image(c_id)
                save_cake_price(c_id)
                cake = cake_model.Cake.objects.get(id=int(c_id))
                response = cake_serializer(cake)
                return Response({'message' : 'Cake Updated Successfully!', 'data' : response})
            else:
                db_param['created_by'] = request.user
                db_param['created_on'] = datetime.now()
                cake = cake_model.Cake.objects.create(**db_param)
                upload_cake_image(cake.id)
                save_cake_price(cake.id)
                response = cake_serializer(cake)
                return Response({'message' : 'Cake Created Successfully!', 'data' : response})            

        
        except APIException as api_exception:
            logger.exception(f"Create Cake Error - {api_exception}")
            raise APIException({'message': api_exception})

        except Exception as e:
            print("Create Cake Exception - {}".format(e))
            logger.exception(f"Create Cake Error - {e}")
            raise APIException({'message' : custom_error_message})

class AddCakeOffer(APIView):
    @transaction.atomic
    def post(self, request):
        try:
            
            data = validate_request(request, request.data)
            if isinstance(data['id_list'], list):
                id_list = data['id_list']
            elif isinstance(data['id_list'], str) and data['id_list'] != "":
                id_list = [int(item) for item in (data['id_list']).split(",")]
            else:
                id_list = []
           

            type = data['type']    # 1 = Category and 2 = Cake and 3 = Cake Price

            db_param = {
                "name" : data['name'],
                "type" : type,
                "id_list" : id_list,
                "offer_per" : round(float(data['offer_per']), 2),
                "offer_from" : data['offer_from'],
                "offer_to" : data['offer_to'],
                "created_on" : datetime.now()
            }

            if "image" in data:
                image = data['image']
                if image and isinstance(image, object) and hasattr(image, 'name') and image != "null" and image != "":
                    file_name = str(uuid.uuid4())
                    ext = image.name.split('.')[-1]
                    if put_image_to_s3(image, "{}/offer/banner/{}.{}".format(aws_domain_name, file_name, ext)):
                        db_param["image_name"] = file_name
                        db_param["image_ext"] = ext



            a_id = str(data['id'])

            if a_id and a_id.isdigit() and a_id != '0':

                query = Q()
                for key in id_list:
                    query |= Q(id_list__contains=key)

                
                filtered_objects = cake_model.Offer.objects.exclude(id=int(a_id)).filter(query, offer_to__gte=data['offer_from']).all()

                if(len(filtered_objects)> 0):
                    raise APIException("Already Offer Applied For the Selected Cake")


                db_param['updated_by'] = request.user
                db_param['updated_on'] = datetime.now()
                cake_model.Offer.objects.filter(id=int(a_id)).update(**db_param)
                offer = cake_model.Offer.objects.get(id=int(a_id))
                response = offer_serializer(offer)
                return Response({'message' : 'Offer Updated Successfully','data' : response})
            else:
                query = Q()
                for key in id_list:
                    query |= Q(id_list__contains=key)

                
                filtered_objects = cake_model.Offer.objects.filter(query, offer_to__gte=data['offer_from']).all()

                if(len(filtered_objects)> 0):
                    raise APIException("Already Offer Applied For the Selected Id")

                db_param['created_by'] = request.user
                db_param['created_on'] = datetime.now()
                offer = cake_model.Offer.objects.create(**db_param)
                response = offer_serializer(offer)
                return Response({'message' : 'Offer Added Successfully','data' : response})

        
        except APIException as api_exception:
            logger.error("Add Cake Offer Error - {}".format(api_exception))
            raise APIException({'message': api_exception})
        
        except Exception as e:
            print("Add Cake Offer Error - {}".format(e))
            logger.exception("Add Cake Offer Error - {}".format(e))
            raise APIException({'message' : custom_error_message})
        
class GetOffer(APIView):
    def get(self, request):
        offer_data = []
        try:
            offer_data = [offer_serializer(ht) for ht in cake_model.Offer.objects.filter(status=True).all()]
        except Exception as e:
            print("Get OFfer ERror {}".format(e))
            offer_data = []

        return JsonResponse({'data' : offer_data})
    
# @vinish
class GetOfferItems(APIView):
    
    permission_classes = []
    authentication_classes = []
    def get(self, request):
        offer_items_list = []
        try:
            current_datetime = timezone.now()
            # print(current_date)
            offer_items = cake_model.Offer.objects.filter(
                status=True,
                offer_from__lte=current_datetime,
                offer_to__gte=current_datetime
            )

            for offer in offer_items:
                if offer.id_list:
                    cake_prices = cake_model.CakePrice.objects.filter(id__in=offer.id_list)
                    for cake_price in cake_prices:
                        offer_item = {
                            'cake_price_id': cake_price.id if cake_price.id else None,
                            'cake_actual_price': cake_price.price,
                            'cake_offer_price': round(cake_price.price * (1 - float(offer.offer_per) / 100), 2) if offer.offer_per else round(cake_price.price, 2),
                            'offer':{
                                'offer_percentage': f"{offer.offer_per:.2f}" if offer.offer_per else "0.00",
                                'offer_from': offer.offer_from.isoformat() if offer.offer_from else None,
                                'offer_to': offer.offer_to.isoformat() if offer.offer_to else None,
                                'offer_id': offer.id,
                            },
                            'cake': {
                                'id': cake_price.cake.id if cake_price.cake else None,
                                'name': cake_price.cake.name if cake_price.cake else None,
                                'description': cake_price.cake.description if cake_price.cake else None,
                                'meta_title': cake_price.cake.meta_title if cake_price.cake else None,
                                'meta_description': cake_price.cake.meta_description if cake_price.cake else None,
                                'slug': cake_price.cake.slug if cake_price.cake else None,
                                'content': cake_price.cake.content if cake_price.cake else None,
                                'sub_category': {
                                    'id': cake_price.cake.sub_category.id if cake_price.cake and cake_price.cake.sub_category else None,
                                    'name': cake_price.cake.sub_category.name if cake_price.cake and cake_price.cake.sub_category else None
                                } if cake_price.cake else None,
                                'images': [
                                    getAWSUrl({
                                        'cake_id': cake_image.cake.id,
                                        'image_name': cake_image.image_name,
                                        'image_ext': cake_image.image_ext
                                    })
                                    for cake_image in cake_model.CakeImages.objects.filter(cake=cake_price.cake)
                                ] if cake_price.cake else []
                            },
                            'kg': {
                                'id': cake_price.kg.id if cake_price.kg else None,
                                'kg': cake_price.kg.kg if cake_price.kg else None,
                            } if cake_price.kg else None,
                        }
                        offer_items_list.append(offer_item)

            return JsonResponse({'data': offer_items_list, 'message': "Get Offer items Successful"}, status=200)
        
        except Exception as e:
            logger.error("Get Offer Error: {}".format(e))
            return JsonResponse({'data': []}, status=500)



class GetLatestCakeData(APIView):
    permission_classes = []
    authentication_classes = []
    def get(self, request):
        try:
            cake_data = [cake_serializer(ht) for ht in cake_model.Cake.objects.filter(status=True).order_by("-id")[:10]]
        except Exception as e:
            cake_data = []

        
        return Response({'data' : cake_data})
    



class DeleteCake(APIView):
    def delete(self, request, id=None):
        try:
            print(f"Delete ID = {id}")
            if id:
                cake_model.Cake.objects.filter(id=int(id)).update(status=False)
                return Response({'message' : "Cake Deleted Successfully"})
            else:
                raise APIException("ID Missing")
        except Exception as e:
            logger.exception(f"Delete Cake Error - {str(e)}")
            raise APIException({'message' : custom_error_message})
        



class DeleteCakeOffer(APIView):
    def delete(self, request, id=None):
        try:
            print(f"Delete ID = {id}")
            if id:
                cake_model.Offer.objects.filter(id=int(id)).update(status=False)
                return Response({'message' : "Offer Deleted Successfully"})
            else:
                raise APIException("ID Missing")
        except Exception as e:
            logger.exception(f"Delete Offer Error - {str(e)}")
            raise APIException({'message' : custom_error_message})

