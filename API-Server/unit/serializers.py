from rest_framework import serializers


def unit_serializer(obj):
    res = dict()

    res['id'] = obj.id
    res['name'] = obj.name
    res['description'] = obj.description
    res['is_variant'] = obj.is_variant

    return res