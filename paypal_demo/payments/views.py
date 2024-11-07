# payments/views.py
from django.shortcuts import render, redirect
from django.conf import settings
import paypalrestsdk
from django.http import JsonResponse



paypalrestsdk.configure({
    "mode": "sandbox",  
    "client_id": settings.PAYPAL_CLIENT_ID,
    "client_secret": settings.PAYPAL_CLIENT_SECRET,
})

def home(request):
    return render(request, 'payments/home.html')

def checkout(request):
    payment = paypalrestsdk.Payment({
        "intent": "sale",
        "payer": {
            "payment_method": "paypal"
        },
        "redirect_urls": {
            "return_url": request.build_absolute_uri('/payment_done/'),  
            "cancel_url": request.build_absolute_uri('/payment_cancelled/')  
        },
        "transactions": [{
            "item_list": {
                "items": [{
                    "name": "Sample Item",
                    "sku": "item",
                    "price": "5000.00",
                    "currency": "USD",
                    "quantity": 1
                }]
            },
            "amount": {
                "total": "5000.00",
                "currency": "USD"
            },
            "description": "This is a sample payment of 5000 USD."
        }]
    })

    if payment.create():
        for link in payment.links:
            if link.rel == "approval_url":

                return redirect(link.href)
    else:
        print(payment.error)

    return redirect('payment_cancelled')

def payment_done(request):

    payment_id = request.GET.get('paymentId')
    payer_id = request.GET.get('PayerID')


    payment = paypalrestsdk.Payment.find(payment_id)
    if payment.execute({"payer_id": payer_id}): 
        print("Payment executed successfully")
        return render(request, 'payments/payment_done.html')
    else:
        print(payment.error) 
        return redirect('payment_cancelled')

def payment_cancelled(request):
    return render(request, 'payments/payment_cancelled.html')
def process_google_payment(request):
    if request.method == 'POST':
        payment_token = request.POST.get('paymentToken')

        if payment_token:
            return JsonResponse({'status': 'success'})
        else:
            return JsonResponse({'status': 'failure'})
    return JsonResponse({'status': 'failure'})