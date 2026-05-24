// backend/services/pushNotificationService.js
const { Expo } = require('expo-server-sdk');

let expo = new Expo();

/**
 * Envoie une notification push à un utilisateur
 * @param {string} pushToken - Token Expo push de l'utilisateur
 * @param {string} title - Titre de la notification
 * @param {string} body - Corps de la notification
 * @param {object} data - Données supplémentaires (rideId, bookingId, etc.)
 * @param {object} prisma - Instance Prisma (optionnel, pour nettoyer les tokens invalides)
 * @returns {Promise<boolean>}
 */
async function sendPushNotification(pushToken, title, body, data = {}, prisma = null) {
    if (!pushToken) {
        console.log('⚠️ Pas de push token fourni');
        return false;
    }
    
    if (!Expo.isExpoPushToken(pushToken)) {
        console.error(`❌ Token push invalide: ${pushToken}`);
        return false;
    }
    
    const messages = [{
        to: pushToken,
        sound: 'default',
        title: title,
        body: body,
        data: data,
    }];
    
    try {
        const chunks = expo.chunkPushNotifications(messages);
        for (const chunk of chunks) {
            const receipts = await expo.sendPushNotificationsAsync(chunk);
            for (const receipt of receipts) {
                if (receipt.status === 'error') {
                    console.error(`❌ Erreur push: ${receipt.message}`);
                    if (receipt.details?.error === 'DeviceNotRegistered' && prisma) {
                        // Supprimer le token de la base
                        await prisma.user.updateMany({
                            where: { expoPushToken: pushToken },
                            data: { expoPushToken: null }
                        });
                        console.log(`🗑️ Token push supprimé de la base (DeviceNotRegistered)`);
                    }
                } else if (receipt.status === 'ok') {
                    console.log(`✅ Push notification envoyée à ${pushToken.substring(0, 10)}...`);
                }
            }
        }
        return true;
    } catch (error) {
        console.error('❌ Erreur envoi push:', error.message);
        return false;
    }
}

/**
 * Envoie une notification push liée à un trajet
 * @param {string} userId - ID de l'utilisateur
 * @param {string} title - Titre de la notification
 * @param {string} body - Corps de la notification
 * @param {object} data - Données supplémentaires
 * @param {object} prisma - Instance Prisma
 * @returns {Promise<boolean>}
 */
async function sendRidePushNotification(userId, title, body, data = {}, prisma) {
    if (!prisma) {
        console.error('❌ Prisma requis pour sendRidePushNotification');
        return false;
    }
    
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { expoPushToken: true }
        });
        
        if (user?.expoPushToken) {
            return await sendPushNotification(user.expoPushToken, title, body, data, prisma);
        } else {
            console.log(`⚠️ Utilisateur ${userId} n'a pas de push token`);
            return false;
        }
    } catch (error) {
        console.error('❌ Erreur envoi ride push:', error.message);
        return false;
    }
}

/**
 * Envoie une notification de nouvelle réservation
 * @param {string} userId - ID du conducteur
 * @param {string} passengerName - Nom du passager
 * @param {number} seats - Nombre de places
 * @param {string} departure - Départ
 * @param {string} destination - Destination
 * @param {object} prisma - Instance Prisma
 */
async function sendNewBookingPush(userId, passengerName, seats, departure, destination, prisma) {
    const translations = {
        fr: {
            title: "🔔 Nouvelle réservation !",
            body: `${passengerName} a réservé ${seats} place(s) pour ${departure} → ${destination}`
        },
        en: {
            title: "🔔 New booking!",
            body: `${passengerName} booked ${seats} seat(s) for ${departure} → ${destination}`
        },
        es: {
            title: "🔔 ¡Nueva reserva!",
            body: `${passengerName} ha reservado ${seats} asiento(s) para ${departure} → ${destination}`
        },
        pt: {
            title: "🔔 Nova reserva!",
            body: `${passengerName} reservou ${seats} lugar(es) para ${departure} → ${destination}`
        }
    };
    
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { expoPushToken: true, language: true }
        });
        
        const lang = user?.language || 'fr';
        const t = translations[lang] || translations.fr;
        
        return await sendPushNotification(user?.expoPushToken, t.title, t.body, { type: 'new_booking' }, prisma);
    } catch (error) {
        console.error('❌ Erreur sendNewBookingPush:', error.message);
        return false;
    }
}

