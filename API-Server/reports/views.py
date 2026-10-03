from django.shortcuts import render

# Create your views here.
import logging
import base64
import sys
from datetime import datetime, timedelta , time , date
from json import JSONEncoder
import json
import uuid

from django.conf import settings
from django.shortcuts import render , redirect
from django.views import View
from django.http import HttpResponse, JsonResponse
from django.contrib.auth.models import Group
from django.utils.decorators import method_decorator
from django.contrib import messages
from django.views.generic import View
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.db import transaction
from cakery.common import StrongRandomPasswordGenerator, generate_username
from django.db.models.functions import ExtractMonth, ExtractDay
from django.db.models import Avg, Count, F, Max, Q, Sum
from django.utils import timezone
from decimal import Decimal


from django.shortcuts import render
from django.core.files.storage import FileSystemStorage


from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import APIException, NotFound
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated
from rest_framework import permissions, status

from cakery.file_upload_to_aws import put_image_to_s3

from cakery.check_instance import check_instance
from cakery.validators import validate_request

from cakery.common import custom_error_message, aws_domain_name

logger = logging.getLogger('cakery')

from order.models import CakeOrder
from order.serializers import cake_order_serialier

from occasion.models import Occasion
from occasion.serializers import occasion_serializer
from crm.models import CRMDelivery, CRMInvoice, CRMOrder, CRMOrderItem, Lead, LeadActivity, Quotation, QuotationActivity, QuotationPayment
from customer.models import Customer
from customer.rbac import HasRBACPermission


def _crm_report_dates(request):
    today = timezone.localdate()
    try:
        start = datetime.strptime(request.query_params.get("from_date", ""), "%Y-%m-%d").date()
        end = datetime.strptime(request.query_params.get("to_date", ""), "%Y-%m-%d").date()
    except ValueError:
        start, end = today - timedelta(days=29), today
    return (end, start) if start > end else (start, end)


def _crm_status_counts(queryset, field="status"):
    return {row[field] or "Unspecified": row["total"] for row in queryset.values(field).annotate(total=Count("id"))}


