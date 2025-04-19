from rest_framework import serializers
from .models import TaxCategory

class TaxCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxCategory
        fields = '__all__'
        extra_kwargs = {
            'tax_group_sequence': {'required': False}, # like node.js Joi schemea 
        }

    def validate_tax_category(self, value):  
        instance = getattr(self.instance, 'id', None)
      
        if TaxCategory.objects.filter(tax_category=value, is_deleted=False).exclude(id=instance).exists():
            raise serializers.ValidationError("This tax category already exists.")
        return value


    
