const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;
// ============ CONFIGURATION EMAIL ============
const nodemailer = require('nodemailer');

// Stockage temporaire des codes OTP
const otpStore = new Map();

// Configuration des transporteurs email
const emailTransporters = {
    gmail: nodemailer.createTransport({
        host: process.env.GMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.GMAIL_PORT) || 587,
        secure: false,
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS,
        },
    }),
    yandex: nodemailer.createTransport({
        host: process.env.YANDEX_HOST || 'smtp.yandex.ru',
        port: parseInt(process.env.YANDEX_PORT) || 465,
        secure: true,
        auth: {
            user: process.env.YANDEX_USER,
            pass: process.env.YANDEX_PASS,
        },
    }),
};

const EMAIL_PRIORITY = ['gmail', 'yandex'];

async function sendEmailWithFallback(to, subject, html) {
    const errors = [];
    for (const serviceName of EMAIL_PRIORITY) {
        try {
            console.log(`📧 Tentative d'envoi via ${serviceName}...`);
            const transporter = emailTransporters[serviceName];
            const result = await transporter.sendMail({
                from: `"Auto-stop" <${serviceName === 'gmail' ? process.env.GMAIL_USER : process.env.YANDEX_USER}>`,
                to: to,
                subject: subject,
                html: html,
            });
            console.log(`✅ Email envoyé via ${serviceName}`);
            return { success: true, service: serviceName, result };
        } catch (error) {
            console.log(`❌ Échec via ${serviceName}:`, error.message);
            errors.push({ service: serviceName, error: error.message });
        }
    }
    console.log(`🚨 Échec total: aucun service n'a pu envoyer l'email à ${to}`);
    return { success: false, errors };
}

app.use(cors());
app.use(express.json());

// ============ FONCTION DE VÉRIFICATION TOKEN ============
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Non authentifié' });
    }
    
    const token = authHeader.split(' ')[1];
    if (!token || token === 'null' || token === 'undefined') {
        return res.status(401).json({ error: 'Token invalide' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (error) {
        console.error('Erreur vérification token:', error.message);
        return res.status(401).json({ error: 'Token invalide ou expiré' });
    }
};

// ============ CONFIGURATION UPLOAD LOCAL ============

const uploadDirs = ['uploads', 'uploads/profiles', 'uploads/gallery', 'uploads/files'];
uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (file.fieldname === 'photo' || file.fieldname === 'profile') {
            cb(null, 'uploads/profiles/');
        } else if (file.fieldname === 'file') {
            cb(null, 'uploads/files/');
        } else {
            cb(null, 'uploads/gallery/');
        }
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Type de fichier non autorisé'));
    }
};

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: fileFilter
});

// ============ SERVEUR SOCKET.IO ============

const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling']
});

const connectedUsers = new Map();

