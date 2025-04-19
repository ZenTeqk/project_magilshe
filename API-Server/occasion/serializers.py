def occasion_serializer(obj):

    res = dict()

    res['id'] = obj.id
    res['type'] = obj.type
    res['date'] = obj.date
    res['person_name'] = obj.person_name
    res['person_phone'] = obj.person_phone

    return res