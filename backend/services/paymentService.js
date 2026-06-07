// backend/services/paymentService.js
const { processPayment } = require('./paymentRouter');
const { sendPushNotification } = require('./pushNotificationService');

// Commission Auto-stop (10%)
const AUTO_STOP_COMMISSION = 0.10;

/**
 * Règles de remboursement selon les heures avant départ
 * @param {number} hoursBeforeDeparture - Heures avant le départ
 * @returns {Object} { refundPercent, penaltyPercent }
 */
function getRefundRules(hoursBeforeDeparture) {
    if (hoursBeforeDeparture >= 6) {
        return { refundPercent: 100, penaltyPercent: 0, description: "Remboursement total" };
    } else if (hoursBeforeDeparture >= 3) {
        return { refundPercent: 50, penaltyPercent: 50, description: "Remboursement 50%" };
    } else {
        return { refundPercent: 0, penaltyPercent: 100, description: "Aucun remboursement" };
    }
}

/**
 * Calcule les montants selon le pourcentage de paiement en ligne
 * @param {number} ridePrice - Prix total du trajet
 * @param {number} onlinePercent - Pourcentage payé en ligne (100, 50, 25, 10)
 * @param {string} processor - Processeur de paiement
 * @returns {Object} { onlineAmount, cashAmount, commission, driverAmount }
 */
function calculateAmounts(ridePrice, onlinePercent, processor = 'FLUTTERWAVE_MM_AFRICA') {
    const onlineAmount = Math.round(ridePrice * (onlinePercent / 100));
    const cashAmount = ridePrice - onlineAmount;
    const commission = Math.round(ridePrice * AUTO_STOP_COMMISSION);
    const driverAmount = ridePrice - commission;
    
    return { onlineAmount, cashAmount, commission, driverAmount };
}

/**
 * Initier un paiement hybride (partie en ligne)
 * @param {Object} ride - Objet trajet
 * @param {Object} passenger - Objet passager
 * @param {number} onlinePercent - Pourcentage à payer en ligne
 * @param {string} processor - Processeur de paiement
 * @param {Object} prisma - Instance Prisma
 * @returns {Promise<Object>} { transaction, paymentUrl }
 */
async function initiateHybridPayment(ride, passenger, onlinePercent, processor, prisma) {
    const { onlineAmount, cashAmount, commission, driverAmount } = calculateAmounts(
        ride.price, 
        onlinePercent, 
        processor
    );
    
    const reference = `RIDE_${ride.id}_${Date.now()}_${passenger.id}`;
    
    // Créer la transaction avec statut PENDING
    const transaction = await prisma.transaction.create({
        data: {
            rideId: ride.id,
            passengerId: passenger.id,
            driverId: ride.driverId,
            totalAmount: ride.price,
            onlineAmount: onlineAmount,
            cashAmount: cashAmount,
            driverAmount: driverAmount,
            commission: commission,
            status: 'PENDING',
            paymentMethod: 'mobile_money',
            transactionRef: reference
        }
    });
    
    // Paiement en ligne (seulement le pourcentage)
    const paymentResult = await processPayment({
        amount: onlineAmount,
        currency: ride.displayCurrency || 'XAF',
        countryCode: passenger.country?.code || 'CM',
        paymentMethod: 'mobile_money',
        customerEmail: passenger.email,
        customerPhone: passenger.phone,
        reference: reference,
        isInternational: false
    });
    
    if (paymentResult.success) {
        await prisma.transaction.update({
            where: { id: transaction.id },
            data: { 
                status: 'HELD',
                processor: paymentResult.processor,
                processorTransactionId: paymentResult.data?.id
            }
        });
    } else {
        await prisma.transaction.update({
            where: { id: transaction.id },
            data: { status: 'FAILED' }
        });
        throw new Error(paymentResult.error || 'Paiement échoué');
    }
    
    return { 
        transaction, 
        paymentUrl: paymentResult.paymentUrl,
        onlineAmount,
        cashAmount
    };
}

/**
 * Libérer les fonds au conducteur après le trajet
 * @param {string} rideId - ID du trajet
 * @param {string} driverId - ID du conducteur
 * @param {Object} prisma - Instance Prisma
 * @returns {Promise<Object>} Résultat du virement
 */
async function releaseFundsToDriver(rideId, driverId, prisma) {
    const transaction = await prisma.transaction.findFirst({
        where: { rideId: rideId, status: 'HELD' },
        include: { driver: true }
    });
    
    if (!transaction) {
        throw new Error('Transaction non trouvée ou déjà libérée');
    }
    
    // Mettre à jour le statut
    await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'RELEASING' }
    });
    
    // Virement vers le compte du conducteur
    const transferResult = await transferToDriver(transaction.driver, transaction.driverAmount);
    
    if (transferResult.success) {
        await prisma.transaction.update({
            where: { id: transaction.id },
            data: { 
                status: 'RELEASED', 
                releasedAt: new Date(),
                transferRef: transferResult.reference
            }
        });
    } else {
        await prisma.transaction.update({
            where: { id: transaction.id },
            data: { status: 'FAILED' }
        });
    }
    
    return transferResult;
}

