const nodemailer = require('nodemailer');

// Configuration du transporteur email
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// ============ TEMPLATES MULTILINGUES ============

const templates = {
    // 1. Confirmation réservation pour PASSAGER
    bookingConfirmationToPassenger: {
        fr: (ride, driver, booking) => `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
                <h2 style="color: #FF5A5F;">✅ Réservation confirmée</h2>
                <p>Bonjour ${booking.bookerName},</p>
                <p>Votre réservation pour le trajet <strong>${ride.departure} → ${ride.destination}</strong> du <strong>${new Date(ride.date).toLocaleString('fr-FR')}</strong> est <strong>CONFIRMÉE</strong>.</p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px;">
                    <p><strong>👤 Conducteur :</strong> ${driver.name}</p>
                    <p><strong>🚘 Véhicule :</strong> ${ride.vehicleBrand} ${ride.vehicleType}</p>
                    <p><strong>🔢 Immatriculation :</strong> ${ride.licensePlate || 'Non renseignée'}</p>
                    <p><strong>🆔 CNI conducteur :</strong> ${driver.cniNumber || 'Non renseignée'}</p>
                </div>
                <p>🔐 Un email de sécurité a été envoyé à vos contacts de confiance.</p>
                <hr><p style="color:#888;font-size:12px;">Auto-stop - Covoiturage sécurisé</p>
            </div>
        `,
        en: (ride, driver, booking) => `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
                <h2 style="color: #FF5A5F;">✅ Booking confirmed</h2>
                <p>Hello ${booking.bookerName},</p>
                <p>Your booking for <strong>${ride.departure} → ${ride.destination}</strong> on <strong>${new Date(ride.date).toLocaleString('en-US')}</strong> is <strong>CONFIRMED</strong>.</p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px;">
                    <p><strong>👤 Driver:</strong> ${driver.name}</p>
                    <p><strong>🚘 Vehicle:</strong> ${ride.vehicleBrand} ${ride.vehicleType}</p>
                    <p><strong>🔢 License plate:</strong> ${ride.licensePlate || 'Not provided'}</p>
                    <p><strong>🆔 Driver ID:</strong> ${driver.cniNumber || 'Not provided'}</p>
                </div>
                <p>🔐 A security email has been sent to your trusted contacts.</p>
                <hr><p style="color:#888;font-size:12px;">Auto-stop - Safe carpooling</p>
            </div>
        `,
        es: (ride, driver, booking) => `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
                <h2 style="color: #FF5A5F;">✅ Reserva confirmada</h2>
                <p>Hola ${booking.bookerName},</p>
                <p>Su reserva para <strong>${ride.departure} → ${ride.destination}</strong> del <strong>${new Date(ride.date).toLocaleString('es-ES')}</strong> está <strong>CONFIRMADA</strong>.</p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px;">
                    <p><strong>👤 Conductor:</strong> ${driver.name}</p>
                    <p><strong>🚘 Vehículo:</strong> ${ride.vehicleBrand} ${ride.vehicleType}</p>
                    <p><strong>🔢 Matrícula:</strong> ${ride.licensePlate || 'No proporcionada'}</p>
                    <p><strong>🆔 CI conductor:</strong> ${driver.cniNumber || 'No proporcionada'}</p>
                </div>
                <p>🔐 Se ha enviado un email de seguridad a sus contactos de confianza.</p>
                <hr><p style="color:#888;font-size:12px;">Auto-stop - Viaje seguro</p>
            </div>
        `,
        pt: (ride, driver, booking) => `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
                <h2 style="color: #FF5A5F;">✅ Reserva confirmada</h2>
                <p>Olá ${booking.bookerName},</p>
                <p>A sua reserva para <strong>${ride.departure} → ${ride.destination}</strong> em <strong>${new Date(ride.date).toLocaleString('pt-PT')}</strong> está <strong>CONFIRMADA</strong>.</p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px;">
                    <p><strong>👤 Motorista:</strong> ${driver.name}</p>
                    <p><strong>🚘 Veículo:</strong> ${ride.vehicleBrand} ${ride.vehicleType}</p>
                    <p><strong>🔢 Matrícula:</strong> ${ride.licensePlate || 'Não informada'}</p>
                    <p><strong>🆔 BI motorista:</strong> ${driver.cniNumber || 'Não informado'}</p>
                </div>
                <p>🔐 Um email de segurança foi enviado aos seus contactos de confiança.</p>
                <hr><p style="color:#888;font-size:12px;">Auto-stop - Boleias seguras</p>
            </div>
        `,
    },

    // 2. Confirmation réservation pour CHAUFFEUR
    bookingConfirmationToDriver: {
        fr: (ride, passenger, booking) => `
            <div style="font-family: Arial, sans-serif;">
                <h2 style="color: #FF5A5F;">✅ Nouvelle réservation</h2>
                <p>Bonjour ${ride.driver.name},</p>
                <p><strong>${passenger.name}</strong> a réservé <strong>${booking.seats} place(s)</strong> pour votre trajet :</p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px;">
                    <p>🚗 ${ride.departure} → ${ride.destination}</p>
                    <p>📅 ${new Date(ride.date).toLocaleString('fr-FR')}</p>
                    <p><strong>👤 Passager :</strong> ${passenger.name}</p>
                    <p><strong>🆔 CNI passager :</strong> ${passenger.cniNumber || 'Non renseignée'}</p>
                    <p><strong>📞 Téléphone :</strong> ${passenger.phone}</p>
                </div>
                <p>🔐 Les contacts de confiance du passager ont été notifiés.</p>
                <hr><p style="color:#888;font-size:12px;">Auto-stop - Sécurité avant tout</p>
            </div>
        `,
        en: (ride, passenger, booking) => `
            <div style="font-family: Arial, sans-serif;">
                <h2 style="color: #FF5A5F;">✅ New booking</h2>
                <p>Hello ${ride.driver.name},</p>
                <p><strong>${passenger.name}</strong> booked <strong>${booking.seats} seat(s)</strong> for your ride:</p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px;">
                    <p>🚗 ${ride.departure} → ${ride.destination}</p>
                    <p>📅 ${new Date(ride.date).toLocaleString('en-US')}</p>
                    <p><strong>👤 Passenger:</strong> ${passenger.name}</p>
                    <p><strong>🆔 Passenger ID:</strong> ${passenger.cniNumber || 'Not provided'}</p>
                    <p><strong>📞 Phone:</strong> ${passenger.phone}</p>
                </div>
                <p>🔐 The passenger's trusted contacts have been notified.</p>
                <hr><p style="color:#888;font-size:12px;">Auto-stop - Safety first</p>
            </div>
        `,
        es: (ride, passenger, booking) => `
            <div style="font-family: Arial, sans-serif;">
                <h2 style="color: #FF5A5F;">✅ Nueva reserva</h2>
                <p>Hola ${ride.driver.name},</p>
                <p><strong>${passenger.name}</strong> reservó <strong>${booking.seats} plaza(s)</strong> para su viaje:</p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px;">
                    <p>🚗 ${ride.departure} → ${ride.destination}</p>
                    <p>📅 ${new Date(ride.date).toLocaleString('es-ES')}</p>
                    <p><strong>👤 Pasajero:</strong> ${passenger.name}</p>
                    <p><strong>🆔 CI pasajero:</strong> ${passenger.cniNumber || 'No proporcionada'}</p>
                    <p><strong>📞 Teléfono:</strong> ${passenger.phone}</p>
                </div>
                <p>🔐 Los contactos de confianza del pasajero han sido notificados.</p>
                <hr><p style="color:#888;font-size:12px;">Auto-stop - Seguridad primero</p>
            </div>
        `,
        pt: (ride, passenger, booking) => `
            <div style="font-family: Arial, sans-serif;">
                <h2 style="color: #FF5A5F;">✅ Nova reserva</h2>
                <p>Olá ${ride.driver.name},</p>
                <p><strong>${passenger.name}</strong> reservou <strong>${booking.seats} lugar(es)</strong> para a sua viagem:</p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px;">
                    <p>🚗 ${ride.departure} → ${ride.destination}</p>
                    <p>📅 ${new Date(ride.date).toLocaleString('pt-PT')}</p>
                    <p><strong>👤 Passageiro:</strong> ${passenger.name}</p>
                    <p><strong>🆔 BI passageiro:</strong> ${passenger.cniNumber || 'Não informado'}</p>
                    <p><strong>📞 Telefone:</strong> ${passenger.phone}</p>
                </div>
                <p>🔐 Os contactos de confiança do passageiro foram notificados.</p>
                <hr><p style="color:#888;font-size:12px;">Auto-stop - Segurança em primeiro lugar</p>
            </div>
        `,
    },

    // 3. Alerte aux contacts de confiance
    trustedContactAlert: {
        fr: (passengerName, ride, driver) => `
            <div style="font-family: Arial, sans-serif;">
                <h2 style="color: #FF5A5F;">🔐 Alerte de sécurité Auto-stop</h2>
                <p><strong>${passengerName}</strong> vous a désigné comme contact de confiance.</p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px;">
                    <p><strong>🚗 Trajet :</strong> ${ride.departure} → ${ride.destination}</p>
                    <p><strong>📅 Départ :</strong> ${new Date(ride.date).toLocaleString('fr-FR')}</p>
                    <p><strong>👤 Conducteur :</strong> ${driver.name}</p>
                    <p><strong>🔢 Matricule :</strong> ${ride.licensePlate || 'Non renseigné'}</p>
                </div>
                <p>Vous recevrez des alertes de suivi (départ, arrivée).</p>
            </div>
        `,
        en: (passengerName, ride, driver) => `
            <div style="font-family: Arial, sans-serif;">
                <h2 style="color: #FF5A5F;">🔐 Auto-stop Security Alert</h2>
                <p><strong>${passengerName}</strong> has designated you as a trusted contact.</p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px;">
                    <p><strong>🚗 Ride:</strong> ${ride.departure} → ${ride.destination}</p>
                    <p><strong>📅 Departure:</strong> ${new Date(ride.date).toLocaleString('en-US')}</p>
                    <p><strong>👤 Driver:</strong> ${driver.name}</p>
                    <p><strong>🔢 License plate:</strong> ${ride.licensePlate || 'Not provided'}</p>
                </div>
                <p>You will receive tracking alerts (departure, arrival).</p>
            </div>
        `,
        es: (passengerName, ride, driver) => `
            <div style="font-family: Arial, sans-serif;">
                <h2 style="color: #FF5A5F;">🔐 Alerta de seguridad Auto-stop</h2>
                <p><strong>${passengerName}</strong> le ha designado como contacto de confianza.</p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px;">
                    <p><strong>🚗 Viaje:</strong> ${ride.departure} → ${ride.destination}</p>
                    <p><strong>📅 Salida:</strong> ${new Date(ride.date).toLocaleString('es-ES')}</p>
                    <p><strong>👤 Conductor:</strong> ${driver.name}</p>
                    <p><strong>🔢 Matrícula:</strong> ${ride.licensePlate || 'No proporcionada'}</p>
                </div>
                <p>Recibirá alertas de seguimiento (salida, llegada).</p>
            </div>
        `,
        pt: (passengerName, ride, driver) => `
            <div style="font-family: Arial, sans-serif;">
                <h2 style="color: #FF5A5F;">🔐 Alerta de segurança Auto-stop</h2>
                <p><strong>${passengerName}</strong> designou-o como contacto de confiança.</p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px;">
                    <p><strong>🚗 Viagem:</strong> ${ride.departure} → ${ride.destination}</p>
                    <p><strong>📅 Partida:</strong> ${new Date(ride.date).toLocaleString('pt-PT')}</p>
                    <p><strong>👤 Motorista:</strong> ${driver.name}</p>
                    <p><strong>🔢 Matrícula:</strong> ${ride.licensePlate || 'Não informada'}</p>
                </div>
                <p>Receberá alertas de acompanhamento (partida, chegada).</p>
            </div>
        `,
    },

    // 4. Vérification sécurité 10min avant (PASSAGER)
    securityCheckPassenger: {
        fr: (ride, driver) => `
            <div style="font-family: Arial, sans-serif;">
                <h2 style="color: #FF5A5F;">🔐 VÉRIFICATION SÉCURITÉ</h2>
                <p>Votre trajet commence dans <strong>10 minutes</strong>.</p>
                <div style="background: #fff3cd; padding: 15px; border-radius: 8px;">
                    <p><strong>✅ AVANT D'EMBARQUER, VÉRIFIEZ :</strong></p>
                    <p>🚘 Véhicule : ${ride.vehicleBrand} ${ride.vehicleType}</p>
                    <p>🔢 Immatriculation : ${ride.licensePlate || 'Non renseignée'}</p>
                    <p>👤 Conducteur : ${driver.name}</p>
                    <p>🆔 CNI conducteur : ${driver.cniNumber || 'Non renseignée'}</p>
                </div>
                <div style="background: #f8d7da; padding: 15px; border-radius: 8px; margin-top: 10px;">
                    <p><strong>⚠️ EN CAS DE NON-CONFORMITÉ, N'EMBARQUEZ PAS</strong></p>
                    <p>📞 Contactez immédiatement le support</p>
                </div>
            </div>
        `,
        en: (ride, driver) => `
            <div style="font-family: Arial, sans-serif;">
                <h2 style="color: #FF5A5F;">🔐 SECURITY CHECK</h2>
                <p>Your ride starts in <strong>10 minutes</strong>.</p>
                <div style="background: #fff3cd; padding: 15px; border-radius: 8px;">
                    <p><strong>✅ BEFORE BOARDING, CHECK:</strong></p>
                    <p>🚘 Vehicle: ${ride.vehicleBrand} ${ride.vehicleType}</p>
                    <p>🔢 License plate: ${ride.licensePlate || 'Not provided'}</p>
                    <p>👤 Driver: ${driver.name}</p>
                    <p>🆔 Driver ID: ${driver.cniNumber || 'Not provided'}</p>
                </div>
                <div style="background: #f8d7da; padding: 15px; border-radius: 8px; margin-top: 10px;">
                    <p><strong>⚠️ IF ANYTHING DOES NOT MATCH, DO NOT BOARD</strong></p>
                    <p>📞 Contact support immediately</p>
                </div>
            </div>
        `,
        es: (ride, driver) => `
            <div style="font-family: Arial, sans-serif;">
                <h2 style="color: #FF5A5F;">🔐 CONTROL DE SEGURIDAD</h2>
                <p>Su viaje comienza en <strong>10 minutos</strong>.</p>
                <div style="background: #fff3cd; padding: 15px; border-radius: 8px;">
                    <p><strong>✅ ANTES DE SUBIR, VERIFIQUE:</strong></p>
                    <p>🚘 Vehículo: ${ride.vehicleBrand} ${ride.vehicleType}</p>
                    <p>🔢 Matrícula: ${ride.licensePlate || 'No proporcionada'}</p>
                    <p>👤 Conductor: ${driver.name}</p>
                    <p>🆔 CI conductor: ${driver.cniNumber || 'No proporcionada'}</p>
                </div>
                <div style="background: #f8d7da; padding: 15px; border-radius: 8px; margin-top: 10px;">
                    <p><strong>⚠️ SI ALGO NO COINCIDE, NO SUBAS</strong></p>
                    <p>📞 Contacte al soporte inmediatamente</p>
                </div>
            </div>
        `,
        pt: (ride, driver) => `
            <div style="font-family: Arial, sans-serif;">
                <h2 style="color: #FF5A5F;">🔐 VERIFICAÇÃO DE SEGURANÇA</h2>
                <p>A sua viagem começa em <strong>10 minutos</strong>.</p>
                <div style="background: #fff3cd; padding: 15px; border-radius: 8px;">
                    <p><strong>✅ ANTES DE ENTRAR, VERIFIQUE:</strong></p>
                    <p>🚘 Veículo: ${ride.vehicleBrand} ${ride.vehicleType}</p>
                    <p>🔢 Matrícula: ${ride.licensePlate || 'Não informada'}</p>
                    <p>👤 Motorista: ${driver.name}</p>
                    <p>🆔 BI motorista: ${driver.cniNumber || 'Não informado'}</p>
                </div>
                <div style="background: #f8d7da; padding: 15px; border-radius: 8px; margin-top: 10px;">
                    <p><strong>⚠️ SE ALGO NÃO CORRESPONDER, NÃO ENTRE</strong></p>
                    <p>📞 Contacte o suporte imediatamente</p>
                </div>
            </div>
        `,
    },

    // 5. Vérification sécurité 10min avant (CHAUFFEUR)
    securityCheckDriver: {
        fr: (ride, passengers) => `
            <div style="font-family: Arial, sans-serif;">
                <h2 style="color: #FF5A5F;">🔐 VÉRIFICATION SÉCURITÉ</h2>
                <p>Votre trajet commence dans <strong>10 minutes</strong>.</p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px;">
                    <p><strong>✅ VÉRIFIEZ L'IDENTITÉ DE VOS PASSAGERS :</strong></p>
                    ${passengers.map(p => `<p>👤 ${p.name} - CNI: ${p.cniNumber || 'Non renseignée'}</p>`).join('')}
                </div>
            </div>
        `,
        en: (ride, passengers) => `
            <div style="font-family: Arial, sans-serif;">
                <h2 style="color: #FF5A5F;">🔐 SECURITY CHECK</h2>
                <p>Your ride starts in <strong>10 minutes</strong>.</p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px;">
                    <p><strong>✅ CHECK YOUR PASSENGERS' IDENTITY:</strong></p>
                    ${passengers.map(p => `<p>👤 ${p.name} - ID: ${p.cniNumber || 'Not provided'}</p>`).join('')}
                </div>
            </div>
        `,
        es: (ride, passengers) => `
            <div style="font-family: Arial, sans-serif;">
                <h2 style="color: #FF5A5F;">🔐 CONTROL DE SEGURIDAD</h2>
                <p>Su viaje comienza en <strong>10 minutos</strong>.</p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px;">
                    <p><strong>✅ VERIFIQUE LA IDENTIDAD DE SUS PASAJEROS:</strong></p>
                    ${passengers.map(p => `<p>👤 ${p.name} - CI: ${p.cniNumber || 'No proporcionada'}</p>`).join('')}
                </div>
            </div>
        `,
        pt: (ride, passengers) => `
            <div style="font-family: Arial, sans-serif;">
                <h2 style="color: #FF5A5F;">🔐 VERIFICAÇÃO DE SEGURANÇA</h2>
                <p>A sua viagem começa em <strong>10 minutos</strong>.</p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px;">
                    <p><strong>✅ VERIFIQUE A IDENTIDADE DOS SEUS PASSAGEIROS:</strong></p>
                    ${passengers.map(p => `<p>👤 ${p.name} - BI: ${p.cniNumber || 'Não informado'}</p>`).join('')}
                </div>
            </div>
        `,
    },

    // 6. Rappel trajet (générique)
    rideReminder: {
        fr: (ride, hours) => `
            <div style="font-family: Arial, sans-serif;">
                <h2 style="color: #FF5A5F;">⏰ Rappel trajet</h2>
                <p>Votre trajet <strong>${ride.departure} → ${ride.destination}</strong> commence dans <strong>${hours}</strong>.</p>
                <p>📅 ${new Date(ride.date).toLocaleString('fr-FR')}</p>
            </div>
        `,
        en: (ride, hours) => `
            <div style="font-family: Arial, sans-serif;">
                <h2 style="color: #FF5A5F;">⏰ Ride reminder</h2>
                <p>Your ride <strong>${ride.departure} → ${ride.destination}</strong> starts in <strong>${hours}</strong>.</p>
                <p>📅 ${new Date(ride.date).toLocaleString('en-US')}</p>
            </div>
        `,
        es: (ride, hours) => `
            <div style="font-family: Arial, sans-serif;">
                <h2 style="color: #FF5A5F;">⏰ Recordatorio de viaje</h2>
                <p>Su viaje <strong>${ride.departure} → ${ride.destination}</strong> comienza en <strong>${hours}</strong>.</p>
                <p>📅 ${new Date(ride.date).toLocaleString('es-ES')}</p>
            </div>
        `,
        pt: (ride, hours) => `
            <div style="font-family: Arial, sans-serif;">
                <h2 style="color: #FF5A5F;">⏰ Lembrete de viagem</h2>
                <p>A sua viagem <strong>${ride.departure} → ${ride.destination}</strong> começa em <strong>${hours}</strong>.</p>
                <p>📅 ${new Date(ride.date).toLocaleString('pt-PT')}</p>
            </div>
        `,
    },

    // 7. Notification de DÉPART
    departureNotification: {
        fr: (ride, driver, passengerName = null) => `
            <div style="font-family: Arial, sans-serif;">
                <h2 style="color: #4CAF50;">🚗 TRAJET COMMENCÉ</h2>
                <p>Le trajet <strong>${ride.departure} → ${ride.destination}</strong> a commencé.</p>
                ${passengerName ? `<p><strong>${passengerName}</strong> voyage avec <strong>${driver.name}</strong> (${ride.licensePlate || 'sans plaque'}).</p>` : ''}
                <p>Bon voyage !</p>
            </div>
        `,
        en: (ride, driver, passengerName = null) => `
            <div style="font-family: Arial, sans-serif;">
                <h2 style="color: #4CAF50;">🚗 RIDE STARTED</h2>
                <p>The ride <strong>${ride.departure} → ${ride.destination}</strong> has started.</p>
                ${passengerName ? `<p><strong>${passengerName}</strong> is traveling with <strong>${driver.name}</strong> (${ride.licensePlate || 'no plate'}).</p>` : ''}
                <p>Have a good trip!</p>
            </div>
        `,
        es: (ride, driver, passengerName = null) => `
            <div style="font-family: Arial, sans-serif;">
                <h2 style="color: #4CAF50;">🚗 VIAJE COMENZADO</h2>
                <p>El viaje <strong>${ride.departure} → ${ride.destination}</strong> ha comenzado.</p>
                ${passengerName ? `<p><strong>${passengerName}</strong> viaja con <strong>${driver.name}</strong> (${ride.licensePlate || 'sin placa'}).</p>` : ''}
                <p>¡Buen viaje!</p>
            </div>
        `,
        pt: (ride, driver, passengerName = null) => `
            <div style="font-family: Arial, sans-serif;">
                <h2 style="color: #4CAF50;">🚗 VIAGEM INICIADA</h2>
                <p>A viagem <strong>${ride.departure} → ${ride.destination}</strong> começou.</p>
                ${passengerName ? `<p><strong>${passengerName}</strong> está viajando com <strong>${driver.name}</strong> (${ride.licensePlate || 'sem placa'}).</p>` : ''}
                <p>Boa viagem!</p>
            </div>
        `,
    },

    // 8. Notification d'ARRIVÉE
    arrivalNotification: {
        fr: (ride, passengerName = null) => `
            <div style="font-family: Arial, sans-serif;">
                <h2 style="color: #2196F3;">🏁 TRAJET TERMINÉ</h2>
                <p>Le trajet est normalement arrivé à <strong>${ride.destination}</strong>.</p>
                ${passengerName ? `<p><strong>${passengerName}</strong> est arrivé à destination.</p>` : ''}
            </div>
        `,
        en: (ride, passengerName = null) => `
            <div style="font-family: Arial, sans-serif;">
                <h2 style="color: #2196F3;">🏁 RIDE COMPLETED</h2>
                <p>The ride has normally arrived at <strong>${ride.destination}</strong>.</p>
                ${passengerName ? `<p><strong>${passengerName}</strong> has arrived at destination.</p>` : ''}
            </div>
        `,
        es: (ride, passengerName = null) => `
            <div style="font-family: Arial, sans-serif;">
                <h2 style="color: #2196F3;">🏁 VIAJE TERMINADO</h2>
                <p>El viaje ha llegado normalmente a <strong>${ride.destination}</strong>.</p>
                ${passengerName ? `<p><strong>${passengerName}</strong> ha llegado a su destino.</p>` : ''}
            </div>
        `,
        pt: (ride, passengerName = null) => `
            <div style="font-family: Arial, sans-serif;">
                <h2 style="color: #2196F3;">🏁 VIAGEM TERMINADA</h2>
                <p>A viagem chegou normalmente a <strong>${ride.destination}</strong>.</p>
                ${passengerName ? `<p><strong>${passengerName}</strong> chegou ao destino.</p>` : ''}
            </div>
        `,
    },

    // 9. Invitation à noter (1h après arrivée)
    ratingInvitation: {
        fr: (driverName) => `
            <div style="font-family: Arial, sans-serif;">
                <h2 style="color: #FF5A5F;">⭐ Comment s'est passé votre trajet ?</h2>
                <p>Notez et commentez votre expérience avec <strong>${driverName}</strong>.</p>
                <p>Votre avis nous aide à améliorer la sécurité.</p>
            </div>
        `,
        en: (driverName) => `
            <div style="font-family: Arial, sans-serif;">
                <h2 style="color: #FF5A5F;">⭐ How was your ride?</h2>
                <p>Rate and review your experience with <strong>${driverName}</strong>.</p>
                <p>Your feedback helps us improve safety.</p>
            </div>
        `,
        es: (driverName) => `
            <div style="font-family: Arial, sans-serif;">
                <h2 style="color: #FF5A5F;">⭐ ¿Cómo fue su viaje?</h2>
                <p>Califique y comente su experiencia con <strong>${driverName}</strong>.</p>
                <p>Su opinión nos ayuda a mejorar la seguridad.</p>
            </div>
        `,
        pt: (driverName) => `
            <div style="font-family: Arial, sans-serif;">
                <h2 style="color: #FF5A5F;">⭐ Como foi a sua viagem?</h2>
                <p>Avalie e comente a sua experiência com <strong>${driverName}</strong>.</p>
                <p>A sua opinião ajuda-nos a melhorar a segurança.</p>
            </div>
        `,
    },
};

