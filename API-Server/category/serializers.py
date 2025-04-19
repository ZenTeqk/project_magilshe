from django.conf import settings
from cakery.common import aws_domain_name

def main_category_serializer(obj):
    res = dict()

    res['id'] = obj.id 
    res['name'] = obj.name 
    res['description'] = obj.description 
    res['meta_title'] = obj.meta_title 
    res['meta_description'] = obj.meta_description 
    res['slug'] = obj.slug 
    res['content'] = obj.content 
    res['image_url'] = None if(obj.image_name == "" or obj.image_name == None) else f'{settings.IMAGE_BASE_URL}/{aws_domain_name}/category/main/image/{obj.image_name}.{obj.image_ext}'

    return res


def sub_category_serializer(obj):
    res = dict()

    res['id'] = obj.id

    main_category = {
        "id" : obj.main_category.id,
        "name" : obj.main_category.name 
    }

    res['main_category'] = main_category

    res['name'] = obj.name 
    res['description'] = obj.description 
    res['meta_title'] = obj.meta_title 
    res['meta_description'] = obj.meta_description 
    res['slug'] = obj.slug 
    res['content'] = obj.content
    res['image_url'] = None if(obj.image_name == "" or obj.image_name == None) else f'{settings.IMAGE_BASE_URL}/{aws_domain_name}/category/sub/image/{obj.image_name}.{obj.image_ext}'

    return res