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

// ============ IMPORTS DES SERVICES ============
const notificationsRoutes = require('./routes/notifications');
const reminderService = require('./services/reminderService');
const pushService = require('./services/pushNotificationService');

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

// ============ CONFIGURATION DU SERVICE DE RAPPELS ==========
reminderService.setEmailSender(sendEmailWithFallback);
console.log('🔔 Service de rappels initialisé');

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
        req.user = { id: decoded.userId };
        req.userId = decoded.userId;
        next();
    } catch (error) {
        console.error('Erreur vérification token:', error.message);
        return res.status(401).json({ error: 'Token invalide ou expiré' });
    }
};

// ============ ROUTES NOTIFICATIONS ============
app.get('/api/notifications', verifyToken, notificationsRoutes.getNotifications);
app.put('/api/notifications/:id/read', verifyToken, notificationsRoutes.markAsRead);
app.put('/api/notifications/read-all', verifyToken, notificationsRoutes.markAllAsRead);

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

// ============ ROUTE D'INSCRIPTION AVEC OTP ============
app.post('/api/register', async (req, res) => {
    try {
        const { email, password, name, phone, countryCode, language = 'fr' } = req.body;

        // Vérifier si l'utilisateur existe déjà
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Cet email est déjà utilisé' });
        }

        // Vérifier le pays
        const country = await prisma.country.findUnique({ where: { code: countryCode } });
        if (!country) {
            return res.status(400).json({ error: 'Pays non trouvé' });
        }

        // Hacher le mot de passe
        const hashedPassword = await bcrypt.hash(password, 10);

        // Générer un code OTP à 6 chiffres
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // Expire dans 10 minutes

        // Créer l'utilisateur (NON VÉRIFIÉ)
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                phone,
                countryId: country.id,
                role: 'USER',
                registrationDate: new Date(),
                language: language,
                isVerified: false,        // ← NON vérifié
                otpCode: otpCode,         // ← Stocker le code OTP
                otpExpiresAt: otpExpiresAt,
                otpAttempts: 0
            }
        });

        // ========== TRADUCTIONS MULTILINGUES ==========
        const translations = {
            fr: {
                email_subject: "🔐 Vérifiez votre compte Auto-stop",
                email_title: "Code de vérification",
                email_text: "Bienvenue sur Auto-stop ! Pour activer votre compte, veuillez utiliser le code ci-dessous :",
                email_footer: "Ce code expire dans 10 minutes. Si vous n'êtes pas à l'origine de cette inscription, ignorez cet email.",
                button_text: "Vérifier mon compte"
            },
            en: {
                email_subject: "🔐 Verify your Auto-stop account",
                email_title: "Verification code",
                email_text: "Welcome to Auto-stop! To activate your account, please use the code below:",
                email_footer: "This code expires in 10 minutes. If you didn't sign up, please ignore this email.",
                button_text: "Verify my account"
            },
            es: {
                email_subject: "🔐 Verifica tu cuenta Auto-stop",
                email_title: "Código de verificación",
                email_text: "¡Bienvenido a Auto-stop! Para activar tu cuenta, utiliza el siguiente código:",
                email_footer: "Este código expira en 10 minutos. Si no te has registrado, ignora este email.",
                button_text: "Verificar mi cuenta"
            },
            pt: {
                email_subject: "🔐 Verifique sua conta Auto-stop",
                email_title: "Código de verificação",
                email_text: "Bem-vindo ao Auto-stop! Para ativar sua conta, use o código abaixo:",
                email_footer: "Este código expira em 10 minutos. Se você não se registrou, ignore este email.",
                button_text: "Verificar minha conta"
            }
        };

        const t = translations[language] || translations.fr;

        // ========== ENVOI DU CODE OTP PAR EMAIL ==========
        try {
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background-color: #FF5A5F; padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0;">🚗 Auto-stop</h1>
                    </div>
                    <div style="padding: 20px;">
                        <h2 style="color: #FF5A5F;">${t.email_title}</h2>
                        <p>Bonjour ${name},</p>
                        <p>${t.email_text}</p>
                        <div style="font-size: 48px; font-weight: bold; text-align: center; padding: 20px; background: #f5f5f5; border-radius: 10px; letter-spacing: 10px;">
                            ${otpCode}
                        </div>
                        <p>${t.email_footer}</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="https://autostop.app" style="background-color: #FF5A5F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
                                ${t.button_text}
                            </a>
                        </div>
                        <hr>
                        <p style="color: #888; font-size: 12px;">Auto-stop - Covoiturage sécurisé</p>
                    </div>
                </div>
            `;
            
            await sendEmailWithFallback(email, t.email_subject, emailHtml);
            console.log(`📧 Code OTP ${otpCode} envoyé à ${email} (${language})`);
        } catch (emailError) {
            console.error('Erreur envoi email OTP:', emailError.message);
        }

        // ========== NOTIFICATION INTERNE DE BIENVENUE (ATTEND VÉRIFICATION) ==========
        // On n'envoie pas de notification de bienvenue tant que le compte n'est pas vérifié
        
        res.json({ 
            success: true, 
            message: 'Inscription réussie. Un code de vérification a été envoyé à votre email.',
            userId: user.id,
            email: user.email,
            phone: user.phone,
            requiresVerification: true
        });

    } catch (error) {
        console.error('Erreur inscription:', error);
        res.status(500).json({ error: 'Erreur lors de l\'inscription' });
    }
});

// ============ ENVOYER CODE OTP POUR VÉRIFICATION (MULTILINGUE) ============
app.post('/api/auth/send-otp', async (req, res) => {
    try {
        const { email, phone, method = 'email', language = 'fr' } = req.body;
        
        // Traductions
        const translations = {
            fr: {
                email_subject: "🔐 Votre code de vérification Auto-stop",
                email_title: "🔐 Code de vérification",
                greeting: (name) => `Bonjour ${name},`,
                message: "Votre code de vérification est :",
                expiry: "Ce code expire dans <strong>10 minutes</strong>.",
                ignore: "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.",
                telegram_message: (code) => `🔐 *Votre code de vérification Auto-stop*\n\nVotre code est : *${code}*\n\nCe code expire dans 10 minutes.`,
                error_no_channel: "Aucun canal de communication disponible"
            },
            en: {
                email_subject: "🔐 Your Auto-stop verification code",
                email_title: "🔐 Verification code",
                greeting: (name) => `Hello ${name},`,
                message: "Your verification code is:",
                expiry: "This code expires in <strong>10 minutes</strong>.",
                ignore: "If you didn't request this, please ignore this email.",
                telegram_message: (code) => `🔐 *Your Auto-stop verification code*\n\nYour code is: *${code}*\n\nThis code expires in 10 minutes.`,
                error_no_channel: "No communication channel available"
            },
            es: {
                email_subject: "🔐 Tu código de verificación Auto-stop",
                email_title: "🔐 Código de verificación",
                greeting: (name) => `Hola ${name},`,
                message: "Tu código de verificación es:",
                expiry: "Este código expira en <strong>10 minutos</strong>.",
                ignore: "Si no solicitaste esto, ignora este email.",
                telegram_message: (code) => `🔐 *Tu código de verificación Auto-stop*\n\nTu código es: *${code}*\n\nEste código expira en 10 minutos.`,
                error_no_channel: "No hay canal de comunicación disponible"
            },
            pt: {
                email_subject: "🔐 Seu código de verificação Auto-stop",
                email_title: "🔐 Código de verificação",
                greeting: (name) => `Olá ${name},`,
                message: "Seu código de verificação é:",
                expiry: "Este código expira em <strong>10 minutos</strong>.",
                ignore: "Se você não solicitou isso, ignore este e-mail.",
                telegram_message: (code) => `🔐 *Seu código de verificação Auto-stop*\n\nSeu código é: *${code}*\n\nEste código expira em 10 minutos.`,
                error_no_channel: "Nenhum canal de comunicação disponível"
            }
        };
        
        // Trouver l'utilisateur
        const user = await prisma.user.findFirst({
            where: { OR: [{ email }, { phone }] }
        });
        
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        
        const userLang = user.language || language || 'fr';
        const t = translations[userLang] || translations.fr;
        
        // Générer code OTP à 6 chiffres
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        
        // Stocker le code
        await prisma.user.update({
            where: { id: user.id },
            data: { otpCode, otpExpiresAt, otpAttempts: 0 }
        });
        
        // Envoyer selon la méthode choisie
        if (method === 'email' && user.email) {
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px;">
                    <div style="background-color: #FF5A5F; padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0;">🚗 Auto-stop</h1>
                    </div>
                    <div style="padding: 20px;">
                        <h2 style="color: #FF5A5F;">${t.email_title}</h2>
                        <p>${t.greeting(user.name)}</p>
                        <p>${t.message}</p>
                        <div style="font-size: 48px; font-weight: bold; text-align: center; padding: 20px; background: #f5f5f5; border-radius: 10px; letter-spacing: 10px;">
                            ${otpCode}
                        </div>
                        <p>${t.expiry}</p>
                        <p>${t.ignore}</p>
                        <hr>
                        <p style="color: #888; font-size: 12px;">Auto-stop - Covoiturage sécurisé</p>
                    </div>
                </div>
            `;
            await sendEmailWithFallback(user.email, t.email_subject, emailHtml);
            console.log(`📧 Code OTP ${otpCode} envoyé à ${user.email} (${userLang})`);
        } 
        else if (method === 'telegram' && user.telegramChatId) {
            const { sendTelegramMessage } = require('./services/telegramService');
            await sendTelegramMessage(user.telegramChatId, t.telegram_message(otpCode));
            console.log(`🤖 Code OTP ${otpCode} envoyé à Telegram ${user.telegramChatId} (${userLang})`);
        }
        else {
            return res.status(400).json({ error: t.error_no_channel });
        }
        
        res.json({ success: true, message: 'Code envoyé', method });
        
    } catch (error) {
        console.error('❌ Erreur envoi OTP:', error);
        res.status(500).json({ error: 'Erreur lors de l\'envoi du code' });
    }
});