// ============ FONCTIONS D'ENVOI ============

async function sendEmail(to, subject, htmlContent) {
    try {
        const info = await transporter.sendMail({
            from: '"Auto-stop Sécurité" <securite@autostop.com>',
            to: to,
            subject: subject,
            html: htmlContent,
        });
        console.log(`📧 Email envoyé à ${to}`);
        return true;
    } catch (error) {
        console.error('❌ Erreur envoi email:', error.message);
        return false;
    }
}

async function sendMultilingualEmail(to, language, templateName, templateData) {
    const template = templates[templateName];
    if (!template) {
        console.error(`Template ${templateName} not found`);
        return false;
    }
    
    const lang = ['fr', 'en', 'es', 'pt'].includes(language) ? language : 'fr';
    const htmlContent = template[lang](...templateData);
    
    const subjects = {
        bookingConfirmationToPassenger: { fr: '✅ Réservation confirmée', en: '✅ Booking confirmed', es: '✅ Reserva confirmada', pt: '✅ Reserva confirmada' },
        bookingConfirmationToDriver: { fr: '✅ Nouvelle réservation', en: '✅ New booking', es: '✅ Nueva reserva', pt: '✅ Nova reserva' },
        trustedContactAlert: { fr: '🔐 Alerte de sécurité', en: '🔐 Security Alert', es: '🔐 Alerta de seguridad', pt: '🔐 Alerta de segurança' },
        securityCheckPassenger: { fr: '🔐 Vérification sécurité', en: '🔐 Security Check', es: '🔐 Control de seguridad', pt: '🔐 Verificação de segurança' },
        securityCheckDriver: { fr: '🔐 Vérification sécurité', en: '🔐 Security Check', es: '🔐 Control de seguridad', pt: '🔐 Verificação de segurança' },
        rideReminder: { fr: '⏰ Rappel trajet', en: '⏰ Ride reminder', es: '⏰ Recordatorio', pt: '⏰ Lembrete' },
        departureNotification: { fr: '🚗 Départ', en: '🚗 Departure', es: '🚗 Salida', pt: '🚗 Partida' },
        arrivalNotification: { fr: '🏁 Arrivée', en: '🏁 Arrival', es: '🏁 Llegada', pt: '🏁 Chegada' },
        ratingInvitation: { fr: '⭐ Notez votre trajet', en: '⭐ Rate your ride', es: '⭐ Califique su viaje', pt: '⭐ Avalie sua viagem' },
    };
    
    const subject = subjects[templateName]?.[lang] || 'Auto-stop Notification';
    return await sendEmail(to, subject, htmlContent);
}

module.exports = { sendEmail, sendMultilingualEmail, templates };