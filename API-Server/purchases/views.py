from rest_framework.views import APIView
from rest_framework.response import Response
from datetime import datetime
from rest_framework.exceptions import APIException
from django.db import transaction
from django.forms.models import model_to_dict
from .models import Items, StockLocations, Purchase, PurchaseItems
from cakery.validators import validate_request
from .serializers import PurchaseSerializer, PurchaseItemsSerializer
from rest_framework.pagination import PageNumberPagination

class StockLocationView(APIView):

    def get(self, request):
        try:
            locations = StockLocations.objects.filter(deleted=0)
            locations_list = [model_to_dict(location) for location in locations]

            return Response({'message': 'Stock Locations Retrieved Successfully', 'data': locations_list})

        except Exception as e:
            print(f"Retrieve Stock Locations Error - {e}")
            raise APIException({'message': 'An error occurred while retrieving the stock locations.'})
        
    def post(self, request):
        try:
            data = validate_request(request, request.data)

            db_param = {
                "location_name": data.get('location_name', ''),
                "deleted": data.get('deleted', 0),
            }

            location_id = data.get('id', None)
            location_id_str = str(location_id) if location_id is not None else ''

            with transaction.atomic():
                if location_id_str and location_id_str.isdigit() and location_id_str != '0':
                    db_param['updated_at'] = datetime.now()
                    StockLocations.objects.filter(id=int(location_id_str)).update(**db_param)
                    location = StockLocations.objects.get(id=int(location_id_str))
                    message = 'Stock Location Updated Successfully'
                else:
                    db_param['created_at'] = datetime.now()
                    location = StockLocations.objects.create(**db_param)
                    message = 'Stock Location Created Successfully'

                response_data = model_to_dict(location)

                return Response({'message': message, 'data': response_data})

        except Exception as e:
            print(f"Create/Update Stock Location Error - {e}")
            raise APIException({'message': 'An error occurred while processing your request.'})

class PurchaseDetailView(APIView):
    def get(self, request, id, *args, **kwargs):
        try:
            purchase = Purchase.objects.prefetch_related('purchaseitems_set').get(id=id)
            serializer = PurchaseSerializer(purchase)
            return Response({'message': 'Purchase Retrieved Successfully', 'data': serializer.data})
        except Purchase.DoesNotExist:
            return Response({'message': 'Purchase not found.'}, status=404)
        except Exception as e:
            print(f"Retrieve Purchase Error - {e}")
            raise APIException({'message': 'An error occurred while retrieving the purchase.'})