// ============ VÉRIFIER CODE OTP (MULTILINGUE) ==========
app.post('/api/auth/verify-otp', async (req, res) => {
    try {
        const { email, phone, otpCode, language = 'fr' } = req.body;
        
        // Traductions des erreurs
        const translations = {
            fr: {
                user_not_found: "Utilisateur non trouvé",
                no_code: "Aucun code demandé",
                expired: "Code expiré",
                too_many_attempts: "Trop de tentatives",
                invalid_code: "Code invalide",
                success: "Compte vérifié avec succès"
            },
            en: {
                user_not_found: "User not found",
                no_code: "No code requested",
                expired: "Code expired",
                too_many_attempts: "Too many attempts",
                invalid_code: "Invalid code",
                success: "Account verified successfully"
            },
            es: {
                user_not_found: "Usuario no encontrado",
                no_code: "No se solicitó ningún código",
                expired: "Código expirado",
                too_many_attempts: "Demasiados intentos",
                invalid_code: "Código inválido",
                success: "Cuenta verificada exitosamente"
            },
            pt: {
                user_not_found: "Usuário não encontrado",
                no_code: "Nenhum código solicitado",
                expired: "Código expirado",
                too_many_attempts: "Muitas tentativas",
                invalid_code: "Código inválido",
                success: "Conta verificada com sucesso"
            }
        };
        
        // Trouver l'utilisateur
        const user = await prisma.user.findFirst({
            where: { OR: [{ email }, { phone }] }
        });
        
        if (!user) {
            const lang = language || 'fr';
            return res.status(404).json({ error: translations[lang]?.user_not_found || translations.fr.user_not_found });
        }
        
        const userLang = user.language || language || 'fr';
        const t = translations[userLang] || translations.fr;
        
        // Vérifications
        if (!user.otpCode) {
            return res.status(400).json({ error: t.no_code });
        }
        
        if (new Date() > user.otpExpiresAt) {
            return res.status(400).json({ error: t.expired });
        }
        
        if (user.otpAttempts >= 3) {
            return res.status(400).json({ error: t.too_many_attempts });
        }
        
        if (user.otpCode !== otpCode) {
            await prisma.user.update({
                where: { id: user.id },
                data: { otpAttempts: { increment: 1 } }
            });
            return res.status(400).json({ error: t.invalid_code });
        }
        
        // ✅ Code valide -> vérifier le compte
        await prisma.user.update({
            where: { id: user.id },
            data: { 
                isVerified: true,
                otpCode: null,
                otpExpiresAt: null,
                otpAttempts: 0
            }
        });
        
        // ========== NOTIFICATION DE BIENVENUE (CLOCHE) ==========
        try {
            const welcomeTranslations = {
                fr: {
                    title: "🎉 Bienvenue sur Auto-stop !",
                    message: "Votre compte a été vérifié avec succès. Publiez votre premier trajet ou réservez une place dès maintenant !"
                },
                en: {
                    title: "🎉 Welcome to Auto-stop!",
                    message: "Your account has been successfully verified. Publish your first ride or book a seat now!"
                },
                es: {
                    title: "🎉 ¡Bienvenido a Auto-stop!",
                    message: "Tu cuenta ha sido verificada exitosamente. ¡Publica tu primer viaje o reserva un asiento ahora!"
                },
                pt: {
                    title: "🎉 Bem-vindo ao Auto-stop!",
                    message: "Sua conta foi verificada com sucesso. Publique sua primeira viagem ou reserve um lugar agora!"
                }
            };
            const wt = welcomeTranslations[userLang] || welcomeTranslations.fr;
            
            await prisma.notification.create({
                data: {
                    userId: user.id,
                    type: "welcome",
                    title: wt.title,
                    message: wt.message,
                    isRead: false
                }
            });
            console.log(`📬 Notification de bienvenue (cloche) envoyée à ${user.name} (${userLang})`);
        } catch (notifError) {
            console.error('❌ Erreur notification bienvenue:', notifError.message);
        }
        
        // ========== EMAIL DE BIENVENUE ==========
        console.log('📧 Préparation de l\'email de bienvenue...');
        try {
            const welcomeEmailTranslations = {
                fr: {
                    subject: "🎉 Bienvenue sur Auto-stop ! Votre compte est actif",
                    title: "Bienvenue {name} ! 🎉",
                    text: "Nous sommes ravis de vous compter parmi notre communauté de covoiturage sécurisé.",
                    features_title: "✨ Ce qui vous attend :",
                    features: [
                        "🔍 Trouvez des trajets vers toutes les villes",
                        "🚘 Publiez vos trajets et gagnez de l'argent",
                        "🤝 Voyagez en toute sécurité",
                        "⭐ Notez vos compagnons de voyage"
                    ],
                    button: "Découvrir l'application",
                    footer: "Votre compte a été vérifié avec succès. Vous pouvez maintenant publier des trajets ou réserver des places."
                },
                en: {
                    subject: "🎉 Welcome to Auto-stop! Your account is active",
                    title: "Welcome {name}! 🎉",
                    text: "We are delighted to have you in our secure carpooling community.",
                    features_title: "✨ What awaits you:",
                    features: [
                        "🔍 Find rides to all cities",
                        "🚘 Publish your rides and earn money",
                        "🤝 Travel safely",
                        "⭐ Rate your travel companions"
                    ],
                    button: "Discover the app",
                    footer: "Your account has been successfully verified. You can now publish rides or book seats."
                },
                es: {
                    subject: "🎉 ¡Bienvenido a Auto-stop! Tu cuenta está activa",
                    title: "¡Bienvenido {name}! 🎉",
                    text: "Estamos encantados de tenerte en nuestra comunidad de viajes compartidos seguros.",
                    features_title: "✨ Lo que te espera:",
                    features: [
                        "🔍 Encuentra viajes a todas las ciudades",
                        "🚘 Publica tus viajes y gana dinero",
                        "🤝 Viaja con seguridad",
                        "⭐ Califica a tus compañeros de viaje"
                    ],
                    button: "Descubrir la aplicación",
                    footer: "Tu cuenta ha sido verificada exitosamente. Ahora puedes publicar viajes o reservar asientos."
                },
                pt: {
                    subject: "🎉 Bem-vindo ao Auto-stop! Sua conta está ativa",
                    title: "Bem-vindo {name}! 🎉",
                    text: "Estamos felizes em tê-lo em nossa comunidade de caronas seguras.",
                    features_title: "✨ O que espera por você:",
                    features: [
                        "🔍 Encontre viagens para todas as cidades",
                        "🚘 Publique suas viagens e ganhe dinheiro",
                        "🤝 Viaje com segurança",
                        "⭐ Avalie seus companheiros de viagem"
                    ],
                    button: "Descobrir o aplicativo",
                    footer: "Sua conta foi verificada com sucesso. Agora você pode publicar viagens ou reservar lugares."
                }
            };
            
            const wtEmail = welcomeEmailTranslations[userLang] || welcomeEmailTranslations.fr;
            const featuresList = wtEmail.features.map(f => `<li>${f}</li>`).join('');
            
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background-color: #FF5A5F; padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0;">🚗 Auto-stop</h1>
                    </div>
                    <div style="padding: 20px;">
                        <h2 style="color: #FF5A5F;">${wtEmail.title.replace('{name}', user.name)}</h2>
                        <p>${wtEmail.text}</p>
                        <h3>${wtEmail.features_title}</h3>
                        <ul>
                            ${featuresList}
                        </ul>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="https://autostop.app" style="background-color: #FF5A5F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
                                ${wtEmail.button}
                            </a>
                        </div>
                        <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center;">
                            <p style="margin: 0; color: #2e7d32;">✅ ${wtEmail.footer}</p>
                        </div>
                        <hr>
                        <p style="color: #888; font-size: 12px; text-align: center;">
                            Auto-stop - Covoiturage sécurisé<br>
                            <a href="https://autostop.app" style="color: #FF5A5F;">autostop.app</a>
                        </p>
                    </div>
                </div>
            `;
            
            console.log(`📧 Envoi de l'email de bienvenue à ${user.email}...`);
            const emailResult = await sendEmailWithFallback(user.email, wtEmail.subject, emailHtml);
            
            if (emailResult && emailResult.success) {
                console.log(`✅ Email de bienvenue envoyé avec succès à ${user.email} (${userLang}) via ${emailResult.service}`);
            } else {
                console.log(`❌ Échec envoi email de bienvenue à ${user.email}`);
            }
        } catch (emailError) {
            console.error('❌ Erreur envoi email de bienvenue:', emailError.message);
            console.error('❌ Stack:', emailError.stack);
        }

        // Générer le token JWT
        const token = jwt.sign(
            { userId: user.id, email: user.email, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        console.log(`✅ Compte vérifié pour ${user.email} - Email de bienvenue envoyé`);
        
        res.json({ 
            success: true, 
            message: t.success,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                isVerified: true,
                language: userLang
            }
        });
        
    } catch (error) {
        console.error('❌ Erreur vérification OTP:', error);
        res.status(500).json({ error: 'Erreur lors de la vérification' });
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
                photoUrl: user.photoUrl,
                language: user.language || 'fr'
            }
        });

    } catch (error) {
        console.error('Erreur connexion:', error);
        res.status(500).json({ error: 'Erreur lors de la connexion' });
    }
});

