const { PrismaClient } = require('@prisma/client');
const { sendMultilingualEmail } = require('./emailService');

const prisma = new PrismaClient();

// ============ VÉRIFICATION CNI EXPIRÉE ============
async function checkExpiredCNIs() {
    console.log('🔍 Vérification des CNI expirées...');
    const now = new Date();
    
    try {
        const users = await prisma.user.findMany({
            where: {
                cniExpiryDate: { lt: now },
                cniNumber: { not: null }
            },
            select: { id: true, email: true, name: true, cniNumber: true, cniExpiryDate: true, language: true }
        });
        
        for (const user of users) {
            const lang = user.language || 'fr';
            const htmlContent = lang === 'fr' ? `
                <div style="font-family: Arial, sans-serif;">
                    <h2 style="color: #FF5A5F;">⚠️ Votre CNI a expiré</h2>
                    <p>Bonjour ${user.name},</p>
                    <p>Votre carte nationale d'identité (${user.cniNumber}) a expiré le ${new Date(user.cniExpiryDate).toLocaleDateString('fr-FR')}.</p>
                    <p>Pour continuer à utiliser Auto-stop en tant que conducteur, veuillez mettre à jour votre CNI dans votre profil.</p>
                    <a href="${process.env.APP_URL}/profile" style="background:#FF5A5F;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Mettre à jour</a>
                </div>
            ` : `
                <div style="font-family: Arial, sans-serif;">
                    <h2 style="color: #FF5A5F;">⚠️ Your ID has expired</h2>
                    <p>Hello ${user.name},</p>
                    <p>Your national ID (${user.cniNumber}) expired on ${new Date(user.cniExpiryDate).toLocaleDateString('en-US')}.</p>
                    <p>To continue using Auto-stop as a driver, please update your ID in your profile.</p>
                    <a href="${process.env.APP_URL}/profile" style="background:#FF5A5F;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Update now</a>
                </div>
            `;
            
            await sendMultilingualEmail(user.email, lang, 'custom', [htmlContent, '⚠️ CNI expirée - Action requise']);
        }
    } catch (error) {
        console.error('❌ Erreur checkExpiredCNIs:', error);
    }
}

// ============ VÉRIFICATION DES NUMÉROS DE CONFIANCE ============
async function verifyTrustedContacts(rideId, passengerId) {
    try {
        const booking = await prisma.booking.findFirst({
            where: { rideId, passengerId },
            include: { passenger: true, ride: true }
        });
        
        if (!booking) return false;
        
        const trustedNumbers = [
            booking.trustedContact1,
            booking.trustedContact2,
            booking.trustedContact3
        ].filter(c => c);
        
        if (trustedNumbers.length === 0) {
            console.log(`⚠️ Aucun contact de confiance pour le passager ${passengerId}`);
            return false;
        }
        
        console.log(`✅ ${trustedNumbers.length} contacts de confiance trouvés pour le trajet ${rideId}`);
        return true;
        
    } catch (error) {
        console.error('❌ Erreur verifyTrustedContacts:', error);
        return false;
    }
}

// ============ VÉRIFICATION CONDUCTEUR (CNI, VÉHICULE) ============
async function verifyDriverSafety(driverId) {
    try {
        const driver = await prisma.user.findUnique({
            where: { id: driverId },
            select: { 
                cniNumber: true, 
                cniExpiryDate: true, 
                cniVerified: true,
                phoneVerified: true,
                rating: true
            }
        });
        
        const issues = [];
        
        if (!driver.cniNumber || !driver.cniVerified) {
            issues.push('CNI non vérifiée');
        }
        
        if (driver.cniExpiryDate && new Date(driver.cniExpiryDate) < new Date()) {
            issues.push('CNI expirée');
        }
        
        if (!driver.phoneVerified) {
            issues.push('Téléphone non vérifié');
        }
        
        if (driver.rating < 3 && driver.rating > 0) {
            issues.push(`Note basse (${driver.rating}/5)`);
        }
        
        if (issues.length > 0) {
            console.log(`⚠️ Conducteur ${driverId} - Problèmes: ${issues.join(', ')}`);
            return { safe: false, issues };
        }
        
        return { safe: true, issues: [] };
        
    } catch (error) {
        console.error('❌ Erreur verifyDriverSafety:', error);
        return { safe: false, issues: ['Erreur de vérification'] };
    }
}

// ============ VÉRIFICATION PASSAGER ============
async function verifyPassengerSafety(passengerId) {
    try {
        const passenger = await prisma.user.findUnique({
            where: { id: passengerId },
            select: { 
                cniNumber: true,
                phoneVerified: true,
                rating: true
            }
        });
        
        const issues = [];
        
        if (!passenger.cniNumber) {
            issues.push('CNI non renseignée');
        }
        
        if (!passenger.phoneVerified) {
            issues.push('Téléphone non vérifié');
        }
        
        if (passenger.rating < 2 && passenger.rating > 0) {
            issues.push(`Note basse (${passenger.rating}/5)`);
        }
        
        if (issues.length > 0) {
            console.log(`⚠️ Passager ${passengerId} - Problèmes: ${issues.join(', ')}`);
            return { safe: false, issues };
        }
        
        return { safe: true, issues: [] };
        
    } catch (error) {
        console.error('❌ Erreur verifyPassengerSafety:', error);
        return { safe: false, issues: ['Erreur de vérification'] };
    }
}

// ============ RAPPORT DE SÉCURITÉ POUR ADMIN ============
async function getSecurityReport() {
    try {
        const now = new Date();
        
        const expiredCNIs = await prisma.user.count({
            where: {
                cniExpiryDate: { lt: now },
                cniNumber: { not: null }
            }
        });
        
        const unverifiedPhones = await prisma.user.count({
            where: { phoneVerified: false }
        });
        
        const lowRatedDrivers = await prisma.user.count({
            where: { rating: { lt: 3 }, rating: { gt: 0 }, ridesAsDriver: { some: {} } }
        });
        
        const ridesWithoutTrustedContacts = await prisma.ride.count({
            where: {
                status: 'SCHEDULED',
                bookings: {
                    every: {
                        trustedContact1: null,
                        trustedContact2: null,
                        trustedContact3: null
                    }
                }
            }
        });
        
        return {
            expiredCNIs,
            unverifiedPhones,
            lowRatedDrivers,
            ridesWithoutTrustedContacts,
            generatedAt: now
        };
        
    } catch (error) {
        console.error('❌ Erreur getSecurityReport:', error);
        return null;
    }
}

// ============ VÉRIFICATION MENSUELLE DES CNI ============
// Exécuter une fois par jour
setInterval(checkExpiredCNIs, 24 * 60 * 60 * 1000);
console.log('🔐 Service de vérification de sécurité démarré');

module.exports = {
    checkExpiredCNIs,
    verifyTrustedContacts,
    verifyDriverSafety,
    verifyPassengerSafety,
    getSecurityReport
};