class PurchaseView(APIView):

    # def get(self, request, *args, **kwargs):
    #     try:
    #         purchases = Purchase.objects.exclude(purchase_status=2).prefetch_related('purchaseitems_set')
    #         serializer = PurchaseSerializer(purchases, many=True)
    #         return Response({'message': 'Purchases Retrieved Successfully', 'data': serializer.data})
    #     except Exception as e:
    #         print(f"Retrieve Purchase Error - {e}")
    #         raise APIException({'message': 'An error occurred while retrieving purchases.'})

    def get(self, request, *args, **kwargs):
        try:
            today = datetime.today().date()
            start_date_str = request.query_params.get('start_date')
            end_date_str = request.query_params.get('end_date')
            
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else today
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else today

            # purchases = Purchase.objects.exclude(purchase_status=2).filter(
            #     created_at__date__range=[start_date, end_date]
            # ).prefetch_related('purchaseitems_set')

            purchases = Purchase.objects.exclude(purchase_status=2).filter(
                created_at__date__gte = start_date, created_at__date__lte = end_date
            ).prefetch_related('purchaseitems_set')

            total_purchases = purchases.count()

            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 5))

            paginator = PageNumberPagination()
            paginator.page_size = page_size
            paginated_purchases = paginator.paginate_queryset(purchases, request)

            serializer = PurchaseSerializer(paginated_purchases, many=True)
            return paginator.get_paginated_response({'message': 'Purchases Retrieved Successfully', 'data': serializer.data, 'total_length': total_purchases})

        except Exception as e:
            print(f"Retrieve Purchase Error - {e}")
            raise APIException({'message': 'An error occurred while retrieving purchases.'})


    def post(self, request, *args, **kwargs):
        try:
            data = validate_request(request, request.data)
            items_data = data.get('items', [])
            
            for item_data in items_data:
                item_id = item_data.get('item_id')
                if not Items.objects.filter(id=item_id).exists():
                    return Response({'error': f'Item with ID {item_id} does not exist.'}, status=400)
            
            with transaction.atomic():
                purchase_data = data.get('purchase')
                purchase_data['login_user'] = request.user.id

                purchase_serializer = PurchaseSerializer(data=purchase_data)
                if purchase_serializer.is_valid():
                    purchase = purchase_serializer.save()

                    PurchaseItems.objects.filter(purchase_id=purchase).delete()
                    
                    for item_data in items_data:
                        item_data['purchase_id'] = purchase.id
                        item_serializer = PurchaseItemsSerializer(data=item_data)
                        if item_serializer.is_valid():
                            item_serializer.save()
                        else:
                            return Response(item_serializer.errors, status=400)
                    
                    purchase_with_items = Purchase.objects.prefetch_related('purchaseitems_set').get(id=purchase.id)
                    response_data = PurchaseSerializer(purchase_with_items).data

                    return Response({'message': 'Purchase Created Successfully', 'data': response_data})
                else:
                    return Response(purchase_serializer.errors, status=400)
       
        except Exception as e:
            print(f"Create Purchase Error - {e}")
            raise APIException({'message': 'An error occurred while processing your request.'})

    def put(self, request, *args, **kwargs):
        try:
            data = validate_request(request, request.data)
            purchase_id = kwargs.get('id')

            items_data = data.get('items', [])

            for item_data in items_data:
                item_id = item_data.get('item_id')
                if not Items.objects.filter(id=item_id).exists():
                    return Response({'error': f'Item with ID {item_id} does not exist.'}, status=400)

            with transaction.atomic():
                try:
                    purchase = Purchase.objects.get(id=purchase_id)
                except Purchase.DoesNotExist:
                    return Response({'error': 'Purchase with the given ID does not exist.'}, status=404)

                purchase_data = data.get('purchase')
                purchase_data['login_user'] = request.user.id

                purchase_serializer = PurchaseSerializer(purchase, data=purchase_data, partial=True)
                if purchase_serializer.is_valid():
                    purchase = purchase_serializer.save()

                    for item_data in items_data:
                        item_id = item_data.get('item_id')

                        try:
                            purchase_item = PurchaseItems.objects.get(purchase_id=purchase, item_id=item_id)

                            if item_data.get('is_deleted', False):
                                purchase_item.delete()
                            else:
                                item_serializer = PurchaseItemsSerializer(purchase_item, data=item_data, partial=True)
                                if item_serializer.is_valid():
                                    item_serializer.save()
                                else:
                                    return Response(item_serializer.errors, status=400)
                        except PurchaseItems.DoesNotExist:
                            if not item_data.get('is_deleted', False):
                                item_data['purchase_id'] = purchase.id
                                item_serializer = PurchaseItemsSerializer(data=item_data)
                                if item_serializer.is_valid():
                                    item_serializer.save()
                                else:
                                    return Response(item_serializer.errors, status=400)
                                
                    purchase_with_items = Purchase.objects.prefetch_related('purchaseitems_set').get(id=purchase_id)
                    response_data = PurchaseSerializer(purchase_with_items).data

                    return Response({'message': 'Purchase Updated Successfully', 'data': response_data})
                    # return Response({'message': 'Purchase Updated Successfully', 'data': purchase_serializer.data})
                else:
                    return Response(purchase_serializer.errors, status=400)
        except Exception as e:
            print(f"Update Purchase Error - {e}")
            raise APIException({'message': 'An error occurred while processing your request.'})
    
    def delete(self, request, *args, **kwargs):
        try:
            purchase_id = kwargs.get('id')
            try:
                purchase = Purchase.objects.get(id=purchase_id)
            except Purchase.DoesNotExist:
                return Response({'error': 'Purchase with the given ID does not exist.'}, status=404)

            purchase.purchase_status = 2
            purchase.save()

            return Response({'message': 'Purchase Delete status updated successfully.'}, status=200)
        except Exception as e:
            print(f"Update Purchase Status Error - {e}")
            raise APIException({'message': 'An error occurred while processing your request.'})