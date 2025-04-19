import logging
import uuid
import hashlib
import base64
import random
from decimal import Decimal
from boto3 import Session
from django.conf import settings


logger = logging.getLogger("ck")

custom_error_message = 'Something Went Wrong'
permission_denied_message = "You Don't Have Permission"

aws_domain_name = "cakery"



def generate_username():
    """
    generates a username
    :return: random hexdigest of 30 characters
    """
    return str(uuid.uuid1()).replace('-', "").upper()[:30]


def generate_db_username():
    """
    generates db username
    :return: random hexdigest of 19 characters
    """
    return "LC" + str(uuid.uuid1()).replace('-', "").upper()[:17]



def get_s3_session():
    """
    Get s3 session
    :return:
    """
    session = Session(
        aws_access_key_id=settings.AWS_S3_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_S3_SECRET_ACCESS_KEY
    )
    return session


def get_s3_client():
    """
    Get s3 client
    :return:
    """
    session = get_s3_session()
    client = session.client('s3')
    return client


class StrongRandomPasswordGenerator(object):

    char_set = {
        'small': 'abcdefghijklmnopqrstuvwxyz',
        'nums': '0123456789',
        'big': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'special': '^!$%&()=?{[]}+~#-_.:,;<>'
    }
    all_char = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
                'u', 'v', 'w', 'x', 'y', 'z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D',
                'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X',
                'Y', 'Z', '^', '!', '$', '%', '&', '(', ')', '=', '?', '{', '[', ']', '}', '+', '~', '#', '-', '_',
                '.', ':', ',', ';', '<', '>']

    def execute(self, length=40):
        """Function to generate a password"""

        password = []

        while len(password) < length:
            key = random.choice(list(self.char_set.keys()))
            a_char = random.choice(self.all_char)
            if a_char in self.char_set[key]:
                if self.check_prev_char(password, self.char_set[key]):
                    continue
                else:
                    password.append(a_char)
        return ''.join(password)

    def check_prev_char(self, password, current_char_set):
        """Function to ensure that there are no consecutive
        UPPERCASE/lowercase/numbers/special-characters."""

        index = len(password)
        if index == 0:
            return False
        else:
            prev_char = password[index - 1]
            if prev_char in current_char_set:
                return True
            else:
                return False
