// backend/services/payoutService.js
const https = require('https');

// Configuration Flutterwave
const FLW_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;

/**
 * Transférer de l'argent vers un compte Mobile Money
 * @param {string} phoneNumber - Numéro de téléphone (ex: 237690001122)
 * @param {number} amount - Montant à transférer
 * @param {string} reference - Référence unique
 * @returns {Promise<Object>}
 */
async function transferToMobileMoney(phoneNumber, amount, reference) {
    // Déterminer le code pays
    let countryCode = 'CM';
    let beneficiaryName = 'Auto-stop Beneficiary';
    
    if (phoneNumber.startsWith('237')) countryCode = 'CM';
    else if (phoneNumber.startsWith('225')) countryCode = 'CI';
    else if (phoneNumber.startsWith('221')) countryCode = 'SN';
    else if (phoneNumber.startsWith('241')) countryCode = 'GA';
    else if (phoneNumber.startsWith('254')) countryCode = 'KE';
    
    const transferData = {
        account_bank: getBankCode(countryCode, 'mobile_money'),
        account_number: phoneNumber,
        amount: amount,
        narration: `Paiement trajet Auto-stop ${reference}`,
        currency: 'XAF',
        reference: reference,
        beneficiary_name: beneficiaryName,
        debit_currency: 'XAF'
    };
    
    console.log('📤 Transfert Mobile Money:', transferData);
    
    try {
        const response = await fetch('https://api.flutterwave.com/v3/transfers', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${FLW_SECRET_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(transferData)
        });
        
        const data = await response.json();
        console.log('📥 Réponse transfert:', data);
        
        if (data.status === 'success') {
            return { success: true, data: data.data, reference: data.data.id };
        } else {
            return { success: false, error: data.message };
        }
    } catch (error) {
        console.error('❌ Erreur transfert:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Transférer de l'argent vers un compte bancaire
 * @param {Object} bankAccount - Informations bancaires
 * @param {number} amount - Montant à transférer
 * @param {string} reference - Référence unique
 * @returns {Promise<Object>}
 */
async function transferToBankAccount(bankAccount, amount, reference) {
    const transferData = {
        account_bank: bankAccount.bankCode,
        account_number: bankAccount.accountNumber,
        amount: amount,
        narration: `Paiement trajet Auto-stop ${reference}`,
        currency: 'XAF',
        reference: reference,
        beneficiary_name: bankAccount.accountName,
        debit_currency: 'XAF'
    };
    
    console.log('📤 Transfert bancaire:', transferData);
    
    try {
        const response = await fetch('https://api.flutterwave.com/v3/transfers', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${FLW_SECRET_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(transferData)
        });
        
        const data = await response.json();
        console.log('📥 Réponse transfert:', data);
        
        if (data.status === 'success') {
            return { success: true, data: data.data, reference: data.data.id };
        } else {
            return { success: false, error: data.message };
        }
    } catch (error) {
        console.error('❌ Erreur transfert:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Obtenir le code bancaire selon le pays et le type
 */
function getBankCode(countryCode, type) {
    const codes = {
        'CM': { mobile_money: 'MOBILE_MONEY_CM', bank: 'CMB' },
        'CI': { mobile_money: 'MOBILE_MONEY_CI', bank: 'BICICI' },
        'SN': { mobile_money: 'MOBILE_MONEY_SN', bank: 'BSIC' },
        'GA': { mobile_money: 'MOBILE_MONEY_GA', bank: 'BGFI' },
        'KE': { mobile_money: 'MOBILE_MONEY_KE', bank: 'KCB' }
    };
    
    return codes[countryCode]?.[type] || 'MOBILE_MONEY_CM';
}

/**
 * Vérifier le statut d'un transfert
 * @param {string} transferId - ID du transfert
 * @returns {Promise<Object>}
 */
async function verifyTransfer(transferId) {
    try {
        const response = await fetch(`https://api.flutterwave.com/v3/transfers/${transferId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${FLW_SECRET_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Erreur vérification:', error);
        return null;
    }
}

module.exports = {
    transferToMobileMoney,
    transferToBankAccount,
    verifyTransfer,
    getBankCode
};