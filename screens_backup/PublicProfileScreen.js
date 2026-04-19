import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Image, FlatList, Alert
} from 'react-native';

const API_URL = 'http://192.168.0.109:3000';

export default function PublicProfileScreen({ route, navigation }) {
  const { userId, user: currentUser, language = 'fr' } = route.params || {};
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const translations = {
    fr: {
      title: 'Profil du conducteur',
      experience: 'Expérience de conduite',
      memberSince: 'Membre depuis',
      trips: 'trajets effectués',
      about: 'À propos',
      preferences: 'Préférences',
      nonSmoker: 'Voiture non-fumeur',
      noPets: 'Pas d\'animaux',
      chat: 'Discussion possible',
      gallery: 'Galerie photos',
      noPhoto: 'Aucune photo',
      rating: 'Note',
      back: 'Retour',
      sendMessage: '💬 Envoyer un message'
    },
    en: {
      title: 'Driver profile',
      experience: 'Driving experience',
      memberSince: 'Member since',
      trips: 'trips completed',
      about: 'About',
      preferences: 'Preferences',
      nonSmoker: 'Non-smoking car',
      noPets: 'No pets',
      chat: 'Chat possible',
      gallery: 'Photo gallery',
      noPhoto: 'No photos',
      rating: 'Rating',
      back: 'Back',
      sendMessage: '💬 Send message'
    },
    es: {
      title: 'Perfil del conductor',
      experience: 'Experiencia de conducción',
      memberSince: 'Miembro desde',
      trips: 'viajes realizados',
      about: 'Acerca de',
      preferences: 'Preferencias',
      nonSmoker: 'Coche no fumador',
      noPets: 'Sin mascotas',
      chat: 'Posibilidad de hablar',
      gallery: 'Galería de fotos',
      noPhoto: 'Sin fotos',
      rating: 'Puntuación',
      back: 'Volver',
      sendMessage: '💬 Enviar mensaje'
    },
    pt: {
      title: 'Perfil do motorista',
      experience: 'Experiência de condução',
      memberSince: 'Membro desde',
      trips: 'viagens realizadas',
      about: 'Sobre',
      preferences: 'Preferências',
      nonSmoker: 'Carro não fumador',
      noPets: 'Sem animais',
      chat: 'Conversa possível',
      gallery: 'Galeria de fotos',
      noPhoto: 'Sem fotos',
      rating: 'Avaliação',
      back: 'Voltar',
      sendMessage: '💬 Enviar mensagem'
    }
  };

  const t = translations[language];

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${API_URL}/api/users/${userId}/public`);
      const data = await response.json();
      setProfile(data.profile);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const getExperienceText = (level) => {
    switch(level) {
      case '0-1': return '0 à 1 an';
      case '1-3': return '1 à 3 ans';
      case '3-5': return '3 à 5 ans';
      case '5-10': return '5 à 10 ans';
      case '10+': return 'Plus de 10 ans';
      default: return 'Non spécifié';
    }
  };

  const handleSendMessage = () => {
    if (!currentUser) {
      Alert.alert('Erreur', 'Vous devez être connecté pour envoyer un message');
      return;
    }
    
    if (currentUser.id === userId) {
      Alert.alert('Information', 'Vous ne pouvez pas vous envoyer un message à vous-même');
      return;
    }
    
    const conversationId = `user_${currentUser.id}_${userId}`;
    
    navigation.navigate('Chat', {
      user: currentUser,
      conversation: { id: conversationId, messages: [] },
      ride: {
        departure: 'Profil',
        destination: 'Discussion'
      },
      otherUser: {
        id: userId,
        name: profile?.name,
        photoUrl: profile?.photoUrl
      },
      language: language
    });
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
      {/* En-tête */}
      <View style={styles.header}>
        {profile?.photoUrl ? (
          <Image source={{ uri: profile.photoUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
        )}
        <View style={styles.nameContainer}>
          <Text style={styles.name}>{profile?.name}</Text>
          <TouchableOpacity style={styles.messageButton} onPress={handleSendMessage}>
            <Text style={styles.messageButtonText}>{t.sendMessage}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.ratingContainer}>
          <Text style={styles.ratingStar}>⭐</Text>
          <Text style={styles.rating}>{profile?.rating || '4.97'}</Text>
        </View>
      </View>

      {/* Statistiques */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{profile?.totalTrips || 0}</Text>
          <Text style={styles.statLabel}>{t.trips}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {profile?.registrationDate ? new Date(profile.registrationDate).getFullYear() : '2026'}
          </Text>
          <Text style={styles.statLabel}>{t.memberSince}</Text>
        </View>
      </View>

      {/* Expérience */}
      {profile?.experienceLevel && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚗 {t.experience}</Text>
          <Text style={styles.sectionText}>{getExperienceText(profile.experienceLevel)}</Text>
        </View>
      )}

      {/* À propos */}
      {profile?.bio && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 {t.about}</Text>
          <Text style={styles.sectionText}>{profile.bio}</Text>
        </View>
      )}

      {/* Préférences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚙️ {t.preferences}</Text>
        <View style={styles.preferencesList}>
          <View style={styles.preferenceItem}>
            <Text style={styles.preferenceIcon}>🚭</Text>
            <Text style={styles.preferenceText}>{t.nonSmoker}</Text>
          </View>
          <View style={styles.preferenceItem}>
            <Text style={styles.preferenceIcon}>🐾</Text>
            <Text style={styles.preferenceText}>{t.noPets}</Text>
          </View>
          <View style={styles.preferenceItem}>
            <Text style={styles.preferenceIcon}>💬</Text>
            <Text style={styles.preferenceText}>{t.chat}</Text>
          </View>
        </View>
      </View>

      {/* Galerie */}
      {profile?.gallery && profile.gallery.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📸 {t.gallery}</Text>
          <FlatList
            horizontal
            data={profile.gallery}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={styles.galleryImage} />
            )}
            showsHorizontalScrollIndicator={false}
          />
        </View>
      )}

      {/* Bouton retour */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>← {t.back}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#FF5A5F',
    padding: 30,
    paddingTop: 50,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: 'white',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    gap: 15,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  messageButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  messageButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  ratingStar: {
    fontSize: 18,
    color: '#FFD700',
    marginRight: 5,
  },
  rating: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    padding: 15,
    marginTop: -20,
    marginHorizontal: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF5A5F',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  section: {
    backgroundColor: 'white',
    margin: 15,
    padding: 15,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  sectionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  preferencesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
  },
  preferenceIcon: {
    fontSize: 14,
    marginRight: 5,
  },
  preferenceText: {
    fontSize: 12,
    color: '#666',
  },
  galleryImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginRight: 10,
  },
  backButton: {
    backgroundColor: '#f0f0f0',
    margin: 15,
    marginBottom: 30,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FF5A5F',
    fontSize: 16,
    fontWeight: 'bold',
  },
});