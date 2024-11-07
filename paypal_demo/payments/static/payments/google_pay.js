const baseRequest = {
  apiVersion: 2,
  apiVersionMinor: 0
};

const allowedCardNetworks = ["AMEX", "DISCOVER", "INTERAC", "JCB", "MASTERCARD", "VISA"];
const allowedCardAuthMethods = ["PAN_ONLY", "CRYPTOGRAM_3DS"];

const tokenizationSpecification = {
  type: 'PAYMENT_GATEWAY',
  parameters: {
    'gateway': 'example', //eg: 'braintree','stripe',...
    'gatewayMerchantId': 'exampleGatewayMerchantId' // Merchant ID mà cổng thanh toán cung cấp
  }
};

const baseCardPaymentMethod = {
  type: 'CARD',
  parameters: {
    allowedAuthMethods: allowedCardAuthMethods,
    allowedCardNetworks: allowedCardNetworks
  }
};

const cardPaymentMethod = Object.assign(
  {},
  baseCardPaymentMethod,
  {
    tokenizationSpecification: tokenizationSpecification
  }
);

let paymentsClient = null;

function getGoogleIsReadyToPayRequest() {
  return Object.assign(
      {},
      baseRequest,
      {
        allowedPaymentMethods: [baseCardPaymentMethod]
      }
  );
}

function getGooglePaymentDataRequest() {
  const paymentDataRequest = Object.assign({}, baseRequest);
  paymentDataRequest.allowedPaymentMethods = [cardPaymentMethod];
  paymentDataRequest.transactionInfo = getGoogleTransactionInfo();
  paymentDataRequest.merchantInfo = {
    // merchantId: 'YOUR_MERCHANT_ID',  // Thay 'YOUR_MERCHANT_ID' bằng Merchant ID thực từ Google
    // merchantName: 'Your Merchant Name' // Cập nhật tên thương hiệu của bạn
    merchantName: 'Example Merchant'
  };

  paymentDataRequest.callbackIntents = ["PAYMENT_AUTHORIZATION"];
  return paymentDataRequest;
}

function getGooglePaymentsClient() {
  if (paymentsClient === null) {
    paymentsClient = new google.payments.api.PaymentsClient({
        environment: 'TEST',// 'PRODUCTION'
      paymentDataCallbacks: {
        onPaymentAuthorized: onPaymentAuthorized
      }
    });
  }
  return paymentsClient;
}

function onPaymentAuthorized(paymentData) {
  return new Promise(function(resolve, reject){
    processPayment(paymentData)
      .then(function() {
        resolve({transactionState: 'SUCCESS'});
        showPaymentResult("success");
      })
      .catch(function() {
        resolve({
          transactionState: 'ERROR',
          error: {
            intent: 'PAYMENT_AUTHORIZATION',
            message: 'Insufficient funds, try again.',
            reason: 'PAYMENT_DATA_INVALID'
          }
        });
        showPaymentResult("failure");
      });
  });
}

function onGooglePayLoaded() {
  const paymentsClient = getGooglePaymentsClient();
  paymentsClient.isReadyToPay(getGoogleIsReadyToPayRequest())
    .then(function(response) {
      if (response.result) {
        addGooglePayButton();
      }
    })
    .catch(function(err) {
      console.error(err);
    });
}

function addGooglePayButton() {
  const paymentsClient = getGooglePaymentsClient();
  const button = paymentsClient.createButton({onClick: onGooglePaymentButtonClicked});
  document.getElementById('container').appendChild(button);
}

function getGoogleTransactionInfo() {
  return {
    displayItems: [
        {
          label: "Subtotal",
          type: "SUBTOTAL",
          price: "5000.00",
        }
    ],
    countryCode: 'US',
    currencyCode: "USD",
    totalPriceStatus: "FINAL",
    totalPrice: "5000.00",
    totalPriceLabel: "Total"
  };
}

function onGooglePaymentButtonClicked() {
  const paymentDataRequest = getGooglePaymentDataRequest();
  paymentDataRequest.transactionInfo = getGoogleTransactionInfo();

  const paymentsClient = getGooglePaymentsClient();
  paymentsClient.loadPaymentData(paymentDataRequest);
}

let attempts = 0;

function processPayment(paymentData) {
  return new Promise(function(resolve, reject) {
    const paymentToken = paymentData.paymentMethodData.tokenizationData.token;


    fetch('/process_google_payment/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken()
      },
      body: JSON.stringify({ paymentToken: paymentToken })
    })
    .then(response => response.json())
    .then(data => {
      if (attempts === 0) {

        attempts++;
        reject(new Error('Insufficient funds, try again.'));
      } else {

        attempts++;
        resolve();
      }
    })
    .catch(error => {
      console.error('Error:', error);
      reject();
    });
  });
}


function showPaymentResult(status) {
  const messageContainer = document.getElementById('payment-result');
  if (status === "success") {
    messageContainer.innerText = "Googlepay payment successful!";
    messageContainer.style.color = "green";
  } else {
    messageContainer.innerText = "Googlepay payment failed! Please try again.";
    messageContainer.style.color = "red";
  }
}


function getCsrfToken() {
  let csrfToken = null;
  const cookies = document.cookie.split(';');
  cookies.forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrftoken') {
      csrfToken = decodeURIComponent(value);
    }
  });
  return csrfToken;
}
