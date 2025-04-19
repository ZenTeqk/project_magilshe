from rest_framework import serializers
from .models import Purchase, PurchaseItems
from items.models import Items

class ItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = Items
        fields = '__all__'  

class PurchaseItemsSerializer(serializers.ModelSerializer):
    item = ItemSerializer(source='item_id', read_only=True)
    class Meta:
        model = PurchaseItems
        fields = '__all__'

class PurchaseSerializer(serializers.ModelSerializer):
    purchase_items = PurchaseItemsSerializer(many=True, read_only=True, source='purchaseitems_set')

    class Meta:
        model = Purchase
        fields = '__all__'
    