// Route pour les trajets disponibles
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
                        photoUrl: true,
                        language: true
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
                driver: { select: { name: true, rating: true, language: true } },
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
                            select: { name: true, rating: true, photoUrl: true, language: true }
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
        
        // ========== NOTIFICATION DE PUBLICATION DE TRAJET (MULTILINGUE) ==========
        const userLanguage = user.language || 'fr';
        
        const pubTranslations = {
            fr: {
                title: "✅ Votre trajet a été publié !",
                message: `${departure} → ${destination} le ${new Date(date).toLocaleDateString('fr-FR')}. Bonnes réservations !`,
                email_subject: "✅ Votre trajet a été publié",
                email_title: "✅ Votre trajet a été publié !",
                email_greeting: `Bonjour ${user.name},`,
                email_text: `Votre trajet <strong>${departure} → ${destination}</strong> du <strong>${new Date(date).toLocaleDateString('fr-FR')}</strong> a bien été publié.`,
                email_price: `💰 Prix : ${price} FCFA par place`,
                email_seats: `💺 Places disponibles : ${availableSeats}`,
                email_footer: "Les passagers peuvent maintenant réserver votre trajet. Soyez attentif aux notifications !"
            },
            en: {
                title: "✅ Your ride has been published!",
                message: `${departure} → ${destination} on ${new Date(date).toLocaleDateString('en-US')}. Good luck with bookings!`,
                email_subject: "✅ Your ride has been published",
                email_title: "✅ Your ride has been published!",
                email_greeting: `Hello ${user.name},`,
                email_text: `Your ride <strong>${departure} → ${destination}</strong> on <strong>${new Date(date).toLocaleDateString('en-US')}</strong> has been successfully published.`,
                email_price: `💰 Price: ${price} FCFA per seat`,
                email_seats: `💺 Available seats: ${availableSeats}`,
                email_footer: "Passengers can now book your ride. Stay tuned for notifications!"
            },
            es: {
                title: "✅ ¡Tu viaje ha sido publicado!",
                message: `${departure} → ${destination} el ${new Date(date).toLocaleDateString('es-ES')}. ¡Buenas reservas!`,
                email_subject: "✅ Tu viaje ha sido publicado",
                email_title: "✅ ¡Tu viaje ha sido publicado!",
                email_greeting: `Hola ${user.name},`,
                email_text: `Tu viaje <strong>${departure} → ${destination}</strong> del <strong>${new Date(date).toLocaleDateString('es-ES')}</strong> ha sido publicado correctamente.`,
                email_price: `💰 Precio: ${price} FCFA por asiento`,
                email_seats: `💺 Asientos disponibles: ${availableSeats}`,
                email_footer: "Los pasajeros ya pueden reservar tu viaje. ¡Mantente atento a las notificaciones!"
            },
            pt: {
                title: "✅ Sua viagem foi publicada!",
                message: `${departure} → ${destination} em ${new Date(date).toLocaleDateString('pt-PT')}. Boas reservas!`,
                email_subject: "✅ Sua viagem foi publicada",
                email_title: "✅ Sua viagem foi publicada!",
                email_greeting: `Olá ${user.name},`,
                email_text: `Sua viagem <strong>${departure} → ${destination}</strong> em <strong>${new Date(date).toLocaleDateString('pt-PT')}</strong> foi publicada com sucesso.`,
                email_price: `💰 Preço: ${price} FCFA por lugar`,
                email_seats: `💺 Lugares disponíveis: ${availableSeats}`,
                email_footer: "Os passageiros já podem reservar sua viagem. Fique atento às notificações!"
            }
        };

        const tPub = pubTranslations[userLanguage] || pubTranslations.fr;

        try {
            await prisma.notification.create({
                data: {
                    userId: user.id,
                    type: "ride_published",
                    title: tPub.title,
                    message: tPub.message,
                    data: JSON.stringify({ rideId: ride.id }),
                    isRead: false
                }
            });
            console.log(`📬 Notification de publication envoyée à ${user.name} (${userLanguage})`);
            
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background-color: #FF5A5F; padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0;">🚗 Auto-stop</h1>
                    </div>
                    <div style="padding: 20px;">
                        <h2 style="color: #FF5A5F;">${tPub.email_title}</h2>
                        <p>${tPub.email_greeting}</p>
                        <p>${tPub.email_text}</p>
                        <ul style="list-style: none; padding: 0;">
                            <li>${tPub.email_price}</li>
                            <li>${tPub.email_seats}</li>
                        </ul>
                        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
                            <p style="margin: 0;">🔔 ${tPub.email_footer}</p>
                        </div>
                        <hr>
                        <p style="color: #888; font-size: 12px;">Auto-stop - Covoiturage sécurisé</p>
                    </div>
                </div>
            `;
            
            await sendEmailWithFallback(user.email, tPub.email_subject, emailHtml);
            console.log(`📧 Email de confirmation de publication envoyé à ${user.email} (${userLanguage})`);
        } catch (notifError) {
            console.error('Erreur notification publication:', notifError.message);
        }
        
        // ========== PROGRAMMER LES RAPPELS ==========
        try {
            await reminderService.scheduleRideReminders(ride.id);
            console.log(`⏰ Rappels programmés pour le trajet ${ride.id}`);
        } catch (reminderError) {
            console.error('❌ Erreur programmation rappels:', reminderError.message);
        }
        
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
        
        // ========== NOTIFICATION AU CONDUCTEUR (MULTILINGUE) ==========
        try {
            const rideWithDriver = await prisma.ride.findUnique({
                where: { id: rideId },
                include: { driver: true }
            });

            const driverLanguage = rideWithDriver.driver.language || 'fr';
            
            const bookingTranslations = {
                fr: {
                    title: "🔔 Nouvelle réservation !",
                    message: `${bookerName || 'Un passager'} a réservé ${seats} place(s) pour votre trajet ${rideWithDriver.departure} → ${rideWithDriver.destination}`,
                    email_subject: "🔔 Nouvelle réservation sur votre trajet",
                    email_title: "🔔 Nouvelle réservation !",
                    email_greeting: `Bonjour ${rideWithDriver.driver.name},`,
                    email_text: `<strong>${bookerName || 'Un passager'}</strong> a réservé <strong>${seats} place(s)</strong> pour votre trajet <strong>${rideWithDriver.departure} → ${rideWithDriver.destination}</strong>.`,
                    email_footer: "Connectez-vous à l'application pour voir les détails et contacter le passager."
                },
                en: {
                    title: "🔔 New booking!",
                    message: `${bookerName || 'A passenger'} has booked ${seats} seat(s) for your ride ${rideWithDriver.departure} → ${rideWithDriver.destination}`,
                    email_subject: "🔔 New booking for your ride",
                    email_title: "🔔 New booking!",
                    email_greeting: `Hello ${rideWithDriver.driver.name},`,
                    email_text: `<strong>${bookerName || 'A passenger'}</strong> has booked <strong>${seats} seat(s)</strong> for your ride <strong>${rideWithDriver.departure} → ${rideWithDriver.destination}</strong>.`,
                    email_footer: "Log in to the app to view details and contact the passenger."
                },
                es: {
                    title: "🔔 ¡Nueva reserva!",
                    message: `${bookerName || 'Un pasajero'} ha reservado ${seats} asiento(s) para tu viaje ${rideWithDriver.departure} → ${rideWithDriver.destination}`,
                    email_subject: "🔔 Nueva reserva en tu viaje",
                    email_title: "🔔 ¡Nueva reserva!",
                    email_greeting: `Hola ${rideWithDriver.driver.name},`,
                    email_text: `<strong>${bookerName || 'Un pasajero'}</strong> ha reservado <strong>${seats} asiento(s)</strong> para tu viaje <strong>${rideWithDriver.departure} → ${rideWithDriver.destination}</strong>.`,
                    email_footer: "Inicia sesión en la aplicación para ver los detalles y contactar al pasajero."
                },
                pt: {
                    title: "🔔 Nova reserva!",
                    message: `${bookerName || 'Um passageiro'} reservou ${seats} lugar(es) para sua viagem ${rideWithDriver.departure} → ${rideWithDriver.destination}`,
                    email_subject: "🔔 Nova reserva na sua viagem",
                    email_title: "🔔 Nova reserva!",
                    email_greeting: `Olá ${rideWithDriver.driver.name},`,
                    email_text: `<strong>${bookerName || 'Um passageiro'}</strong> reservou <strong>${seats} lugar(es)</strong> para sua viagem <strong>${rideWithDriver.departure} → ${rideWithDriver.destination}</strong>.`,
                    email_footer: "Faça login no aplicativo para ver os detalhes e entrar em contato com o passageiro."
                }
            };

            const tBooking = bookingTranslations[driverLanguage] || bookingTranslations.fr;

            // Notification interne
            await prisma.notification.create({
                data: {
                    userId: rideWithDriver.driverId,
                    type: "new_booking",
                    title: tBooking.title,
                    message: tBooking.message,
                    data: JSON.stringify({ rideId: rideId, bookingId: booking.id, seats: seats }),
                    isRead: false
                }
            });
            console.log(`📬 Notification interne envoyée au conducteur (${driverLanguage})`);

            // Email au conducteur
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background-color: #FF5A5F; padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0;">🚗 Auto-stop</h1>
                    </div>
                    <div style="padding: 20px;">
                        <h2 style="color: #FF5A5F;">${tBooking.email_title}</h2>
                        <p>${tBooking.email_greeting}</p>
                        <p>${tBooking.email_text}</p>
                        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
                            <p style="margin: 0;">🔔 ${tBooking.email_footer}</p>
                        </div>
                        <hr>
                        <p style="color: #888; font-size: 12px;">Auto-stop - Covoiturage sécurisé</p>
                    </div>
                </div>
            `;

            await sendEmailWithFallback(rideWithDriver.driver.email, tBooking.email_subject, emailHtml);
            console.log(`📧 Email de notification envoyé au conducteur (${driverLanguage})`);

        } catch (notifError) {
            console.error('❌ Erreur notification conducteur:', notifError.message);
        }

        // ========== NOTIFICATIONS PUSH ==========
        try {
            const rideWithDriver = await prisma.ride.findUnique({
                where: { id: rideId },
                include: { driver: { select: { expoPushToken: true, language: true } } }
            });
            
            const passenger = await prisma.user.findUnique({
                where: { id: req.userId },
                select: { name: true, language: true, expoPushToken: true }
            });
            
            // Push au conducteur
            if (rideWithDriver?.driver?.expoPushToken) {
                await pushService.sendNewBookingPush(
                    rideWithDriver.driverId,
                    bookerName || passenger?.name || 'Un passager',
                    seats,
                    rideWithDriver.departure,
                    rideWithDriver.destination,
                    prisma
                );
                console.log(`📱 Push notification envoyée au conducteur`);
            }
            
            // Push au passager
            if (passenger?.expoPushToken) {
                await pushService.sendBookingConfirmedPush(
                    req.userId,
                    rideWithDriver.driver.name,
                    rideWithDriver.departure,
                    rideWithDriver.destination,
                    new Date(rideWithDriver.date).toLocaleDateString(),
                    new Date(rideWithDriver.date).toLocaleTimeString(),
                    prisma
                );
                console.log(`📱 Push notification envoyée au passager`);
            }
            
        } catch (pushError) {
            console.error('❌ Erreur envoi push:', pushError.message);
        }

        res.json({ message: 'Réservation confirmée', booking });

    } catch (error) {
        console.error('❌ Erreur création réservation:', error);
        res.status(500).json({ error: 'Erreur lors de la réservation: ' + error.message });
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
        
        // ========== VÉRIFIER S'IL RESTE DES PASSAGERS ==========
        const remainingBookings = await prisma.booking.count({
            where: { rideId: booking.rideId, status: 'CONFIRMED' }
        });
        
        if (remainingBookings === 0) {
            try {
                await reminderService.cancelRideReminders(booking.rideId);
                console.log(`⏰ Rappels annulés pour le trajet ${booking.rideId} (plus de passagers)`);
            } catch (reminderError) {
                console.error('❌ Erreur annulation rappels:', reminderError.message);
            }
        }
        
        res.json({ message: 'Réservation annulée avec succès', booking: updatedBooking });
    } catch (error) {
        console.error('Erreur annulation:', error);
        res.status(500).json({ error: 'Erreur lors de l\'annulation' });
    }
});

