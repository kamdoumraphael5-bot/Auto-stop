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
const suggestionService = require('./services/suggestionService');
require('dotenv').config();

// ============ IMPORTS DES SERVICES ============
const notificationsRoutes = require('./routes/notifications');
const reminderService = require('./services/reminderService');
const pushService = require('./services/pushNotificationService');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 10000;

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

// ============ ROUTES D'AUTHENTIFICATION ============

// Route d'inscription avec OTP
app.post('/api/register', async (req, res) => {
    try {
        const { email, password, name, phone, countryCode, language = 'fr' } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Cet email est déjà utilisé' });
        }

        const country = await prisma.country.findUnique({ where: { code: countryCode } });
        if (!country) {
            return res.status(400).json({ error: 'Pays non trouvé' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

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
                isVerified: false,
                otpCode: otpCode,
                otpExpiresAt: otpExpiresAt,
                otpAttempts: 0
            }
        });

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

// Envoyer code OTP
app.post('/api/auth/send-otp', async (req, res) => {
    try {
        const { email, phone, method = 'email', language = 'fr' } = req.body;
        
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
        
        const user = await prisma.user.findFirst({
            where: { OR: [{ email }, { phone }] }
        });
        
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        
        const userLang = user.language || language || 'fr';
        const t = translations[userLang] || translations.fr;
        
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        
        await prisma.user.update({
            where: { id: user.id },
            data: { otpCode, otpExpiresAt, otpAttempts: 0 }
        });
        
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

// Vérifier code OTP
app.post('/api/auth/verify-otp', async (req, res) => {
    try {
        const { email, phone, otpCode, language = 'fr' } = req.body;
        
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
        
        const user = await prisma.user.findFirst({
            where: { OR: [{ email }, { phone }] }
        });
        
        if (!user) {
            const lang = language || 'fr';
            return res.status(404).json({ error: translations[lang]?.user_not_found || translations.fr.user_not_found });
        }
        
        const userLang = user.language || language || 'fr';
        const t = translations[userLang] || translations.fr;
        
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
        
        await prisma.user.update({
            where: { id: user.id },
            data: { 
                isVerified: true,
                otpCode: null,
                otpExpiresAt: null,
                otpAttempts: 0
            }
        });
        
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
        
        const token = jwt.sign(
            { userId: user.id, email: user.email, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
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

// Mot de passe oublié
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
            return res.json({ 
                success: true, 
                message: "Si cet email existe, un code de réinitialisation a été envoyé" 
            });
        }
        
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = Date.now() + 15 * 60 * 1000;
        
        resetOtpStore.set(email, {
            code: otpCode,
            expiresAt: otpExpiresAt,
            attempts: 0,
            userId: user.id
        });
        
        const translations = {
            fr: {
                subject: "🔐 Code de réinitialisation Auto-stop",
                title: "Code de réinitialisation",
                greeting: `Bonjour ${user.name},`,
                message: "Vous avez demandé à réinitialiser votre mot de passe. Voici votre code de vérification :",
                expiry: "Ce code expire dans 15 minutes.",
                ignore: "Si vous n'avez pas demandé cette réinitialisation, ignorez cet email."
            },
            en: {
                subject: "🔐 Auto-stop reset code",
                title: "Reset code",
                greeting: `Hello ${user.name},`,
                message: "You requested to reset your password. Here is your verification code:",
                expiry: "This code expires in 15 minutes.",
                ignore: "If you didn't request this, ignore this email."
            },
            es: {
                subject: "🔐 Código de reinicio Auto-stop",
                title: "Código de reinicio",
                greeting: `Hola ${user.name},`,
                message: "Solicitaste reiniciar tu contraseña. Aquí está tu código:",
                expiry: "Este código expira en 15 minutos.",
                ignore: "Si no solicitaste esto, ignora este email."
            },
            pt: {
                subject: "🔐 Código de redefinição Auto-stop",
                title: "Código de redefinição",
                greeting: `Olá ${user.name},`,
                message: "Você solicitou redefinir sua senha. Aqui está seu código:",
                expiry: "Este código expira em 15 minutos.",
                ignore: "Se você não solicitou isso, ignore este e-mail."
            }
        };
        
        const t = translations[language] || translations.fr;
        const userLang = user.language || language || 'fr';
        
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
        
        res.json({ 
            success: true, 
            message: "Un code de réinitialisation a été envoyé par email" 
        });
        
    } catch (error) {
        console.error('❌ Erreur forgot-password:', error);
        res.status(500).json({ error: "Erreur lors du traitement" });
    }
});

// Réinitialiser mot de passe avec OTP
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
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        await prisma.user.update({
            where: { id: otpData.userId },
            data: { password: hashedPassword }
        });
        
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

// ============ ROUTES PAIEMENT UTILISATEUR ============

app.get('/api/users/payment-info', verifyToken, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: {
                paymentMethod: true,
                mobileMoneyNumber: true,
                cardNumber: true,
                cardExpiry: true,
                cardCvv: true,
                bankName: true,
                accountNumber: true
            }
        });
        
        res.json({ 
            paymentInfo: {
                method: user?.paymentMethod || 'mobile_money',
                mobileMoneyNumber: user?.mobileMoneyNumber || '',
                cardNumber: user?.cardNumber || '',
                cardExpiry: user?.cardExpiry || '',
                cardCvv: user?.cardCvv || '',
                bankName: user?.bankName || '',
                accountNumber: user?.accountNumber || ''
            }
        });
    } catch (error) {
        console.error('❌ Erreur get payment info:', error);
        res.status(500).json({ error: 'Erreur lors du chargement' });
    }
});

app.put('/api/users/payment-info', verifyToken, async (req, res) => {
    try {
        const { 
            method, 
            mobileMoneyNumber, 
            cardNumber, 
            cardExpiry, 
            cardCvv,
            bankName,
            accountNumber 
        } = req.body;
        
        const updateData = {
            paymentMethod: method
        };
        
        if (method === 'mobile_money') {
            updateData.mobileMoneyNumber = mobileMoneyNumber;
            updateData.cardNumber = null;
            updateData.cardExpiry = null;
            updateData.cardCvv = null;
            updateData.bankName = null;
            updateData.accountNumber = null;
        } else if (method === 'bank_card') {
            updateData.cardNumber = cardNumber;
            updateData.cardExpiry = cardExpiry;
            updateData.cardCvv = cardCvv;
            updateData.mobileMoneyNumber = null;
            updateData.bankName = null;
            updateData.accountNumber = null;
        } else if (method === 'bank_transfer') {
            updateData.bankName = bankName;
            updateData.accountNumber = accountNumber;
            updateData.mobileMoneyNumber = null;
            updateData.cardNumber = null;
            updateData.cardExpiry = null;
            updateData.cardCvv = null;
        }
        
        await prisma.user.update({
            where: { id: req.userId },
            data: updateData
        });
        
        res.json({ success: true, message: 'Informations de paiement mises à jour' });
    } catch (error) {
        console.error('❌ Erreur update payment info:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
});

// ============ ROUTES PUSH NOTIFICATIONS ============

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

// ============ ROUTES TELEGRAM ============

app.post('/api/users/link-telegram', verifyToken, async (req, res) => {
    try {
        const { telegramChatId } = req.body;
        const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        
        if (!telegramChatId) {
            return res.status(400).json({ error: 'ID Telegram requis' });
        }
        
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: { language: true, name: true, email: true, telegramChatId: true }
        });
        
        const userLang = user?.language || 'fr';
        
        if (user?.telegramChatId) {
            return res.status(400).json({ error: 'Compte Telegram déjà lié' });
        }
        
        const testResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: telegramChatId,
                text: "🔔 Votre compte Telegram a été lié avec succès à Auto-stop.",
                parse_mode: 'Markdown'
            })
        });
        
        const testData = await testResponse.json();
        
        if (!testData.ok) {
            return res.status(400).json({ error: 'ID Telegram invalide' });
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

app.delete('/api/users/unlink-telegram', verifyToken, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: { telegramChatId: true, language: true }
        });
        
        if (!user?.telegramChatId) {
            return res.status(400).json({ error: 'Aucun compte Telegram lié' });
        }
        
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

// ============ ROUTES TRAJETS (SANS PARAMÈTRES - SPÉCIFIQUES) ============

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

// RECHERCHE DYNAMIQUE AVEC TRI
app.get('/api/rides/dynamic-search', async (req, res) => {
    try {
        let { 
            departure = '', 
            destination = '', 
            date, 
            minPrice, 
            maxPrice,
            sortBy = 'date',      // date, price, duration
            sortOrder = 'asc'      // asc, desc
        } = req.query;
        
        console.log('🔍 Recherche reçue:', { departure, destination, sortBy, sortOrder });
        
        // 🔥 CORRECTION DES FAUTES D'ORTHOGRAPHE 🔥
        const corrected = await suggestionService.searchRidesWithTolerance(prisma, departure, destination);
        
        const searchDeparture = corrected.bestDeparture;
        const searchDestination = corrected.bestDestination;
        
        // Construction du where clause
        const whereClause = {
            status: 'SCHEDULED',
            isHidden: false,
            date: { gte: new Date() }
        };
        
        // Filtrage par date spécifique
        if (date) {
            const searchDate = new Date(date);
            const nextDay = new Date(searchDate);
            nextDay.setDate(nextDay.getDate() + 1);
            whereClause.date = {
                gte: searchDate,
                lt: nextDay
            };
        }
        
        // Filtrage par prix
        if (minPrice || maxPrice) {
            whereClause.price = {};
            if (minPrice) whereClause.price.gte = parseFloat(minPrice);
            if (maxPrice) whereClause.price.lte = parseFloat(maxPrice);
        }
        
        // Recherche avec la ville corrigée
        if (searchDeparture && searchDeparture !== '') {
            whereClause.departure = {
                contains: searchDeparture,
                mode: 'insensitive'
            };
        }
        
        if (searchDestination && searchDestination !== '') {
            whereClause.destination = {
                contains: searchDestination,
                mode: 'insensitive'
            };
        }
        
        // Construction de l'ordre de tri
        let orderBy = {};
        switch (sortBy) {
            case 'date':
                orderBy = { date: sortOrder === 'asc' ? 'asc' : 'desc' };
                break;
            case 'price':
                orderBy = { price: sortOrder === 'asc' ? 'asc' : 'desc' };
                break;
            case 'duration':
                orderBy = { estimatedDuration: sortOrder === 'asc' ? 'asc' : 'desc' };
                break;
            default:
                orderBy = { date: 'asc' };
        }
        
        const rides = await prisma.ride.findMany({
            where: whereClause,
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
                bookings: {
                    where: { status: 'CONFIRMED' },
                    select: { seats: true }
                }
            },
            orderBy: orderBy  // ← Application du tri
        });
        
        // Ajouter les statistiques de places
        const ridesWithStats = rides.map(ride => {
            const totalBookedSeats = ride.bookings.reduce((sum, booking) => sum + booking.seats, 0);
            return {
                ...ride,
                totalSeats: ride.totalSeats || ride.availableSeats + totalBookedSeats,
                availableSeats: ride.availableSeats,
                bookedSeats: totalBookedSeats,
                searchCorrected: {
                    departure: searchDeparture !== departure,
                    destination: searchDestination !== destination,
                    originalDeparture: departure,
                    originalDestination: destination,
                    correctedDeparture: searchDeparture,
                    correctedDestination: searchDestination
                }
            };
        });
        
        console.log(`📊 ${ridesWithStats.length} trajets trouvés - Trié par ${sortBy} (${sortOrder})`);
        
        res.json({ 
            success: true,
            count: ridesWithStats.length,
            rides: ridesWithStats,
            sort: { sortBy, sortOrder },
            corrected: {
                departure: searchDeparture !== departure,
                destination: searchDestination !== destination,
                original: { departure, destination },
                corrected: { departure: searchDeparture, destination: searchDestination }
            }
        });
        
    } catch (error) {
        console.error('❌ Erreur recherche dynamique:', error);
        res.status(500).json({ 
            success: false,
            error: 'Erreur lors de la recherche',
            details: error.message 
        });
    }
});

