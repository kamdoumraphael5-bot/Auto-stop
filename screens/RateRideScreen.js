import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, TextInput
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.0.109:3000';

export default function RateRideScreen({ route, navigation }) {
  const { rideId, driverName, language = 'fr' } = route.params || {};
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Charger l'utilisateur depuis AsyncStorage
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUser({ ...parsedUser, token });
        }
      } catch (error) {
        console.error('Erreur chargement utilisateur:', error);
      }
    };
    loadUser();
  }, []);

  const translations = {
    fr: {
      title: 'Noter votre trajet',
      noRides: 'Aucun trajet à noter',
      selectRide: 'Sélectionnez un trajet à noter',
      rating: 'Votre note',
      comment: 'Votre commentaire',
      commentPlaceholder: 'Partagez votre expérience...',
      submit: 'Envoyer mon avis',
      thanks: 'Merci pour votre avis !',
      error: 'Erreur',
      stars: ['Très mauvais', 'Mauvais', 'Moyen', 'Bien', 'Excellent'],
      back: 'Retour',
      driver: 'Conducteur'
    },
    en: {
      title: 'Rate your ride',
      noRides: 'No rides to rate',
      selectRide: 'Select a ride to rate',
      rating: 'Your rating',
      comment: 'Your comment',
      commentPlaceholder: 'Share your experience...',
      submit: 'Submit review',
      thanks: 'Thank you for your review!',
      error: 'Error',
      stars: ['Very bad', 'Bad', 'Average', 'Good', 'Excellent'],
      back: 'Back',
      driver: 'Driver'
    },
    es: {
      title: 'Calificar viaje',
      noRides: 'No hay viajes para calificar',
      selectRide: 'Seleccione un viaje',
      rating: 'Tu calificación',
      comment: 'Tu comentario',
      commentPlaceholder: 'Comparte tu experiencia...',
      submit: 'Enviar opinión',
      thanks: '¡Gracias por tu opinión!',
      error: 'Error',
      stars: ['Muy malo', 'Malo', 'Normal', 'Bueno', 'Excelente'],
      back: 'Volver',
      driver: 'Conductor'
    },
    pt: {
      title: 'Avaliar viagem',
      noRides: 'Nenhuma viagem para avaliar',
      selectRide: 'Selecione uma viagem',
      rating: 'Sua avaliação',
      comment: 'Seu comentário',
      commentPlaceholder: 'Compartilhe sua experiência...',
      submit: 'Enviar avaliação',
      thanks: 'Obrigado pela sua avaliação!',
      error: 'Erro',
      stars: ['Muito mau', 'Mau', 'Normal', 'Bom', 'Excelente'],
      back: 'Voltar',
      driver: 'Motorista'
    }
  };

  const t = translations[language];

  useEffect(() => {
    if (user?.token) {
      fetchRateableRides();
    }
  }, [user]);

  const fetchRateableRides = async () => {
    if (!user?.token) return;
    
    try {
      const response = await fetch(`${API_URL}/api/rides/rateable`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const data = await response.json();
      setBookings(data.bookings || []);
      
      // Si rideId est passé, sélectionner directement la réservation correspondante
      if (rideId && data.bookings) {
        const matchingBooking = data.bookings.find(b => b.ride.id === rideId);
        if (matchingBooking) {
          setSelectedBooking(matchingBooking);
        }
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert(t.error, 'Veuillez sélectionner une note');
      return;
    }
    
    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/rides/${selectedBooking.ride.id}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          rating: rating,
          comment: comment
        })
      });
      
      if (response.ok) {
        Alert.alert(t.thanks, t.thanks);
        navigation.goBack();
      } else {
        const data = await response.json();
        Alert.alert(t.error, data.error);
      }
    } catch (error) {
      Alert.alert(t.error, 'Connexion au serveur impossible');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString(language === 'fr' ? 'fr-FR' : language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'pt-PT');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF5A5F" />
      </View>
    );
  }

  // Si on a un selectedBooking (directement depuis rideId ou sélection manuelle)
  if (selectedBooking) {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>⭐ {t.rating}</Text>
        
        <View style={styles.rideCard}>
          <Text style={styles.rideRoute}>
            {selectedBooking.ride.departure} → {selectedBooking.ride.destination}
          </Text>
          <Text style={styles.rideDate}>📅 {formatDate(selectedBooking.ride.date)}</Text>
          <Text style={styles.rideDriver}>👤 {t.driver}: {selectedBooking.ride.driver.name}</Text>
        </View>
        
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              style={styles.starButton}
              onPress={() => setRating(star)}
            >
              <Text style={[styles.star, rating >= star && styles.starSelected]}>
                {rating >= star ? '★' : '☆'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.ratingLabel}>{t.stars[rating - 1] || ''}</Text>
        
        <Text style={styles.commentLabel}>{t.comment}</Text>
        <TextInput
          style={styles.commentInput}
          placeholder={t.commentPlaceholder}
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={4}
        />
        
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
          <Text style={styles.submitButtonText}>{submitting ? '...' : t.submit}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButtonText}>← {t.back}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (bookings.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyEmoji}>⭐</Text>
        <Text style={styles.emptyText}>{t.noRides}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← {t.back}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>⭐ {t.title}</Text>
      <Text style={styles.subtitle}>{t.selectRide}</Text>
      
      {bookings.map((booking) => (
        <TouchableOpacity
          key={booking.id}
          style={styles.rideCard}
          onPress={() => setSelectedBooking(booking)}
        >
          <Text style={styles.rideRoute}>
            {booking.ride.departure} → {booking.ride.destination}
          </Text>
          <Text style={styles.rideDate}>📅 {formatDate(booking.ride.date)}</Text>
          <Text style={styles.rideDriver}>👤 {t.driver}: {booking.ride.driver.name}</Text>
          <Text style={styles.rateButton}>⭐ {t.title} →</Text>
        </TouchableOpacity>
      ))}
      
      <TouchableOpacity style={styles.backButtonFull} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>← {t.back}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8', padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FF5A5F', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 20 },
  rideCard: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  rideRoute: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  rideDate: { fontSize: 14, color: '#666', marginBottom: 5 },
  rideDriver: { fontSize: 14, color: '#666', marginBottom: 10 },
  rateButton: { color: '#FF5A5F', fontWeight: 'bold', marginTop: 5 },
  starsContainer: { flexDirection: 'row', justifyContent: 'center', marginVertical: 20 },
  starButton: { paddingHorizontal: 8 },
  star: { fontSize: 45, color: '#ddd' },
  starSelected: { color: '#FFD700' },
  ratingLabel: { textAlign: 'center', fontSize: 14, color: '#666', marginBottom: 20 },
  commentLabel: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  commentInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 15, fontSize: 16, backgroundColor: '#f8f8f8', marginBottom: 20, minHeight: 100, textAlignVertical: 'top' },
  submitButton: { backgroundColor: '#4CAF50', padding: 16, borderRadius: 12, alignItems: 'center' },
  submitButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  cancelButton: { backgroundColor: '#f0f0f0', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  cancelButtonText: { color: '#FF5A5F', fontSize: 16, fontWeight: 'bold' },
  backButton: { marginTop: 20, backgroundColor: '#f0f0f0', padding: 12, borderRadius: 10, alignItems: 'center' },
  backButtonFull: { backgroundColor: '#f0f0f0', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, marginBottom: 30 },
  backButtonText: { color: '#FF5A5F', fontSize: 16, fontWeight: 'bold' },
  emptyEmoji: { fontSize: 50, marginBottom: 10 },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 20 }
});