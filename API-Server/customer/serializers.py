from customer.models import CustomerAddress
from cart.models import Cart
from cart.serializers import cart_serializer
from django.conf import settings
from cakery.common import aws_domain_name

def customer_serializer(obj):

    res = dict()

    res['id'] = obj.id
    res['username'] = obj.username
    res['email'] = obj.email
    res['phone'] = obj.phone
    res['name'] = obj.first_name
    res['is_active'] = obj.is_active
    res['address_details'] = [customer_address_serializer(ht) for ht in CustomerAddress.objects.filter(customer=obj.id).all()]

    return res


def customer_address_serializer(obj):

    res = dict()

    res['id'] = obj.id
    res['title'] = obj.title
    res['person_name'] = obj.person_name
    res['phone'] = obj.phone
    res['address'] = obj.address
    res['city'] = obj.city
    res['pincode'] = obj.pincode
    res['is_primary'] = obj.is_primary
    res['customer_id'] = obj.customer.id
    # res['customer_name'] = obj.customer.first_name
    # res['customer_email'] = obj.customer.email
    # res['customer_phone'] = obj.customer.phone

    return res


def profile_serializer(obj, cus_id):

    res = dict()

    res['id'] = obj.id
    res['username'] = obj.username
    res['email'] = obj.email
    res['phone'] = obj.phone
    res['name'] = obj.first_name
    res['first_name'] = obj.first_name
    res['last_name'] = obj.last_name
    res['profile_url'] = None if(obj.profile_picture_name == "" or obj.profile_picture_name == None) else f'{settings.IMAGE_BASE_URL}/{aws_domain_name}/customer/profile/{obj.profile_picture_name}.{obj.profile_picture_ext}'

    res['is_active'] = obj.is_active
    res['date_joined'] = obj.date_joined
    res['last_login'] = obj.last_login
    res['address_details'] = [customer_address_serializer(ht) for ht in CustomerAddress.objects.filter(customer=obj.id).all()]

    active_cart = Cart.objects.filter(customer = int(cus_id), status=True).all()

    cart = [cart_serializer(cs) for cs in active_cart]

    res['cart'] = cart

    res['active_cart_count'] = active_cart.count()

    return res
