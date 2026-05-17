import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Linking, Share
} from 'react-native';
import config from '../config';

export default function RideDetailsScreen({ route, navigation }) {
  const { rideId, user, language = 'fr' } = route.params || {};
  const [ride, setRide] = useState(null);
  const [passengers, setPassengers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commission, setCommission] = useState(0);
  const [driverInfo, setDriverInfo] = useState(null);
  
  // Déterminer si l'utilisateur est le conducteur
  const isDriver = user?.id === ride?.driverId;

  const translations = {
    fr: {
      title: 'Détails du trajet',
      passengers: 'Passagers',
      name: 'Nom',
      cni: 'CNI / Passeport',
      expiryDate: "Date d'expiration",
      deliveryPlace: 'Lieu de délivrance',
      phone: 'Téléphone',
      seats: 'Places',
      paymentMethod: 'Moyen de paiement',
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
      price: 'Prix par place',
      driverInfo: 'Informations du chauffeur',
      driverFullName: 'Nom complet',
      driverCniNumber: 'Numéro CNI',
      driverPassportNumber: 'Numéro Passeport',
      idDeliveryPlace: 'Lieu de délivrance',
      idIssueDate: 'Date de délivrance',
      idExpiryDate: "Date d'expiration",
      vehicleInfo: 'Informations du véhicule',
      vehicleBrand: 'Marque',
      licensePlate: "Plaque d'immatriculation",
      totalSeats: 'Nombre total de sièges',
      share: 'Partager',
      shareMessage: 'Voici les détails de votre trajet Auto-stop',
      driver: 'Chauffeur',
      vehicle: 'Véhicule',
      rideDetails: 'Détails du trajet',
      availableSeats: 'Places disponibles',
      passengerInfo: 'Informations du passager'
    },
    en: {
      title: 'Ride details',
      passengers: 'Passengers',
      name: 'Name',
      cni: 'ID / Passport',
      expiryDate: 'Expiry date',
      deliveryPlace: 'Place of issue',
      phone: 'Phone',
      seats: 'Seats',
      paymentMethod: 'Payment method',
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
      price: 'Price per seat',
      driverInfo: 'Driver information',
      driverFullName: 'Full name',
      driverCniNumber: 'ID card number',
      driverPassportNumber: 'Passport number',
      idDeliveryPlace: 'Place of issue',
      idIssueDate: 'Issue date',
      idExpiryDate: 'Expiry date',
      vehicleInfo: 'Vehicle information',
      vehicleBrand: 'Brand',
      licensePlate: 'License plate',
      totalSeats: 'Total seats',
      share: 'Share',
      shareMessage: 'Here are the details of your Auto-stop ride',
      driver: 'Driver',
      vehicle: 'Vehicle',
      rideDetails: 'Ride details',
      availableSeats: 'Available seats',
      passengerInfo: 'Passenger information'
    },
    es: {
      title: 'Detalles del viaje',
      passengers: 'Pasajeros',
      name: 'Nombre',
      cni: 'DNI / Pasaporte',
      expiryDate: 'Fecha de caducidad',
      deliveryPlace: 'Lugar de expedición',
      phone: 'Teléfono',
      seats: 'Asientos',
      paymentMethod: 'Método de pago',
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
      price: 'Precio por asiento',
      driverInfo: 'Información del conductor',
      driverFullName: 'Nombre completo',
      driverCniNumber: 'Número de DNI',
      driverPassportNumber: 'Número de pasaporte',
      idDeliveryPlace: 'Lugar de expedición',
      idIssueDate: 'Fecha de expedición',
      idExpiryDate: 'Fecha de caducidad',
      vehicleInfo: 'Información del vehículo',
      vehicleBrand: 'Marca',
      licensePlate: 'Matrícula',
      totalSeats: 'Total de asientos',
      share: 'Compartir',
      shareMessage: 'Aquí están los detalles de tu viaje Auto-stop',
      driver: 'Conductor',
      vehicle: 'Vehículo',
      rideDetails: 'Detalles del viaje',
      availableSeats: 'Asientos disponibles',
      passengerInfo: 'Información del pasajero'
    },
    pt: {
      title: 'Detalhes da viagem',
      passengers: 'Passageiros',
      name: 'Nome',
      cni: 'BI / Passaporte',
      expiryDate: 'Data de validade',
      deliveryPlace: 'Local de emissão',
      phone: 'Telefone',
      seats: 'Lugares',
      paymentMethod: 'Método de pagamento',
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
      price: 'Preço por lugar',
      driverInfo: 'Informações do motorista',
      driverFullName: 'Nome completo',
      driverCniNumber: 'Número do BI',
      driverPassportNumber: 'Número do passaporte',
      idDeliveryPlace: 'Local de emissão',
      idIssueDate: 'Data de emissão',
      idExpiryDate: 'Data de validade',
      vehicleInfo: 'Informações do veículo',
      vehicleBrand: 'Marca',
      licensePlate: 'Matrícula',
      totalSeats: 'Total de lugares',
      share: 'Partilhar',
      shareMessage: 'Aqui estão os detalhes da sua viagem Auto-stop',
      driver: 'Motorista',
      vehicle: 'Veículo',
      rideDetails: 'Detalhes da viagem',
      availableSeats: 'Lugares disponíveis',
      passengerInfo: 'Informação do passageiro'
    }
  };

  const t = translations[language];

  useEffect(() => {
    fetchRideDetails();
    fetchPassengers();
    fetchDriverInfo();
  }, []);

  const fetchRideDetails = async () => {
    try {
      const response = await fetch(`${config.API_URL}/api/rides/${rideId}`, {
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
      const response = await fetch(`${config.API_URL}/api/rides/${rideId}/passengers`, {
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

  const fetchDriverInfo = async () => {
    if (!ride?.driverId) return;
    
    try {
      const response = await fetch(`${config.API_URL}/api/users/${ride.driverId}/public`);
      const data = await response.json();
      setDriverInfo(data.profile);
    } catch (error) {
      console.error('Erreur chargement info chauffeur:', error);
    }
  };

  const handleShare = async () => {
    const shareMessage = `
🚗 *${t.shareMessage}* 🚗

━━━━━━━━━━━━━━━━━━━━
📍 *${t.rideDetails}*
━━━━━━━━━━━━━━━━━━━━
📌 ${t.from}: ${ride?.departure}
📍 ${t.to}: ${ride?.destination}
📅 ${t.date}: ${formatDate(ride?.date)}
⏰ ${t.departureTime}: ${formatTime(ride?.date)}
💰 ${t.price}: ${ride?.price?.toLocaleString()} FCFA

━━━━━━━━━━━━━━━━━━━━
👤 *${t.driverInfo}*
━━━━━━━━━━━━━━━━━━━━
👨 ${t.driverFullName}: ${driverInfo?.name || ride?.driverName || 'Non spécifié'}
🆔 ${t.driverCniNumber}: ${driverInfo?.cniNumber || 'Non spécifié'}
📋 ${t.driverPassportNumber}: ${driverInfo?.passportNumber || 'Non spécifié'}
📍 ${t.idDeliveryPlace}: ${driverInfo?.idDeliveryPlace || 'Non spécifié'}
📅 ${t.idIssueDate}: ${driverInfo?.idIssueDate ? formatDate(driverInfo.idIssueDate) : 'Non spécifiée'}
⏰ ${t.idExpiryDate}: ${driverInfo?.idExpiryDate ? formatDate(driverInfo.idExpiryDate) : 'Non spécifiée'}

━━━━━━━━━━━━━━━━━━━━
🚘 *${t.vehicleInfo}*
━━━━━━━━━━━━━━━━━━━━
🔧 ${t.vehicleBrand}: ${ride?.vehicleBrand || 'Non spécifié'}
🔢 ${t.licensePlate}: ${ride?.licensePlate || 'Non spécifié'}
💺 ${t.totalSeats}: ${ride?.availableSeats ? parseInt(ride.availableSeats) + (ride?.bookings?.reduce((s, b) => s + b.seats, 0) || 0) : 'Non spécifié'} places

━━━━━━━━━━━━━━━━━━━━
📱 *Auto-stop - Covoiturage sécurisé*
━━━━━━━━━━━━━━━━━━━━
    `;

    try {
      await Share.share({
        message: shareMessage,
        title: t.shareMessage,
      });
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de partager');
    }
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

  // Calcul du nombre total de sièges
  const totalSeats = ride?.availableSeats 
    ? parseInt(ride.availableSeats) + (ride?.bookings?.reduce((s, b) => s + b.seats, 0) || 0)
    : 'Non spécifié';

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF5A5F" />
      </View>
    );
  }

  // ========== VUE POUR LE PASSAGER (affiche infos chauffeur + trajet + partage) ==========
  if (!isDriver) {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>📋 {t.title}</Text>

        {/* Section Trajet */}
        {ride && (
          <View style={styles.rideInfoCard}>
            <Text style={styles.sectionTitleSmall}>🚗 {t.rideInfo}</Text>
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
              💺 {t.availableSeats}: {ride.availableSeats} places
            </Text>
          </View>
        )}

        {/* Section Chauffeur */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitleSmall}>👤 {t.driverInfo}</Text>
          
          <Text style={styles.detailText}>
            👨 {t.driverFullName}: {driverInfo?.name || ride?.driverName || 'Non spécifié'}
          </Text>
          <Text style={styles.detailText}>
            🆔 {t.driverCniNumber}: {driverInfo?.cniNumber || 'Non spécifié'}
          </Text>
          <Text style={styles.detailText}>
            📋 {t.driverPassportNumber}: {driverInfo?.passportNumber || 'Non spécifié'}
          </Text>
          <Text style={styles.detailText}>
            📍 {t.idDeliveryPlace}: {driverInfo?.idDeliveryPlace || 'Non spécifié'}
          </Text>
          <Text style={styles.detailText}>
            📅 {t.idIssueDate}: {driverInfo?.idIssueDate ? formatDate(driverInfo.idIssueDate) : 'Non spécifiée'}
          </Text>
          <Text style={styles.detailText}>
            ⏰ {t.idExpiryDate}: {driverInfo?.idExpiryDate ? formatDate(driverInfo.idExpiryDate) : 'Non spécifiée'}
          </Text>
        </View>

        {/* Section Véhicule */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitleSmall}>🚘 {t.vehicleInfo}</Text>
          
          <Text style={styles.detailText}>
            🔧 {t.vehicleBrand}: {ride?.vehicleBrand || 'Non spécifié'}
          </Text>
          <Text style={styles.detailText}>
            🔢 {t.licensePlate}: {ride?.licensePlate || 'Non spécifié'}
          </Text>
          <Text style={styles.detailText}>
            💺 {t.totalSeats}: {totalSeats} places
          </Text>
        </View>

        {/* Bouton Partager */}
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Text style={styles.shareButtonText}>📤 {t.share}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← {t.back}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ========== VUE POUR LE CHAUFFEUR (affiche la liste des passagers) ==========
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📋 {t.title}</Text>

      {/* Section Trajet (résumé pour le chauffeur) */}
      {ride && (
        <View style={styles.rideInfoCard}>
          <Text style={styles.sectionTitleSmall}>🚗 {t.rideInfo}</Text>
          <Text style={styles.rideRoute}>
            {t.from} {ride.departure} {t.to} {ride.destination}
          </Text>
          <Text style={styles.rideDetail}>
            📅 {t.date}: {formatDate(ride.date)}
          </Text>
          <Text style={styles.rideDetail}>
            🚀 {t.departureTime}: {formatTime(ride.date)}
          </Text>
          <Text style={styles.rideDetail}>
            💰 {t.price}: {ride.price?.toLocaleString()} FCFA
          </Text>
          <Text style={styles.rideDetail}>
            💺 {t.availableSeats}: {ride.availableSeats} places disponibles
          </Text>
        </View>
      )}

      {/* Section Passagers avec toutes leurs infos */}
      <Text style={styles.sectionTitle}>👥 {t.passengers} ({passengers.length})</Text>

      {passengers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>👤</Text>
          <Text style={styles.emptyText}>{t.noPassengers}</Text>
        </View>
      ) : (
        passengers.map((passenger, index) => (
          <View key={index} style={styles.passengerCard}>
            <Text style={styles.passengerName}>{passenger.travelerName || passenger.bookerName}</Text>
            
            <View style={styles.passengerDetails}>
              <Text style={styles.detailText}>
                📞 {t.phone}: {passenger.bookerPhone || passenger.travelerPhone || 'Non spécifié'}
              </Text>
              <Text style={styles.detailText}>
                🆔 {t.cni}: {passenger.idNumber || 'Non spécifié'}
              </Text>
              <Text style={styles.detailText}>
                📅 {t.expiryDate}: {passenger.idExpiryDate ? formatDate(passenger.idExpiryDate) : 'Non spécifiée'}
              </Text>
              <Text style={styles.detailText}>
                📍 {t.deliveryPlace}: {passenger.idDeliveryPlace || 'Non spécifié'}
              </Text>
              <Text style={styles.detailText}>
                💺 {t.seats}: {passenger.seats || 1} place(s)
              </Text>
              <Text style={styles.detailText}>
                💳 {t.paymentMethod}: {passenger.paymentMethod?.replace('_', ' ') || 'Non spécifié'}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={styles.contactButton}
              onPress={() => {
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
              }}
            >
              <Text style={styles.contactButtonText}>💬 {t.contact}</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      {/* Commission Card */}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8', padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FF5A5F', textAlign: 'center', marginBottom: 20 },
  rideInfoCard: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  infoCard: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 10, marginBottom: 15 },
  sectionTitleSmall: { fontSize: 16, fontWeight: 'bold', color: '#FF5A5F', marginBottom: 10 },
  rideRoute: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  rideDetail: { fontSize: 14, color: '#666', marginBottom: 5 },
  detailText: { fontSize: 14, color: '#666', marginBottom: 5 },
  passengerCard: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  passengerName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  passengerDetails: { marginTop: 5 },
  contactButton: { backgroundColor: '#2196F3', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginTop: 10, alignItems: 'center' },
  contactButtonText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  shareButton: { backgroundColor: '#25D366', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, marginBottom: 10 },
  shareButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
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