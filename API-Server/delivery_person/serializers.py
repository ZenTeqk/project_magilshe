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