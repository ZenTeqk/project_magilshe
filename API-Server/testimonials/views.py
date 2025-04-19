# Create your views here.
import logging
from datetime import datetime
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import APIException
from rest_framework import status
from cakery.common import custom_error_message
from testimonials import models as testimonial_model
from django.forms.models import model_to_dict


class FeedbackMessages(APIView):
    def get(self, request):
        try:
            if "status" in request.query_params:
                feedback_messages = testimonial_model.feedback_messages.objects.filter(status=True).all()
            else:
                feedback_messages = testimonial_model.feedback_messages.objects.all()
            feedback_messages = list(feedback_messages.values())
        except Exception as e:
            logging.error(f"Error fetching feedback messages: {str(e)}")
            feedback_messages = []
        
        return Response({'data': feedback_messages})

    permission_classes = []
    authentication_classes = []
    def post(self, request):
        
        try:
            data = request.data
            
            db_param = {
                "name" : data['name'],
                "mobile" : data['mobile'],
                "message" : data['message'],
                "created_at": datetime.now(),
            }

            if "is_subscribed" in data:
                db_param['is_subscribed'] = data['is_subscribed']

            f_id = data.get('id', '0')

            if f_id and str(f_id != '0'):
                testimonial_model.feedback_messages.objects.filter(id=int(f_id)).update(**db_param)
                response = testimonial_model.feedback_messages.objects.filter(id=int(f_id)).values().first()
            else:
                feedbackMessage = testimonial_model.feedback_messages.objects.create(**db_param)
                response = model_to_dict(feedbackMessage)
            return Response({'message' : 'Message Sent Successfully', 'data' : response})

        except Exception as e:
            raise APIException({'message' : custom_error_message})

        

    def delete(self, request, pk=None):
        try:
            fm = testimonial_model.feedback_messages.objects.get(id=pk)
            fm.delete()

            return Response({'message' : 'Deleted Successfully'})
        except testimonial_model.feedback_messages.DoesNotExist:
            return Response({'message' : 'Record Not Found'}, status=status.HTTP_404_NOT_FOUND)