// Trajets publiés par l'utilisateur
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

// Réservations de l'utilisateur
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

// Trajets notables
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

// ============ ROUTES AUTOCOMPLÉTION AVEC CORRECTION D'ORTHOGRAPHE ============

// Obtenir les villes de départ avec correction des fautes
app.get('/api/rides/autocomplete/departures', async (req, res) => {
    try {
        const { query = '' } = req.query;
        
        if (!query || query.length < 2) {
            return res.json({ suggestions: [] });
        }
        
        const suggestions = await suggestionService.getSuggestions(prisma, query, 'departure', 10);
        res.json({ suggestions });
        
    } catch (error) {
        console.error('❌ Erreur autocomplete départ:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Obtenir les villes d'arrivée avec correction des fautes
app.get('/api/rides/autocomplete/destinations', async (req, res) => {
    try {
        const { query = '', departure = '' } = req.query;
        
        if (!query || query.length < 2) {
            return res.json({ suggestions: [] });
        }
        
        let suggestions = await suggestionService.getSuggestions(prisma, query, 'destination', 10);
        
        // Si un départ est spécifié, on peut filtrer les destinations pertinentes
        if (departure) {
            const departureNormalized = suggestionService.normalizeCity(departure);
            suggestions = suggestions.filter(dest => 
                suggestionService.normalizeCity(dest) !== departureNormalized
            );
        }
        
        res.json({ suggestions });
        
    } catch (error) {
        console.error('❌ Erreur autocomplete destination:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ============ ROUTES TRAJETS (AVEC PARAMÈTRES) ============

// Détails d'un trajet spécifique
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

// Passagers d'un trajet
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

// Publier un trajet
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
            isRecurring,
            onlinePaymentPercent,
            displayCurrency,
            receptionMethod,
            mobileMoneyNumber,
            bankCardNumber,
            bankCardExpiry,
            bankCardCvv
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
                totalSeats: parseInt(availableSeats),
                onlinePaymentPercent: onlinePaymentPercent || 100,
                displayCurrency: displayCurrency || 'XAF',
                receptionMethod: receptionMethod || 'mobile_money',
                receiverPhone: receptionMethod === 'mobile_money' ? mobileMoneyNumber : null,
                receiverCardNumber: receptionMethod === 'bank_card' ? bankCardNumber : null,
                receiverCardExpiry: receptionMethod === 'bank_card' ? bankCardExpiry : null,
                receiverCardCvv: receptionMethod === 'bank_card' ? bankCardCvv : null
            }
        });
        
        await prisma.user.update({
            where: { id: user.id },
            data: { totalTrips: { increment: 1 } }
        });
        
        console.log('✅ Trajet créé:', ride.id);
        
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

// Démarrer un trajet
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
        
        res.json({ message: 'Trajet démarré', ride: { ...ride, status: 'ONGOING' } });
        
    } catch (error) {
        console.error('❌ Erreur démarrage trajet:', error);
        res.status(500).json({ error: 'Erreur lors du démarrage du trajet' });
    }
});

// Terminer un trajet
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
        
        await reminderService.cancelRideReminders(id);
        
        res.json({ message: 'Trajet terminé', ride: { ...ride, status: 'COMPLETED' } });
        
    } catch (error) {
        console.error('❌ Erreur terminaison trajet:', error);
        res.status(500).json({ error: 'Erreur lors de la terminaison du trajet' });
    }
});

