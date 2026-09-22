from tag.models import Tag
from django.conf import settings
from cakery.common import aws_domain_name
from cake.models import CakePrice, CakeImages, Offer
import pytz
from datetime import datetime
from django.utils import timezone
from rest_framework import serializers
from .models import Cake
from unit.models import unit
from category.models import SubCategory, MainCategory

class MainCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = MainCategory
        fields = ['id', 'name']

class UnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = unit
        fields = ['id', 'name', 'description', 'is_variant']

class SubCategorySerializer(serializers.ModelSerializer):
    main_category = MainCategorySerializer(read_only=True)

    class Meta:
        model = SubCategory
        fields = ['id', 'name', 'main_category']

class CakePriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = CakePrice
        fields = ['id', 'cake', 'kg', 'price']  

class CakeSerializer(serializers.ModelSerializer):
    sub_category = SubCategorySerializer(read_only=True)
    unit = UnitSerializer(read_only=True)
    price_list = serializers.SerializerMethodField()
    images_list = serializers.SerializerMethodField()

    class Meta:
        model = Cake
        fields = [
            'id', 'name', 'description', 'sub_category', 'unit', 'tag', 'seo_url',
              'seo_text', 'price', 'price_list', 'images_list', 'meta_title', 'meta_description',
                'slug', 'content'
        ]

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

    def get_price_list(self, obj):
        cake_price_list = []

        cake_price_obj = CakePrice.objects.filter(cake=obj.id)

        now = timezone.now()

        for cpl in cake_price_obj:
            offer_obj = Offer.objects.filter(
                id_list__contains=cpl.id, 
                offer_from__lte=now, 
                offer_to__gte=now
            ).first()

            if offer_obj is None:
                cake_price_after_offer = round(float(cpl.price), 2)
                offer_percentage = None
            else:
                cake_price_after_offer = round(
                    float(cpl.price) - (float(cpl.price) * (float(offer_obj.offer_per) / 100)), 2
                )
                offer_percentage = offer_obj.offer_per

            cake_price_list.append({
                "id": cpl.id,
                "cake_id": cpl.cake.id,
                "kg_id": cpl.kg.id,
                "kg": cpl.kg.kg,
                "price": cpl.price,
                "offer_percentage": offer_percentage,
                "cake_price_after_offer": cake_price_after_offer
            })

        return {'price_list': cake_price_list}


def cake_serializer(obj):

    local_tz = pytz.timezone('Asia/Kolkata')

    res = dict()

    res['id'] = obj.id
    res['name'] = obj.name
    res['price'] = obj.price
    res['description'] = obj.description 
    res['meta_title'] = obj.meta_title 
    res['meta_description'] = obj.meta_description 
    res['slug'] = obj.slug 
    res['content'] = obj.content
    res['seo_url'] = obj.seo_url
    res['seo_text'] = obj.seo_text

    sub_category = {
        "id" : obj.sub_category.id,
        "name" : obj.sub_category.name
    }
    
    if obj.unit:
        res['unit'] = {
            'id': obj.unit.id,
            'name': obj.unit.name,
            'is_variant': obj.unit.is_variant,
        }
    else:
        res['unit'] = None

    main_category = {
        "id" : obj.sub_category.main_category.id,
        "name" : obj.sub_category.main_category.name
    }

    res['sub_category'] = sub_category
    res['main_category'] = main_category

    res['tag'] = obj.tag   

    tag_details = []

    if not obj.tag == None:
        for t in obj.tag:
            tag_id = int(t)
            tag_name_map = getattr(obj, '_tag_name_map', None)
            tag_name = tag_name_map.get(tag_id) if tag_name_map is not None else Tag.objects.filter(id=tag_id).values_list('tag', flat=True).first()
            if tag_name is not None:
                tag_details.append({"id": tag_id, "tag": tag_name})

    res['tag_details'] = tag_details

    cake_price_list = []

    cake_price_obj = getattr(obj, '_prefetched_prices', None)
    if cake_price_obj is None:
        cake_price_obj = CakePrice.objects.filter(cake=int(obj.id)).select_related('cake', 'kg')

    for cpl in cake_price_obj:       

        now = timezone.now()

        # offer_obj = Offer.objects.filter(id_list__contains=cpl.id, offer_from__gt=now, offer_to__lt=now).first()
        active_offers = getattr(obj, '_active_offers', None)
        if active_offers is None:
            offer_obj = Offer.objects.filter(id_list__contains=cpl.id, offer_from__lte=now, offer_to__gte=now).first()
        else:
            offer_obj = next((offer for offer in active_offers if cpl.id in (offer.id_list or [])), None)

        
        if offer_obj is None:
            cake_price_after_offer = round(float(cpl.price), 2)
            offer_percentage = None
        else:
            cake_price_after_offer = round(float(cpl.price) - (((float(cpl.price)) * (float(offer_obj.offer_per) / 100))),2)
            offer_percentage =  offer_obj.offer_per,

        cake_price_list.append({
            "id" : cpl.id,
            "cake_id" : cpl.cake.id,
            "kg_id" : cpl.kg.id,
            "kg" : cpl.kg.kg,
            "price" : cpl.price,
            "offer_percentage" :  offer_percentage,
            "cake_price_after_offer" : cake_price_after_offer
        })
    
    res['price_list'] = cake_price_list

    cake_image_list = []

    cake_images_obj = getattr(obj, '_prefetched_images', None)
    if cake_images_obj is None:
        cake_images_obj = CakeImages.objects.filter(cake=int(obj.id)).select_related('cake')

    for cil in cake_images_obj:
        cake_image_list.append({
            "id" : cil.id,
            "cake_id" : cil.cake.id,
            "url" : None if(cil.image_name == "" or cil.image_name == None) else "{}/{}/cake/{}/{}.{}".format(settings.IMAGE_BASE_URL, aws_domain_name, str(obj.id), cil.image_name, cil.image_ext)
        })
    
    res['images'] = cake_image_list

    return res

def offer_serializer(obj):

    res = dict()

    res['id'] = obj.id
    res['name'] = obj.name
    res['type'] = obj.type
    res['id_list'] = obj.id_list
    res['offer_per'] = obj.offer_per
    res['offer_from'] = obj.offer_from
    res['offer_to'] = obj.offer_to
    res['status'] = obj.status
    res['url'] = None if(obj.image_name == "" or obj.image_name == None) else "{}/{}/offer/banner/{}.{}".format(settings.IMAGE_BASE_URL, aws_domain_name, obj.image_name, obj.image_ext)

    if obj.id_list:
        cake_prices = CakePrice.objects.filter(id__in=obj.id_list)
        cake_obj = []

        for item in cake_prices:
            cake_obj.append({
                "id": item.id,
                "cake_id": item.cake.id,
                "cake_name": item.cake.name,
                "sub_category_name": item.cake.sub_category.name,
                "kg_id": item.kg.id,
                "kg_name": item.kg.kg,
                "price": item.price,
            })

        unique_cake_ids = list({item['cake_id'] for item in cake_obj})
        res['cake_list'] = unique_cake_ids
        res['cake_price'] = cake_obj

    return res

def getAWSUrl(data):

    image_url = None if(data['image_name'] == "" or data['image_name'] == None) else "{}/{}/cake/{}/{}.{}".format(settings.IMAGE_BASE_URL, aws_domain_name, str(data['cake_id']), data['image_name'], data['image_ext'])

    return image_url