// ============ DÉMARRER LE TRAJET ============
app.put('/api/rides/:id/start', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const ride = await prisma.ride.findUnique({
            where: { id: id },
            include: {
                driver: true,
                bookings: {
                    where: { status: 'CONFIRMED' },
                    include: { passenger: true }
                }
            }
        });
        
        if (!ride) {
            return res.status(404).json({ error: 'Trajet non trouvé' });
        }
        
        if (ride.driverId !== req.userId) {
            return res.status(403).json({ error: 'Seul le conducteur peut démarrer le trajet' });
        }
        
        if (ride.status !== 'SCHEDULED') {
            return res.status(400).json({ error: 'Le trajet ne peut pas être démarré' });
        }
        
        await prisma.ride.update({
            where: { id: id },
            data: { status: 'ONGOING' }
        });
        
        // ========== NOTIFICATIONS PENDANT LE VOYAGE ==========
        const startTranslations = {
            fr: {
                title: "🚗 Votre trajet a commencé !",
                message_driver: (dep, dest) => `Votre trajet ${dep} → ${dest} est en cours. Bonne route !`,
                message_passenger: (dep, dest) => `Votre trajet ${dep} → ${dest} a commencé. Bon voyage !`
            },
            en: {
                title: "🚗 Your ride has started!",
                message_driver: (dep, dest) => `Your ride ${dep} → ${dest} is in progress. Have a safe trip!`,
                message_passenger: (dep, dest) => `Your ride ${dep} → ${dest} has started. Have a great trip!`
            },
            es: {
                title: "🚗 ¡Tu viaje ha comenzado!",
                message_driver: (dep, dest) => `Tu viaje ${dep} → ${dest} está en curso. ¡Buen viaje!`,
                message_passenger: (dep, dest) => `Tu viaje ${dep} → ${dest} ha comenzado. ¡Buen viaje!`
            },
            pt: {
                title: "🚗 Sua viagem começou!",
                message_driver: (dep, dest) => `Sua viagem ${dep} → ${dest} está em andamento. Boa viagem!`,
                message_passenger: (dep, dest) => `Sua viagem ${dep} → ${dest} começou. Boa viagem!`
            }
        };
        
        // Notification pour le conducteur
        const driverLang = ride.driver.language || 'fr';
        const tStartDriver = startTranslations[driverLang];
        await prisma.notification.create({
            data: {
                userId: ride.driverId,
                type: "ride_started",
                title: tStartDriver.title,
                message: tStartDriver.message_driver(ride.departure, ride.destination),
                data: JSON.stringify({ rideId: id, status: 'ongoing' }),
                isRead: false
            }
        });
        console.log(`📬 Notification départ envoyée au conducteur (${driverLang})`);
        
        // Notifications pour les passagers
        for (const booking of ride.bookings) {
            const passengerLang = booking.passenger.language || 'fr';
            const tStartPassenger = startTranslations[passengerLang];
            await prisma.notification.create({
                data: {
                    userId: booking.passengerId,
                    type: "ride_started",
                    title: tStartPassenger.title,
                    message: tStartPassenger.message_passenger(ride.departure, ride.destination),
                    data: JSON.stringify({ rideId: id, status: 'ongoing' }),
                    isRead: false
                }
            });
            console.log(`📬 Notification départ envoyée au passager ${booking.passenger.name} (${passengerLang})`);
        }
        
        res.json({ message: 'Trajet démarré', ride: { ...ride, status: 'ONGOING' } });
        
    } catch (error) {
        console.error('❌ Erreur démarrage trajet:', error);
        res.status(500).json({ error: 'Erreur lors du démarrage du trajet' });
    }
});