// Noter un trajet
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

// ============ ROUTES RÉSERVATIONS ============

// Créer une réservation
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

// Annuler une réservation
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

// Confirmer paiement en espèces
app.post('/api/bookings/:id/confirm-cash', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { amount } = req.body;
        
        const booking = await prisma.booking.findUnique({
            where: { id: id },
            include: { ride: true }
        });
        
        if (!booking) {
            return res.status(404).json({ error: 'Réservation non trouvée' });
        }
        
        if (booking.ride.driverId !== req.userId) {
            return res.status(403).json({ error: 'Non autorisé' });
        }
        
        const remainingCash = (booking.cashAmount || 0) - (booking.cashAmountPaid || 0);
        if (amount > remainingCash) {
            return res.status(400).json({ error: 'Le montant dépasse le montant restant dû' });
        }
        
        const updatedBooking = await prisma.booking.update({
            where: { id: id },
            data: {
                cashAmountPaid: {
                    increment: amount
                },
                cashPaymentConfirmed: true,
                cashPaymentDate: new Date()
            }
        });
        
        res.json({ 
            success: true, 
            message: 'Paiement espèces confirmé',
            booking: updatedBooking
        });
        
    } catch (error) {
        console.error('❌ Erreur confirm-cash:', error);
        res.status(500).json({ error: 'Erreur lors de la confirmation' });
    }
});

