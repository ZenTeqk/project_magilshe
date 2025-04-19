from django.conf import settings
from cakery.common import aws_domain_name

def gallery_serializer(obj):
    res = dict()
    
    res['id'] = obj.id
    res['description'] = obj.description 
    res['image_url'] = None if(obj.image_name == "" or obj.image_name == None) else f'{settings.IMAGE_BASE_URL}/{aws_domain_name}/gallery/{obj.image_name}.{obj.image_ext}'
    
    return res