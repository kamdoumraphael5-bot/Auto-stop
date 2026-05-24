// backend/routes/notifications.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Récupérer toutes les notifications d'un utilisateur
async function getNotifications(req, res) {
  try {
    const userId = req.user?.id || req.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Utilisateur non authentifié' });
    }
    
    const notifications = await prisma.notification.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' }
    });
    
    const unreadCount = notifications.filter(n => !n.isRead).length;
    
    res.json({ 
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Erreur getNotifications:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// Marquer une notification comme lue
async function markAsRead(req, res) {
  try {
    const userId = req.user?.id || req.userId;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'Utilisateur non authentifié' });
    }
    
    // Vérifier que la notification appartient bien à l'utilisateur
    const notification = await prisma.notification.findFirst({
      where: {
        id: id,
        userId: userId
      }
    });
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification non trouvée' });
    }
    
    await prisma.notification.update({
      where: { id: id },
      data: { isRead: true }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur markAsRead:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// Marquer toutes les notifications comme lues
async function markAllAsRead(req, res) {
  try {
    const userId = req.user?.id || req.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Utilisateur non authentifié' });
    }
    
    await prisma.notification.updateMany({
      where: {
        userId: userId,
        isRead: false
      },
      data: { isRead: true }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur markAllAsRead:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// Créer une notification (utile depuis d'autres parties de l'app)
async function createNotification(userId, type, title, message, data = {}) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: userId,
        type: type,
        title: title,
        message: message,
        data: data, // Prisma accepte directement l'objet pour le champ Json
        isRead: false
      }
    });
    console.log(`🔔 Notification créée: ${title} pour ${userId}`);
    return notification.id;
  } catch (error) {
    console.error('Erreur createNotification:', error);
    return null;
  }
}

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  createNotification
};