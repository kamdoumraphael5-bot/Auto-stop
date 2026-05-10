import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Linking
} from 'react-native';

const API_URL = 'http://192.168.0.109:3000';

export default function RideDetailsScreen({ route, navigation }) {
  const { rideId, user, language = 'fr' } = route.params || {};
  const [ride, setRide] = useState(null);
  const [passengers, setPassengers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commission, setCommission] = useState(0);

  const translations = {
    fr: {
      title: 'Détails du trajet',
      passengers: 'Passagers',
      name: 'Nom',
      cni: 'CNI / Passeport',
      expiryDate: 'Expire le',
      paymentMethod: 'Paiement',
      contact: 'Contacter',
      commission: 'Commission Auto-stop',
      payCommission: 'Payer en ligne',
      totalCommission: 'Total à payer',
      perSeat: 'par place',
      noPassengers: 'Aucun passager pour ce trajet',
      back: 'Retour',
      rideInfo: 'Informations du trajet',
      from: 'De',
      to: 'à',
      date: 'Date',
      departureTime: 'Départ',
      arrivalTime: 'Arrivée',
      price: 'Prix par place'
    },
    en: {
      title: 'Ride details',
      passengers: 'Passengers',
      name: 'Name',
      cni: 'ID / Passport',
      expiryDate: 'Expires on',
      paymentMethod: 'Payment',
      contact: 'Contact',
      commission: 'Auto-stop commission',
      payCommission: 'Pay online',
      totalCommission: 'Total to pay',
      perSeat: 'per seat',
      noPassengers: 'No passengers for this ride',
      back: 'Back',
      rideInfo: 'Ride information',
      from: 'From',
      to: 'to',
      date: 'Date',
      departureTime: 'Departure',
      arrivalTime: 'Arrival',
      price: 'Price per seat'
    },
    es: {
      title: 'Detalles del viaje',
      passengers: 'Pasajeros',
      name: 'Nombre',
      cni: 'DNI / Pasaporte',
      expiryDate: 'Expira el',
      paymentMethod: 'Pago',
      contact: 'Contactar',
      commission: 'Comisión Auto-stop',
      payCommission: 'Pagar en línea',
      totalCommission: 'Total a pagar',
      perSeat: 'por asiento',
      noPassengers: 'No hay pasajeros',
      back: 'Volver',
      rideInfo: 'Información del viaje',
      from: 'De',
      to: 'a',
      date: 'Fecha',
      departureTime: 'Salida',
      arrivalTime: 'Llegada',
      price: 'Precio por asiento'
    },
    pt: {
      title: 'Detalhes da viagem',
      passengers: 'Passageiros',
      name: 'Nome',
      cni: 'BI / Passaporte',
      expiryDate: 'Expira em',
      paymentMethod: 'Pagamento',
      contact: 'Contatar',
      commission: 'Comissão Auto-stop',
      payCommission: 'Pagar online',
      totalCommission: 'Total a pagar',
      perSeat: 'por lugar',
      noPassengers: 'Nenhum passageiro',
      back: 'Voltar',
      rideInfo: 'Informação da viagem',
      from: 'De',
      to: 'para',
      date: 'Data',
      departureTime: 'Partida',
      arrivalTime: 'Chegada',
      price: 'Preço por lugar'
    }
  };

  const t = translations[language];

  useEffect(() => {
    fetchRideDetails();
    fetchPassengers();
  }, []);

  const fetchRideDetails = async () => {
    try {
      const response = await fetch(`${API_URL}/api/rides/${rideId}`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await response.json();
      setRide(data.ride);
    } catch (error) {
      console.error('Erreur chargement trajet:', error);
    }
  };

  const fetchPassengers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/rides/${rideId}/passengers`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await response.json();
      setPassengers(data.passengers || []);
      
      const totalSeats = data.passengers.reduce((sum, p) => sum + (p.seats || 1), 0);
      setCommission(totalSeats * 100);
    } catch (error) {
      console.error('Erreur chargement passagers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContactPassenger = (passenger) => {
    const conversationId = `user_${user?.id}_${passenger.id}`;
    navigation.navigate('Chat', {
      user: user,
      conversation: { id: conversationId, messages: [] },
      ride: {
        id: rideId,
        departure: ride?.departure,
        destination: ride?.destination
      },
      otherUser: {
        id: passenger.id,
        name: passenger.name,
        photoUrl: passenger.photoUrl
      },
      language: language
    });
  };

  const handlePayCommission = () => {
    Alert.alert(
      'Paiement',
      `Vous allez payer ${commission} FCFA de commission Auto-stop.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Payer', onPress: () => Linking.openURL('https://example.com/payment') }
      ]
    );
  };

  const formatDate = (date) => {
    if (!date) return 'Non spécifiée';
    const d = new Date(date);
    return d.toLocaleDateString(language === 'fr' ? 'fr-FR' : language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'pt-PT');
  };

  const formatTime = (date) => {
    if (!date) return 'Non spécifiée';
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF5A5F" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📋 {t.title}</Text>

      {ride && (
        <View style={styles.rideInfoCard}>
          <Text style={styles.rideTitle}>🚗 {t.rideInfo}</Text>
          <Text style={styles.rideRoute}>
            {t.from} {ride.departure} {t.to} {ride.destination}
          </Text>
          <Text style={styles.rideDetail}>
            📅 {t.date}: {formatDate(ride.date)}
          </Text>
          <Text style={styles.rideDetail}>
            🚀 {t.departureTime}: {formatTime(ride.date)}
          </Text>
          {ride.arrivalTime && (
            <Text style={styles.rideDetail}>
              🏁 {t.arrivalTime}: {formatTime(ride.arrivalTime)}
            </Text>
          )}
          <Text style={styles.rideDetail}>
            💰 {t.price}: {ride.price?.toLocaleString()} FCFA
          </Text>
          <Text style={styles.rideDetail}>
            🚘 {ride.vehicleBrand} {ride.licensePlate ? `[${ride.licensePlate}]` : ''}
          </Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>👥 {t.passengers} ({passengers.length})</Text>

      {passengers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>👤</Text>
          <Text style={styles.emptyText}>{t.noPassengers}</Text>
        </View>
      ) : (
        passengers.map((passenger, index) => (
          <View key={index} style={styles.passengerCard}>
            <View style={styles.passengerHeader}>
              <Text style={styles.passengerName}>{passenger.travelerName || passenger.bookerName}</Text>
              <TouchableOpacity 
                style={styles.contactButton}
                onPress={() => handleContactPassenger(passenger)}
              >
                <Text style={styles.contactButtonText}>💬 {t.contact}</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.passengerDetails}>
              <Text style={styles.detailText}>
                🆔 {t.cni}: {passenger.idNumber || 'Non spécifié'}
              </Text>
              <Text style={styles.detailText}>
                📅 {t.expiryDate}: {passenger.idExpiryDate ? formatDate(passenger.idExpiryDate) : 'Non spécifiée'}
              </Text>
              <Text style={styles.detailText}>
                💳 {t.paymentMethod}: {passenger.paymentMethod?.replace('_', ' ') || 'Non spécifié'}
              </Text>
              <Text style={styles.detailText}>
                💺 {passenger.seats || 1} place(s)
              </Text>
            </View>
          </View>
        ))
      )}

      {commission > 0 && (
        <View style={styles.commissionCard}>
          <Text style={styles.commissionTitle}>🔴 {t.commission}</Text>
          <Text style={styles.commissionAmount}>
            {commission.toLocaleString()} FCFA
          </Text>
          <Text style={styles.commissionDetail}>
            ({passengers.reduce((sum, p) => sum + (p.seats || 1), 0)} {t.perSeat} × 100 FCFA)
          </Text>
          <TouchableOpacity style={styles.payButton} onPress={handlePayCommission}>
            <Text style={styles.payButtonText}>💳 {t.payCommission}</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>← {t.back}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8', padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FF5A5F', textAlign: 'center', marginBottom: 20 },
  rideInfoCard: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  rideTitle: { fontSize: 16, fontWeight: 'bold', color: '#FF5A5F', marginBottom: 10 },
  rideRoute: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  rideDetail: { fontSize: 14, color: '#666', marginBottom: 5 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 10, marginBottom: 15 },
  passengerCard: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  passengerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10 },
  passengerName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  contactButton: { backgroundColor: '#2196F3', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  contactButtonText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  passengerDetails: { marginTop: 5 },
  detailText: { fontSize: 14, color: '#666', marginBottom: 5 },
  commissionCard: { backgroundColor: '#FFF9C4', borderRadius: 12, padding: 20, marginTop: 10, marginBottom: 20, borderWidth: 1, borderColor: '#FF5A5F' },
  commissionTitle: { fontSize: 18, fontWeight: 'bold', color: '#F44336', textAlign: 'center', marginBottom: 10 },
  commissionAmount: { fontSize: 32, fontWeight: 'bold', color: '#F44336', textAlign: 'center', marginBottom: 5 },
  commissionDetail: { fontSize: 12, color: '#666', textAlign: 'center', marginBottom: 15 },
  payButton: { backgroundColor: '#4CAF50', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  payButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  backButton: { backgroundColor: '#f0f0f0', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 30 },
  backButtonText: { color: '#FF5A5F', fontSize: 16, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 50, marginBottom: 10 },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center' }
});