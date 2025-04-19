import logging
import botocore
from django.conf import settings
import os
import boto3

from cakery.common import get_s3_session


def put_image_to_s3(file_obj, folder_name):
    """
    Put the file to s3
    :param file_obj:
    :return:
    """

    print("FILE SIZE ===== ",file_obj.size)
    print("Content Type ===== ",file_obj.content_type)
    print("FOLDER NAME = ",folder_name)

    s3_filename = f"{folder_name}"
    session = get_s3_session()
    s3 = session.resource('s3')
    try:
        s3.Bucket(settings.AWS_STORAGE_BUCKET_NAME).put_object(
            Key="%s" % s3_filename,
            Body=file_obj.read(),
            ContentDisposition='attachment; filename=%s' % s3_filename,
            ContentType='%s' % file_obj.content_type
        )

        print("SUCCESSFULLY UPLOADED !!!!!!")
        return True
    except botocore.exceptions.ClientError as e:
        print("ERR 1 : ",str(e))
    except Exception as e:
        print("ERR 2 : ",str(e))
    return False
