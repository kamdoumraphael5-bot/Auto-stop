// services/flutterwaveService.js

const FLW_API_URL = process.env.FLUTTERWAVE_ENV === 'sandbox'
    ? 'https://api.flutterwave.com/v3'
    : 'https://api.flutterwave.com/v3';

async function initiatePayment({ amount, currency, email, phoneNumber, reference, redirectUrl, paymentType }) {
    const payload = {
        tx_ref: reference,
        amount: amount,
        currency: currency,
        redirect_url: redirectUrl,
        customer: {
            email: email,
            phonenumber: phoneNumber
        },
        payment_options: paymentType === 'mobile_money' ? 'mobilemoney' : 'card'
    };
    
    const response = await fetch(`${FLW_API_URL}/payments`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Flutterwave payment failed: ${error}`);
    }
    
    return response.json();
}

async function verifyPayment(transactionId) {
    const response = await fetch(`${FLW_API_URL}/transactions/${transactionId}/verify`, {
        headers: {
            'Authorization': `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`
        }
    });
    
    if (!response.ok) throw new Error('Failed to verify payment');
    return response.json();
}

module.exports = { initiatePayment, verifyPayment };