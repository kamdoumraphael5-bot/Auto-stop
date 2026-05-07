// services/payunitService.js

const PAYUNIT_API_URL = process.env.PAYUNIT_ENV === 'sandbox' 
    ? 'https://sandbox.api.payunit.com/v1'
    : 'https://api.payunit.com/v1';

async function initiatePayment({ amount, phoneNumber, reference, description }) {
    const response = await fetch(`${PAYUNIT_API_URL}/payments`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.PAYUNIT_API_KEY}`,
            'X-API-Secret': process.env.PAYUNIT_API_SECRET,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            amount: amount,
            currency: 'XAF',
            phone_number: phoneNumber,
            payment_method: 'MOBILE_MONEY',
            provider: 'ORANGE_MTN',
            reference: reference,
            description: description
        })
    });
    
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`PayUnit payment failed: ${error}`);
    }
    
    return response.json();
}

async function checkPaymentStatus(paymentId) {
    const response = await fetch(`${PAYUNIT_API_URL}/payments/${paymentId}`, {
        headers: {
            'Authorization': `Bearer ${process.env.PAYUNIT_API_KEY}`,
            'X-API-Secret': process.env.PAYUNIT_API_SECRET
        }
    });
    
    if (!response.ok) throw new Error('Failed to check payment status');
    return response.json();
}

module.exports = { initiatePayment, checkPaymentStatus };