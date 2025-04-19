from django.db import transaction, IntegrityError
from django.shortcuts import render
from rest_framework.response import Response
from rest_framework import generics, status
from .models import TaxCategory
from rest_framework.views import APIView
from .serializers import TaxCategorySerializer

class TaxCategoryAPIView(APIView):

    def get(self, request):
        try:
            queryset = TaxCategory.objects.filter(is_deleted=False)
            serializer = TaxCategorySerializer(queryset, many=True)
            return Response({'data': serializer.data, 'message': "Success"}, status=status.HTTP_200_OK)
        
        except Exception as e:
            print(f"Error in GET TaxCategory - {e}")
            return Response({'message': 'An error occurred while processing your request.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


    @transaction.atomic
    def post(self, request):
        serializer = TaxCategorySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    

    @transaction.atomic
    def put(self, request, pk):
        try:
            tax_category = TaxCategory.objects.get(pk=pk, is_deleted=False)
        except TaxCategory.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = TaxCategorySerializer(tax_category, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
