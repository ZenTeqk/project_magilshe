import uuid

from rest_framework import serializers
from cakery.common import aws_domain_name, get_s3_file_url
from cakery.file_upload_to_aws import put_image_to_s3
from delivery_person.models import DeliveryPerson, DeliveryPlatform, ExternalDeliveryPerson


def delivery_person_serializer(obj):

    res = dict()

    res['id'] = obj.id
    res['name'] = obj.name
    res['email'] = obj.email
    res['phone'] = obj.phone
    res['address'] = obj.address
    res['dob'] = obj.dob
    res['status'] = obj.status

    return res


class DeliveryStaffSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(write_only=True, required=False)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = DeliveryPerson
        fields = "__all__"
        read_only_fields = ("staff_id", "created_by", "updated_by", "created_on", "updated_on")

    def get_image_url(self, obj):
        if not obj.image_name or not obj.image_ext:
            return None
        return get_s3_file_url(f"{aws_domain_name}/delivery-person/profile/{obj.image_name}.{obj.image_ext}")

    def _save_image(self, validated_data):
        image = validated_data.pop("image", None)
        if not image:
            return
        ext = image.name.rsplit(".", 1)[-1].lower() if "." in image.name else ""
        if ext not in {"jpg", "jpeg", "png", "webp"}:
            raise serializers.ValidationError({"image": "Supported images: JPG, JPEG, PNG and WEBP."})
        image_name = uuid.uuid4()
        key = f"{aws_domain_name}/delivery-person/profile/{image_name}.{ext}"
        if not put_image_to_s3(image, key):
            raise serializers.ValidationError({"image": "Delivery staff photo upload failed."})
        validated_data.update({"image_name": image_name, "image_ext": ext})

    def create(self, validated_data):
        self._save_image(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        self._save_image(validated_data)
        return super().update(instance, validated_data)


class DeliveryPlatformSerializer(serializers.ModelSerializer):
    driver_count = serializers.IntegerField(read_only=True, default=0)
    class Meta:
        model = DeliveryPlatform
        fields = "__all__"


class ExternalDeliveryPersonSerializer(serializers.ModelSerializer):
    platform_name = serializers.CharField(source="platform.name", read_only=True)
    class Meta:
        model = ExternalDeliveryPerson
        fields = "__all__"
        read_only_fields = ("partner_id", "created_on", "updated_on")
