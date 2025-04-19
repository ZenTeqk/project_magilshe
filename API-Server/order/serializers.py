from cart.models import Cart
from cart.serializers import cart_serializer
from delivery_person.serializers import delivery_person_serializer
from rest_framework import serializers
from unit.models import unit
from category.models import SubCategory, MainCategory

from customer.models import Customer, CustomerAddress
from delivery_person.models import DeliveryPerson
from cake.models import Cake, CakePrice, Offer, CakeImages
from kg.models import Kg
from occasion.models import Occasion
from order.models import CakeOrder
from django.conf import settings
from cakery.common import aws_domain_name

def cake_order_serialier(obj):

    res = dict()
    print(obj.cart_id_list)
    res['id'] = obj.id
    res['cart_id_list'] = [] if(obj.cart_id_list == None) else obj.cart_id_list

    print("Cart Id List = ",obj.cart_id_list)

    res['cart_details'] = [] if(obj.cart_id_list == None) else [cart_serializer(Cart.objects.get(id=int(ht))) for ht in obj.cart_id_list]
   
    res['order_time'] = obj.order_time
    res['delivery_time'] = obj.delivery_time
    res['delivery_status'] = obj.delivery_status
    res['tracking_link'] = obj.tracking_link

    customer = {
        "id" : obj.customer.id,
        "name" : obj.customer.first_name,
        "phone" : obj.customer.phone,
        "email" : obj.customer.email,
    }

    delivery_person = {
        "name" : obj.delivery_person_name,
        "phone" : obj.delivery_person_phone,        
    }

    delivery_partner = None

    if not obj.delivery_partner == None:
        delivery_partner = delivery_person_serializer(obj.delivery_partner)

    delivery_address = {
        "address_title" : obj.delivery_address.title,
        "address" : obj.delivery_address.address,
        "id" : obj.delivery_address.id,
    }

    res['customer'] = customer
    res['delivery_address'] = delivery_address
    res['delivery_person'] = delivery_person
    res['delivery_partner'] = delivery_partner
    res['is_manual_order'] = obj.is_manual_order


    return res

# Serializers @vinish
class SubCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SubCategory
        fields = ['id', 'name']

class UnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = unit
        fields = ['id', 'name']

class OfferSerializer(serializers.ModelSerializer):
    id_list = serializers.ListField(child=serializers.PrimaryKeyRelatedField(queryset=Cake.objects.all()), allow_empty=True)

    class Meta:
        model = Offer
        fields = ['id', 'name', 'type', 'id_list', 'image_name', 'image_ext', 'offer_per', 'offer_from', 'offer_to', 'status', 'created_on', 'created_by', 'updated_by', 'updated_on']

class CakeSerializer(serializers.ModelSerializer):
    sub_category = SubCategorySerializer()
    unit = UnitSerializer()
    images_list = serializers.SerializerMethodField()

    class Meta:
        model = Cake
        fields = ['id', 'name', 'description', 'sub_category', 'unit', 'tag', 'seo_url', 'seo_text', 'price', 'created_on', 'created_by', 'images_list', 'updated_by', 'updated_on']

    def get_images_list(self, obj):

        cake_image_list = []
        cake_images_obj = CakeImages.objects.filter(cake=obj.id)

        for cil in cake_images_obj:
            image_url = (
                None 
                if not cil.image_name 
                else f"{settings.IMAGE_BASE_URL}/{aws_domain_name}/cake/{obj.id}/{cil.image_name}.{cil.image_ext}"
            )
            cake_image_list.append({
                "id": cil.id,
                "url": image_url
            })

        return cake_image_list

class KgSerializer(serializers.ModelSerializer):
    class Meta:
        model = Kg
        fields = ['id', 'kg']

class CakePriceSerializer(serializers.ModelSerializer):
    cake = CakeSerializer()
    kg = KgSerializer()

    class Meta:
        model = CakePrice
        fields = ['id', 'cake', 'kg', 'price', 'created_on', 'created_by', 'updated_by', 'updated_on']

class OccasionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Occasion
        fields = ['id', 'type', 'date', 'person_name', 'person_phone', 'created_on', 'updated_on']

# class CartSerializer(serializers.ModelSerializer):
#     cake_price = CakePriceSerializer()

#     class Meta:
#         model = Cart
#         fields = [
#             'id', 'customer', 'cake_price', 'price', 'qty', 
#             'greeting_text', 'occasion', 
#             'status', 'created_on', 'updated_on'
#         ]

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ['id', 'username', 'email', 'phone', 'phone_verified_at', 'email_verified_at', 'profile_picture_name', 'profile_picture_ext']

class DeliveryPersonSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryPerson
        fields = ['id', 'name', 'dob', 'email', 'phone', 'address', 'status']

class CustomerAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerAddress
        fields = ['id', 'customer', 'title', 'address', 'city', 'pincode', 'is_primary', 'created_on', 'created_by', 'updated_by', 'updated_on']

class CartSerializer(serializers.ModelSerializer):
    cake_price = CakePriceSerializer()
    occasion = OccasionSerializer()

    class Meta:
        model = Cart
        fields = ['id', 'customer', 'cake_price', 'price', 'qty', 'greeting_text', 'occasion', 'status', 'created_on', 'updated_on']

class CakeOrderSerializer(serializers.ModelSerializer):
    customer = CustomerSerializer()
    delivery_partner = DeliveryPersonSerializer()
    delivery_address = CustomerAddressSerializer()
    cart_items = serializers.SerializerMethodField()

    class Meta:
        model = CakeOrder
        fields = ['id', 'cart_id_list', 'customer', 'total_amount', 'total_qty', 'order_time', 'delivery_time', 'delivery_person_name', 'delivery_person_phone', 'delivery_partner', 'delivery_address', 'delivery_status', 'tracking_link', 'manual_order_type','is_manual_order', 'created_on', 'updated_on', 'cart_items']

    def get_cart_items(self, obj):
        if obj.cart_id_list and isinstance(obj.cart_id_list, list):
            cart_items = Cart.objects.filter(id__in=obj.cart_id_list)
            return CartSerializer(cart_items, many=True).data
        return []