from tag.models import Tag
from django.conf import settings
from cakery.common import aws_domain_name
from cake.models import CakePrice, CakeImages, Offer
import pytz
from datetime import datetime

def cake_serializer(obj):

    local_tz = pytz.timezone('Asia/Kolkata')

    res = dict()

    res['id'] = obj.id
    res['name'] = obj.name
    res['price'] = obj.price
    res['description'] = obj.description
    res['seo_url'] = obj.seo_url
    res['seo_text'] = obj.seo_text

    sub_category = {
        "id" : obj.sub_category.id,
        "name" : obj.sub_category.name
    }
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
            tag_details.append({
                "id" : int(t),
                "tag" : Tag.objects.get(id=int(t)).tag
            })

    res['tag_details'] = tag_details

    cake_price_list = []

    cake_price_obj = CakePrice.objects.filter(cake=int(obj.id)).all()

    for cpl in cake_price_obj:


        

        now = datetime.now().astimezone(local_tz)

        offer_obj = Offer.objects.filter(id_list__contains=cpl.id, offer_from__gte=now, offer_to__lte=now).first()

        if offer_obj is None:
            price = 0

        if(offer != None and cpl.has_offer == True):
            cake_price_after_offer = round(float(cpl.price) - (((float(cpl.price)) * (float(offer.offer_per) / 100))),2)
        else:
            cake_price_after_offer = round(float(cpl.price), 2)



        cake_price_list.append({
            "id" : cpl.id,
            "cake_id" : cpl.cake.id,
            "kg_id" : cpl.kg.id,
            "kg" : cpl.kg.kg,
            "price" : cpl.price,
        })
    
    res['price_list'] = cake_price_list

    cake_image_list = []

    cake_images_obj = CakeImages.objects.filter(cake=int(obj.id)).all()

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

    return res