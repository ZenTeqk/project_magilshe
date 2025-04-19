from rest_framework.views import exception_handler
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework.response import Response
from rest_framework import status
from cakery.common import custom_error_message

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if isinstance(exc, (InvalidToken, TokenError)):
        
        response.data = {
            'detail': custom_error_message,
            'code': 'token_not_valid',
            'messages': [
                {
                    'token_class': "AccessToken",  # You can customize this if needed
                    'token_type': "access",  # You can customize this if needed
                    'message': custom_error_message,
                }
            ]
        }
        response.status_code = status.HTTP_401_UNAUTHORIZED  # You can customize the status code

    return response