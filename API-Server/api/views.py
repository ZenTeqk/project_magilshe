import logging
from django.http import JsonResponse
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import APIException, AuthenticationFailed

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.views import APIView

from django.db import connections

from cakery.common import custom_error_message

from customer.models import Customer

logger = logging.getLogger('cakery')

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Add custom claims
        token['username'] = user.username
        token['first_name'] = user.first_name
        # ...

        return token

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer


@api_view(['GET'])
def getRoutes(request):
    try:
        routes = [
            '/api/token',
            '/api/token/refresh'
        ]

        return Response(routes)
    except Exception as e:
        raise APIException(custom_error_message)



class CustomTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({"detail": "Refresh token is missing."}, status=status.HTTP_401_UNAUTHORIZED)        
        try:
            user_id = RefreshToken(refresh_token).payload['user_id']
            user = Customer.objects.get(id=int(user_id))

            if not user.is_active:
                return Response({"detail": "Inactive user."}, status=status.HTTP_401_UNAUTHORIZED)
            response = super().post(request, *args, **kwargs)
            return response
        except Exception as e:
            print("REFRESH ERROR - {}".format(e))
            logger.exception("REFRESH TOKEN ERROR - {}".format(e))
            return Response({"detail": str(e)}, status=status.HTTP_401_UNAUTHORIZED)
