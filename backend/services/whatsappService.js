// backend/services/whatsappService.js
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER;

async function sendWhatsAppMessage(to, message) {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
        console.log('⚠️ Twilio non configuré');
        return false;
    }
    
    try {
        const accountSid = TWILIO_ACCOUNT_SID;
        const authToken = TWILIO_AUTH_TOKEN;
        const client = require('twilio')(accountSid, authToken);
        
        const result = await client.messages.create({
            from: `whatsapp:${TWILIO_WHATSAPP_NUMBER}`,
            to: `whatsapp:${to}`,
            body: message
        });
        
        console.log(`💬 Message WhatsApp envoyé à ${to}: ${result.sid}`);
        return true;
    } catch (error) {
        console.error('❌ Erreur envoi WhatsApp:', error.message);
        return false;
    }
}

module.exports = { sendWhatsAppMessage };