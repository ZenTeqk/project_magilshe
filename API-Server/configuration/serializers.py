from django.conf import settings
from cakery.common import aws_domain_name
from rest_framework import serializers
from .models import Configuration, TermsAndConditions, PrivacyPolicy

def configuration_serializer(obj):

    res = dict()

    res["id"] = obj.id
    res["name"] = obj.name
    res['url'] = None if(obj.image_name == "" or obj.image_name == None) else f'{settings.IMAGE_BASE_URL}/{aws_domain_name}/logo/{obj.image_name}.{obj.image_ext}'
    res["mobile"] = obj.mobile
    res["email"] = obj.email
    res["website"] = obj.website
    res["gst_number"] = obj.gst_number
    res["food_license_number"] = obj.food_license_number
    res["company_address"] = obj.company_address
    res["map_iframe_link"] = obj.map_iframe_link
    res["description"] = obj.description
    res["return_policy"] = obj.return_policy
    res["greeting_text"] = obj.greeting_text
    res["meta"] = obj.meta

    return res

class ConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Configuration
        fields = '__all__'

class TermsAndConditionsSerializer(serializers.ModelSerializer):
    class Meta:
        model = TermsAndConditions
        fields = ['content']

class PrivacyPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = PrivacyPolicy
        fields = ['content']

