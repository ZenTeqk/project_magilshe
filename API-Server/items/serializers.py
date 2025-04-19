from rest_framework import serializers
from .models import Items
from category.models import SubCategory
from tax.models import TaxCategory

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SubCategory 
        fields = ['id', 'name']  

class TaxCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxCategory 
        fields = ['id', 'tax_category', 'tax_percentage']  

class GetItemsSerializer(serializers.ModelSerializer):
    category = CategorySerializer()
    tax_category = TaxCategorySerializer()

    class Meta:
        model = Items
        fields = ['id', 'name', 'category', 'description', 'hsn_code', 'purchase_price', 'mrp_price', 'retail_price', 'wholesale_price', 'receiving_quantity', 'is_serialized', 'is_stock', 'is_deleted', 'tax_category', 'created_at', 'updated_at']

class ItemsSerializer(serializers.ModelSerializer):

    class Meta:
        model = Items
        fields = ['id', 'name', 'category', 'description', 'hsn_code', 'purchase_price', 'mrp_price', 'retail_price', 'wholesale_price', 'receiving_quantity', 'is_serialized', 'is_stock', 'is_deleted', 'tax_category', 'created_at', 'updated_at']
        extra_kwargs = {
            'created_at': {'read_only': True},
            'updated_at': {'read_only': True},
            'name' : {'required': True},
            'hsn_code' : {'required': False},
            'description': {'required': False},
            'purchase_price': {'required': True},
        }