/**
 * Transférer l'argent au conducteur selon son mode de paiement
 * @param {Object} driver - Objet conducteur
 * @param {number} amount - Montant à transférer
 * @returns {Promise<Object>} Résultat du transfert
 */
async function transferToDriver(driver, amount) {
    // À implémenter avec l'API de transfert Flutterwave
    // Pour l'instant, simulation
    console.log(`💰 Transfert de ${amount} FCFA à ${driver.name}`);
    console.log(`   Mode: ${driver.paymentMethod || 'mobile_money'}`);
    console.log(`   Destinataire: ${driver.mobileMoneyNumber || driver.bankAccountNumber}`);
    
    // TODO: Appel réel à l'API Flutterwave pour le transfert
    return {
        success: true,
        reference: `TRANSFER_${Date.now()}`,
        message: 'Transfert initié avec succès'
    };
}

/**
 * Gestion d'annulation par le passager
 * @param {string} bookingId - ID de la réservation
 * @param {number} hoursBeforeDeparture - Heures avant le départ
 * @param {Object} prisma - Instance Prisma
 * @returns {Promise<Object>} { refundAmount, penaltyAmount }
 */
async function cancelByPassenger(bookingId, hoursBeforeDeparture, prisma) {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { 
            ride: { include: { driver: true } },
            transaction: true 
        }
    });
    
    if (!booking || !booking.transaction) {
        throw new Error('Réservation ou transaction non trouvée');
    }
    
    const rules = getRefundRules(hoursBeforeDeparture);
    const refundAmount = Math.round(booking.transaction.onlineAmount * (rules.refundPercent / 100));
    const penaltyAmount = booking.transaction.onlineAmount - refundAmount;
    
    // Remboursement
    if (refundAmount > 0) {
        await refundPassenger(booking.transaction.transactionRef, refundAmount);
    }
    
    // Mettre à jour la transaction
    await prisma.transaction.update({
        where: { id: booking.transaction.id },
        data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancelReason: `Passager annulé ${hoursBeforeDeparture}h avant départ`,
            driverAmount: penaltyAmount
        }
    });
    
    // Enregistrer le remboursement
    await prisma.refund.create({
        data: {
            transactionId: booking.transaction.id,
            amount: refundAmount,
            reason: `Annulation par passager - ${rules.description}`,
            refundPercent: rules.refundPercent,
            hoursBefore: hoursBeforeDeparture
        }
    });
    
    // Si pénalité, verser au conducteur
    if (penaltyAmount > 0) {
        await transferToDriver(booking.ride.driver, penaltyAmount);
    }
    
    // Notification
    if (booking.ride.driver.expoPushToken) {
        await sendPushNotification(
            booking.ride.driver.expoPushToken,
            '❌ Annulation de réservation',
            `Le passager a annulé. Vous recevez ${penaltyAmount} FCFA de dédommagement.`
        );
    }
    
    return { refundAmount, penaltyAmount, rules };
}

/**
 * Gestion d'annulation par le conducteur
 * @param {string} rideId - ID du trajet
 * @param {string} driverId - ID du conducteur
 * @param {number} hoursBeforeDeparture - Heures avant le départ
 * @param {Object} prisma - Instance Prisma
 * @returns {Promise<Object>} { penaltyAmount, penaltyMultiplier }
 */