/**
 * Envoie une notification de confirmation de réservation
 * @param {string} userId - ID du passager
 * @param {string} driverName - Nom du conducteur
 * @param {string} departure - Départ
 * @param {string} destination - Destination
 * @param {string} date - Date du trajet
 * @param {string} time - Heure du trajet
 * @param {object} prisma - Instance Prisma
 */
async function sendBookingConfirmedPush(userId, driverName, departure, destination, date, time, prisma) {
    const translations = {
        fr: {
            title: "✅ Réservation confirmée !",
            body: `Votre trajet ${departure} → ${destination} avec ${driverName} est confirmé. Bon voyage !`
        },
        en: {
            title: "✅ Booking confirmed!",
            body: `Your ride ${departure} → ${destination} with ${driverName} is confirmed. Have a great trip!`
        },
        es: {
            title: "✅ ¡Reserva confirmada!",
            body: `Tu viaje ${departure} → ${destination} con ${driverName} está confirmado. ¡Buen viaje!`
        },
        pt: {
            title: "✅ Reserva confirmada!",
            body: `Sua viagem ${departure} → ${destination} com ${driverName} está confirmada. Boa viagem!`
        }
    };
    
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { expoPushToken: true, language: true }
        });
        
        const lang = user?.language || 'fr';
        const t = translations[lang] || translations.fr;
        
        return await sendPushNotification(user?.expoPushToken, t.title, t.body, { type: 'booking_confirmed' }, prisma);
    } catch (error) {
        console.error('❌ Erreur sendBookingConfirmedPush:', error.message);
        return false;
    }
}

/**
 * Envoie une notification de rappel
 * @param {string} userId - ID de l'utilisateur
 * @param {string} departure - Départ
 * @param {string} destination - Destination
 * @param {string} reminderType - Type de rappel ('2h', '1h', '30min')
 * @param {object} prisma - Instance Prisma
 */
async function sendReminderPush(userId, departure, destination, reminderType, prisma) {
    const translations = {
        fr: {
            '2h': { title: "⏰ Rappel: Trajet dans 2h", body: `Votre trajet ${departure} → ${destination} commence dans 2 heures.` },
            '1h': { title: "⏰ Rappel: Trajet dans 1h", body: `Votre trajet ${departure} → ${destination} commence dans 1 heure.` },
            '30min': { title: "⏰ Rappel: Trajet dans 30min", body: `Votre trajet ${departure} → ${destination} commence dans 30 minutes !` }
        },
        en: {
            '2h': { title: "⏰ Reminder: Ride in 2h", body: `Your ride ${departure} → ${destination} starts in 2 hours.` },
            '1h': { title: "⏰ Reminder: Ride in 1h", body: `Your ride ${departure} → ${destination} starts in 1 hour.` },
            '30min': { title: "⏰ Reminder: Ride in 30min", body: `Your ride ${departure} → ${destination} starts in 30 minutes!` }
        },
        es: {
            '2h': { title: "⏰ Recordatorio: Viaje en 2h", body: `Tu viaje ${departure} → ${destination} comienza en 2 horas.` },
            '1h': { title: "⏰ Recordatorio: Viaje en 1h", body: `Tu viaje ${departure} → ${destination} comienza en 1 hora.` },
            '30min': { title: "⏰ Recordatorio: Viaje en 30min", body: `¡Tu viaje ${departure} → ${destination} comienza en 30 minutos!` }
        },
        pt: {
            '2h': { title: "⏰ Lembrete: Viagem em 2h", body: `Sua viagem ${departure} → ${destination} começa em 2 horas.` },
            '1h': { title: "⏰ Lembrete: Viagem em 1h", body: `Sua viagem ${departure} → ${destination} começa em 1 hora.` },
            '30min': { title: "⏰ Lembrete: Viagem em 30min", body: `Sua viagem ${departure} → ${destination} começa em 30 minutos!` }
        }
    };
    
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { expoPushToken: true, language: true }
        });
        
        const lang = user?.language || 'fr';
        const t = translations[lang]?.[reminderType] || translations.fr[reminderType];
        
        if (t) {
            return await sendPushNotification(user?.expoPushToken, t.title, t.body, { type: 'reminder', reminderType }, prisma);
        }
        return false;
    } catch (error) {
        console.error('❌ Erreur sendReminderPush:', error.message);
        return false;
    }
}

module.exports = { 
    sendPushNotification, 
    sendRidePushNotification,
    sendNewBookingPush,
    sendBookingConfirmedPush,
    sendReminderPush
};