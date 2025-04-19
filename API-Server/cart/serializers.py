from cake.models import CakeImages
from customer.models import CustomerAddress
from django.conf import settings
from cakery.common import aws_domain_name
from cake.serializers import cake_serializer
from kg.serializers import kg_serializer

def my_cart_serializer(obj):
    res = {
        'id': obj.id,
        'cake_price_id': obj.cake_price.id if obj.cake_price else None,
        'price': obj.price,
        'qty': obj.qty,
        'greeting_text': obj.greeting_text
    }

    cake_obj = obj.cake_price.cake
    sub_category_obj = cake_obj.sub_category
    main_category_obj = sub_category_obj.main_category
    price_list_obj = obj.cake_price.kg

    # Structure for cake details
    cake = {
        'id': cake_obj.id,
        'name': cake_obj.name,
        'sub_category': {
            'id': sub_category_obj.id,
            'name': sub_category_obj.name
        },
        'main_category': {
            'id': main_category_obj.id,
            'name': main_category_obj.name
        },
        'price_list': {
            'id': price_list_obj.id,
            'kg': price_list_obj.kg,
            'price': obj.cake_price.price
        },
        'images': [
            {
                'id': img.id,
                'url': None if not img.image_name else f"{settings.IMAGE_BASE_URL}/{aws_domain_name}/cake/{cake_obj.id}/{img.image_name}.{img.image_ext}"
            }
            for img in cake_obj.cakeimages_set.all()
        ]
    }

    # Customer details
    customer = {
        'id': obj.customer.id,
        'name': obj.customer.first_name,
        'phone': obj.customer.phone
    }

    # Occasion details
    occasion = None
    if obj.occasion:
        occ = obj.occasion
        occasion = {
            'id': occ.id,
            'type': occ.type,
            'date': occ.date,
            'person_name': occ.person_name,
            'person_phone': occ.person_phone
        }

    # Collect addresses once, remove loop over CustomerAddress
    address = [
        {
            'id': addr.title,
            'address': addr.address,
            'city': addr.city,
            'pincode': addr.pincode
        }
        for addr in obj.customer.customeraddress_set.all()
    ]

    res['cake'] = cake
    res['customer'] = customer
    # res['address'] = address  # Uncomment if addresses need to be included
    res['occasion'] = occasion

    return res


def cart_serializer(obj):

    res = dict()

    res['id'] = obj.id
    if obj.cake_price:
        res['cake_price_id'] = obj.cake_price.id
        cake_obj = obj.cake_price.cake
    else:
        res['cake_price_id'] = None
        cake_obj = None
        
    
    if not cake_obj is None:        
        cake = {
            "id" : cake_obj.id,
            "name" : cake_obj.name,
        }

        sub_category_obj = cake_obj.sub_category
        sub_category = {
            "id" : sub_category_obj.id,
            "name" : sub_category_obj.name
        }

        main_category_obj = sub_category_obj.main_category
        main_category = {
            "id" : main_category_obj.id,
            "name" : main_category_obj.name
        }

        unit = None

        if cake_obj.unit:
            unit = {
                "id" : cake_obj.unit.id,
                "name" : cake_obj.unit.name
            }

        cake['unit'] = unit

        price_list_obj = obj.cake_price.kg
        price_list = {
            "id" : price_list_obj.id,
            "kg" : price_list_obj.kg,
            "price" : obj.cake_price.price
        }

        address = []
        address_list_obj = CustomerAddress.objects.filter(customer=int(obj.customer.id)).all()
        for alo in address_list_obj:
            address.append({
                "id" : alo.title,
                "address" : alo.address,
                "city" : alo.city,
                "pincode" : alo.pincode,
            })
        

        images = []
        cake_images_obj = CakeImages.objects.filter(cake=int(cake_obj.id)).all()
        for cil in cake_images_obj:
            images.append({
                "id" : cil.id,
                "url" : None if(cil.image_name == "" or cil.image_name == None) else "{}/{}/cake/{}/{}.{}".format(settings.IMAGE_BASE_URL, aws_domain_name, str(cake_obj.id), cil.image_name, cil.image_ext)
            })
            
        
        
        cake['sub_category'] = sub_category
        cake['main_category'] = main_category
        cake['price_list'] = price_list
        cake['images'] = images
        
            
    else:
        cake = None
        images = []
        address = []

    customer = {
        "id" : obj.customer.id,
        "name" : obj.customer.first_name,
        "phone" : obj.customer.phone,
    }

    
    res['cake'] = cake
    res['customer'] = customer
    # res['address'] = address
    res['price'] = obj.price
    res['qty'] = obj.qty
    res['greeting_text'] = obj.greeting_text


    occasion = None

    occ = obj.occasion

    if not occ is None:
        occasion = {
            "id" : occ.id,
            "type" : occ.type,
            "date" : occ.date,
            "person_name" : occ.person_name,
            "person_phone" : occ.person_phone,
        }

    
    res['occasion'] = occasion

    return res