async function cancelByDriver(rideId, driverId, hoursBeforeDeparture, prisma) {
    const ride = await prisma.ride.findUnique({
        where: { id: rideId },
        include: { 
            bookings: { 
                include: { passenger: true, transaction: true } 
            },
            driver: true
        }
    });
    
    if (!ride) {
        throw new Error('Trajet non trouvé');
    }
    
    // Pénalité uniquement si annulation moins de 3h avant le départ
    let penaltyAmount = 0;
    let penaltyMultiplier = 1;
    
    if (hoursBeforeDeparture < 3) {
        const driverPenalty = await getDriverPenalty(driverId, prisma);
        penaltyMultiplier = driverPenalty.multiplier;
        penaltyAmount = ride.price * AUTO_STOP_COMMISSION * penaltyMultiplier;
        
        // Mettre à jour les pénalités
        await updateDriverPenalty(driverId, prisma);
    }
    
    // Rembourser tous les passagers
    for (const booking of ride.bookings) {
        if (booking.transaction) {
            await refundPassenger(booking.transaction.transactionRef, booking.transaction.onlineAmount);
            
            await prisma.transaction.update({
                where: { id: booking.transaction.id },
                data: {
                    status: 'CANCELLED',
                    cancelledAt: new Date(),
                    cancelReason: `Conducteur annulé ${hoursBeforeDeparture}h avant départ`,
                    driverAmount: -penaltyAmount
                }
            });
            
            // Notification au passager
            if (booking.passenger.expoPushToken) {
                await sendPushNotification(
                    booking.passenger.expoPushToken,
                    '❌ Trajet annulé par le conducteur',
                    `Votre trajet a été annulé. Vous serez remboursé intégralement.`
                );
            }
        }
    }
    
    // Si pénalité, elle est due par le conducteur
    if (penaltyAmount > 0 && penaltyMultiplier > 1) {
        // TODO: Débiter le conducteur de la pénalité
        console.log(`⚠️ Pénalité de ${penaltyAmount} FCFA appliquée au conducteur (x${penaltyMultiplier})`);
    }
    
    // Changer le statut du trajet
    await prisma.ride.update({
        where: { id: rideId },
        data: { status: 'CANCELLED' }
    });
    
    return { penaltyAmount, penaltyMultiplier };
}

/**
 * Récupérer les pénalités du conducteur
 * @param {string} driverId - ID du conducteur
 * @param {Object} prisma - Instance Prisma
 * @returns {Promise<Object>} { count, multiplier }
 */
async function getDriverPenalty(driverId, prisma) {
    const activePenalty = await prisma.driverPenalty.findFirst({
        where: { 
            driverId: driverId, 
            expiresAt: { gt: new Date() } 
        },
        orderBy: { createdAt: 'desc' }
    });
    
    if (activePenalty) {
        return { count: activePenalty.penaltyCount, multiplier: activePenalty.multiplier };
    }
    
    return { count: 0, multiplier: 1 };
}

/**
 * Mettre à jour les pénalités du conducteur après une annulation
 * @param {string} driverId - ID du conducteur
 * @param {Object} prisma - Instance Prisma
 * @returns {Promise<Object>} { count, multiplier, accountFrozen }
 */
async function updateDriverPenalty(driverId, prisma) {
    const lastPenalty = await prisma.driverPenalty.findFirst({
        where: { driverId: driverId },
        orderBy: { createdAt: 'desc' }
    });
    
    let newCount = 1;
    let newMultiplier = 1;
    let accountFrozen = false;
    
    if (lastPenalty) {
        newCount = lastPenalty.penaltyCount + 1;
        if (newCount === 2) newMultiplier = 2;
        else if (newCount >= 3) newMultiplier = 3;
    }
    
    // Geler le compte après 3 annulations consécutives
    if (newCount >= 3) {
        accountFrozen = true;
        await prisma.user.update({
            where: { id: driverId },
            data: { isActive: false }
        });
    }
    
    await prisma.driverPenalty.create({
        data: {
            driverId: driverId,
            penaltyCount: newCount,
            multiplier: newMultiplier,
            expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 jours
        }
    });
    
    return { count: newCount, multiplier: newMultiplier, accountFrozen };
}

/**
 * Rembourser un passager
 * @param {string} transactionRef - Référence de la transaction
 * @param {number} amount - Montant à rembourser
 * @returns {Promise<Object>}
 */
async function refundPassenger(transactionRef, amount) {
    // TODO: Appel à l'API Flutterwave pour remboursement
    console.log(`💰 Remboursement de ${amount} FCFA pour la transaction ${transactionRef}`);
    
    return {
        success: true,
        message: 'Remboursement initié'
    };
}

/**
 * Vérifier si le conducteur peut annuler sans pénalité
 * @param {Date} departureTime - Heure de départ
 * @returns {boolean}
 */
function canCancelWithoutPenalty(departureTime) {
    const now = new Date();
    const hoursBefore = (departureTime - now) / (1000 * 60 * 60);
    return hoursBefore >= 3;
}

/**
 * Calculer le nombre d'heures avant le départ
 * @param {Date} departureTime - Heure de départ
 * @returns {number}
 */
function getHoursBeforeDeparture(departureTime) {
    const now = new Date();
    return (departureTime - now) / (1000 * 60 * 60);
}

module.exports = {
    AUTO_STOP_COMMISSION,
    getRefundRules,
    calculateAmounts,
    initiateHybridPayment,
    releaseFundsToDriver,
    transferToDriver,
    cancelByPassenger,
    cancelByDriver,
    getDriverPenalty,
    updateDriverPenalty,
    refundPassenger,
    canCancelWithoutPenalty,
    getHoursBeforeDeparture
};