io.on('connection', (socket) => {
    console.log('🔌 Nouvelle connexion socket:', socket.id);
    
    socket.on('register', (userId) => {
        if (userId) {
            connectedUsers.set(userId, socket.id);
            console.log(`✅ Utilisateur ${userId} connecté (${socket.id})`);
            console.log('📱 Utilisateurs connectés:', Array.from(connectedUsers.keys()));
            socket.emit('registered', { success: true, userId, message: 'Enregistrement réussi' });
        } else {
            console.log('⚠️ Tentative d\'enregistrement sans userId');
            socket.emit('registered', { success: false, message: 'UserId manquant' });
        }
    });
    
    socket.on('joinConversation', (conversationId) => {
        socket.join(conversationId);
        console.log(`📢 Socket ${socket.id} a rejoint la conversation ${conversationId}`);
    });
    
    socket.on('leaveConversation', (conversationId) => {
        socket.leave(conversationId);
        console.log(`👋 Socket ${socket.id} a quitté la conversation ${conversationId}`);
    });
    
    socket.on('sendMessage', async (data) => {
        console.log('📨 Message reçu:', data);
        
        const { conversationId, senderId, receiverId, content, type = 'text', fileUrl, fileName, fileSize } = data;
        
        if (senderId === receiverId) {
            socket.emit('error', { message: 'Vous ne pouvez pas vous envoyer un message à vous-même' });
            return;
        }
        
        try {
            let conversation = await prisma.conversation.findUnique({
                where: { id: conversationId }
            });
            
            if (!conversation) {
                conversation = await prisma.conversation.create({
                    data: {
                        id: conversationId,
                        participants: {
                            create: [
                                { userId: senderId },
                                { userId: receiverId }
                            ]
                        }
                    }
                });
            }
            
            const message = await prisma.message.create({
                data: {
                    conversationId: conversation.id,
                    senderId: senderId,
                    receiverId: receiverId,
                    content: content,
                    type: type,
                    fileUrl: fileUrl,
                    fileName: fileName,
                    fileSize: fileSize,
                    isRead: false,
                    isDelivered: false
                },
                include: {
                    sender: {
                        select: { id: true, name: true, photoUrl: true }
                    }
                }
            });
            
            await prisma.conversation.update({
                where: { id: conversation.id },
                data: { updatedAt: new Date() }
            });
            
            const receiverSocketId = connectedUsers.get(receiverId);
            
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('newMessage', message);
                await prisma.message.update({
                    where: { id: message.id },
                    data: { isDelivered: true }
                });
                io.to(receiverSocketId).emit('messageDelivered', { messageId: message.id, conversationId });
                console.log('✅ Message envoyé au destinataire');
            } else {
                console.log('❌ Destinataire non connecté');
            }
            
            socket.emit('messageSent', { success: true, message });
            
        } catch (error) {
            console.error('❌ Erreur envoi message:', error);
            socket.emit('error', { message: 'Erreur lors de l\'envoi' });
        }
    });
    
    socket.on('markAsRead', async (data) => {
        try {
            const { conversationId, userId } = data;
            
            await prisma.message.updateMany({
                where: {
                    conversationId: conversationId,
                    receiverId: userId,
                    isRead: false
                },
                data: { isRead: true }
            });
            
            const senderMessages = await prisma.message.findMany({
                where: {
                    conversationId: conversationId,
                    receiverId: userId,
                    isRead: true
                },
                select: { senderId: true }
            });
            
            const uniqueSenders = [...new Set(senderMessages.map(m => m.senderId))];
            for (const senderId of uniqueSenders) {
                const senderSocketId = connectedUsers.get(senderId);
                if (senderSocketId) {
                    io.to(senderSocketId).emit('messagesRead', { conversationId, userId });
                }
            }
            
        } catch (error) {
            console.error('❌ Erreur markAsRead:', error);
        }
    });
    
    socket.on('messageDelivered', async (data) => {
        try {
            const { messageId, conversationId } = data;
            
            await prisma.message.update({
                where: { id: messageId },
                data: { isDelivered: true }
            });
            
            const message = await prisma.message.findUnique({
                where: { id: messageId },
                select: { senderId: true }
            });
            
            if (message) {
                const senderSocketId = connectedUsers.get(message.senderId);
                if (senderSocketId) {
                    io.to(senderSocketId).emit('messageDelivered', { messageId, conversationId });
                }
            }
        } catch (error) {
            console.error('❌ Erreur messageDelivered:', error);
        }
    });
    
    socket.on('disconnect', () => {
        for (const [userId, socketId] of connectedUsers.entries()) {
            if (socketId === socket.id) {
                connectedUsers.delete(userId);
                console.log(`👤 Utilisateur ${userId} déconnecté`);
                break;
            }
        }
    });
});

// ============ ROUTES API ============

// Route de test
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: '🚗 Auto-stop API fonctionne !', time: new Date().toISOString() });
});

// Route pour les pays
app.get('/api/countries', async (req, res) => {
    try {
        const countries = await prisma.country.findMany({
            where: { isActive: true },
            select: { code: true, name: true, flag: true, phoneCode: true, currency: true }
        });
        res.json({ countries });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors du chargement des pays' });
    }
});

// Route d'inscription
app.post('/api/register', async (req, res) => {
    try {
        const { email, password, name, phone, countryCode } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Cet email est déjà utilisé' });
        }

        const country = await prisma.country.findUnique({ where: { code: countryCode } });
        if (!country) {
            return res.status(400).json({ error: 'Pays non trouvé' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                phone,
                countryId: country.id,
                role: 'USER',
                registrationDate: new Date()
            }
        });

        const token = jwt.sign(
            { userId: user.id, email: user.email, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Inscription réussie',
            token,
            user: { id: user.id, name: user.name, email: user.email, phone: user.phone }
        });

    } catch (error) {
        console.error('Erreur inscription:', error);
        res.status(500).json({ error: 'Erreur lors de l\'inscription' });
    }
});

// Route de connexion
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({
            where: { email },
            include: { country: true }
        });

        if (!user) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Connexion réussie',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                country: user.country.name,
                countryCode: user.country.code,
                photoUrl: user.photoUrl
            }
        });

    } catch (error) {
        console.error('Erreur connexion:', error);
        res.status(500).json({ error: 'Erreur lors de la connexion' });
    }
});

// Route pour les trajets disponibles (écran d'accueil)
app.get('/api/rides', async (req, res) => {
    try {
        const rides = await prisma.ride.findMany({
            where: { 
                status: 'SCHEDULED',
                date: { gte: new Date() },
                isHidden: false
            },
            include: {
                driver: {
                    select: {
                        id: true,
                        name: true,
                        rating: true,
                        photoUrl: true
                    }
                },
                country: true,
                bookings: {
                    where: { status: 'CONFIRMED' },
                    select: { seats: true }
                }
            },
            orderBy: { date: 'asc' }
        });
        
        const ridesWithStats = rides.map(ride => {
            const totalBookedSeats = ride.bookings.reduce((sum, booking) => sum + booking.seats, 0);
            return {
                ...ride,
                totalSeats: ride.totalSeats || ride.availableSeats + totalBookedSeats,
                availableSeats: ride.availableSeats,
                bookedSeats: totalBookedSeats
            };
        });
        
        res.json({ rides: ridesWithStats });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ error: 'Erreur lors du chargement des trajets' });
    }
});

