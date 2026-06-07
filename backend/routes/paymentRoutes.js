// backend/routes/paymentRoutes.js
const { processPayment } = require('../services/paymentRouter');
const { 
    initiateHybridPayment, 
    releaseFundsToDriver,
    cancelByPassenger,
    cancelByDriver,
    getHoursBeforeDeparture,
    getDriverPenalty
} = require('../services/paymentService');

/**
 * Route pour initier un paiement hybride
 * POST /api/payment/initiate
 */
async function initiatePayment(req, res) {
    try {
        const { rideId, onlinePercent, paymentMethod } = req.body;
        const userId = req.userId;
        
        const ride = await req.prisma.ride.findUnique({
            where: { id: rideId },
            include: { driver: true }
        });
        
        if (!ride) {
            return res.status(404).json({ error: 'Trajet non trouvé' });
        }
        
        const passenger = await req.prisma.user.findUnique({
            where: { id: userId },
            include: { country: true }
        });
        
        const percent = onlinePercent || ride.onlinePaymentPercent || 100;
        
        const result = await initiateHybridPayment(
            ride, 
            passenger, 
            percent, 
            null, 
            req.prisma
        );
        
        res.json({
            success: true,
            paymentUrl: result.paymentUrl,
            transactionId: result.transaction.id,
            onlineAmount: result.onlineAmount,
            cashAmount: result.cashAmount
        });
        
    } catch (error) {
        console.error('❌ Erreur initiation paiement:', error);
        res.status(500).json({ error: error.message });
    }
}

/**
 * Route pour vérifier le statut d'une transaction
 * GET /api/payment/status/:transactionId
 */
async function getPaymentStatus(req, res) {
    try {
        const { transactionId } = req.params;
        
        const transaction = await req.prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { ride: true, driver: true, passenger: true }
        });
        
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction non trouvée' });
        }
        
        res.json({
            status: transaction.status,
            onlineAmount: transaction.onlineAmount,
            cashAmount: transaction.cashAmount,
            driverAmount: transaction.driverAmount,
            releasedAt: transaction.releasedAt
        });
        
    } catch (error) {
        console.error('❌ Erreur statut paiement:', error);
        res.status(500).json({ error: error.message });
    }
}

/**
 * Route pour annuler une réservation (passager)
 * POST /api/payment/cancel-booking
 */
async function cancelBooking(req, res) {
    try {
        const { bookingId } = req.body;
        const userId = req.userId;
        
        const booking = await req.prisma.booking.findUnique({
            where: { id: bookingId },
            include: { ride: true }
        });
        
        if (!booking) {
            return res.status(404).json({ error: 'Réservation non trouvée' });
        }
        
        if (booking.passengerId !== userId) {
            return res.status(403).json({ error: 'Non autorisé' });
        }
        
        const hoursBefore = getHoursBeforeDeparture(booking.ride.date);
        const result = await cancelByPassenger(bookingId, hoursBefore, req.prisma);
        
        res.json({
            success: true,
            refundAmount: result.refundAmount,
            penaltyAmount: result.penaltyAmount,
            refundPercent: result.rules.refundPercent
        });
        
    } catch (error) {
        console.error('❌ Erreur annulation réservation:', error);
        res.status(500).json({ error: error.message });
    }
}

/**
 * Route pour annuler un trajet (conducteur)
 * POST /api/payment/cancel-ride
 */
async function cancelRide(req, res) {
    try {
        const { rideId } = req.body;
        const userId = req.userId;
        
        const ride = await req.prisma.ride.findUnique({
            where: { id: rideId }
        });
        
        if (!ride) {
            return res.status(404).json({ error: 'Trajet non trouvé' });
        }
        
        if (ride.driverId !== userId) {
            return res.status(403).json({ error: 'Non autorisé' });
        }
        
        const hoursBefore = getHoursBeforeDeparture(ride.date);
        const result = await cancelByDriver(rideId, userId, hoursBefore, req.prisma);
        
        // Récupérer les pénalités mises à jour
        const penalty = await getDriverPenalty(userId, req.prisma);
        
        res.json({
            success: true,
            penaltyAmount: result.penaltyAmount,
            penaltyMultiplier: result.penaltyMultiplier,
            totalPenalties: penalty.count,
            accountFrozen: penalty.count >= 3
        });
        
    } catch (error) {
        console.error('❌ Erreur annulation trajet:', error);
        res.status(500).json({ error: error.message });
    }
}

