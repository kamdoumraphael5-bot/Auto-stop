// backend/services/telegramService.js
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendTelegramMessage(chatId, message, parseMode = 'Markdown') {
    if (!TELEGRAM_BOT_TOKEN) {
        console.log('⚠️ TELEGRAM_BOT_TOKEN non configuré');
        return false;
    }
    
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: parseMode
            })
        });
        const data = await response.json();
        if (data.ok) {
            console.log(`🤖 Message Telegram envoyé à ${chatId}`);
            return true;
        }
        console.error('❌ Erreur Telegram:', data.description);
        return false;
    } catch (error) {
        console.error('❌ Erreur envoi Telegram:', error.message);
        return false;
    }
}

// Fonction pour envoyer un message de bienvenue
async function sendWelcomeMessage(chatId, userLang = 'fr') {
    const translations = {
        fr: (id) => `🚗 *Bienvenue sur Auto-stop !*\n\n` +
            `Je suis votre assistant de notifications.\n\n` +
            `📌 *Pour lier votre compte :*\n` +
            `Allez dans l'application Auto-stop → Profil → Lier Telegram\n` +
            `et entrez votre ID Telegram : \`${id}\`\n\n` +
            `📱 *Vous recevrez :*\n` +
            `• Confirmations de réservation\n` +
            `• Rappels avant départ\n` +
            `• Messages de sécurité\n` +
            `• Fin de trajet et notation\n\n` +
            `🚗 Bon voyage !`,
        en: (id) => `🚗 *Welcome to Auto-stop!*\n\n` +
            `I am your notification assistant.\n\n` +
            `📌 *To link your account:*\n` +
            `Go to Auto-stop app → Profile → Link Telegram\n` +
            `and enter your Telegram ID: \`${id}\`\n\n` +
            `📱 *You will receive:*\n` +
            `• Booking confirmations\n` +
            `• Departure reminders\n` +
            `• Security messages\n` +
            `• End of trip and rating\n\n` +
            `🚗 Have a safe trip!`,
        es: (id) => `🚗 *¡Bienvenido a Auto-stop!*\n\n` +
            `Soy tu asistente de notificaciones.\n\n` +
            `📌 *Para vincular tu cuenta:*\n` +
            `Ve a la aplicación Auto-stop → Perfil → Vincular Telegram\n` +
            `e ingresa tu ID de Telegram: \`${id}\`\n\n` +
            `📱 *Recibirás:*\n` +
            `• Confirmaciones de reserva\n` +
            `• Recordatorios de salida\n` +
            `• Mensajes de seguridad\n` +
            `• Fin de viaje y calificación\n\n` +
            `🚗 ¡Buen viaje!`,
        pt: (id) => `🚗 *Bem-vindo ao Auto-stop!*\n\n` +
            `Sou seu assistente de notificações.\n\n` +
            `📌 *Para vincular sua conta:*\n` +
            `Vá ao aplicativo Auto-stop → Perfil → Vincular Telegram\n` +
            `e digite seu ID do Telegram: \`${id}\`\n\n` +
            `📱 *Você receberá:*\n` +
            `• Confirmações de reserva\n` +
            `• Lembretes de partida\n` +
            `• Mensagens de segurança\n` +
            `• Fim da viagem e avaliação\n\n` +
            `🚗 Boa viagem!`
    };
    
    const t = translations[userLang] || translations.fr;
    const message = t(chatId);
    return sendTelegramMessage(chatId, message);
}

// Fonction pour envoyer une notification de liaison réussie
async function sendLinkedSuccessMessage(chatId, userLang = 'fr') {
    const translations = {
        fr: "🔔 *Connexion réussie !*\n\nVotre compte Telegram a été lié avec succès à Auto-stop.\nVous recevrez désormais les notifications de vos trajets.",
        en: "🔔 *Connection successful!*\n\nYour Telegram account has been successfully linked to Auto-stop.\nYou will now receive your ride notifications.",
        es: "🔔 *¡Conexión exitosa!*\n\nTu cuenta de Telegram ha sido vinculada exitosamente a Auto-stop.\nAhora recibirás las notificaciones de tus viajes.",
        pt: "🔔 *Conexão bem-sucedida!*\n\nSua conta do Telegram foi vinculada com sucesso ao Auto-stop.\nVocê agora receberá as notificações de suas viagens."
    };
    
    const message = translations[userLang] || translations.fr;
    return sendTelegramMessage(chatId, message);
}

