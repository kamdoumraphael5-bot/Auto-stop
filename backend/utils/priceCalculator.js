// utils/priceCalculator.js

// Frais fixes
const TRANSFER_FEE = 0.01;      // 1% transfert
const PLATFORM_FEE = 0.03;      // 3% commission plateforme
const TOTAL_FIXED_FEES = TRANSFER_FEE + PLATFORM_FEE; // 0.04

// Taux de collecte par processeur
const COLLECTION_RATES = {
    PAYUNIT_MM_CMR: 0.01,           // 1% PayUnit Mobile Money Cameroun
    FLUTTERWAVE_MM_AFRICA: 0.02,    // 2% Flutterwave Mobile Money Afrique
    FLUTTERWAVE_CARD_LOCAL: 0.035,  // 3.5% Flutterwave carte locale Afrique
    FLUTTERWAVE_CARD_INTL: 0.048,   // 4.8% Flutterwave carte internationale
    ADYEN_CARD_INTL: {               // Adyen hors Afrique
        fixedFee: 72,               // 72 FCFA (~0.11€)
        variableRate: 0.031         // 3.1% (Interchange 2.5% + marge 0.6%)
    }
};

/**
 * Calcule le prix à afficher au passager
 * @param {number} driverPrice - Prix que le conducteur veut recevoir
 * @param {string} processor - Type de processeur ('PAYUNIT_MM_CMR', 'FLUTTERWAVE_MM_AFRICA', 'FLUTTERWAVE_CARD_LOCAL', 'FLUTTERWAVE_CARD_INTL', 'ADYEN_CARD_INTL')
 * @returns {number} Prix à afficher au passager (arrondi à l'entier supérieur)
 */
function calculatePassengerPrice(driverPrice, processor) {
    const baseWithFees = driverPrice * (1 + TOTAL_FIXED_FEES); // driverPrice * 1.04
    
    if (processor === 'ADYEN_CARD_INTL') {
        // Formule Adyen : (PC * 1.04 + 72) / (1 - 0.031)
        const passengerPrice = (baseWithFees + COLLECTION_RATES.ADYEN_CARD_INTL.fixedFee) / 
                               (1 - COLLECTION_RATES.ADYEN_CARD_INTL.variableRate);
        return Math.ceil(passengerPrice);
    }
    
    // Formule générique pour les autres : PC * 1.04 / (1 - taux_collecte)
    const collectionRate = COLLECTION_RATES[processor];
    const passengerPrice = baseWithFees / (1 - collectionRate);
    return Math.ceil(passengerPrice);
}

/**
 * Calcule ce que le conducteur recevra réellement
 * @param {number} passengerPrice - Prix payé par le passager
 * @param {string} processor - Type de processeur
 * @returns {number} Montant que le conducteur reçoit
 */
function calculateDriverNet(passengerPrice, processor) {
    if (processor === 'ADYEN_CARD_INTL') {
        const afterCollection = passengerPrice * (1 - COLLECTION_RATES.ADYEN_CARD_INTL.variableRate);
        const afterFixed = afterCollection - COLLECTION_RATES.ADYEN_CARD_INTL.fixedFee;
        return Math.floor(afterFixed / (1 + TOTAL_FIXED_FEES));
    }
    
    const collectionRate = COLLECTION_RATES[processor];
    const afterCollection = passengerPrice * (1 - collectionRate);
    return Math.floor(afterCollection / (1 + TOTAL_FIXED_FEES));
}

/**
 * Détermine le processeur à utiliser selon le pays et le mode de paiement
 */
function selectProcessor(countryCode, paymentMethod, isInternational = false) {
    const africanCountries = ['CM', 'CI', 'SN', 'GA', 'CF', 'GN', 'ML', 'BF', 'NE', 'TD', 'TG', 'BJ', 'NG', 'GH', 'MA', 'TN', 'DZ', 'EG'];
    const isAfrican = africanCountries.includes(countryCode);
    
    if (paymentMethod === 'mobile_money') {
        if (countryCode === 'CM') {
            return { primary: 'PAYUNIT_MM_CMR', secondary: 'FLUTTERWAVE_MM_AFRICA', type: 'mobile_money' };
        } else if (isAfrican) {
            return { primary: 'FLUTTERWAVE_MM_AFRICA', secondary: null, type: 'mobile_money' };
        }
    }
    
    if (paymentMethod === 'card') {
        if (isAfrican) {
            return { primary: 'FLUTTERWAVE_CARD_LOCAL', secondary: 'FLUTTERWAVE_CARD_INTL', type: 'card' };
        } else if (isInternational) {
            return { primary: 'ADYEN_CARD_INTL', secondary: 'FLUTTERWAVE_CARD_INTL', type: 'card' };
        }
    }
    
    return null;
}

module.exports = {
    calculatePassengerPrice,
    calculateDriverNet,
    selectProcessor,
    COLLECTION_RATES,
    TOTAL_FIXED_FEES
};