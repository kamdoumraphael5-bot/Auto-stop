// services/adyenService.js

const ADYIN_API_URL = process.env.ADYIN_ENV === 'test'
    ? 'https://checkout-test.adyen.com/v69'
    : 'https://checkout-live.adyen.com/v69';

async function initiatePayment({ amount, currency, reference, returnUrl, cardDetails }) {
    const response = await fetch(`${ADYIN_API_URL}/payments`, {
        method: 'POST',
        headers: {
            'X-API-Key': process.env.ADYEN_API_KEY,
            'Content-Type': 'application/json',
            'Idempotency-Key': reference
        },
        body: JSON.stringify({
            amount: {
                value: Math.round(amount * 100), // Adyen utilise les centimes
                currency: currency
            },
            reference: reference,
            returnUrl: returnUrl,
            merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT,
            paymentMethod: {
                type: 'scheme',
                number: cardDetails.number,
                expiryMonth: cardDetails.expiryMonth,
                expiryYear: cardDetails.expiryYear,
                cvc: cardDetails.cvc
            }
        })
    });
    
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Adyen payment failed: ${error}`);
    }
    
    return response.json();
}

module.exports = { initiatePayment };