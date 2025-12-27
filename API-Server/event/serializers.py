from django.conf import settings
from cakery.common import aws_domain_name
from cake.models import Cake
from cake.serializers import CakeSerializer
from event.models import EventOrderItems

def event_serializer(obj):
    res = {
        "id": obj.id,
        "name" : obj.name,
        "place" : obj.place,
        "start" : obj.start,
        "end" : obj.end,
        "description" : obj.description,
        "cake_id_list" : obj.cake_id_list,
        "url" :  None if(obj.image_name == "" or obj.image_name == None) else f'{settings.IMAGE_BASE_URL}/{aws_domain_name}/event/{obj.image_name}.{obj.image_ext}',
        "status" : obj.status
    }

    cake_details = []

    for c in obj.cake_id_list:
        ck = Cake.objects.filter(id=int(c), status=True).first()

        if ck:
            cake_details.append(CakeSerializer(ck).data)

    res['cake_details'] = cake_details
    
    return res



def event_order_serializer(obj):
    res = {
        "id" : obj.id,
        "name" : obj.name,
        "phone" : obj.phone,
        "email" : obj.email,
        "notes" : obj.notes,
        "address" : obj.address,
        "total_amount" : obj.total_amount
    }

    cake_price_details = []

    event_order_items = EventOrderItems.objects.filter(event_order=obj.id).all()

    for eo in event_order_items:
        cake_price_details.append(
            {
                "id" : eo.cake_price.id,
                "cake_id" : eo.cake_price.cake.id,
                "qty" : eo.qty
            }
        )

    res['cake_price_details'] = cake_price_details

    return res