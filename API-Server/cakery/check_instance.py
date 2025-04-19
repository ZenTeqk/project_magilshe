from django.http import QueryDict

def check_instance(data):
    if isinstance(data, QueryDict):
        res = data.dict()
    elif isinstance(data, dict):
        res = data
    elif isinstance(data, list):
        res = data
    else:
        res = None

    return res