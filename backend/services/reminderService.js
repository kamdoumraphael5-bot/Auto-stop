// backend/services/reminderService.js
const { PrismaClient } = require('@prisma/client');
const cron = require('node-cron');
const prisma = new PrismaClient();

const scheduledTasks = new Map();
let sendEmailFunction = null;

const setEmailSender = (fn) => {
    sendEmailFunction = fn;
};

const reminderTranslations = {
    fr: {
        title_2h: "⏰ Rappel : Votre trajet dans 2 heures",
        message_2h: (departure, destination) => `⏰ Votre trajet ${departure} → ${destination} commence dans 2 heures.`,
        email_subject_2h: "⏰ Rappel : Votre trajet dans 2 heures",
        title_1h: "⏰ Rappel : Votre trajet dans 1 heure",
        message_1h: (departure, destination) => `⏰ Votre trajet ${departure} → ${destination} commence dans 1 heure.`,
        email_subject_1h: "⏰ Rappel : Votre trajet dans 1 heure",
        title_30min: "⏰ Rappel : Votre trajet dans 30 minutes",
        message_30min: (departure, destination) => `⏰ Votre trajet ${departure} → ${destination} commence dans 30 minutes !`,
        email_subject_30min: "⏰ Rappel : Votre trajet dans 30 minutes",
        security_title: "🔐 Sécurité : Vérifiez l'identité",
        security_message_driver: "🔐 Avant le départ, vérifiez la CNI de vos passagers dans l'application.",
        security_message_passenger: "🔐 Avant de monter, vérifiez la plaque et la CNI du conducteur.",
        security_email_subject: "🔐 Sécurité Auto-stop - Vérification d'identité"
    },
    en: {
        title_2h: "⏰ Reminder: Your ride in 2 hours",
        message_2h: (departure, destination) => `⏰ Your ride ${departure} → ${destination} starts in 2 hours.`,
        email_subject_2h: "⏰ Reminder: Your ride in 2 hours",
        title_1h: "⏰ Reminder: Your ride in 1 hour",
        message_1h: (departure, destination) => `⏰ Your ride ${departure} → ${destination} starts in 1 hour.`,
        email_subject_1h: "⏰ Reminder: Your ride in 1 hour",
        title_30min: "⏰ Reminder: Your ride in 30 minutes",
        message_30min: (departure, destination) => `⏰ Your ride ${departure} → ${destination} starts in 30 minutes!`,
        email_subject_30min: "⏰ Reminder: Your ride in 30 minutes",
        security_title: "🔐 Security: Verify identity",
        security_message_driver: "🔐 Before departure, check your passengers' ID in the app.",
        security_message_passenger: "🔐 Before getting in, check the license plate and driver's ID.",
        security_email_subject: "🔐 Auto-stop Security - Identity verification"
    },
    es: {
        title_2h: "⏰ Recordatorio: Su viaje en 2 horas",
        message_2h: (departure, destination) => `⏰ Su viaje ${departure} → ${destination} comienza en 2 horas.`,
        email_subject_2h: "⏰ Recordatorio: Su viaje en 2 horas",
        title_1h: "⏰ Recordatorio: Su viaje en 1 hora",
        message_1h: (departure, destination) => `⏰ Su viaje ${departure} → ${destination} comienza en 1 hora.`,
        email_subject_1h: "⏰ Recordatorio: Su viaje en 1 hora",
        title_30min: "⏰ Recordatorio: Su viaje en 30 minutos",
        message_30min: (departure, destination) => `⏰ ¡Su viaje ${departure} → ${destination} comienza en 30 minutos!`,
        email_subject_30min: "⏰ Recordatorio: Su viaje en 30 minutos",
        security_title: "🔐 Seguridad: Verificar identidad",
        security_message_driver: "🔐 Antes de salir, verifique la identificación de sus pasajeros.",
        security_message_passenger: "🔐 Antes de subir, verifique la matrícula y la identificación del conductor.",
        email_subject_security: "🔐 Seguridad Auto-stop - Verificación de identidad"
    },
    pt: {
        title_2h: "⏰ Lembrete: Sua viagem em 2 horas",
        message_2h: (departure, destination) => `⏰ Sua viagem ${departure} → ${destination} começa em 2 horas.`,
        email_subject_2h: "⏰ Lembrete: Sua viagem em 2 horas",
        title_1h: "⏰ Lembrete: Sua viagem em 1 hora",
        message_1h: (departure, destination) => `⏰ Sua viagem ${departure} → ${destination} começa em 1 hora.`,
        email_subject_1h: "⏰ Lembrete: Sua viagem em 1 hora",
        title_30min: "⏰ Lembrete: Sua viagem em 30 minutos",
        message_30min: (departure, destination) => `⏰ Sua viagem ${departure} → ${destination} começa em 30 minutos!`,
        email_subject_30min: "⏰ Lembrete: Sua viagem em 30 minutos",
        security_title: "🔐 Segurança: Verificar identidade",
        security_message_driver: "🔐 Antes de sair, verifique a identificação de seus passageiros.",
        security_message_passenger: "🔐 Antes de entrar, verifique a placa e a identificação do motorista.",
        email_subject_security: "🔐 Segurança Auto-stop - Verificação de identidade"
    }
};

