from rest_framework import serializers
from .models import Kg, unit
from unit.models import unit

class UnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = unit
        fields = ['id', 'name'] 

class GetKgSerializer(serializers.ModelSerializer):
    unit = UnitSerializer()

    class Meta:
        model = Kg
        fields = ['id', 'kg','description', 'unit']

class KgSerializer(serializers.ModelSerializer):
    unit = serializers.PrimaryKeyRelatedField(queryset=unit.objects.all(), write_only=True)  

    class Meta:
        model = Kg
        fields = ['id', 'kg', 'description', 'unit']
        extra_kwargs = {
            'description': {'required': True},
            'kg': {'required': True},
            'unit': {'required': True}
        }


    def to_representation(self, instance):
        representation = super().to_representation(instance)
        return representation


    def validate_kg(self, value):
        unit = self.initial_data.get('unit', None)
        if self.instance:
            if Kg.objects.exclude(id=self.instance.id).filter(kg=value, unit=unit).exists():
                raise serializers.ValidationError("Kg with this value already exists.")
        else:
            if Kg.objects.filter(kg=value, unit=unit).exists():
                raise serializers.ValidationError("Kg with this value already exists.")
        return value


def kg_serializer(obj):
    res = dict()

    res['id'] = obj.id
    res['kg'] = obj.kg
    res['description'] = obj.description

    if obj.unit:
        res['unit'] = {
            'id': obj.unit.id,
            'name': obj.unit.name,
        }
    else:
        res['unit'] = None
    

    return res