// Route pour les trajets publiés par l'utilisateur
app.get('/api/rides/my-published', verifyToken, async (req, res) => {
    try {
        const rides = await prisma.ride.findMany({
            where: { driverId: req.userId },
            include: {
                driver: { select: { name: true, rating: true } },
                bookings: {
                    include: {
                        passenger: { select: { id: true, name: true, phone: true, photoUrl: true } }
                    }
                }
            },
            orderBy: { date: 'desc' }
        });
        
        res.json({ rides });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ error: 'Erreur lors du chargement' });
    }
});

// Route pour les réservations de l'utilisateur
app.get('/api/rides/my-bookings', verifyToken, async (req, res) => {
    try {
        const bookings = await prisma.booking.findMany({
            where: { passengerId: req.userId },
            include: {
                ride: {
                    include: {
                        driver: {
                            select: { name: true, rating: true, photoUrl: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        
        const rides = bookings.map(b => ({
            bookingId: b.id,
            id: b.ride.id,
            departure: b.ride.departure,
            destination: b.ride.destination,
            date: b.ride.date,
            price: b.ride.price,
            availableSeats: b.ride.availableSeats,
            driverName: b.ride.driver.name,
            driverPhoto: b.ride.driver.photoUrl,
            driverRating: b.ride.driver.rating,
            bookingStatus: b.status,
            bookingDate: b.createdAt,
            seats: b.seats
        }));
        
        res.json({ rides });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ error: 'Erreur lors du chargement' });
    }
});

// Route pour annuler une réservation
app.put('/api/bookings/:id/cancel', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        console.log('📝 Annulation réservation ID:', id);
        
        const booking = await prisma.booking.findUnique({
            where: { id: id },
            include: { ride: true }
        });
        
        if (!booking) {
            return res.status(404).json({ error: 'Réservation non trouvée' });
        }
        
        if (booking.passengerId !== req.userId) {
            return res.status(403).json({ error: 'Non autorisé' });
        }
        
        if (booking.status === 'CANCELLED') {
            return res.status(400).json({ error: 'Réservation déjà annulée' });
        }
        
        if (new Date(booking.ride.date) < new Date()) {
            return res.status(400).json({ error: 'Impossible d\'annuler un trajet déjà passé' });
        }
        
        const updatedBooking = await prisma.booking.update({
            where: { id: id },
            data: { status: 'CANCELLED' }
        });
        
        await prisma.ride.update({
            where: { id: booking.rideId },
            data: { availableSeats: { increment: booking.seats } }
        });
        
        res.json({ message: 'Réservation annulée avec succès', booking: updatedBooking });
    } catch (error) {
        console.error('Erreur annulation:', error);
        res.status(500).json({ error: 'Erreur lors de l\'annulation' });
    }
});

// Route pour les messages non lus (total)
app.get('/api/messages/unread/total', verifyToken, async (req, res) => {
    try {
        const count = await prisma.message.count({
            where: {
                receiverId: req.userId,
                isRead: false
            }
        });
        res.json({ count });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ error: 'Erreur lors du chargement' });
    }
});

// Route pour les conversations
app.get('/api/conversations', verifyToken, async (req, res) => {
    try {
        const participants = await prisma.participant.findMany({
            where: { userId: req.userId },
            include: {
                conversation: {
                    include: {
                        participants: {
                            include: {
                                user: {
                                    select: { id: true, name: true, photoUrl: true }
                                }
                            }
                        },
                        messages: {
                            take: 1,
                            orderBy: { createdAt: 'desc' }
                        },
                        ride: {
                            select: { departure: true, destination: true }
                        }
                    }
                }
            },
            orderBy: { lastReadAt: 'desc' }
        });
        
        const conversations = participants.map(p => p.conversation);
        res.json({ conversations });
    } catch (error) {
        console.error('Erreur conversations:', error);
        res.status(500).json({ error: 'Erreur lors du chargement des conversations' });
    }
});

// Route pour les messages d'une conversation
app.get('/api/messages/:conversationId', verifyToken, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const messages = await prisma.message.findMany({
            where: { conversationId: conversationId },
            orderBy: { createdAt: 'asc' }
        });
        res.json({ messages });
    } catch (error) {
        console.error('Erreur messages:', error);
        res.status(500).json({ error: 'Erreur lors du chargement des messages' });
    }
});

// Route pour les messages non lus d'une conversation
app.get('/api/messages/unread/:conversationId', verifyToken, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const count = await prisma.message.count({
            where: {
                conversationId: conversationId,
                receiverId: req.userId,
                isRead: false
            }
        });
        res.json({ count });
    } catch (error) {
        console.error('Erreur unread:', error);
        res.status(500).json({ error: 'Erreur lors du chargement' });
    }
});