// ============ TERMINER LE TRAJET ============
app.put('/api/rides/:id/complete', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const ride = await prisma.ride.findUnique({
            where: { id: id },
            include: {
                driver: true,
                bookings: {
                    where: { status: 'CONFIRMED' },
                    include: { passenger: true }
                }
            }
        });
        
        if (!ride) {
            return res.status(404).json({ error: 'Trajet non trouvé' });
        }
        
        if (ride.driverId !== req.userId) {
            return res.status(403).json({ error: 'Seul le conducteur peut terminer le trajet' });
        }
        
        if (ride.status !== 'ONGOING') {
            return res.status(400).json({ error: 'Le trajet ne peut pas être terminé' });
        }
        
        await prisma.ride.update({
            where: { id: id },
            data: { status: 'COMPLETED' }
        });
        
        // ========== NOTIFICATIONS DE FIN DE TRAJET ==========
        const completeTranslations = {
            fr: {
                title: "✅ Votre trajet est terminé",
                message: (dep, dest) => `Votre trajet ${dep} → ${dest} est terminé. Merci d'avoir voyagé avec Auto-stop !`,
                rating_title: "⭐ Notez votre conducteur",
                rating_message: "Votre avis est important. Prenez 2 minutes pour noter votre conducteur !",
                email_subject: "✅ Votre trajet est terminé - Auto-stop",
                email_body: (name, dep, dest) => `<p>Votre trajet <strong>${dep} → ${dest}</strong> est terminé.</p><p>⭐ N'oubliez pas de noter votre conducteur dans l'application.</p>`
            },
            en: {
                title: "✅ Your ride is complete",
                message: (dep, dest) => `Your ride ${dep} → ${dest} is complete. Thank you for traveling with Auto-stop!`,
                rating_title: "⭐ Rate your driver",
                rating_message: "Your opinion matters. Take 2 minutes to rate your driver!",
                email_subject: "✅ Your ride is complete - Auto-stop",
                email_body: (name, dep, dest) => `<p>Your ride <strong>${dep} → ${dest}</strong> is complete.</p><p>⭐ Don't forget to rate your driver in the app.</p>`
            },
            es: {
                title: "✅ Tu viaje ha terminado",
                message: (dep, dest) => `Tu viaje ${dep} → ${dest} ha terminado. ¡Gracias por viajar con Auto-stop!`,
                rating_title: "⭐ Califica a tu conductor",
                rating_message: "Tu opinión es importante. ¡Tómate 2 minutos para calificar a tu conductor!",
                email_subject: "✅ Tu viaje ha terminado - Auto-stop",
                email_body: (name, dep, dest) => `<p>Tu viaje <strong>${dep} → ${dest}</strong> ha terminado.</p><p>⭐ No olvides calificar a tu conductor en la aplicación.</p>`
            },
            pt: {
                title: "✅ Sua viagem terminou",
                message: (dep, dest) => `Sua viagem ${dep} → ${dest} terminou. Obrigado por viajar com Auto-stop!`,
                rating_title: "⭐ Avalie seu motorista",
                rating_message: "Sua opinião é importante. Tire 2 minutos para avaliar seu motorista!",
                email_subject: "✅ Sua viagem terminou - Auto-stop",
                email_body: (name, dep, dest) => `<p>Sua viagem <strong>${dep} → ${dest}</strong> terminou.</p><p>⭐ Não se esqueça de avaliar seu motorista no aplicativo.</p>`
            }
        };
        
        // Annuler les rappels programmés
        await reminderService.cancelRideReminders(id);
        
        // Notification pour le conducteur
        const driverLang = ride.driver.language || 'fr';
        const tCompleteDriver = completeTranslations[driverLang];
        await prisma.notification.create({
            data: {
                userId: ride.driverId,
                type: "ride_completed",
                title: tCompleteDriver.title,
                message: tCompleteDriver.message(ride.departure, ride.destination),
                data: JSON.stringify({ rideId: id, status: 'completed' }),
                isRead: false
            }
        });
        console.log(`📬 Notification fin trajet envoyée au conducteur (${driverLang})`);
        
        // Notifications pour les passagers
        for (const booking of ride.bookings) {
            const passengerLang = booking.passenger.language || 'fr';
            const tCompletePassenger = completeTranslations[passengerLang];
            
            await prisma.notification.create({
                data: {
                    userId: booking.passengerId,
                    type: "ride_completed",
                    title: tCompletePassenger.title,
                    message: tCompletePassenger.message(ride.departure, ride.destination),
                    data: JSON.stringify({ rideId: id, status: 'completed' }),
                    isRead: false
                }
            });
            
            await prisma.notification.create({
                data: {
                    userId: booking.passengerId,
                    type: "rating_request",
                    title: tCompletePassenger.rating_title,
                    message: tCompletePassenger.rating_message,
                    data: JSON.stringify({ rideId: id, bookingId: booking.id }),
                    isRead: false
                }
            });
            
            if (booking.passenger.email) {
                const emailHtml = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px;">
                        <h2 style="color: #FF5A5F;">${tCompletePassenger.title}</h2>
                        <p>Bonjour ${booking.passenger.name},</p>
                        ${tCompletePassenger.email_body(booking.passenger.name, ride.departure, ride.destination)}
                        <hr><p style="color:#888;">Auto-stop - Covoiturage sécurisé</p>
                    </div>
                `;
                await sendEmailWithFallback(booking.passenger.email, tCompletePassenger.email_subject, emailHtml);
                console.log(`📧 Email fin trajet envoyé à ${booking.passenger.email} (${passengerLang})`);
            }
            
            console.log(`📬 Notifications fin trajet + notation envoyées au passager ${booking.passenger.name} (${passengerLang})`);
        }
        
        res.json({ message: 'Trajet terminé', ride: { ...ride, status: 'COMPLETED' } });
        
    } catch (error) {
        console.error('❌ Erreur terminaison trajet:', error);
        res.status(500).json({ error: 'Erreur lors de la terminaison du trajet' });
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
                        phone: true,
                        language: true
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

// Route pour obtenir les passagers d'un trajet
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
            return res.status(403).json({ error: 'Non autorisé' });
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
                        rating: true,
                        language: true
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
            language: booking.passenger.language,
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

app.put('/api/users/profile', verifyToken, async (req, res) => {
    try {
        const { bio, experienceLevel, preferences, birthDate, phone, name, language } = req.body;
        
        const user = await prisma.user.update({
            where: { id: req.userId },
            data: { 
                bio, 
                experienceLevel, 
                preferences, 
                birthDate: birthDate ? new Date(birthDate) : undefined,
                phone: phone || undefined,
                name: name || undefined,
                language: language || undefined
            }
        });
        
        const { password, ...profileWithoutPassword } = user;
        res.json({ message: 'Profil mis à jour', profile: profileWithoutPassword });
        
    } catch (error) {
        console.error('Erreur mise à jour profil:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour du profil' });
    }
});

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
            country: user.country,
            language: user.language
        };
        
        res.json({ profile: publicProfile });
        
    } catch (error) {
        console.error('Erreur chargement profil public:', error);
        res.status(500).json({ error: 'Erreur lors du chargement du profil' });
    }
});

// ============ ROUTES POUR LA NOTATION ============

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
                            select: { id: true, name: true, photoUrl: true, language: true }
                        }
                    }
                }
            }
        });
        
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
        
        await prisma.booking.update({
            where: { id: booking.id },
            data: {
                ratingGiven: true,
                ratingValue: rating,
                ratingComment: comment,
                ratingDate: now
            }
        });
        
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

// ============ ROUTES PAIEMENT ============

const { processPayment } = require('./services/paymentRouter');
const { calculatePassengerPrice, calculateDriverNet, selectProcessor } = require('./utils/priceCalculator');

app.post('/api/payment/initiate', verifyToken, async (req, res) => {
    try {
        const { rideId, paymentMethod, isInternational = false } = req.body;
        
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

// ============ ROUTES MESSAGES ============

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
                                    select: { id: true, name: true, photoUrl: true, language: true }
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

// ============ MOT DE PASSE OUBLIÉ AVEC OTP ============
const crypto = require('crypto');

// Stockage temporaire des codes OTP pour réinitialisation
const resetOtpStore = new Map();

// 1️⃣ ROUTE POUR ENVOYER LE CODE OTP
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email, language = 'fr' } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: "L'email est requis" });
        }
        
        const user = await prisma.user.findUnique({
            where: { email: email }
        });
        
        if (!user) {
            // Sécurité : on ne révèle pas que l'email n'existe pas
            return res.json({ 
                success: true, 
                message: "Si cet email existe, un code de réinitialisation a été envoyé" 
            });
        }
        
        // Générer un code OTP à 6 chiffres
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes
        
        // Stocker le code
        resetOtpStore.set(email, {
            code: otpCode,
            expiresAt: otpExpiresAt,
            attempts: 0,
            userId: user.id
        });
        
        // Traductions
        const translations = {
            fr: {
                subject: "🔐 Code de réinitialisation Auto-stop",
                title: "Code de réinitialisation",
                greeting: `Bonjour ${user.name},`,
                message: "Vous avez demandé à réinitialiser votre mot de passe. Voici votre code de vérification :",
                expiry: "Ce code expire dans 15 minutes.",
                ignore: "Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.",
                telegram_message: `🔐 *Code de réinitialisation Auto-stop*\n\nBonjour ${user.name},\n\nVotre code de réinitialisation est : *${otpCode}*\n\nCe code expire dans 15 minutes.`
            },
            en: {
                subject: "🔐 Auto-stop reset code",
                title: "Reset code",
                greeting: `Hello ${user.name},`,
                message: "You requested to reset your password. Here is your verification code:",
                expiry: "This code expires in 15 minutes.",
                ignore: "If you didn't request this, ignore this email.",
                telegram_message: `🔐 *Auto-stop reset code*\n\nHello ${user.name},\n\nYour reset code is: *${otpCode}*\n\nThis code expires in 15 minutes.`
            },
            es: {
                subject: "🔐 Código de reinicio Auto-stop",
                title: "Código de reinicio",
                greeting: `Hola ${user.name},`,
                message: "Solicitaste reiniciar tu contraseña. Aquí está tu código:",
                expiry: "Este código expira en 15 minutos.",
                ignore: "Si no solicitaste esto, ignora este email.",
                telegram_message: `🔐 *Código de reinicio Auto-stop*\n\nHola ${user.name},\n\nTu código es: *${otpCode}*\n\nEste código expira en 15 minutos.`
            },
            pt: {
                subject: "🔐 Código de redefinição Auto-stop",
                title: "Código de redefinição",
                greeting: `Olá ${user.name},`,
                message: "Você solicitou redefinir sua senha. Aqui está seu código:",
                expiry: "Este código expira em 15 minutos.",
                ignore: "Se você não solicitou isso, ignore este e-mail.",
                telegram_message: `🔐 *Código de redefinição Auto-stop*\n\nOlá ${user.name},\n\nSeu código é: *${otpCode}*\n\nEste código expira em 15 minutos.`
            }
        };
        
        const t = translations[language] || translations.fr;
        const userLang = user.language || language || 'fr';
        
        // Envoi par email
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #FF5A5F; padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">🚗 Auto-stop</h1>
                </div>
                <div style="padding: 20px;">
                    <h2 style="color: #FF5A5F;">${t.title}</h2>
                    <p>${t.greeting}</p>
                    <p>${t.message}</p>
                    <div style="font-size: 48px; font-weight: bold; text-align: center; padding: 20px; background: #f5f5f5; border-radius: 10px; letter-spacing: 10px; margin: 20px 0;">
                        ${otpCode}
                    </div>
                    <p>${t.expiry}</p>
                    <p>${t.ignore}</p>
                    <hr>
                    <p style="color: #888; font-size: 12px;">Auto-stop - Covoiturage sécurisé</p>
                </div>
            </div>
        `;
        
        await sendEmailWithFallback(email, t.subject, emailHtml);
        console.log(`📧 Code OTP ${otpCode} envoyé à ${email} (${userLang})`);
        
        // Envoi par Telegram si lié
        if (user.telegramChatId) {
            try {
                const { sendTelegramMessage } = require('./services/telegramService');
                await sendTelegramMessage(user.telegramChatId, t.telegram_message);
                console.log(`🤖 Code OTP envoyé à Telegram ${user.telegramChatId}`);
            } catch (telegramError) {
                console.error('❌ Erreur envoi Telegram:', telegramError.message);
            }
        }
        
        res.json({ 
            success: true, 
            message: "Un code de réinitialisation a été envoyé par email" 
        });
        
    } catch (error) {
        console.error('❌ Erreur forgot-password:', error);
        res.status(500).json({ error: "Erreur lors du traitement" });
    }
});

