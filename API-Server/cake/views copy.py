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


from cake import models as cake_model
from category import models as category_model
from kg.models import Kg as KGModel
from cake.models import CakePrice as CakePriceModel

from cake.serializers import cake_serializer

class GetCakeList(APIView):
    def get(self ,request):
        cake_data = []
        try:
            # order = request.query_params['sort']
            if "search" in request.query_params:
                searchKey = request.query_params['search']
                CakeObj = cake_model.Cake.objects.filter(name__icontains=searchKey)
                cake_data = [cake_serializer(ht) for ht in  CakeObj]
            elif "category" in request.query_params:
                categoryKey = request.query_params['category']
                CakeObj = cake_model.Cake.objects.filter(sub_category=categoryKey)
                cake_data = [cake_serializer(ht) for ht in  CakeObj]

            else:
                CakeObj = cake_model.Cake.objects.all()
                cake_data = [cake_serializer(ht) for ht in  CakeObj]
        except Exception as e:
            cake_data = []
            print("Get Cake List Error - {}".format(e))

        
        return Response({'data' : cake_data})
    
class GetCakeData(APIView):
    def get(self, request, id):
        try:
            cakeID = id
            if cakeID:
                if(cake_model.Cake.objects.filter(id=int(cakeID)).exists()):
                    cake_data = cake_serializer(cake_model.Cake.objects.get(id=int(cakeID)))
                else:
                    raise APIException("Cake Not Found")

        except Exception as e:
            cake_data = []
            raise APIException("Cake Not Found".format(e))
        
        return Response({'data' : cake_data})

class CreateCake(APIView):
    @transaction.atomic
    def post(self, request):
        try:
            data = validate_request(request, request.data)
            print("Cake Payload = ",data)
            
            form_data = request.POST  # Non-file data
            image_files = request.FILES

            db_param = {
                "name" : data['name'],
                "price" : data['price'],
                "description" : data['description'],
                "tag" : data['tag'].split(','), #tag array conversion
                "sub_category" : category_model.SubCategory.objects.get(id=int(data['sub_category'])),
                "seo_url" : data['seo_url'],
                "seo_text" : data['seo_text'],
            }

            def save_cake_price(cake_id):
                try:
                    cake = cake_model.Cake.objects.get(id=int(cake_id))
                    # Vinish
                    kg_list_data = []

                    for key in form_data.keys():
                        if key.startswith('kg_list['):
                            
                            index_start = key.find('[')
                            index_end = key.find(']')
                            index = int(key[index_start + 1:index_end])
                            
                            kg = form_data[f'kg_list[{index}][kg]']
                            price = float(form_data[f'kg_list[{index}][price]'])
                            kg_item  = {
                                'id': form_data[f'kg_list[{index}][id]'],
                                'kg': kg,
                                'price': price
                            }

                            kg_list_data.append(kg_item)

                    seen_kgs = set()
                    unique_kg_list = [item for item in kg_list_data if not (item['kg'] in seen_kgs or seen_kgs.add(item['kg']))]
                    # end

                    if "unique_kg_list":
                        for kgd in unique_kg_list:
                            kg_db_param = {
                                "cake" : cake,
                                "kg" : KGModel.objects.get(id=int(kgd['kg'])),
                                "price" : float(kgd['price'])
                            }
                            print("kg_db_param", kg_db_param)
                            cp_id = kgd['id']
                            if (str(cp_id) == "0"):
                                kg_db_param['created_by'] = request.user
                                kg_db_param['created_on'] = datetime.now()
                                CakePriceModel.objects.create(**kg_db_param)
                            else:
                                kg_db_param['updated_by'] = request.user
                                kg_db_param['updated_on'] = datetime.now()
                                CakePriceModel.objects.filter(id=int(cp_id)).update(**kg_db_param)


                except Exception as e:
                    print("Save Cake Price Error - {}".format(e))
                    raise APIException(custom_error_message)

            

            def upload_cake_image(cake_id):
                try:
                    cake = cake_model.Cake.objects.get(id=int(cake_id))

                    # Vinish
                    image_list_data = []
                    
                    for key in form_data.keys():
                        if key.startswith('image_list['):
                            
                            index_start = key.find('[')
                            index_end = key.find(']')
                            index = int(key[index_start + 1:index_end])
                            
                            index_id = int(form_data[f'image_list[{index}][index]'])
                            is_deleted = False #(form_data[f'image_list[{index}][is_deleted]'])
                            image = image_files[f'image_list[{index}][image]']
                            image_item  = {
                                'id': int(form_data[f'image_list[{index}][id]']),
                                'index': index_id,
                                'image': image,
                                'is_deleted': is_deleted
                            }

                            image_list_data.append(image_item)


                    seen_imgs = set()
                    unique_image_list = [item for item in image_list_data if not (item['index'] in seen_imgs or seen_imgs.add(item['index']))]
                    # end

                    if "unique_image_list":
                        for img in unique_image_list:
                            img_id = img["id"]
                            if img["is_deleted"] == True:
                                cake_model.CakeImages.objects.filter(id=int(img_id)).delete()
                            else:
                                image = img["image"]
                                if (image != None and image != "null"):
                                    print("Image  = ",image," Image Name = ",image.name)
                                    file_name = str(uuid.uuid4())
                                    ext = image.name.split('.')[-1]

                                    if put_image_to_s3(image, "{}/cake/{}/{}.{}".format(aws_domain_name, str(cake_id), file_name, ext)):
                                        # cake.image_name = file_name
                                        # cake.image_ext = ext
                                        # cake.save()
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
            
            c_id = str(data['id'])

            if c_id and c_id.isdigit() and c_id != '0':
                db_param['updated_by'] = request.user
                db_param['updated_on'] = datetime.now()
                cake_model.Cake.objects.filter(id=int(c_id)).update(**db_param)
                upload_cake_image(c_id)
                save_cake_price(c_id)
                cake = cake_model.Cake.objects.get(id=int(c_id))
                response = cake_serializer(cake)
                return Response({'message' : 'Cake Updated Successfully !!!!!', 'data' : response})
            else:
                db_param['created_by'] = request.user
                db_param['created_on'] = datetime.now()
                cake = cake_model.Cake.objects.create(**db_param)
                upload_cake_image(cake.id)
                save_cake_price(cake.id)
                response = cake_serializer(cake)
                return Response({'message' : 'Cake Created Successfully !!!!!', 'data' : response})            

        
        except APIException as api_exception:
            raise APIException({'message': api_exception})

        except Exception as e:
            print("Create Cake Exception - {}".format(e))
            raise APIException({'message' : custom_error_message})