class CRMAnalyticsReport(APIView):
    """Read-only management snapshot assembled from existing CRM documents."""

    # Explicit, not inherited from DRF defaults: RBACJWTAuthentication no longer
    # enforces permissions itself (that moved to HasRBACPermission below), so a
    # bare IsAuthenticated override here would let any logged-in customer read
    # CRM leads/quotations/revenue/PII. Must include HasRBACPermission.
    permission_classes = [IsAuthenticated, HasRBACPermission]

    def get(self, request):
        start, end = _crm_report_dates(request)
        search = request.query_params.get("search", "").strip()
        status_filter = request.query_params.get("status", "").strip()
        module_filter = request.query_params.get("module", "").strip().lower()
        leads = Lead.objects.filter(is_archived=False, created_on__date__range=(start, end))
        quotations = Quotation.objects.filter(is_archived=False, created_on__date__range=(start, end))
        orders = CRMOrder.objects.filter(is_archived=False, confirmed_on__date__range=(start, end))
        invoices = CRMInvoice.objects.filter(is_archived=False, generated_on__date__range=(start, end))
        deliveries = CRMDelivery.objects.filter(is_archived=False, created_on__date__range=(start, end))
        payments = QuotationPayment.objects.filter(
            payment_date__range=(start, end),
            quotation__is_archived=False,
        ).filter(
            Q(quotation__crm_order__isnull=True) | Q(quotation__crm_order__is_archived=False)
        )
        if search:
            customer_q = Q(customer_name__icontains=search) | Q(phone__icontains=search)
            leads = leads.filter(customer_q | Q(lead_no__icontains=search))
            quotations = quotations.filter(customer_q | Q(quotation_no__icontains=search))
            orders = orders.filter(customer_q | Q(order_no__icontains=search))
            invoices = invoices.filter(customer_q | Q(invoice_no__icontains=search))
            deliveries = deliveries.filter(Q(order__customer_name__icontains=search) | Q(order__phone__icontains=search) | Q(delivery_no__icontains=search))
            payments = payments.filter(Q(quotation__customer_name__icontains=search) | Q(quotation__phone__icontains=search))

        funnel = [
            {"key": "leads", "label": "Leads", "value": leads.count()},
            {"key": "quotations", "label": "Quotations", "value": quotations.count()},
            {"key": "orders", "label": "Orders", "value": orders.count()},
            {"key": "invoices", "label": "Invoices", "value": invoices.count()},
            {"key": "deliveries", "label": "Deliveries", "value": deliveries.count()},
            {"key": "completed", "label": "Completed", "value": deliveries.filter(delivery_status="Delivered Successfully").count()},
        ]
        previous = None
        for stage in funnel:
            stage["conversion"] = round(stage["value"] * 100 / previous, 1) if previous else 100
            stage["drop_off"] = max((previous or stage["value"]) - stage["value"], 0)
            previous = stage["value"]

        collected = payments.aggregate(value=Sum("amount"))["value"] or Decimal("0")
        advance = payments.filter(Q(quotation__crm_order__isnull=True) | Q(created_on__lte=F("quotation__crm_order__confirmed_on"))).aggregate(value=Sum("amount"))["value"] or Decimal("0")
        outstanding = invoices.aggregate(value=Sum("balance_amount"))["value"] or Decimal("0")
        # These are current operational metrics, deliberately independent of
        # the selected reporting range. CRMOrder is the financial source of
        # truth before and after an invoice exists; payment endpoints keep
        # advance_paid synchronized as payments are recorded.
        today_orders = CRMOrder.objects.filter(
            is_archived=False,
            confirmed_on__date=timezone.localdate(),
        ).exclude(status="Cancelled").count()
        # Every live order with money still owed, invoiced or not. An order
        # only gets an invoice after it reaches Ready, so counting invoices
        # alone would hide the balance on every Confirmed/Processing order --
        # the same balance the Home page's "Due" labels already show.
        pending_orders = CRMOrder.objects.filter(is_archived=False).exclude(status="Cancelled").annotate(
            balance_due=F("total_amount") - F("advance_paid"),
        ).filter(balance_due__gt=0)
        payments_pending_amount = pending_orders.aggregate(value=Sum("balance_due"))["value"] or Decimal("0")
        payments_pending = {
            "count": pending_orders.count(),
            "amount": Decimal(payments_pending_amount).quantize(Decimal("0.01")),
        }
        # payment_date is already a plain DateField (day granularity), so no
        # truncation is needed. TruncDate() here previously made Django's sqlite
        # backend cast it through a UTC->TIME_ZONE datetime conversion function
        # that assumes a full datetime string, raising "user-defined function
        # raised exception" against a bare date value.
        revenue_trend = list(payments.annotate(day=F("payment_date")).values("day").annotate(value=Sum("amount")).order_by("day"))
        customer_rows = list(orders.values("phone", "customer_name").annotate(total_orders=Count("id"), total_spend=Sum("total_amount"), last_order=Max("confirmed_on")).order_by("-total_spend")[:25])
        product_rows = list(CRMOrderItem.objects.filter(order__in=orders).values("item_name", "flavour", "weight").annotate(quantity=Sum("quantity"), revenue=Sum("amount"), orders=Count("order", distinct=True)).order_by("-quantity")[:20])
        occasions = list(leads.values("occasion").annotate(value=Count("id")).order_by("-value")[:12])
        sources = list(leads.values("lead_source").annotate(value=Count("id")).order_by("-value")[:12])
        delivery_methods = list(deliveries.values("delivery_type").annotate(value=Count("id")).order_by("-value"))

        lead_events = LeadActivity.objects.filter(
            lead__is_archived=False,
            created_on__date__range=(start, end),
        ).select_related("lead", "staff")
        quotation_events = QuotationActivity.objects.filter(
            quotation__is_archived=False,
            created_on__date__range=(start, end),
        ).select_related("quotation", "staff")
        if search:
            lead_events = lead_events.filter(Q(lead__customer_name__icontains=search) | Q(lead__phone__icontains=search))
            quotation_events = quotation_events.filter(Q(quotation__customer_name__icontains=search) | Q(quotation__phone__icontains=search))
        timeline = []
        if module_filter in ("", "lead"):
            timeline.extend({"id": f"lead-{row.id}", "module": "Lead", "action": row.action, "reference": row.lead.lead_no, "customer": row.lead.customer_name, "staff": (row.staff.get_full_name() or row.staff.username) if row.staff else None, "created_on": row.created_on} for row in lead_events[:100])
        if module_filter in ("", "quotation", "order", "invoice", "delivery"):
            timeline.extend({"id": f"quotation-{row.id}", "module": "Quotation", "action": row.action, "reference": row.quotation.quotation_no, "customer": row.quotation.customer_name, "staff": (row.staff.get_full_name() or row.staff.username) if row.staff else None, "created_on": row.created_on} for row in quotation_events[:100])
        timeline = sorted(timeline, key=lambda row: row["created_on"], reverse=True)[:100]
        if status_filter:
            timeline = [row for row in timeline if status_filter.lower() in row["action"].lower()]

        return Response({
            "range": {"from_date": start, "to_date": end},
            "current": {
                "today_orders": today_orders,
                "payments_pending": payments_pending,
                # Backward-compatible alias for older analytics consumers.
                "balance_pending": payments_pending["amount"],
            },
            "overview": {"leads": _crm_status_counts(leads), "quotations": _crm_status_counts(quotations), "orders": _crm_status_counts(orders), "invoices": _crm_status_counts(invoices), "deliveries": _crm_status_counts(deliveries, field="delivery_status")},
            "totals": {"leads": leads.count(), "quotations": quotations.count(), "orders": orders.count(), "invoices": invoices.count(), "deliveries": deliveries.count(), "new_customers": Customer.objects.filter(date_joined__date__range=(start, end)).count()},
            "revenue": {"collected": collected, "outstanding": outstanding, "advance_collected": advance, "balance_collected": max(collected - advance, Decimal("0")), "average_order": orders.aggregate(value=Avg("total_amount"))["value"] or 0, "trend": revenue_trend},
            "funnel": funnel, "customers": customer_rows, "products": product_rows, "occasions": occasions,
            "lead_sources": sources, "delivery_methods": delivery_methods, "timeline": timeline,
        })