// Fonction pour envoyer une notification de dissociation
async function sendUnlinkedMessage(chatId, userLang = 'fr') {
    const translations = {
        fr: "🔔 *Liaison supprimée*\n\nVotre compte Telegram a été dissocié d'Auto-stop. Vous ne recevrez plus de notifications.",
        en: "🔔 *Link removed*\n\nYour Telegram account has been unlinked from Auto-stop. You will no longer receive notifications.",
        es: "🔔 *Vinculación eliminada*\n\nTu cuenta de Telegram ha sido desvinculada de Auto-stop. Ya no recibirás notificaciones.",
        pt: "🔔 *Vinculação removida*\n\nSua conta do Telegram foi desvinculada do Auto-stop. Você não receberá mais notificações."
    };
    
    const message = translations[userLang] || translations.fr;
    return sendTelegramMessage(chatId, message);
}

// Traductions pour les notifications de trajet
const rideTranslations = {
    fr: {
        new_booking: (passengerName, seats, departure, destination) => 
            `🔔 *Nouvelle réservation !*\n\n` +
            `👤 *Passager :* ${passengerName}\n` +
            `👥 *Places :* ${seats}\n` +
            `📍 *Trajet :* ${departure} → ${destination}\n\n` +
            `📱 Connectez-vous à l'application pour plus de détails.`,
        
        booking_confirmed: (driverName, departure, destination, date, time) =>
            `✅ *Réservation confirmée !*\n\n` +
            `👤 *Conducteur :* ${driverName}\n` +
            `📍 *Trajet :* ${departure} → ${destination}\n` +
            `📅 *Date :* ${date}\n` +
            `⏰ *Heure :* ${time}\n\n` +
            `🚗 Bon voyage !`,
        
        reminder_2h: (departure, destination) =>
            `⏰ *Rappel : Trajet dans 2h*\n\n` +
            `Votre trajet ${departure} → ${destination} commence dans 2 heures.\n` +
            `Préparez-vous et soyez à l'heure !`,
        
        reminder_1h: (departure, destination) =>
            `⏰ *Rappel : Trajet dans 1h*\n\n` +
            `Votre trajet ${departure} → ${destination} commence dans 1 heure.\n` +
            `Préparez-vous !`,
        
        reminder_30min: (departure, destination) =>
            `⏰ *Rappel : Trajet dans 30min*\n\n` +
            `Votre trajet ${departure} → ${destination} commence dans 30 minutes !\n` +
            `Rendez-vous au point de rencontre.`,
        
        security_driver: (departure, destination) =>
            `🔐 *Sécurité - Vérification identité*\n\n` +
            `Votre trajet ${departure} → ${destination} commence dans 10 minutes.\n` +
            `Avant le départ, vérifiez la CNI de vos passagers dans l'application.\n\n` +
            `❌ En cas de non-concordance, vous avez le droit de refuser le passager.`,
        
        security_passenger: (departure, destination) =>
            `🔐 *Sécurité - Vérification identité*\n\n` +
            `Votre trajet ${departure} → ${destination} commence dans 10 minutes.\n` +
            `Avant de monter, vérifiez la plaque d'immatriculation et la CNI du conducteur.\n\n` +
            `❌ En cas de non-concordance, ne montez PAS et contactez le support.`,
        
        ride_started_driver: (departure, destination) =>
            `🚗 *Trajet en cours !*\n\n` +
            `Votre trajet ${departure} → ${destination} a commencé.\n` +
            `Bonne route !`,
        
        ride_started_passenger: (departure, destination) =>
            `🚗 *Trajet en cours !*\n\n` +
            `Votre trajet ${departure} → ${destination} a commencé.\n` +
            `Bon voyage !`,
        
        ride_completed: (departure, destination) =>
            `✅ *Trajet terminé !*\n\n` +
            `Votre trajet ${departure} → ${destination} est terminé.\n` +
            `Merci d'avoir voyagé avec Auto-stop !\n\n` +
            `⭐ N'oubliez pas de noter votre conducteur dans l'application.`
    },
    en: {
        new_booking: (passengerName, seats, departure, destination) => 
            `🔔 *New booking!*\n\n` +
            `👤 *Passenger:* ${passengerName}\n` +
            `👥 *Seats:* ${seats}\n` +
            `📍 *Ride:* ${departure} → ${destination}\n\n` +
            `📱 Log in to the app for details.`,
        booking_confirmed: (driverName, departure, destination, date, time) =>
            `✅ *Booking confirmed!*\n\n` +
            `👤 *Driver:* ${driverName}\n` +
            `📍 *Ride:* ${departure} → ${destination}\n` +
            `📅 *Date:* ${date}\n` +
            `⏰ *Time:* ${time}\n\n` +
            `🚗 Have a great trip!`,
        reminder_2h: (departure, destination) =>
            `⏰ *Reminder: Ride in 2h*\n\n` +
            `Your ride ${departure} → ${destination} starts in 2 hours.\n` +
            `Get ready and be on time!`,
        reminder_1h: (departure, destination) =>
            `⏰ *Reminder: Ride in 1h*\n\n` +
            `Your ride ${departure} → ${destination} starts in 1 hour.\n` +
            `Get ready!`,
        reminder_30min: (departure, destination) =>
            `⏰ *Reminder: Ride in 30min*\n\n` +
            `Your ride ${departure} → ${destination} starts in 30 minutes!\n` +
            `Go to the meeting point.`,
        security_driver: (departure, destination) =>
            `🔐 *Security - Verify identity*\n\n` +
            `Your ride ${departure} → ${destination} starts in 10 minutes.\n` +
            `Before departure, check your passengers' ID in the app.\n\n` +
            `❌ If information doesn't match, you can refuse the passenger.`,
        security_passenger: (departure, destination) =>
            `🔐 *Security - Verify identity*\n\n` +
            `Your ride ${departure} → ${destination} starts in 10 minutes.\n` +
            `Before getting in, check the license plate and driver's ID.\n\n` +
            `❌ If information doesn't match, DON'T get in and contact support.`,
        ride_started_driver: (departure, destination) =>
            `🚗 *Ride in progress!*\n\n` +
            `Your ride ${departure} → ${destination} has started.\n` +
            `Have a safe trip!`,
        ride_started_passenger: (departure, destination) =>
            `🚗 *Ride in progress!*\n\n` +
            `Your ride ${departure} → ${destination} has started.\n` +
            `Have a great trip!`,
        ride_completed: (departure, destination) =>
            `✅ *Ride completed!*\n\n` +
            `Your ride ${departure} → ${destination} is complete.\n` +
            `Thank you for traveling with Auto-stop!\n\n` +
            `⭐ Don't forget to rate your driver in the app.`
    },
    es: {
        new_booking: (passengerName, seats, departure, destination) => 
            `🔔 *¡Nueva reserva!*\n\n` +
            `👤 *Pasajero:* ${passengerName}\n` +
            `👥 *Asientos:* ${seats}\n` +
            `📍 *Viaje:* ${departure} → ${destination}\n\n` +
            `📱 Conéctate a la app para más detalles.`,
        booking_confirmed: (driverName, departure, destination, date, time) =>
            `✅ *¡Reserva confirmada!*\n\n` +
            `👤 *Conductor:* ${driverName}\n` +
            `📍 *Viaje:* ${departure} → ${destination}\n` +
            `📅 *Fecha:* ${date}\n` +
            `⏰ *Hora:* ${time}\n\n` +
            `🚗 ¡Buen viaje!`,
        reminder_2h: (departure, destination) =>
            `⏰ *Recordatorio: Viaje en 2h*\n\n` +
            `Tu viaje ${departure} → ${destination} comienza en 2 horas.\n` +
            `¡Prepárate y llega a tiempo!`,
        reminder_1h: (departure, destination) =>
            `⏰ *Recordatorio: Viaje en 1h*\n\n` +
            `Tu viaje ${departure} → ${destination} comienza en 1 hora.\n` +
            `¡Prepárate!`,
        reminder_30min: (departure, destination) =>
            `⏰ *Recordatorio: Viaje en 30min*\n\n` +
            `¡Tu viaje ${departure} → ${destination} comienza en 30 minutos!\n` +
            `Dirígete al punto de encuentro.`,
        security_driver: (departure, destination) =>
            `🔐 *Seguridad - Verificar identidad*\n\n` +
            `Tu viaje ${departure} → ${destination} comienza en 10 minutos.\n` +
            `Antes de salir, verifica la identificación de tus pasajeros.\n\n` +
            `❌ Si no coinciden, puedes rechazar al pasajero.`,
        security_passenger: (departure, destination) =>
            `🔐 *Seguridad - Verificar identidad*\n\n` +
            `Tu viaje ${departure} → ${destination} comienza en 10 minutos.\n` +
            `Antes de subir, verifica la matrícula y la identificación del conductor.\n\n` +
            `❌ Si no coinciden, NO subas y contacta al soporte.`,
        ride_started_driver: (departure, destination) =>
            `🚗 *¡Viaje en curso!*\n\n` +
            `Tu viaje ${departure} → ${destination} ha comenzado.\n` +
            `¡Buen viaje!`,
        ride_started_passenger: (departure, destination) =>
            `🚗 *¡Viaje en curso!*\n\n` +
            `Tu viaje ${departure} → ${destination} ha comenzado.\n` +
            `¡Buen viaje!`,
        ride_completed: (departure, destination) =>
            `✅ *¡Viaje completado!*\n\n` +
            `Tu viaje ${departure} → ${destination} ha terminado.\n` +
            `¡Gracias por viajar con Auto-stop!\n\n` +
            `⭐ No olvides calificar a tu conductor en la aplicación.`
    },
    pt: {
        new_booking: (passengerName, seats, departure, destination) => 
            `🔔 *Nova reserva!*\n\n` +
            `👤 *Passageiro:* ${passengerName}\n` +
            `👥 *Lugares:* ${seats}\n` +
            `📍 *Viagem:* ${departure} → ${destination}\n\n` +
            `📱 Acesse o app para mais detalhes.`,
        booking_confirmed: (driverName, departure, destination, date, time) =>
            `✅ *Reserva confirmada!*\n\n` +
            `👤 *Motorista:* ${driverName}\n` +
            `📍 *Viagem:* ${departure} → ${destination}\n` +
            `📅 *Data:* ${date}\n` +
            `⏰ *Hora:* ${time}\n\n` +
            `🚗 Boa viagem!`,
        reminder_2h: (departure, destination) =>
            `⏰ *Lembrete: Viagem em 2h*\n\n` +
            `Sua viagem ${departure} → ${destination} começa em 2 horas.\n` +
            `Prepare-se e seja pontual!`,
        reminder_1h: (departure, destination) =>
            `⏰ *Lembrete: Viagem em 1h*\n\n` +
            `Sua viagem ${departure} → ${destination} começa em 1 hora.\n` +
            `Prepare-se!`,
        reminder_30min: (departure, destination) =>
            `⏰ *Lembrete: Viagem em 30min*\n\n` +
            `Sua viagem ${departure} → ${destination} começa em 30 minutos!\n` +
            `Vá para o ponto de encontro.`,
        security_driver: (departure, destination) =>
            `🔐 *Segurança - Verificar identidade*\n\n` +
            `Sua viagem ${departure} → ${destination} começa em 10 minutos.\n` +
            `Antes de sair, verifique a identificação de seus passageiros.\n\n` +
            `❌ Se não coincidir, você pode recusar o passageiro.`,
        security_passenger: (departure, destination) =>
            `🔐 *Segurança - Verificar identidade*\n\n` +
            `Sua viagem ${departure} → ${destination} começa em 10 minutos.\n` +
            `Antes de entrar, verifique a placa e a identificação do motorista.\n\n` +
            `❌ Se não coincidir, NÃO entre e contate o suporte.`,
        ride_started_driver: (departure, destination) =>
            `🚗 *Viagem em andamento!*\n\n` +
            `Sua viagem ${departure} → ${destination} começou.\n` +
            `Boa viagem!`,
        ride_started_passenger: (departure, destination) =>
            `🚗 *Viagem em andamento!*\n\n` +
            `Sua viagem ${departure} → ${destination} começou.\n` +
            `Boa viagem!`,
        ride_completed: (departure, destination) =>
            `✅ *Viagem concluída!*\n\n` +
            `Sua viagem ${departure} → ${destination} terminou.\n` +
            `Obrigado por viajar com Auto-stop!\n\n` +
            `⭐ Não se esqueça de avaliar seu motorista no aplicativo.`
    }
};

