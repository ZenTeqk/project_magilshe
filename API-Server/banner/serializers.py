from django.conf import settings
from cakery.common import aws_domain_name

def banner_serializer(obj):
    res = {
        "id": obj.id,
        "main_text" : obj.main_text,
        "sub_text" : obj.sub_text,
        "url" :  None if(obj.image_name == "" or obj.image_name == None) else f'{settings.IMAGE_BASE_URL}/{aws_domain_name}/banner/{obj.image_name}.{obj.image_ext}',
        "status" : obj.status
    }
    
    return res