// Route pour publier un trajet
app.post('/api/rides', verifyToken, async (req, res) => {
    try {
        const { 
            departure, 
            meetingPoint, 
            destination, 
            dropoffPoint, 
            date, 
            availableSeats, 
            price, 
            vehicleType, 
            vehicleBrand,
            licensePlate,
            estimatedDuration,
            arrivalTime,
            isRecurring 
        } = req.body;
        
        console.log('📝 Publication trajet reçue:', { departure, destination, price });
        
        if (!departure || !destination || !availableSeats || !price || !vehicleType || !vehicleBrand) {
            return res.status(400).json({ error: 'Champs obligatoires manquants' });
        }
        
        const user = await prisma.user.findUnique({ 
            where: { id: req.userId },
            include: { country: true }
        });
        
        if (!user) {
            return res.status(401).json({ error: 'Utilisateur non trouvé' });
        }
        
        const ride = await prisma.ride.create({
            data: {
                departure,
                meetingPoint: meetingPoint || null,
                destination,
                dropoffPoint: dropoffPoint || null,
                date: new Date(date),
                availableSeats: parseInt(availableSeats),
                price: parseFloat(price),
                vehicleType,
                vehicleBrand,
                licensePlate: licensePlate || null,
                estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : null,
                arrivalTime: arrivalTime ? new Date(arrivalTime) : null,
                isRecurring: isRecurring || false,
                driverId: user.id,
                countryId: user.countryId,
                status: 'SCHEDULED',
                totalSeats: parseInt(availableSeats)
            }
        });
        
        await prisma.user.update({
            where: { id: user.id },
            data: { totalTrips: { increment: 1 } }
        });
        
        console.log('✅ Trajet créé:', ride.id);
        res.json({ message: 'Trajet publié avec succès', ride });
        
    } catch (error) {
        console.error('❌ Erreur publication trajet:', error);
        res.status(500).json({ error: 'Erreur lors de la publication: ' + error.message });
    }
});

// ============ ROUTE POUR CRÉER UNE RÉSERVATION ============
app.post('/api/bookings', verifyToken, async (req, res) => {
    try {
        const { 
            rideId, 
            seats, 
            bookerName, 
            bookerPhone, 
            travelerName, 
            travelerPhone, 
            idNumber, 
            idExpiryDate, 
            amount, 
            paymentMethod 
        } = req.body;

        console.log('📝 Création réservation reçue:', { rideId, seats, bookerName });

        const ride = await prisma.ride.findUnique({
            where: { id: rideId }
        });

        if (!ride) {
            return res.status(404).json({ error: 'Trajet non trouvé' });
        }

        if (ride.availableSeats < seats) {
            return res.status(400).json({ error: 'Plus assez de places disponibles' });
        }

        if (ride.driverId === req.userId) {
            return res.status(400).json({ error: 'Vous ne pouvez pas réserver votre propre trajet' });
        }

        const booking = await prisma.booking.create({
            data: {
                rideId: rideId,
                passengerId: req.userId,
                seats: seats,
                status: 'CONFIRMED',
                bookerName: bookerName || null,
                bookerPhone: bookerPhone || null,
                travelerName: travelerName || null,
                travelerPhone: travelerPhone || null,
                idNumber: idNumber || null,
                idExpiryDate: idExpiryDate ? new Date(idExpiryDate) : null,
                amount: amount || ride.price * seats,
                paymentMethod: paymentMethod || null
            }
        });

        await prisma.ride.update({
            where: { id: rideId },
            data: { availableSeats: { decrement: seats } }
        });

        console.log('✅ Réservation créée:', booking.id);
        res.json({ message: 'Réservation confirmée', booking });

    } catch (error) {
        console.error('❌ Erreur création réservation:', error);
        res.status(500).json({ error: 'Erreur lors de la réservation: ' + error.message });
    }
});

// ============ ROUTES POUR LES DÉTAILS D'UN TRAJET ============

// Route pour obtenir les détails d'un trajet spécifique
app.get('/api/rides/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const ride = await prisma.ride.findUnique({
            where: { id: id },
            include: {
                driver: {
                    select: {
                        id: true,
                        name: true,
                        rating: true,
                        photoUrl: true,
                        phone: true
                    }
                },
                country: true,
                bookings: {
                    where: { status: 'CONFIRMED' },
                    select: { seats: true }
                }
            }
        });
        
        if (!ride) {
            return res.status(404).json({ error: 'Trajet non trouvé' });
        }
        
        const totalBookedSeats = ride.bookings.reduce((sum, booking) => sum + booking.seats, 0);
        
        const rideWithDetails = {
            ...ride,
            bookedSeats: totalBookedSeats,
            availableSeats: ride.availableSeats
        };
        
        res.json({ ride: rideWithDetails });
        
    } catch (error) {
        console.error('Erreur chargement trajet:', error);
        res.status(500).json({ error: 'Erreur lors du chargement du trajet' });
    }
});