// Libérer paiement en ligne
app.post('/api/bookings/:id/release-payment', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const booking = await prisma.booking.findUnique({
            where: { id: id },
            include: { 
                ride: {
                    include: { driver: true }
                }
            }
        });
        
        if (!booking) {
            return res.status(404).json({ error: 'Réservation non trouvée' });
        }
        
        if (booking.ride.status !== 'COMPLETED') {
            return res.status(400).json({ error: 'Le trajet n\'est pas encore terminé' });
        }
        
        if (booking.ride.driverId !== req.userId) {
            return res.status(403).json({ error: 'Non autorisé' });
        }
        
        if (booking.paymentStatus === 'RELEASED') {
            return res.status(400).json({ error: 'Paiement déjà libéré' });
        }
        
        await prisma.booking.update({
            where: { id: id },
            data: {
                paymentStatus: 'RELEASED',
                paymentReleasedAt: new Date(),
                payoutReference: `RELEASED_${booking.id}_${Date.now()}`
            }
        });
        
        res.json({ 
            success: true, 
            message: 'Paiement libéré avec succès'
        });
        
    } catch (error) {
        console.error('❌ Erreur release-payment:', error);
        res.status(500).json({ error: 'Erreur lors de la libération du paiement' });
    }
});

// Statut de paiement d'une réservation
app.get('/api/bookings/:id/payment-status', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const booking = await prisma.booking.findUnique({
            where: { id: id },
            select: {
                id: true,
                passengerId: true,
                onlineAmount: true,
                cashAmount: true,
                cashAmountPaid: true,
                cashPaymentConfirmed: true,
                paymentStatus: true,
                paymentReleasedAt: true,
                ride: {
                    select: {
                        driverId: true,
                        status: true
                    }
                }
            }
        });
        
        if (!booking) {
            return res.status(404).json({ error: 'Réservation non trouvée' });
        }
        
        const isPassenger = booking.passengerId === req.userId;
        const isDriver = booking.ride.driverId === req.userId;
        
        if (!isPassenger && !isDriver) {
            return res.status(403).json({ error: 'Non autorisé' });
        }
        
        res.json({
            paymentStatus: {
                onlineAmount: booking.onlineAmount,
                onlinePaid: booking.paymentStatus === 'RELEASED',
                onlineReleasedAt: booking.paymentReleasedAt,
                cashAmount: booking.cashAmount || 0,
                cashPaid: booking.cashAmountPaid || 0,
                cashRemaining: (booking.cashAmount || 0) - (booking.cashAmountPaid || 0),
                cashFullyPaid: booking.cashPaymentConfirmed,
                overallStatus: booking.paymentStatus
            }
        });
        
    } catch (error) {
        console.error('❌ Erreur payment-status:', error);
        res.status(500).json({ error: 'Erreur lors du chargement' });
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

// ============ ROUTES AVIS ============

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

// ============ STOCKAGE OTP PASSWORD RESET ==========
const resetOtpStore = new Map();

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
    console.log(`🔍 http://localhost:${PORT}/api/rides/dynamic-search`);
    console.log(`📋 http://localhost:${PORT}/api/rides/my-published`);
    console.log(`📖 http://localhost:${PORT}/api/rides/my-bookings`);
    console.log(`💰 http://localhost:${PORT}/api/users/payment-info`);
    console.log(`💳 http://localhost:${PORT}/api/bookings/:id/confirm-cash`);
    console.log(`💸 http://localhost:${PORT}/api/bookings/:id/release-payment`);
    console.log(`📊 http://localhost:${PORT}/api/bookings/:id/payment-status`);
});