import logging
import botocore
from django.conf import settings
import os
import boto3

from cakery.common import get_s3_session


logger = logging.getLogger(__name__)


def put_image_to_s3(file_obj, folder_name):
    """
    Put the file to s3
    :param file_obj:
    :return:
    """

    s3_filename = f"{folder_name}"
    if not settings.AWS_STORAGE_BUCKET_NAME:
        logger.error("S3 upload rejected: AWS_STORAGE_BUCKET_NAME is not configured (key=%s)", s3_filename)
        return False
    session = get_s3_session()
    s3 = session.resource('s3', endpoint_url=settings.AWS_S3_ENDPOINT_URL or None)
    try:
        s3.Bucket(settings.AWS_STORAGE_BUCKET_NAME).put_object(
            Key="%s" % s3_filename,
            Body=file_obj.read(),
            ContentDisposition='inline',
            ContentType='%s' % file_obj.content_type
        )

        logger.info("S3 upload completed: bucket=%s key=%s", settings.AWS_STORAGE_BUCKET_NAME, s3_filename)
        return True
    except botocore.exceptions.ClientError as e:
        error = e.response.get("Error", {})
        logger.exception(
            "S3 upload failed: bucket=%s key=%s code=%s message=%s",
            settings.AWS_STORAGE_BUCKET_NAME, s3_filename,
            error.get("Code", "ClientError"), error.get("Message", "AWS rejected the request"),
        )
    except Exception as e:
        logger.exception(
            "S3 upload failed: bucket=%s key=%s error=%s",
            settings.AWS_STORAGE_BUCKET_NAME, s3_filename, type(e).__name__,
        )
    return False
