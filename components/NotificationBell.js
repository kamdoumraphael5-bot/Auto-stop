import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Modal, FlatList,
  StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import config from '../config';

export default function NotificationBell({ user, navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fonction pour charger les notifications
  const fetchNotifications = async () => {
    if (!user?.token) return;
    
    try {
      const response = await fetch(`${config.API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const data = await response.json();
      setNotifications(data.notifications || []);
      const count = data.notifications.filter(n => !n.is_read).length;
      setUnreadCount(count);
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
    }
  };

  // Fonction pour marquer comme lu
  const markAsRead = async (notificationId) => {
    try {
      await fetch(`${config.API_URL}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${user.token}` }
      });
      
      setNotifications(prev => prev.map(n =>
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  // Quand on clique sur une notification
  const handlePress = (notification) => {
    markAsRead(notification.id);
    
    // Rediriger selon le type de notification
    if (notification.data?.rideId) {
      navigation.navigate('RideDetails', { rideId: notification.data.rideId, user });
    } else if (notification.data?.bookingId) {
      navigation.navigate('MyRides', { user, activeTab: 'booked' });
    }
    
    setShowModal(false);
  };

  // Charger au démarrage
  useEffect(() => {
    fetchNotifications();
    // Recharger toutes les 30 secondes
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // Choisir l'icône selon le type
  const getIcon = (type) => {
    switch (type) {
      case 'welcome': return '🎉';
      case 'booking': return '🚗';
      case 'reminder': return '⏰';
      case 'security': return '🔐';
      case 'rating': return '⭐';
      case 'promo': return '🎁';
      default: return '📬';
    }
  };

  return (
    <>
      {/* La cloche 🔔 */}
      <TouchableOpacity onPress={() => setShowModal(true)} style={styles.bellContainer}>
        <Text style={styles.bellIcon}>🔔</Text>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* La fenêtre modale des notifications */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📬 Notifications</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {notifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>📭</Text>
                <Text style={styles.emptyText}>Aucune notification</Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.notificationItem, !item.is_read && styles.unreadItem]}
                    onPress={() => handlePress(item)}
                  >
                    <Text style={styles.notificationIcon}>{getIcon(item.type)}</Text>
                    <View style={styles.notificationContent}>
                      <Text style={[styles.notificationTitle, !item.is_read && styles.unreadTitle]}>
                        {item.title}
                      </Text>
                      <Text style={styles.notificationMessage} numberOfLines={2}>
                        {item.message}
                      </Text>
                      <Text style={styles.notificationTime}>
                        {new Date(item.created_at).toLocaleString()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bellContainer: {
    position: 'relative',
    marginRight: 15,
  },
  bellIcon: {
    fontSize: 24,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -8,
    backgroundColor: '#F44336',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 24,
    color: '#999',
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  unreadItem: {
    backgroundColor: '#FFF9C4',
  },
  notificationIcon: {
    fontSize: 28,
    marginRight: 15,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  unreadTitle: {
    color: '#FF5A5F',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 11,
    color: '#999',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 50,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});