// 2️⃣ ROUTE POUR VÉRIFIER LE CODE OTP ET RÉINITIALISER LE MOT DE PASSE
app.post('/api/auth/reset-password-with-otp', async (req, res) => {
    try {
        const { email, otpCode, newPassword, confirmPassword, language = 'fr' } = req.body;
        
        const translations = {
            fr: {
                missing_fields: "Email, code OTP et nouveau mot de passe requis",
                password_mismatch: "Les mots de passe ne correspondent pas",
                password_too_short: "Le mot de passe doit contenir au moins 6 caractères",
                invalid_code: "Code invalide ou expiré",
                too_many_attempts: "Trop de tentatives. Veuillez refaire une demande",
                success: "Mot de passe réinitialisé avec succès"
            },
            en: {
                missing_fields: "Email, OTP code and new password required",
                password_mismatch: "Passwords do not match",
                password_too_short: "Password must be at least 6 characters",
                invalid_code: "Invalid or expired code",
                too_many_attempts: "Too many attempts. Please request a new code",
                success: "Password reset successfully"
            },
            es: {
                missing_fields: "Email, código OTP y nueva contraseña requeridos",
                password_mismatch: "Las contraseñas no coinciden",
                password_too_short: "La contraseña debe tener al menos 6 caracteres",
                invalid_code: "Código inválido o expirado",
                too_many_attempts: "Demasiados intentos. Solicita un nuevo código",
                success: "Contraseña restablecida con éxito"
            },
            pt: {
                missing_fields: "Email, código OTP e nova senha são obrigatórios",
                password_mismatch: "As senhas não coincidem",
                password_too_short: "A senha deve ter pelo menos 6 caracteres",
                invalid_code: "Código inválido ou expirado",
                too_many_attempts: "Muitas tentativas. Solicite um novo código",
                success: "Senha redefinida com sucesso"
            }
        };
        
        const t = translations[language] || translations.fr;
        
        if (!email || !otpCode || !newPassword) {
            return res.status(400).json({ error: t.missing_fields });
        }
        
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ error: t.password_mismatch });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ error: t.password_too_short });
        }
        
        const otpData = resetOtpStore.get(email);
        
        if (!otpData) {
            return res.status(400).json({ error: t.invalid_code });
        }
        
        if (Date.now() > otpData.expiresAt) {
            resetOtpStore.delete(email);
            return res.status(400).json({ error: t.invalid_code });
        }
        
        if (otpData.attempts >= 3) {
            resetOtpStore.delete(email);
            return res.status(400).json({ error: t.too_many_attempts });
        }
        
        if (otpData.code !== otpCode) {
            otpData.attempts++;
            resetOtpStore.set(email, otpData);
            return res.status(400).json({ error: t.invalid_code });
        }
        
        // Code valide -> réinitialiser le mot de passe
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        await prisma.user.update({
            where: { id: otpData.userId },
            data: { password: hashedPassword }
        });
        
        // Supprimer le code OTP
        resetOtpStore.delete(email);
        
        console.log(`✅ Mot de passe réinitialisé pour ${email}`);
        
        res.json({ 
            success: true, 
            message: t.success 
        });
        
    } catch (error) {
        console.error('❌ Erreur reset-password-with-otp:', error);
        res.status(500).json({ error: "Erreur lors de la réinitialisation" });
    }
});