// Route pour obtenir les passagers d'un trajet (pour le conducteur)
app.get('/api/rides/:id/passengers', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const ride = await prisma.ride.findUnique({
            where: { id: id }
        });
        
        if (!ride) {
            return res.status(404).json({ error: 'Trajet non trouvé' });
        }
        
        if (ride.driverId !== req.userId) {
            return res.status(403).json({ error: 'Non autorisé - vous n\'êtes pas le conducteur de ce trajet' });
        }
        
        const bookings = await prisma.booking.findMany({
            where: { 
                rideId: id, 
                status: 'CONFIRMED' 
            },
            include: {
                passenger: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        photoUrl: true,
                        rating: true
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        });
        
        const passengers = bookings.map(booking => ({
            id: booking.id,
            passengerId: booking.passenger.id,
            name: booking.passenger.name,
            phone: booking.passenger.phone,
            photoUrl: booking.passenger.photoUrl,
            rating: booking.passenger.rating,
            seats: booking.seats,
            bookerName: booking.bookerName,
            bookerPhone: booking.bookerPhone,
            travelerName: booking.travelerName,
            travelerPhone: booking.travelerPhone,
            idNumber: booking.idNumber,
            idExpiryDate: booking.idExpiryDate,
            amount: booking.amount,
            paymentMethod: booking.paymentMethod,
            bookingDate: booking.createdAt
        }));
        
        res.json({ 
            rideId: id,
            totalPassengers: passengers.length,
            totalSeatsBooked: passengers.reduce((sum, p) => sum + p.seats, 0),
            passengers: passengers 
        });
        
    } catch (error) {
        console.error('Erreur chargement passagers:', error);
        res.status(500).json({ error: 'Erreur lors du chargement des passagers' });
    }
});

// ============ ROUTES PROFIL UTILISATEUR ============

// Route pour obtenir le profil de l'utilisateur connecté
app.get('/api/users/profile', verifyToken, async (req, res) => {
    try {
        console.log('📱 Récupération profil pour userId:', req.userId);
        
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            include: { country: true }
        });
        
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        
        let age = null;
        if (user.birthDate) {
            const today = new Date();
            const birthDate = new Date(user.birthDate);
            age = today.getFullYear() - birthDate.getFullYear();
        }
        
        const { password, ...profileWithoutPassword } = user;
        
        res.json({ 
            profile: {
                ...profileWithoutPassword,
                age
            }
        });
        
    } catch (error) {
        console.error('Erreur chargement profil:', error);
        res.status(500).json({ error: 'Erreur lors du chargement du profil' });
    }
});

// Route pour mettre à jour le profil utilisateur
app.put('/api/users/profile', verifyToken, async (req, res) => {
    try {
        const { bio, experienceLevel, preferences, birthDate, phone, name } = req.body;
        
        const user = await prisma.user.update({
            where: { id: req.userId },
            data: { 
                bio, 
                experienceLevel, 
                preferences, 
                birthDate: birthDate ? new Date(birthDate) : undefined,
                phone: phone || undefined,
                name: name || undefined
            }
        });
        
        const { password, ...profileWithoutPassword } = user;
        res.json({ message: 'Profil mis à jour', profile: profileWithoutPassword });
        
    } catch (error) {
        console.error('Erreur mise à jour profil:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour du profil' });
    }
});

// Route pour obtenir le profil public d'un utilisateur
app.get('/api/users/:id/public', async (req, res) => {
    try {
        const { id } = req.params;
        
        const user = await prisma.user.findUnique({
            where: { id: id },
            include: { country: true }
        });
        
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        
        const publicProfile = {
            id: user.id,
            name: user.name,
            photoUrl: user.photoUrl,
            rating: user.rating,
            experienceLevel: user.experienceLevel,
            bio: user.bio,
            registrationDate: user.registrationDate,
            totalTrips: user.totalTrips,
            preferences: user.preferences,
            gallery: user.gallery,
            country: user.country
        };
        
        res.json({ profile: publicProfile });
        
    } catch (error) {
        console.error('Erreur chargement profil public:', error);
        res.status(500).json({ error: 'Erreur lors du chargement du profil' });
    }
});

// ============ ROUTES POUR LA NOTATION ============

// Récupérer les trajets notables (du départ jusqu'à 24h après)
app.get('/api/rides/rateable', verifyToken, async (req, res) => {
    try {
        const now = new Date();
        
        const bookings = await prisma.booking.findMany({
            where: {
                passengerId: req.userId,
                status: 'CONFIRMED',
                ratingGiven: false
            },
            include: {
                ride: {
                    include: {
                        driver: {
                            select: { id: true, name: true, photoUrl: true }
                        }
                    }
                }
            }
        });
        
        // Filtrer selon la règle: du départ jusqu'à 24h après
        const rateableBookings = bookings.filter(booking => {
            const departureTime = new Date(booking.ride.date);
            const deadline = new Date(departureTime);
            deadline.setHours(deadline.getHours() + 24);
            
            return now >= departureTime && now <= deadline;
        });
        
        res.json({ bookings: rateableBookings });
        
    } catch (error) {
        console.error('Erreur rateable:', error);
        res.status(500).json({ error: 'Erreur lors du chargement' });
    }
});