/**
 * Route pour libérer les fonds (après trajet)
 * POST /api/payment/release
 */
async function releaseFunds(req, res) {
    try {
        const { rideId } = req.body;
        const userId = req.userId;
        
        const ride = await req.prisma.ride.findUnique({
            where: { id: rideId }
        });
        
        if (!ride) {
            return res.status(404).json({ error: 'Trajet non trouvé' });
        }
        
        if (ride.driverId !== userId) {
            return res.status(403).json({ error: 'Non autorisé' });
        }
        
        const result = await releaseFundsToDriver(rideId, userId, req.prisma);
        
        res.json({
            success: true,
            message: 'Fonds libérés avec succès',
            transferReference: result.reference
        });
        
    } catch (error) {
        console.error('❌ Erreur libération fonds:', error);
        res.status(500).json({ error: error.message });
    }
}

/**
 * Route pour obtenir les informations de paiement d'un conducteur
 * GET /api/driver/payment-info
 */
async function getDriverPaymentInfo(req, res) {
    try {
        const userId = req.userId;
        
        const user = await req.prisma.user.findUnique({
            where: { id: userId },
            select: {
                paymentMethod: true,
                mobileMoneyNumber: true,
                bankCardNumber: true,
                bankCardExpiry: true,
                bankName: true,
                bankAccountName: true,
                bankAccountNumber: true
            }
        });
        
        res.json({ paymentInfo: user });
        
    } catch (error) {
        console.error('❌ Erreur récupération infos paiement:', error);
        res.status(500).json({ error: error.message });
    }
}

/**
 * Route pour mettre à jour les informations de paiement d'un conducteur
 * PUT /api/driver/payment-info
 */
async function updateDriverPaymentInfo(req, res) {
    try {
        const userId = req.userId;
        const { 
            paymentMethod, 
            mobileMoneyNumber, 
            bankCardNumber, 
            bankCardExpiry, 
            bankCardCvv,
            bankName,
            bankAccountName,
            bankAccountNumber 
        } = req.body;
        
        const updateData = {};
        if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
        if (mobileMoneyNumber !== undefined) updateData.mobileMoneyNumber = mobileMoneyNumber;
        if (bankCardNumber !== undefined) updateData.bankCardNumber = bankCardNumber;
        if (bankCardExpiry !== undefined) updateData.bankCardExpiry = bankCardExpiry;
        if (bankCardCvv !== undefined) updateData.bankCardCvv = bankCardCvv;
        if (bankName !== undefined) updateData.bankName = bankName;
        if (bankAccountName !== undefined) updateData.bankAccountName = bankAccountName;
        if (bankAccountNumber !== undefined) updateData.bankAccountNumber = bankAccountNumber;
        
        const user = await req.prisma.user.update({
            where: { id: userId },
            data: updateData
        });
        
        res.json({ success: true, message: 'Informations de paiement mises à jour' });
        
    } catch (error) {
        console.error('❌ Erreur mise à jour infos paiement:', error);
        res.status(500).json({ error: error.message });
    }
}

/**
 * Route pour obtenir les pénalités d'un conducteur
 * GET /api/driver/penalties
 */
async function getDriverPenalties(req, res) {
    try {
        const userId = req.userId;
        
        const penalties = await req.prisma.driverPenalty.findMany({
            where: { driverId: userId },
            orderBy: { createdAt: 'desc' }
        });
        
        const activePenalty = penalties.find(p => p.expiresAt > new Date());
        
        res.json({
            penalties: penalties,
            activeMultiplier: activePenalty?.multiplier || 1,
            totalCount: penalties.length,
            accountFrozen: activePenalty?.penaltyCount >= 3
        });
        
    } catch (error) {
        console.error('❌ Erreur récupération pénalités:', error);
        res.status(500).json({ error: error.message });
    }
}

module.exports = {
    initiatePayment,
    getPaymentStatus,
    cancelBooking,
    cancelRide,
    releaseFunds,
    getDriverPaymentInfo,
    updateDriverPaymentInfo,
    getDriverPenalties
};