// ============ TELEGRAM WEBHOOK MULTILINGUE ============
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// ============ TRADUCTIONS TELEGRAM ==========
const telegramTranslations = {
    fr: {
        welcome: (chatId) => `🚗 *Bienvenue sur Auto-stop !*\n\n` +
            `Je suis votre assistant de notifications.\n\n` +
            `📌 *Pour lier votre compte :*\n` +
            `Allez dans l'application Auto-stop → Profil → Lier Telegram\n` +
            `et entrez votre ID Telegram : \`${chatId}\`\n\n` +
            `📱 *Vous recevrez :*\n` +
            `• Confirmations de réservation\n` +
            `• Rappels avant départ\n` +
            `• Messages de sécurité\n` +
            `• Fin de trajet et notation\n\n` +
            `🚗 Bon voyage !`,
        linked_success: "🔔 *Connexion réussie !*\n\nVotre compte Telegram a été lié avec succès à Auto-stop.\nVous recevrez désormais les notifications de vos trajets.",
        already_linked: "ℹ️ *Déjà lié*\n\nVotre compte Telegram est déjà lié à Auto-stop.",
        link_error: "❌ *Erreur de liaison*\n\nID Telegram invalide. Veuillez réessayer.",
        unlinked: "🔔 *Liaison supprimée*\n\nVotre compte Telegram a été dissocié d'Auto-stop.",
        new_booking: (passengerName, seats, departure, destination) => 
            `🔔 *Nouvelle réservation !*\n\n👤 ${passengerName}\n👥 ${seats} place(s)\n📍 ${departure} → ${destination}`,
        booking_confirmed: (driverName, departure, destination, date, time) =>
            `✅ *Réservation confirmée !*\n\n👤 ${driverName}\n📍 ${departure} → ${destination}\n📅 ${date} à ${time}`,
        reminder_2h: (departure, destination) => `⏰ *Rappel : Trajet dans 2h*\n\n${departure} → ${destination}`,
        reminder_1h: (departure, destination) => `⏰ *Rappel : Trajet dans 1h*\n\n${departure} → ${destination}`,
        reminder_30min: (departure, destination) => `⏰ *Rappel : Trajet dans 30min*\n\n${departure} → ${destination}`,
        security_driver: (departure, destination) => `🔐 *Sécurité* Vérifiez la CNI de vos passagers`,
        security_passenger: (departure, destination) => `🔐 *Sécurité* Vérifiez la plaque et la CNI du conducteur`,
        ride_started_driver: (departure, destination) => `🚗 *Trajet en cours* ${departure} → ${destination}`,
        ride_started_passenger: (departure, destination) => `🚗 *Trajet en cours* Bon voyage !`,
        ride_completed: (departure, destination) => `✅ *Trajet terminé* ${departure} → ${destination}`
    },
    en: {
        welcome: (chatId) => `🚗 *Welcome to Auto-stop!*\n\n` +
            `I am your notification assistant.\n\n` +
            `📌 *To link your account:*\n` +
            `Go to Auto-stop app → Profile → Link Telegram\n` +
            `and enter your Telegram ID: \`${chatId}\`\n\n` +
            `🚗 Have a safe trip!`,
        linked_success: "🔔 *Connection successful!*\n\nYour Telegram account has been linked to Auto-stop.",
        already_linked: "ℹ️ *Already linked*\n\nYour Telegram account is already linked.",
        link_error: "❌ *Link error*\n\nInvalid Telegram ID.",
        unlinked: "🔔 *Link removed*\n\nYour Telegram account has been unlinked.",
        new_booking: (passengerName, seats, departure, destination) => 
            `🔔 *New booking!*\n\n👤 ${passengerName}\n👥 ${seats} seat(s)\n📍 ${departure} → ${destination}`,
        booking_confirmed: (driverName, departure, destination, date, time) =>
            `✅ *Booking confirmed!*\n\n👤 ${driverName}\n📍 ${departure} → ${destination}\n📅 ${date} at ${time}`,
        reminder_2h: (departure, destination) => `⏰ *Reminder: Ride in 2h*\n\n${departure} → ${destination}`,
        reminder_1h: (departure, destination) => `⏰ *Reminder: Ride in 1h*\n\n${departure} → ${destination}`,
        reminder_30min: (departure, destination) => `⏰ *Reminder: Ride in 30min*\n\n${departure} → ${destination}`,
        security_driver: (departure, destination) => `🔐 *Security* Check your passengers' ID`,
        security_passenger: (departure, destination) => `🔐 *Security* Check license plate and driver's ID`,
        ride_started_driver: (departure, destination) => `🚗 *Ride in progress* ${departure} → ${destination}`,
        ride_started_passenger: (departure, destination) => `🚗 *Ride in progress* Have a great trip!`,
        ride_completed: (departure, destination) => `✅ *Ride completed* ${departure} → ${destination}`
    },
    es: {
        welcome: (chatId) => `🚗 *¡Bienvenido a Auto-stop!*\n\n` +
            `Soy tu asistente de notificaciones.\n\n` +
            `📌 *Para vincular tu cuenta:*\n` +
            `Ve a Auto-stop → Perfil → Vincular Telegram\n` +
            `e ingresa tu ID: \`${chatId}\`\n\n` +
            `🚗 ¡Buen viaje!`,
        linked_success: "🔔 *¡Conexión exitosa!*\n\nTu cuenta de Telegram ha sido vinculada.",
        already_linked: "ℹ️ *Ya vinculado*\n\nTu cuenta ya está vinculada.",
        link_error: "❌ *Error de vinculación*\n\nID inválido.",
        unlinked: "🔔 *Vinculación eliminada*\n\nTu cuenta ha sido desvinculada.",
        new_booking: (passengerName, seats, departure, destination) => 
            `🔔 *¡Nueva reserva!*\n\n👤 ${passengerName}\n👥 ${seats} asiento(s)\n📍 ${departure} → ${destination}`,
        booking_confirmed: (driverName, departure, destination, date, time) =>
            `✅ *¡Reserva confirmada!*\n\n👤 ${driverName}\n📍 ${departure} → ${destination}\n📅 ${date} a las ${time}`,
        reminder_2h: (departure, destination) => `⏰ *Recordatorio: Viaje en 2h*\n\n${departure} → ${destination}`,
        reminder_1h: (departure, destination) => `⏰ *Recordatorio: Viaje en 1h*\n\n${departure} → ${destination}`,
        reminder_30min: (departure, destination) => `⏰ *Recordatorio: Viaje en 30min*\n\n${departure} → ${destination}`,
        security_driver: (departure, destination) => `🔐 *Seguridad* Verifica identificación de pasajeros`,
        security_passenger: (departure, destination) => `🔐 *Seguridad* Verifica matrícula y DNI del conductor`,
        ride_started_driver: (departure, destination) => `🚗 *Viaje en curso* ${departure} → ${destination}`,
        ride_started_passenger: (departure, destination) => `🚗 *Viaje en curso* ¡Buen viaje!`,
        ride_completed: (departure, destination) => `✅ *Viaje completado* ${departure} → ${destination}`
    },
    pt: {
        welcome: (chatId) => `🚗 *Bem-vindo ao Auto-stop!*\n\n` +
            `Sou seu assistente de notificações.\n\n` +
            `📌 *Para vincular sua conta:*\n` +
            `Vá ao Auto-stop → Perfil → Vincular Telegram\n` +
            `e digite seu ID: \`${chatId}\`\n\n` +
            `🚗 Boa viagem!`,
        linked_success: "🔔 *Conexão bem-sucedida!*\n\nSua conta do Telegram foi vinculada.",
        already_linked: "ℹ️ *Já vinculado*\n\nSua conta já está vinculada.",
        link_error: "❌ *Erro de vinculação*\n\nID inválido.",
        unlinked: "🔔 *Vinculação removida*\n\nSua conta foi desvinculada.",
        new_booking: (passengerName, seats, departure, destination) => 
            `🔔 *Nova reserva!*\n\n👤 ${passengerName}\n👥 ${seats} lugar(es)\n📍 ${departure} → ${destination}`,
        booking_confirmed: (driverName, departure, destination, date, time) =>
            `✅ *Reserva confirmada!*\n\n👤 ${driverName}\n📍 ${departure} → ${destination}\n📅 ${date} às ${time}`,
        reminder_2h: (departure, destination) => `⏰ *Lembrete: Viagem em 2h*\n\n${departure} → ${destination}`,
        reminder_1h: (departure, destination) => `⏰ *Lembrete: Viagem em 1h*\n\n${departure} → ${destination}`,
        reminder_30min: (departure, destination) => `⏰ *Lembrete: Viagem em 30min*\n\n${departure} → ${destination}`,
        security_driver: (departure, destination) => `🔐 *Segurança* Verifique identificação dos passageiros`,
        security_passenger: (departure, destination) => `🔐 *Segurança* Verifique placa e identidade do motorista`,
        ride_started_driver: (departure, destination) => `🚗 *Viagem em andamento* ${departure} → ${destination}`,
        ride_started_passenger: (departure, destination) => `🚗 *Viagem em andamento* Boa viagem!`,
        ride_completed: (departure, destination) => `✅ *Viagem concluída* ${departure} → ${destination}`
    }
};