// Ajouter une note et un commentaire
app.post('/api/rides/:rideId/rate', verifyToken, async (req, res) => {
    try {
        const { rideId } = req.params;
        const { rating, comment } = req.body;
        
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Note invalide (1-5)' });
        }
        
        const booking = await prisma.booking.findFirst({
            where: {
                rideId: rideId,
                passengerId: req.userId,
                status: 'CONFIRMED',
                ratingGiven: false
            },
            include: { 
                ride: { 
                    include: { driver: true } 
                } 
            }
        });
        
        if (!booking) {
            return res.status(404).json({ error: 'Réservation non trouvée ou déjà notée' });
        }
        
        // Vérifier la fenêtre de 24h après le départ
        const now = new Date();
        const departureTime = new Date(booking.ride.date);
        const deadline = new Date(departureTime);
        deadline.setHours(deadline.getHours() + 24);
        
        if (now < departureTime) {
            return res.status(400).json({ error: 'La notation sera disponible après le départ du trajet' });
        }
        
        if (now > deadline) {
            return res.status(400).json({ error: 'La période de notation (24h après le départ) est terminée' });
        }
        
        // Marquer la réservation comme notée
        await prisma.booking.update({
            where: { id: booking.id },
            data: {
                ratingGiven: true,
                ratingValue: rating,
                ratingComment: comment,
                ratingDate: now
            }
        });
        
        // Créer l'avis dans la table Review
        await prisma.review.create({
            data: {
                rideId: rideId,
                reviewerId: req.userId,
                targetId: booking.ride.driverId,
                rating: rating,
                comment: comment,
                category: 'conduite'
            }
        });
        
        // Mettre à jour la note moyenne du conducteur
        const allReviews = await prisma.review.findMany({
            where: { targetId: booking.ride.driverId }
        });
        
        const averageRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
        
        await prisma.user.update({
            where: { id: booking.ride.driverId },
            data: { rating: averageRating }
        });
        
        res.json({ message: 'Merci pour votre avis !' });
        
    } catch (error) {
        console.error('Erreur notation:', error);
        res.status(500).json({ error: 'Erreur lors de la notation' });
    }
});