async function sendRideNotification(chatId, ride, type, userLang = 'fr') {
    const t = rideTranslations[userLang] || rideTranslations.fr;
    
    let message = '';
    switch (type) {
        case 'new_booking':
            message = t.new_booking(ride.passengerName, ride.seats, ride.departure, ride.destination);
            break;
        case 'booking_confirmed':
            message = t.booking_confirmed(ride.driverName, ride.departure, ride.destination, ride.date, ride.time);
            break;
        case 'reminder_2h':
            message = t.reminder_2h(ride.departure, ride.destination);
            break;
        case 'reminder_1h':
            message = t.reminder_1h(ride.departure, ride.destination);
            break;
        case 'reminder_30min':
            message = t.reminder_30min(ride.departure, ride.destination);
            break;
        case 'security_driver':
            message = t.security_driver(ride.departure, ride.destination);
            break;
        case 'security_passenger':
            message = t.security_passenger(ride.departure, ride.destination);
            break;
        case 'ride_started_driver':
            message = t.ride_started_driver(ride.departure, ride.destination);
            break;
        case 'ride_started_passenger':
            message = t.ride_started_passenger(ride.departure, ride.destination);
            break;
        case 'ride_completed':
            message = t.ride_completed(ride.departure, ride.destination);
            break;
        default:
            return false;
    }
    
    return sendTelegramMessage(chatId, message);
}

module.exports = { 
    sendTelegramMessage, 
    sendRideNotification,
    sendWelcomeMessage,
    sendLinkedSuccessMessage,
    sendUnlinkedMessage
};