// Route pour recevoir les messages de Telegram (webhook multilingue)
app.post(`/api/telegram/webhook/${TELEGRAM_TOKEN}`, async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.sendStatus(200);
        }
        
        const chatId = message.chat.id;
        const text = message.text || '';
        
        let userLang = message.from?.language_code || 'fr';
        if (!['fr', 'en', 'es', 'pt'].includes(userLang)) {
            userLang = 'fr';
        }
        
        console.log(`📨 Message Telegram reçu de ${chatId}: ${text} (langue: ${userLang})`);
        
        const t = telegramTranslations[userLang] || telegramTranslations.fr;
        
        if (text === '/start') {
            const reply = t.welcome(chatId);
            await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: reply,
                    parse_mode: 'Markdown'
                })
            });
            console.log(`🤖 Réponse /start envoyée à ${chatId} (${userLang})`);
        } else if (text === '/help') {
            const helpMessage = `📱 *Auto-stop - Aide*\n\n` +
                `• /start - Démarrer le bot\n` +
                `• /help - Voir cette aide\n` +
                `• /status - Voir le statut de votre liaison\n\n` +
                `🔗 Pour lier votre compte, allez dans l'application Auto-stop → Profil → Lier Telegram`;
            await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: helpMessage,
                    parse_mode: 'Markdown'
                })
            });
        } else if (text === '/status') {
            const user = await prisma.user.findFirst({
                where: { telegramChatId: chatId.toString() }
            });
            let statusMessage;
            if (user) {
                statusMessage = `✅ *Compte lié*\n\nVotre compte Telegram est lié à Auto-stop.\n👤 Utilisateur : ${user.name}\n📧 Email : ${user.email}`;
            } else {
                statusMessage = `❌ *Compte non lié*\n\nVotre compte Telegram n'est pas encore lié à Auto-stop.\n\n🔗 Allez dans l'application → Profil → Lier Telegram\net entrez votre ID : \`${chatId}\``;
            }
            await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: statusMessage,
                    parse_mode: 'Markdown'
                })
            });
        }
        
        res.sendStatus(200);
    } catch (error) {
        console.error('❌ Erreur webhook Telegram:', error);
        res.sendStatus(500);
    }
});

// Route pour configurer le webhook
app.get('/api/telegram/set-webhook', async (req, res) => {
    try {
        let baseUrl = process.env.APP_URL || 'http://192.168.0.109:10000';
        if (process.env.NODE_ENV === 'production') {
            baseUrl = process.env.RENDER_EXTERNAL_URL || 'https://ton-backend.onrender.com';
        }
        const webhookUrl = `${baseUrl}/api/telegram/webhook/${TELEGRAM_TOKEN}`;
        console.log(`🔧 Configuration du webhook Telegram: ${webhookUrl}`);
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook?url=${webhookUrl}`);
        const data = await response.json();
        if (data.ok) {
            console.log(`✅ Webhook Telegram configuré : ${webhookUrl}`);
            res.json({ success: true, message: 'Webhook configuré', url: webhookUrl });
        } else {
            console.error('❌ Erreur configuration webhook:', data.description);
            res.status(400).json({ error: data.description });
        }
    } catch (error) {
        console.error('❌ Erreur setWebhook:', error);
        res.status(500).json({ error: error.message });
    }
});

// Route pour supprimer le webhook
app.get('/api/telegram/delete-webhook', async (req, res) => {
    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/deleteWebhook`);
        const data = await response.json();
        console.log(`🔧 Webhook Telegram supprimé`);
        res.json(data);
    } catch (error) {
        console.error('❌ Erreur deleteWebhook:', error);
        res.status(500).json({ error: error.message });
    }
});

// Route pour obtenir les infos du webhook
app.get('/api/telegram/webhook-info', async (req, res) => {
    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getWebhookInfo`);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('❌ Erreur getWebhookInfo:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ LIER TELEGRAM À UN COMPTE AUTO-STOP (MULTILINGUE) ============
app.post('/api/users/link-telegram', verifyToken, async (req, res) => {
    try {
        const { telegramChatId } = req.body;
        
        if (!telegramChatId) {
            return res.status(400).json({ error: 'ID Telegram requis' });
        }
        
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: { language: true, name: true, email: true, telegramChatId: true }
        });
        
        const userLang = user?.language || 'fr';
        const t = telegramTranslations[userLang] || telegramTranslations.fr;
        
        if (user?.telegramChatId) {
            return res.status(400).json({ error: t.already_linked });
        }
        
        const testResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: telegramChatId,
                text: t.linked_success,
                parse_mode: 'Markdown'
            })
        });
        
        const testData = await testResponse.json();
        
        if (!testData.ok) {
            return res.status(400).json({ error: t.link_error });
        }
        
        await prisma.user.update({
            where: { id: req.userId },
            data: { telegramChatId: telegramChatId.toString() }
        });
        
        console.log(`✅ Utilisateur ${req.userId} a lié Telegram: ${telegramChatId} (${userLang})`);
        
        res.json({ success: true, message: 'Telegram lié avec succès' });
        
    } catch (error) {
        console.error('❌ Erreur lien Telegram:', error);
        res.status(500).json({ error: 'Erreur lors du lien Telegram' });
    }
});

// Route pour obtenir l'ID Telegram de l'utilisateur
app.get('/api/users/telegram-id', verifyToken, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: { telegramChatId: true }
        });
        
        res.json({ telegramChatId: user?.telegramChatId || null });
    } catch (error) {
        console.error('❌ Erreur getTelegramId:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Route pour dissocier Telegram
app.delete('/api/users/unlink-telegram', verifyToken, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: { telegramChatId: true, language: true }
        });
        
        const userLang = user?.language || 'fr';
        const t = telegramTranslations[userLang] || telegramTranslations.fr;
        
        if (!user?.telegramChatId) {
            return res.status(400).json({ error: 'Aucun compte Telegram lié' });
        }
        
        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: user.telegramChatId,
                text: t.unlinked,
                parse_mode: 'Markdown'
            })
        });
        
        await prisma.user.update({
            where: { id: req.userId },
            data: { telegramChatId: null }
        });
        
        res.json({ success: true, message: 'Telegram dissocié avec succès' });
    } catch (error) {
        console.error('❌ Erreur dissociation Telegram:', error);
        res.status(500).json({ error: 'Erreur lors de la dissociation' });
    }
});

// ============ ENREGISTRER LE TOKEN PUSH ============
app.post('/api/users/push-token', verifyToken, async (req, res) => {
    try {
        const { pushToken } = req.body;
        
        if (!pushToken) {
            return res.status(400).json({ error: 'Token push requis' });
        }
        
        await prisma.user.update({
            where: { id: req.userId },
            data: { expoPushToken: pushToken }
        });
        
        console.log(`📱 Token push enregistré pour ${req.userId}`);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Erreur enregistrement push token:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ============ FONCTIONS POUR ENVOYER DES NOTIFICATIONS TELEGRAM ============
async function sendTelegramNotification(userId, type, rideData, additionalData = {}) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { telegramChatId: true, language: true }
        });
        
        if (!user?.telegramChatId) {
            return false;
        }
        
        const userLang = user.language || 'fr';
        const t = telegramTranslations[userLang] || telegramTranslations.fr;
        
        let message = '';
        
        switch (type) {
            case 'new_booking':
                message = t.new_booking(rideData.passengerName, rideData.seats, rideData.departure, rideData.destination);
                break;
            case 'booking_confirmed':
                message = t.booking_confirmed(rideData.driverName, rideData.departure, rideData.destination, rideData.date, rideData.time);
                break;
            case 'reminder_2h':
                message = t.reminder_2h(rideData.departure, rideData.destination);
                break;
            case 'reminder_1h':
                message = t.reminder_1h(rideData.departure, rideData.destination);
                break;
            case 'reminder_30min':
                message = t.reminder_30min(rideData.departure, rideData.destination);
                break;
            case 'security_driver':
                message = t.security_driver(rideData.departure, rideData.destination);
                break;
            case 'security_passenger':
                message = t.security_passenger(rideData.departure, rideData.destination);
                break;
            case 'ride_started_driver':
                message = t.ride_started_driver(rideData.departure, rideData.destination);
                break;
            case 'ride_started_passenger':
                message = t.ride_started_passenger(rideData.departure, rideData.destination);
                break;
            case 'ride_completed':
                message = t.ride_completed(rideData.departure, rideData.destination);
                break;
            default:
                return false;
        }
        
        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: user.telegramChatId,
                text: message,
                parse_mode: 'Markdown'
            })
        });
        
        console.log(`🤖 Notification Telegram envoyée à ${user.telegramChatId} (${type}, ${userLang})`);
        return true;
        
    } catch (error) {
        console.error(`❌ Erreur envoi Telegram (${type}):`, error.message);
        return false;
    }
}

module.exports = { sendTelegramNotification };

// ============ DÉMARRER LE SERVEUR ============
server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Serveur Auto-stop lancé sur http://0.0.0.0:${PORT}`);
    console.log(`🔌 Socket.io prêt sur le port ${PORT}`);
    console.log(`🔔 Service de rappels actif`);
    console.log(`📱 http://localhost:${PORT}/api/health`);
    console.log(`🌍 http://localhost:${PORT}/api/countries`);
    console.log(`📝 http://localhost:${PORT}/api/register`);
    console.log(`🔐 http://localhost:${PORT}/api/login`);
    console.log(`🚗 http://localhost:${PORT}/api/rides`);
    console.log(`📋 http://localhost:${PORT}/api/rides/my-published`);
    console.log(`📖 http://localhost:${PORT}/api/rides/my-bookings`);
});