from django.shortcuts import render
import logging

# Create your views here.
from datetime import datetime

from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import APIException

from cakery.validators import validate_request

from cakery.common import custom_error_message

from unit import models as unit_model
from unit.serializers import unit_serializer

logger = logging.getLogger('cakery')

# Create your views here.

class UnitOperations(APIView):

    def get(self, request):
        unit_data = []

        try:            
            unitObj = unit_model.unit.objects.filter(is_deleted=False)           
            unit_data = [unit_serializer(ht) for ht in unitObj]

        except Exception as e:
            unit_data = []
        
        return Response({'data' : unit_data})
    
    def post(self, request):
        try:
            data = validate_request(request, request.data)

            db_param = {
                "name" : data['name'],
                "description" : data['description'],
            }
            
            if "is_variant" in data:
                db_param["is_variant"] = data['is_variant']

            u_id_get = data.get('id', None)
            u_id = str(u_id_get) if u_id_get is not None else ''

            if unit_model.unit.objects.filter(name=db_param['name']).exclude(id=u_id_get).exists():
                return Response({'message': 'A unit with this name already exists.'}, status=400)

            if u_id and u_id.isdigit() and u_id != '0':
                db_param['updated_by'] = request.user
                db_param['updated_on'] = datetime.now()
                unit_model.unit.objects.filter(id=int(u_id)).update(**db_param)
                unit = unit_model.unit.objects.get(id = int(u_id))
                response = unit_serializer(unit)
                return Response({'message' : 'Unit Updated Successfully','data' : response})
            else:
                db_param['created_by'] = request.user
                db_param['created_on'] = datetime.now()
                unit = unit_model.unit.objects.create(**db_param)
                response = unit_serializer(unit)
                return Response({'message' : 'Unit Created Successfully','data' : response})

        except Exception as e:
            print("Create Unit Error - {}".format(e))
            logger.exception("Create Unit Error - {}".format(e))
            raise APIException({'message' : 'An error occurred while processing your request...'})
