from django.contrib import admin
from configuration.models import Configuration, TermsAndConditions, PrivacyPolicy

# Register your models here.

admin.site.register(Configuration)
admin.site.register(TermsAndConditions)
admin.site.register(PrivacyPolicy)