class GetOrderReport(APIView):
    def get(self, request):
        report_data = []
        try:
            
            if "from_date" in request.query_params and "to_date" in request.query_params:
                print("Query Params ....")
                from_date = request.query_params['from_date']
                to_date = request.query_params['to_date']
                report_data = [cake_order_serialier(ht) for ht in CakeOrder.objects.filter(order_time__date__gte=from_date,order_time__date__lte=to_date).all()]
            else:
                print("today ...")
                today = datetime.now().date()
                report_data = [cake_order_serialier(ht) for ht in CakeOrder.objects.filter(order_time__date=today).all()]
        except Exception as e:
            report_data = []
            logger.exception(f"Get Order Report Error - {e}")
        
        return Response({'data' : report_data})




class GetDeliveryPersonReport(APIView):
    def get(self, request):
        report_data = []
        try:
            print("")
            if "dp_id" in request.query_params:
                dp_id = request.query_params['dp_id']
                today = datetime.now().date()
                OrderObj = CakeOrder.objects.filter(delivery_partner=int(dp_id)).all()

                if "from_date" in request.query_params and "to_date" in request.query_params:
                    from_date = request.query_params['from_date']
                    to_date = request.query_params['to_date']
                    OrderObj = OrderObj.filter(order_time__date__gte=from_date, order_time__date__lte=to_date).all()
                else:
                    OrderObj = OrderObj.filter(order_time__date=today).all()

                report_data = [cake_order_serialier(ht) for ht in OrderObj]
                
        except Exception as e:
            report_data = []
            logger.exception(f"Get Order Report Error - {e}")

        return Response({'data' : report_data})



class GetOccasionReport(APIView):
    report_data = []
    def get(self, request):
        try:            

            if "from_date" in request.query_params and "to_date" in request.query_params:
                from_date = request.query_params['from_date']
                to_date = request.query_params['to_date']

                from_month = int(from_date.split("-")[1])
                from_day = int(from_date.split("-")[2])

                to_month = int(to_date.split("-")[1])
                to_day = int(to_date.split("-")[2])

                queryset = Occasion.objects.annotate(
                    month=ExtractMonth('date'),
                    day=ExtractDay('date')
                )

                # Create the filter conditions
                if from_month <= to_month:
                    # Range within the same year (e.g., from 12-01 to 12-31)
                    filtered_objects = queryset.filter(
                        Q(month__gt=from_month) | 
                        (Q(month=from_month) & Q(day__gte=from_day)),
                        Q(month__lt=to_month) | 
                        (Q(month=to_month) & Q(day__lte=to_day))
                    ).all()
                else:
                    # Range spanning across years (e.g., from 12-15 to 01-10)
                    filtered_objects = queryset.filter(
                        (Q(month__gt=from_month) | 
                        (Q(month=from_month) & Q(day__gte=from_day))) |
                        (Q(month__lt=to_month) | 
                        (Q(month=to_month) & Q(day__lte=to_day)))
                    ).all()   


                report_data = [occasion_serializer(ht) for ht in filtered_objects]  

            else:
                report_data = [occasion_serializer(ht) for ht in Occasion.objects.all()] 

        except Exception as e:
            report_data = []
            logger.exception(f"Get Occasion Report Error - {e}")

        return Response({'data' : report_data})