// Récupérer les avis d'un utilisateur (pour affichage sur profil)
app.get('/api/users/:id/reviews', async (req, res) => {
    try {
        const { id } = req.params;
        
        const reviews = await prisma.review.findMany({
            where: { targetId: id },
            include: {
                reviewer: {
                    select: { id: true, name: true, photoUrl: true }
                },
                ride: {
                    select: { departure: true, destination: true, date: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        
        res.json({ reviews });
        
    } catch (error) {
        console.error('Erreur chargement avis:', error);
        res.status(500).json({ error: 'Erreur lors du chargement des avis' });
    }
});

// ============ ROUTE POUR MODIFIER LA VISIBILITÉ D'UN TRAJET ============
app.put('/api/rides/:id/visibility', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { isHidden } = req.body;
        
        console.log('👁️ Modification visibilité trajet:', { id, isHidden, userId: req.userId });
        
        const ride = await prisma.ride.findUnique({
            where: { id: id }
        });
        
        if (!ride) {
            return res.status(404).json({ error: 'Trajet non trouvé' });
        }
        
        if (ride.driverId !== req.userId) {
            return res.status(403).json({ error: 'Non autorisé - vous n\'êtes pas le conducteur de ce trajet' });
        }
        
        const updatedRide = await prisma.ride.update({
            where: { id: id },
            data: { isHidden: isHidden }
        });
        
        console.log('✅ Visibilité mise à jour:', { id, isHidden: updatedRide.isHidden });
        res.json({ message: 'Visibilité mise à jour', ride: updatedRide });
        
    } catch (error) {
        console.error('❌ Erreur modification visibilité:', error);
        res.status(500).json({ error: 'Erreur lors de la modification de la visibilité' });
    }
});

// ============ ROUTES EMAIL OTP ============

// Route pour envoyer un code OTP par email
app.post('/api/auth/send-otp-email', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: "L'adresse email est requise." });
        }
        
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        otpStore.set(email, {
            code: otp,
            expiresAt: Date.now() + 10 * 60 * 1000,
            attempts: 0
        });
        
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
                <h2 style="color: #FF5A5F;">🔐 Code de vérification Auto-stop</h2>
                <p>Votre code de vérification est :</p>
                <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; padding: 10px; background: #f5f5f5; text-align: center;">
                    ${otp}
                </div>
                <p>Ce code expire dans <strong>10 minutes</strong>.</p>
                <hr><p style="color:#888;font-size:12px;">Auto-stop - Covoiturage sécurisé</p>
            </div>
        `;
        
        const result = await sendEmailWithFallback(email, '🔐 Votre code de vérification Auto-stop', emailHtml);
        
        if (result.success) {
            console.log(`📧 Code OTP ${otp} envoyé à ${email}`);
            res.json({ success: true, message: "Code OTP envoyé par email" });
        } else {
            res.status(500).json({ error: "Erreur lors de l'envoi du code par email" });
        }
        
    } catch (error) {
        console.error('❌ Erreur envoi email OTP:', error);
        res.status(500).json({ error: "Erreur lors de l'envoi du code" });
    }
});

// Route pour vérifier le code OTP par email
app.post('/api/auth/verify-otp-email', async (req, res) => {
    try {
        const { email, otp } = req.body;
        
        const otpData = otpStore.get(email);
        
        if (!otpData) {
            return res.status(400).json({ error: 'Aucune demande de code trouvée' });
        }
        
        if (Date.now() > otpData.expiresAt) {
            otpStore.delete(email);
            return res.status(400).json({ error: 'Le code a expiré' });
        }
        
        if (otpData.attempts >= 3) {
            otpStore.delete(email);
            return res.status(400).json({ error: 'Trop de tentatives' });
        }
        
        if (otpData.code !== otp) {
            otpData.attempts++;
            otpStore.set(email, otpData);
            return res.status(400).json({ error: 'Code invalide' });
        }
        
        otpStore.delete(email);
        
        res.json({ 
            success: true, 
            message: "Email vérifié avec succès",
            verified: true
        });
        
    } catch (error) {
        console.error('❌ Erreur vérification OTP email:', error);
        res.status(500).json({ error: "Erreur lors de la vérification" });
    }
});

// ============ ROUTES PAIEMENT ============

const { processPayment } = require('./services/paymentRouter');
const { calculatePassengerPrice, calculateDriverNet, selectProcessor } = require('./utils/priceCalculator');

// Route pour initier un paiement
app.post('/api/payment/initiate', verifyToken, async (req, res) => {
    try {
        const { rideId, paymentMethod, isInternational = false } = req.body;
        
        console.log('📥 Initiation paiement reçue:', { rideId, paymentMethod, isInternational });
        
        if (!rideId) {
            return res.status(400).json({ error: 'rideId requis' });
        }
        
        const ride = await prisma.ride.findUnique({
            where: { id: rideId },
            include: { driver: true }
        });
        
        if (!ride) {
            return res.status(404).json({ error: 'Trajet non trouvé' });
        }
        
        console.log('✅ Trajet trouvé:', ride.id);
        
        const passenger = await prisma.user.findUnique({
            where: { id: req.userId },
            include: { country: true }
        });
        
        if (!passenger) {
            return res.status(404).json({ error: 'Passager non trouvé' });
        }
        
        const userCountryCode = passenger.country?.code || 'CM';
        
        const processorInfo = selectProcessor(userCountryCode, paymentMethod, isInternational);
        const primaryProcessor = processorInfo ? processorInfo.primary : 'FLUTTERWAVE_MM_AFRICA';
        
        const passengerPrice = calculatePassengerPrice(ride.price, primaryProcessor);
        
        const reference = `RIDE_${rideId}_${Date.now()}_${req.userId}`;
        
        const transaction = await prisma.transaction.create({
            data: {
                id: reference,
                rideId: ride.id,
                passengerId: req.userId,
                amount: passengerPrice,
                driverAmount: ride.price,
                processor: primaryProcessor,
                status: 'PENDING',
                paymentMethod: paymentMethod
            }
        });
        
        const paymentResult = await processPayment({
            amount: passengerPrice,
            currency: 'XAF',
            countryCode: userCountryCode,
            paymentMethod: paymentMethod,
            customerEmail: passenger.email,
            customerPhone: passenger.phone,
            reference: reference,
            isInternational: isInternational
        });
        
        res.json({
            success: true,
            paymentUrl: paymentResult.data?.data?.link || paymentResult.data?.link,
            reference: reference,
            amount: passengerPrice,
            processor: paymentResult.processor
        });
        
    } catch (error) {
        console.error('❌ Erreur initiation paiement:', error);
        res.status(500).json({ error: error.message || 'Erreur lors de l\'initiation du paiement' });
    }
});

// Route de callback après paiement
app.get('/api/payment/callback', async (req, res) => {
    try {
        const { tx_ref, transaction_id, status } = req.query;
        
        const transaction = await prisma.transaction.findUnique({
            where: { id: tx_ref }
        });
        
        if (!transaction) {
            return res.status(404).send('Transaction non trouvée');
        }
        
        if (status === 'successful' || status === 'completed') {
            await prisma.transaction.update({
                where: { id: tx_ref },
                data: { status: 'COMPLETED', processorTransactionId: transaction_id }
            });
            
            const booking = await prisma.booking.create({
                data: {
                    rideId: transaction.rideId,
                    passengerId: transaction.passengerId,
                    seats: 1,
                    status: 'CONFIRMED',
                    amount: transaction.amount,
                    paymentMethod: transaction.paymentMethod,
                    transactionId: tx_ref
                }
            });
            
            await prisma.ride.update({
                where: { id: transaction.rideId },
                data: { availableSeats: { decrement: 1 } }
            });
            
            res.redirect(`${process.env.APP_URL}/payment/success?booking=${booking.id}`);
        } else {
            await prisma.transaction.update({
                where: { id: tx_ref },
                data: { status: 'FAILED' }
            });
            res.redirect(`${process.env.APP_URL}/payment/failed`);
        }
        
    } catch (error) {
        console.error('❌ Erreur callback:', error);
        res.status(500).send('Erreur lors du traitement du paiement');
    }
});

// ============ ROUTE MOCK POUR TESTER LE CALLBACK (TEMPORAIRE) ============
app.get('/api/payment/mock-callback', async (req, res) => {
    const { ref } = req.query;
    console.log('🎭 Route mock appelée avec ref:', ref);
    res.redirect(`http://localhost:3000/api/payment/callback?tx_ref=${ref}&transaction_id=mock_${Date.now()}&status=successful`);
});
// ============ ROUTES MOT DE PASSE OUBLIÉ ============

