// services/paymentRouter.js

const payunitService = require('./payunitService');
const flutterwaveService = require('./flutterwaveService');
const adyenService = require('./adyenService');
const { selectProcessor } = require('../utils/priceCalculator');

/**
 * Routeur de paiement intelligent avec fallback automatique
 */
async function processPayment({ amount, currency, countryCode, paymentMethod, customerEmail, customerPhone, reference, isInternational = false }) {
    const processors = selectProcessor(countryCode, paymentMethod, isInternational);
    
    if (!processors) {
        throw new Error(`No processor found for country ${countryCode} and payment method ${paymentMethod}`);
    }
    
    let lastError = null;
    
    // Tentative avec le processeur principal
    try {
        console.log(`🔄 Tentative paiement avec ${processors.primary}...`);
        const result = await callProcessor(processors.primary, {
            amount, currency, customerEmail, customerPhone, reference, countryCode
        });
        return { success: true, processor: processors.primary, data: result };
    } catch (error) {
        console.log(`⚠️ Échec avec ${processors.primary}:`, error.message);
        lastError = error;
        
        // Tentative avec le processeur secondaire si disponible
        if (processors.secondary) {
            try {
                console.log(`🔄 Fallback vers ${processors.secondary}...`);
                const result = await callProcessor(processors.secondary, {
                    amount, currency, customerEmail, customerPhone, reference, countryCode
                });
                return { success: true, processor: processors.secondary, data: result };
            } catch (fallbackError) {
                console.log(`❌ Échec aussi avec ${processors.secondary}:`, fallbackError.message);
                throw new Error(`Payment failed: ${lastError.message} and ${fallbackError.message}`);
            }
        }
        
        throw lastError;
    }
}

async function callProcessor(processorName, params) {
    const { amount, currency, customerEmail, customerPhone, reference, countryCode } = params;
    
    switch (processorName) {
        case 'PAYUNIT_MM_CMR':
            return await payunitService.initiatePayment({
                amount, phoneNumber: customerPhone, reference,
                description: `Paiement trajet Auto-stop ${reference}`
            });
            
        case 'FLUTTERWAVE_MM_AFRICA':
            return await flutterwaveService.initiatePayment({
                amount, currency, email: customerEmail, phoneNumber: customerPhone,
                reference, redirectUrl: `${process.env.APP_URL}/payment/callback`,
                paymentType: 'mobile_money'
            });
            
        case 'FLUTTERWAVE_CARD_LOCAL':
        case 'FLUTTERWAVE_CARD_INTL':
            return await flutterwaveService.initiatePayment({
                amount, currency, email: customerEmail, phoneNumber: customerPhone,
                reference, redirectUrl: `${process.env.APP_URL}/payment/callback`,
                paymentType: 'card'
            });
            
        case 'ADYEN_CARD_INTL':
            // Pour Adyen, il faudra récupérer les détails de carte séparément
            return await adyenService.initiatePayment({
                amount, currency, reference,
                returnUrl: `${process.env.APP_URL}/payment/callback`
            });
            
        default:
            throw new Error(`Unknown processor: ${processorName}`);
    }
}

module.exports = { processPayment };