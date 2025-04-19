def tag_serializer(obj):

    res = dict()

    res['id'] = obj.id
    res['tag'] = obj.tag

    return res