const crypto = require('crypto');

// Route pour demander un lien de réinitialisation
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: "L'email est requis" });
        }
        
        // Vérifier si l'utilisateur existe
        const user = await prisma.user.findUnique({
            where: { email: email }
        });
        
        if (!user) {
            // Pour des raisons de sécurité, on ne révèle pas que l'email n'existe pas
            return res.json({ 
                success: true, 
                message: "Si cet email existe, un lien de réinitialisation a été envoyé" 
            });
        }
        
        // Générer un token unique
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 heure
        
        // Stocker le token dans la base de données
        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken: resetToken,
                resetTokenExpiry: resetTokenExpiry
            }
        });
        
        // Créer le lien de réinitialisation
        const resetUrl = `${process.env.APP_URL || 'http://localhost:8081'}/reset-password?token=${resetToken}`;
        
        // Contenu de l'email
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
                <h2 style="color: #FF5A5F;">🔐 Réinitialisation de votre mot de passe</h2>
                <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
                <p>Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" style="background-color: #FF5A5F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
                        Réinitialiser mon mot de passe
                    </a>
                </div>
                <p>Ce lien expire dans <strong>1 heure</strong>.</p>
                <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
                <hr>
                <p style="color:#888;font-size:12px;">Auto-stop - Covoiturage sécurisé</p>
            </div>
        `;
        
        // Envoyer l'email
        const result = await sendEmailWithFallback(email, '🔐 Réinitialisation de votre mot de passe', emailHtml);
        
        if (result.success) {
            console.log(`📧 Lien de réinitialisation envoyé à ${email}`);
            res.json({ 
                success: true, 
                message: "Un email de réinitialisation a été envoyé" 
            });
        } else {
            res.status(500).json({ error: "Erreur lors de l'envoi de l'email" });
        }
        
    } catch (error) {
        console.error('❌ Erreur forgot-password:', error);
        res.status(500).json({ error: "Erreur lors du traitement" });
    }
});

// Route pour vérifier si un token est valide
app.get('/api/auth/verify-reset-token', async (req, res) => {
    try {
        const { token } = req.query;
        
        if (!token) {
            return res.status(400).json({ error: "Token requis" });
        }
        
        const user = await prisma.user.findFirst({
            where: {
                resetToken: token,
                resetTokenExpiry: { gt: new Date() }
            }
        });
        
        if (!user) {
            return res.status(400).json({ error: "Lien invalide ou expiré" });
        }
        
        res.json({ valid: true });
        
    } catch (error) {
        console.error('❌ Erreur verify-reset-token:', error);
        res.status(500).json({ error: "Erreur lors de la vérification" });
    }
});

// Route pour réinitialiser le mot de passe
app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        
        if (!token || !newPassword) {
            return res.status(400).json({ error: "Token et nouveau mot de passe requis" });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caractères" });
        }
        
        // Vérifier le token
        const user = await prisma.user.findFirst({
            where: {
                resetToken: token,
                resetTokenExpiry: { gt: new Date() }
            }
        });
        
        if (!user) {
            return res.status(400).json({ error: "Lien invalide ou expiré" });
        }
        
        // Hasher le nouveau mot de passe
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Mettre à jour l'utilisateur et supprimer le token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpiry: null
            }
        });
        
        res.json({ 
            success: true, 
            message: "Mot de passe réinitialisé avec succès" 
        });
        
    } catch (error) {
        console.error('❌ Erreur reset-password:', error);
        res.status(500).json({ error: "Erreur lors de la réinitialisation" });
    }
});

// ============ DÉMARRER LE SERVEUR ============
server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Serveur Auto-stop lancé sur http://0.0.0.0:${PORT}`);
    console.log(`🔌 Socket.io prêt sur le port ${PORT}`);
    console.log(`📱 http://localhost:${PORT}/api/health`);
    console.log(`🌍 http://localhost:${PORT}/api/countries`);
    console.log(`📝 http://localhost:${PORT}/api/register`);
    console.log(`🔐 http://localhost:${PORT}/api/login`);
    console.log(`🚗 http://localhost:${PORT}/api/rides`);
    console.log(`📋 http://localhost:${PORT}/api/rides/my-published`);
    console.log(`📖 http://localhost:${PORT}/api/rides/my-bookings`);
});