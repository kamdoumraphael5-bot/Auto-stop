import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  FlatList, ActivityIndicator, RefreshControl
} from 'react-native';
import { useSocket } from '../context/SocketContext';

const API_URL = 'http://192.168.0.109:3000';

export default function MyRidesScreen({ route, navigation }) {
  const { user, language = 'fr' } = route.params || {};
  const [activeTab, setActiveTab] = useState('published');
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const { on, off } = useSocket();

  const translations = {
    fr: {
      title: 'Mes trajets',
      published: 'Publiés',
      booked: 'Réservations',
      noPublished: 'Aucun trajet publié',
      noBooked: 'Aucune réservation',
      hide: 'Masquer',
      show: 'Afficher',
      hidden: 'Masqué',
      active: 'Actif',
      passengers: 'Passagers',
      chat: '💬 Message',
      cancel: 'Annuler',
      rate: '⭐ Noter',
      cancelConfirm: 'Annuler la réservation',
      cancelConfirmMessage: 'Voulez-vous vraiment annuler cette réservation ? Les places redeviennent disponibles.',
      cancelSuccess: 'Réservation annulée',
      cancelError: 'Impossible d\'annuler',
      yes: 'Oui',
      no: 'Non',
      confirmHide: 'Masquer ce trajet ?',
      confirmHideMessage: 'Ce trajet ne sera plus visible par les autres utilisateurs',
      confirmShow: 'Afficher ce trajet ?',
      confirmShowMessage: 'Ce trajet sera à nouveau visible par les autres utilisateurs'
    },
    en: {
      title: 'My rides',
      published: 'Published',
      booked: 'Bookings',
      noPublished: 'No published rides',
      noBooked: 'No bookings',
      hide: 'Hide',
      show: 'Show',
      hidden: 'Hidden',
      active: 'Active',
      passengers: 'Passengers',
      chat: '💬 Message',
      cancel: 'Cancel',
      rate: '⭐ Rate',
      cancelConfirm: 'Cancel booking',
      cancelConfirmMessage: 'Do you really want to cancel this booking? Seats will become available again.',
      cancelSuccess: 'Booking cancelled',
      cancelError: 'Unable to cancel',
      yes: 'Yes',
      no: 'No',
      confirmHide: 'Hide this ride?',
      confirmHideMessage: 'This ride will no longer be visible to other users',
      confirmShow: 'Show this ride?',
      confirmShowMessage: 'This ride will be visible again to other users'
    },
    es: {
      title: 'Mis viajes',
      published: 'Publicados',
      booked: 'Reservas',
      noPublished: 'No hay viajes publicados',
      noBooked: 'No hay reservas',
      hide: 'Ocultar',
      show: 'Mostrar',
      hidden: 'Oculto',
      active: 'Activo',
      passengers: 'Pasajeros',
      chat: '💬 Mensaje',
      cancel: 'Cancelar',
      rate: '⭐ Calificar',
      cancelConfirm: 'Cancelar reserva',
      cancelConfirmMessage: '¿Realmente quieres cancelar esta reserva? Los asientos volverán a estar disponibles.',
      cancelSuccess: 'Reserva cancelada',
      cancelError: 'No se puede cancelar',
      yes: 'Sí',
      no: 'No',
      confirmHide: '¿Ocultar este viaje?',
      confirmHideMessage: 'Este viaje ya no será visible para otros usuarios',
      confirmShow: '¿Mostrar este viaje?',
      confirmShowMessage: 'Este viaje será visible nuevamente'
    },
    pt: {
      title: 'Minhas viagens',
      published: 'Publicadas',
      booked: 'Reservas',
      noPublished: 'Nenhuma viagem publicada',
      noBooked: 'Nenhuma reserva',
      hide: 'Ocultar',
      show: 'Mostrar',
      hidden: 'Oculto',
      active: 'Ativo',
      passengers: 'Passageiros',
      chat: '💬 Mensagem',
      cancel: 'Cancelar',
      rate: '⭐ Avaliar',
      cancelConfirm: 'Cancelar reserva',
      cancelConfirmMessage: 'Deseja realmente cancelar esta reserva? Os lugares ficarão disponíveis novamente.',
      cancelSuccess: 'Reserva cancelada',
      cancelError: 'Não foi possível cancelar',
      yes: 'Sim',
      no: 'Não',
      confirmHide: 'Ocultar esta viagem?',
      confirmHideMessage: 'Esta viagem não será mais visível para outros usuários',
      confirmShow: 'Mostrar esta viagem?',
      confirmShowMessage: 'Esta viagem será visível novamente'
    }
  };

  const t = translations[language];

  useEffect(() => {
    fetchRides();
    
    const handleNewMessage = (message) => {
      if (message.receiverId === user?.id && !message.isRead) {
        checkAndUpdateUnreadCount(message);
      }
    };
    
    on('newMessage', handleNewMessage);
    
    return () => {
      off('newMessage', handleNewMessage);
    };
  }, [activeTab]);

  const fetchRides = async () => {
    try {
      const endpoint = activeTab === 'published' 
        ? `${API_URL}/api/rides/my-published`
        : `${API_URL}/api/rides/my-bookings`;
      
      const response = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await response.json();
      console.log('📋 Rides reçus:', data.rides?.length);
      setRides(data.rides || []);
      
      if (activeTab === 'published') {
        await loadUnreadCounts(data.rides || []);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadUnreadCounts = async (ridesList) => {
    const counts = {};
    for (const ride of ridesList) {
      if (ride.bookings && ride.bookings.length > 0) {
        for (const booking of ride.bookings) {
          const passengerId = booking.passenger?.id || booking.passengerId;
          if (passengerId) {
            const conversationId = `user_${user?.id}_${passengerId}`;
            try {
              const response = await fetch(`${API_URL}/api/messages/unread/${conversationId}`, {
                headers: { 'Authorization': `Bearer ${user?.token}` }
              });
              const data = await response.json();
              if (data.count > 0) {
                counts[conversationId] = data.count;
              }
            } catch (error) {
              console.error('Erreur chargement compteur:', error);
            }
          }
        }
      }
    }
    setUnreadCounts(counts);
  };

  const checkAndUpdateUnreadCount = (message) => {
    const conversationId = message.conversationId;
    setUnreadCounts(prev => ({
      ...prev,
      [conversationId]: (prev[conversationId] || 0) + 1
    }));
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRides();
  };

  const handleCancelBooking = async (bookingId) => {
    console.log('❌ Annulation de la réservation ID:', bookingId);
    
    if (!bookingId) {
      Alert.alert('Erreur', 'ID de réservation introuvable');
      return;
    }
    
    Alert.alert(
      t.cancelConfirm,
      t.cancelConfirmMessage,
      [
        { text: t.no, style: 'cancel' },
        { 
          text: t.yes, 
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/api/bookings/${bookingId}/cancel`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${user?.token}`
                }
              });
              
              const data = await response.json();
              if (response.ok) {
                Alert.alert(t.cancelSuccess, t.cancelSuccess);
                fetchRides();
              } else {
                Alert.alert(t.cancelError, data.error);
              }
            } catch (error) {
              console.error('Erreur annulation:', error);
              Alert.alert(t.cancelError, 'Connexion au serveur impossible');
            }
          }
        }
      ]
    );
  };

  const handleToggleVisibility = async (ride) => {
    const confirmMessage = ride.isHidden ? t.confirmShow : t.confirmHide;
    const confirmMessageText = ride.isHidden ? t.confirmShowMessage : t.confirmHideMessage;
    
    Alert.alert(
      confirmMessage,
      confirmMessageText,
      [
        { text: t.no, style: 'cancel' },
        { 
          text: t.yes, 
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/api/rides/${ride.id}/visibility`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${user?.token}`
                },
                body: JSON.stringify({ isHidden: !ride.isHidden })
              });
              
              if (response.ok) {
                fetchRides();
              } else {
                Alert.alert('Erreur', 'Impossible de modifier la visibilité');
              }
            } catch (error) {
              Alert.alert('Erreur', 'Connexion au serveur impossible');
            }
          }
        }
      ]
    );
  };

  const handleOpenChat = (ride, passenger) => {
    const conversationId = `user_${user?.id}_${passenger.id}`;
    
    setUnreadCounts(prev => {
      const newCounts = { ...prev };
      delete newCounts[conversationId];
      return newCounts;
    });
    
    navigation.navigate('Chat', {
      user: user,
      conversation: { id: conversationId, messages: [] },
      ride: {
        id: ride.id,
        departure: ride.departure,
        destination: ride.destination
      },
      otherUser: {
        id: passenger.id,
        name: passenger.name,
        photoUrl: passenger.photoUrl
      },
      language: language
    });
  };

  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString(language === 'fr' ? 'fr-FR' : language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'pt-PT');
  };

  const formatTime = (date) => {
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderPublishedRide = ({ item }) => (
    <TouchableOpacity 
      style={styles.rideCard}
      onPress={() => navigation.navigate('RideDetails', { rideId: item.id, user, language })}
    >
      <View style={styles.rideHeader}>
        <Text style={styles.rideRoute}>{item.departure} → {item.destination}</Text>
        <TouchableOpacity 
          style={[styles.visibilityButton, item.isHidden && styles.hiddenButton]}
          onPress={() => handleToggleVisibility(item)}
        >
          <Text style={styles.visibilityButtonText}>
            {item.isHidden ? t.show : t.hide}
          </Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.rideDate}>📅 {formatDate(item.date)} à {formatTime(item.date)}</Text>
      <Text style={styles.ridePrice}>💰 {item.price?.toLocaleString()} FCFA</Text>
      <Text style={styles.rideSeats}>💺 {item.availableSeats} places disponibles</Text>
      
      {item.isHidden && (
        <View style={styles.hiddenBadge}>
          <Text style={styles.hiddenBadgeText}>🔒 {t.hidden}</Text>
        </View>
      )}
      
      {item.bookings && item.bookings.length > 0 && (
        <View style={styles.passengersSection}>
          <Text style={styles.passengersTitle}>👥 {t.passengers} :</Text>
          {item.bookings.map((booking) => {
            const passenger = booking.passenger;
            const passengerId = passenger?.id || booking.passengerId;
            const conversationId = `user_${user?.id}_${passengerId}`;
            const unreadCount = unreadCounts[conversationId] || 0;
            
            return (
              <View key={booking.id} style={styles.passengerItem}>
                <View style={styles.passengerInfo}>
                  <Text style={styles.passengerName}>{passenger?.name || 'Passager'}</Text>
                  <Text style={styles.passengerSeats}>{booking.seats} place(s)</Text>
                </View>
                <TouchableOpacity 
                  style={styles.chatButton}
                  onPress={() => handleOpenChat(item, { 
                    id: passengerId, 
                    name: passenger?.name || 'Passager',
                    photoUrl: passenger?.photoUrl
                  })}
                >
                  <Text style={styles.chatButtonText}>💬</Text>
                  {unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </TouchableOpacity>
  );

  const renderBookedRide = ({ item }) => {
    console.log('🔍 Réservation:', { id: item.id, bookingId: item.bookingId, status: item.bookingStatus });
    
    // Vérifier si le trajet est terminé et peut être noté
    const isCompleted = new Date(item.date) < new Date();
    const canRate = isCompleted && item.bookingStatus === 'CONFIRMED';
    
    return (
      <View style={styles.rideCard}>
        <View style={styles.rideHeader}>
          <Text style={styles.rideRoute}>{item.departure} → {item.destination}</Text>
          <View style={styles.buttonGroup}>
            {canRate && (
              <TouchableOpacity 
                style={styles.rateButton}
                onPress={() => navigation.navigate('RateRide', { 
                  rideId: item.id,
                  driverName: item.driverName,
                  language: language 
                })}
              >
                <Text style={styles.rateButtonText}>{t.rate}</Text>
              </TouchableOpacity>
            )}
            {item.bookingStatus !== 'CANCELLED' && new Date(item.date) > new Date() && (
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => handleCancelBooking(item.bookingId)}
              >
                <Text style={styles.cancelButtonText}>{t.cancel}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        <Text style={styles.rideDate}>📅 {formatDate(item.date)} à {formatTime(item.date)}</Text>
        <Text style={styles.ridePrice}>💰 {item.price?.toLocaleString()} FCFA</Text>
        <Text style={styles.rideDriver}>👤 Conducteur: {item.driverName}</Text>
        
        <View style={styles.bookingStatus}>
          <Text style={[
            styles.statusText, 
            item.bookingStatus === 'CONFIRMED' ? styles.statusConfirmed : 
            item.bookingStatus === 'CANCELLED' ? styles.statusCancelled : styles.statusPending
          ]}>
            {item.bookingStatus === 'CONFIRMED' ? '✅ Confirmée' : 
             item.bookingStatus === 'CANCELLED' ? '❌ Annulée' : '⏳ En attente'}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF5A5F" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📋 {t.title}</Text>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'published' && styles.activeTab]}
          onPress={() => setActiveTab('published')}
        >
          <Text style={[styles.tabText, activeTab === 'published' && styles.activeTabText]}>
            🚗 {t.published}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'booked' && styles.activeTab]}
          onPress={() => setActiveTab('booked')}
        >
          <Text style={[styles.tabText, activeTab === 'booked' && styles.activeTabText]}>
            📖 {t.booked}
          </Text>
        </TouchableOpacity>
      </View>

      {rides.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🚗💨</Text>
          <Text style={styles.emptyText}>
            {activeTab === 'published' ? t.noPublished : t.noBooked}
          </Text>
        </View>
      ) : (
        <FlatList
          data={rides}
          keyExtractor={(item) => item.id}
          renderItem={activeTab === 'published' ? renderPublishedRide : renderBookedRide}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF5A5F']} />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FF5A5F', textAlign: 'center', paddingTop: 20, paddingBottom: 20 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: '#FF5A5F' },
  tabText: { fontSize: 16, color: '#666', fontWeight: 'bold' },
  activeTabText: { color: 'white' },
  listContent: { padding: 15, paddingBottom: 30 },
  rideCard: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  rideHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' },
  rideRoute: { fontSize: 18, fontWeight: 'bold', color: '#333', flex: 1 },
  buttonGroup: { flexDirection: 'row', gap: 8 },
  visibilityButton: { backgroundColor: '#FF9800', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  hiddenButton: { backgroundColor: '#4CAF50' },
  visibilityButtonText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  cancelButton: { backgroundColor: '#F44336', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  cancelButtonText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  rateButton: { backgroundColor: '#2196F3', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  rateButtonText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  rideDate: { fontSize: 14, color: '#666', marginBottom: 5 },
  ridePrice: { fontSize: 16, fontWeight: 'bold', color: '#FF5A5F', marginBottom: 5 },
  rideSeats: { fontSize: 14, color: '#666', marginBottom: 10 },
  rideDriver: { fontSize: 14, color: '#666', marginBottom: 10 },
  hiddenBadge: { marginBottom: 10, backgroundColor: '#f0f0f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  hiddenBadgeText: { fontSize: 12, color: '#999' },
  passengersSection: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eee' },
  passengersTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  passengerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f8f8', padding: 10, borderRadius: 8, marginBottom: 8 },
  passengerInfo: { flex: 1 },
  passengerName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  passengerSeats: { fontSize: 12, color: '#666' },
  chatButton: { backgroundColor: '#2196F3', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, position: 'relative' },
  chatButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  unreadBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#F44336', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  unreadBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  bookingStatus: { marginTop: 10, alignItems: 'flex-end' },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  statusConfirmed: { color: '#4CAF50' },
  statusPending: { color: '#FF9800' },
  statusCancelled: { color: '#F44336' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyEmoji: { fontSize: 50, marginBottom: 10 },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center' }
});