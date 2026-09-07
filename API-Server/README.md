1. OTP Request API Curl 

""" This Api Should Happen During Customer Login """

curl --location 'http://127.0.0.1:8000/auth/request-otp/' \
--header 'Content-Type: application/json' \
--header 'Cookie: csrftoken=MhaVejZsu6PaQH6uBrsymM2FMuQBRHa1; sessionid=u73eh7kahfsz3rphya7223i4z0dmp6bd' \
--data-raw '{
    "username" : "8973332888",
    "password" : "test@123"
}'

payload : {
    "username" : customer_phone_number,
    "password" : "customer_password"
}

response : {
    "message": "OTP sent successfully!",
    "login_redirect": false
}

Note : If you get success response and "login_redirect" is false then page should not be redirected to dashboard or home it should go to otp entry page


2. OTP Verification API Curl : 

curl --location 'http://127.0.0.1:8000/auth/verify-otp/' \
--header 'Content-Type: application/json' \
--header 'Cookie: csrftoken=HJ2twVKe94KjqmXx1dgnDsatDNV6xzWx; sessionid=u73eh7kahfsz3rphya7223i4z0dmp6bd' \
--data '{
    "username" : "8973332888",
    "otp" : "396321"
}'


payload : {
    "username" : customer_phone_number,
    "otp" : otp received through sms
}


response : {
    "message": "Logged in successfully",
    "login_redirect": true,
    "tokens": {
        "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc2NDUyMzA1MCwiaWF0IjoxNzMyOTg3MDUwLCJqdGkiOiI2MDFmMTk0MmYzN2U0YmIxODI4ZWI4ZTk2NzBlNjNmMyIsInVzZXJfaWQiOjEyfQ.M1MKqEQ7U53Rg25QxZ6dSaxl1IYvKJllbByc8wAy-i8",
        "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzMzMDczNDUwLCJpYXQiOjE3MzI5ODcwNTAsImp0aSI6ImEyZGYzNzczNDc2YjQzYzdiN2M1N2IzYWI3MTRjYWE0IiwidXNlcl9pZCI6MTJ9.AkhslQsGPEmFSeLfLIc75EPkIqg2sOn8NiGXHIh9XH8"
    }
}

<!-- Deploy pipeline re-verified after moving to the ZenTeqk/project_magilshe repo. -->