async function sendReminder(userId, reminderType, rideDetails, sendEmail = true, emailSender = null) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, email: true, language: true }
        });
        if (!user) return false;

        const lang = user.language || 'fr';
        const t = reminderTranslations[lang] || reminderTranslations.fr;

        let title, message, emailSubject, emailBody;
        const formattedDate = new Date(rideDetails.date).toLocaleDateString();
        const formattedTime = new Date(rideDetails.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        switch (reminderType) {
            case '2h':
                title = t.title_2h;
                message = t.message_2h(rideDetails.departure, rideDetails.destination);
                emailSubject = t.email_subject_2h;
                emailBody = `<p>Bonjour ${user.name},</p><p>${message}</p><p>📅 Date: ${formattedDate} à ${formattedTime}</p>`;
                break;
            case '1h':
                title = t.title_1h;
                message = t.message_1h(rideDetails.departure, rideDetails.destination);
                emailSubject = t.email_subject_1h;
                emailBody = `<p>Bonjour ${user.name},</p><p>${message}</p><p>📅 Date: ${formattedDate} à ${formattedTime}</p>`;
                break;
            case '30min':
                title = t.title_30min;
                message = t.message_30min(rideDetails.departure, rideDetails.destination);
                emailSubject = t.email_subject_30min;
                emailBody = `<p>Bonjour ${user.name},</p><p>${message}</p><p>📅 Date: ${formattedDate} à ${formattedTime}</p>`;
                break;
            default:
                return false;
        }

        await prisma.notification.create({
            data: {
                userId: userId,
                type: "reminder",
                title: title,
                message: message,
                data: JSON.stringify({ rideId: rideDetails.id, reminderType }),
                isRead: false
            }
        });
        console.log(`📬 Rappel ${reminderType} envoyé à ${user.name} (${lang})`);

        if (sendEmail && user.email && emailSender) {
            await emailSender(user.email, emailSubject, emailBody);
            console.log(`📧 Email rappel ${reminderType} envoyé à ${user.email}`);
        }
        return true;
    } catch (error) {
        console.error(`❌ Erreur envoi rappel ${reminderType}:`, error.message);
        return false;
    }
}

async function sendSecurityReminder(userId, rideDetails, isDriver = true, emailSender = null) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, email: true, language: true }
        });
        if (!user) return false;

        const lang = user.language || 'fr';
        const t = reminderTranslations[lang] || reminderTranslations.fr;

        const title = t.security_title;
        const message = isDriver ? t.security_message_driver : t.security_message_passenger;

        await prisma.notification.create({
            data: {
                userId: userId,
                type: "security",
                title: title,
                message: message,
                data: JSON.stringify({ rideId: rideDetails.id, type: 'security' }),
                isRead: false
            }
        });
        console.log(`🔐 Message sécurité envoyé à ${user.name} (${lang})`);

        if (user.email && emailSender) {
            await emailSender(user.email, t.security_email_subject, `<p>${message}</p>`);
            console.log(`📧 Email sécurité envoyé à ${user.email}`);
        }
        return true;
    } catch (error) {
        console.error('❌ Erreur envoi sécurité:', error.message);
        return false;
    }
}

async function scheduleRideReminders(rideId, emailSender = null) {
    try {
        const ride = await prisma.ride.findUnique({
            where: { id: rideId },
            include: {
                driver: { select: { id: true } },
                bookings: { where: { status: 'CONFIRMED' }, select: { passengerId: true } }
            }
        });
        if (!ride) return;

        const departureTime = new Date(ride.date);
        const now = new Date();

        if (scheduledTasks.has(rideId)) {
            const oldTasks = scheduledTasks.get(rideId);
            oldTasks.forEach(task => task.stop());
            scheduledTasks.delete(rideId);
        }

        const reminders = [
            { minutesBefore: 120, type: '2h', users: [ride.driverId, ...ride.bookings.map(b => b.passengerId)] },
            { minutesBefore: 60, type: '1h', users: [ride.driverId, ...ride.bookings.map(b => b.passengerId)] },
            { minutesBefore: 30, type: '30min', users: [ride.driverId, ...ride.bookings.map(b => b.passengerId)] },
            { minutesBefore: 10, type: 'security', users: [ride.driverId, ...ride.bookings.map(b => b.passengerId)] }
        ];

        const tasks = [];
        for (const reminder of reminders) {
            const reminderTime = new Date(departureTime.getTime() - (reminder.minutesBefore * 60 * 1000));
            if (reminderTime > now) {
                const cronExpression = `${reminderTime.getMinutes()} ${reminderTime.getHours()} ${reminderTime.getDate()} ${reminderTime.getMonth() + 1} *`;
                const task = cron.schedule(cronExpression, async () => {
                    console.log(`⏰ Exécution du rappel ${reminder.type} pour le trajet ${rideId}`);
                    if (reminder.type === 'security') {
                        for (const userId of reminder.users) {
                            const isDriver = userId === ride.driverId;
                            await sendSecurityReminder(userId, ride, isDriver, emailSender);
                        }
                    } else {
                        for (const userId of reminder.users) {
                            await sendReminder(userId, reminder.type, ride, true, emailSender);
                        }
                    }
                });
                tasks.push(task);
                console.log(`📅 Rappel ${reminder.type} programmé pour le ${reminderTime.toLocaleString()}`);
            }
        }
        scheduledTasks.set(rideId, tasks);
    } catch (error) {
        console.error('❌ Erreur schedule reminders:', error);
    }
}

async function cancelRideReminders(rideId) {
    if (scheduledTasks.has(rideId)) {
        const tasks = scheduledTasks.get(rideId);
        tasks.forEach(task => task.stop());
        scheduledTasks.delete(rideId);
        console.log(`⏰ Rappels annulés pour le trajet ${rideId}`);
    }
}

module.exports = { 
    sendReminder, 
    sendSecurityReminder, 
    scheduleRideReminders, 
    cancelRideReminders, 
    setEmailSender 
};