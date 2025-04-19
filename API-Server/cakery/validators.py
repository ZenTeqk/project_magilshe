from rest_framework.exceptions import APIException
from cakery.check_instance import check_instance
import logging

logger = logging.getLogger('cakery')

def validate_request(request, req_data):
    if not request.user:
        logger.error("You Are Not Authorized")
        raise APIException({'message': 'You Are Not Authorized'})

    data = check_instance(req_data)

    if not data:
        logger.error("Invalid Request")
        raise APIException({'message': 'Invalid Request'})
    
    return data