import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  FlatList, ActivityIndicator, RefreshControl, Image
} from 'react-native';
import CountryFlag from 'react-native-country-flag';
import RideCard from '../components/RideCard';

const API_URL = 'http://192.168.0.109:3000';

export default function HomeScreen({ route, navigation }) {
  const { user, language = 'fr', updateUser } = route.params || {};
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  console.log('🏠 HomeScreen - Utilisateur reçu:', user?.id);

  const translations = {
    fr: {
      welcome: 'Bonjour',
      publishRide: '🚗 Publier un trajet',
      publishSub: 'je suis conducteur',
      searchRide: '🔍 Rechercher un trajet',
      searchSub: 'je suis passager',
      myRides: '📋 Mes trajets',
      profile: '👤 Mon profil',
      messages: '💬 Messages',
      logout: '🚪 Se déconnecter',
      logoutConfirm: 'Voulez-vous vraiment vous déconnecter ?',
      yes: 'Oui',
      no: 'Non',
      availableRides: 'Trajets disponibles',
      noRides: 'Aucun trajet disponible pour le moment',
      refresh: 'Tirer pour actualiser'
    },
    en: {
      welcome: 'Hello',
      publishRide: '🚗 Publish a ride',
      publishSub: 'I am a driver',
      searchRide: '🔍 Search a ride',
      searchSub: 'I am a passenger',
      myRides: '📋 My rides',
      profile: '👤 My profile',
      messages: '💬 Messages',
      logout: '🚪 Logout',
      logoutConfirm: 'Do you really want to logout?',
      yes: 'Yes',
      no: 'No',
      availableRides: 'Available rides',
      noRides: 'No rides available at the moment',
      refresh: 'Pull to refresh'
    },
    es: {
      welcome: 'Hola',
      publishRide: '🚗 Publicar viaje',
      publishSub: 'soy conductor',
      searchRide: '🔍 Buscar viaje',
      searchSub: 'soy pasajero',
      myRides: '📋 Mis viajes',
      profile: '👤 Mi perfil',
      messages: '💬 Mensajes',
      logout: '🚪 Cerrar sesión',
      logoutConfirm: '¿Realmente quieres cerrar sesión?',
      yes: 'Sí',
      no: 'No',
      availableRides: 'Viajes disponibles',
      noRides: 'No hay viajes disponibles',
      refresh: 'Tirar para actualizar'
    },
    pt: {
      welcome: 'Olá',
      publishRide: '🚗 Publicar viagem',
      publishSub: 'sou motorista',
      searchRide: '🔍 Buscar viagem',
      searchSub: 'sou passageiro',
      myRides: '📋 Minhas viagens',
      profile: '👤 Meu perfil',
      messages: '💬 Mensagens',
      logout: '🚪 Sair',
      logoutConfirm: 'Deseja realmente sair?',
      yes: 'Sim',
      no: 'Não',
      availableRides: 'Viagens disponíveis',
      noRides: 'Nenhuma viagem disponível',
      refresh: 'Puxar para atualizar'
    }
  };

  const t = translations[language];

  const fetchRides = async () => {
    try {
      console.log('📡 Appel API:', `${API_URL}/api/rides`);
      const response = await fetch(`${API_URL}/api/rides`);
      const data = await response.json();
      console.log('📋 Données reçues:', data);
      console.log('📋 Type de données:', typeof data);
      
      // Vérifier que data.rides existe et est un tableau
      if (data && data.rides && Array.isArray(data.rides)) {
        console.log('📋 Nombre de trajets:', data.rides.length);
        setRides(data.rides);
      } else {
        console.log('⚠️ Format de données inattendu:', data);
        setRides([]);
      }
    } catch (error) {
      console.error('❌ Erreur chargement trajets:', error);
      setRides([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadUnreadCount = async () => {
    if (!user?.token) {
      console.log('⚠️ Pas de token, compteur non chargé');
      return;
    }
    
    try {
      console.log('📡 Appel API compteur:', `${API_URL}/api/messages/unread/total`);
      const response = await fetch(`${API_URL}/api/messages/unread/total`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await response.json();
      console.log('📬 Réponse compteur:', data);
      setUnreadMessagesCount(data.count || 0);
    } catch (error) {
      console.error('❌ Erreur chargement compteur messages:', error);
      setUnreadMessagesCount(0);
    }
  };

  useEffect(() => {
    fetchRides();
    if (user?.token) {
      loadUnreadCount();
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchRides();
      if (user?.token) {
        loadUnreadCount();
      }
    });
    return unsubscribe;
  }, [navigation, user?.token]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRides();
    if (user?.token) {
      loadUnreadCount();
    }
  };

  const handleRidePress = (rideData) => {
    navigation.navigate('Booking', { ride: rideData, user, language });
  };

  const handleDriverPress = (driverId) => {
    console.log('🔍 Clic sur conducteur ID:', driverId);
    if (driverId) {
      navigation.navigate('PublicProfile', { userId: driverId, user: user, language });
    } else {
      Alert.alert('Erreur', 'Impossible de charger le profil du conducteur');
    }
  };

  const handleOpenChat = (rideData) => {
    console.log('📱 Ouverture chat avec:', rideData);
    
    if (rideData.driverId === user?.id) {
      Alert.alert('Information', 'Vous ne pouvez pas discuter avec vous-même');
      return;
    }
    
    const tempConversation = {
      id: `user_${user?.id}_${rideData.driverId}`,
      messages: []
    };
    
    navigation.navigate('Chat', {
      user: user,
      conversation: tempConversation,
      ride: {
        id: rideData.rideId,
        departure: rideData.departure,
        destination: rideData.destination
      },
      otherUser: {
        id: rideData.driverId,
        name: rideData.driverName,
        photoUrl: rideData.driverPhoto || null
      },
      language: language
    });
  };

  const handleLogout = () => {
    Alert.alert(
      t.logout,
      t.logoutConfirm,
      [
        { text: t.no, style: 'cancel' },
        { text: t.yes, onPress: () => navigation.replace('Welcome') }
      ]
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
      <TouchableOpacity style={styles.header} onPress={() => navigation.navigate('Profile', { user, language })}>
        {user?.photoUrl ? (
          <Image source={{ uri: user.photoUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
        )}
        <View>
          <Text style={styles.welcomeText}>{t.welcome} 👋</Text>
          <Text style={styles.userName}>{user?.name || 'Invité'}</Text>
        </View>
        <Text style={styles.editIcon}>✎</Text>
      </TouchableOpacity>

      <View style={styles.ridesContainer}>
        <Text style={styles.sectionTitle}>{t.availableRides}</Text>
        
        {rides.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🚗💨</Text>
            <Text style={styles.emptyText}>{t.noRides}</Text>
          </View>
        ) : (
          <FlatList
            data={rides}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <RideCard 
                ride={item} 
                onPress={handleRidePress} 
                onPressDriver={handleDriverPress}
                onPressChat={handleOpenChat}
                currentUserId={user?.id}
                language={language} 
              />
            )}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF5A5F']} />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <View style={styles.quickMenu}>
        <TouchableOpacity style={styles.quickButton} onPress={() => navigation.navigate('PublishRide', { user, language })}>
          <Text style={styles.quickButtonText}>🚗</Text>
          <Text style={styles.quickButtonLabel}>{t.publishRide.split(' ')[0]}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.quickButton} onPress={() => navigation.navigate('SearchRide', { user, language })}>
          <Text style={styles.quickButtonText}>🔍</Text>
          <Text style={styles.quickButtonLabel}>Search</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.quickButton} onPress={() => navigation.navigate('MyRides', { user, language })}>
          <Text style={styles.quickButtonText}>📋</Text>
          <Text style={styles.quickButtonLabel}>My rides</Text>
          {unreadMessagesCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.quickButton} onPress={() => navigation.navigate('Conversations', { user, language })}>
          <Text style={styles.quickButtonText}>💬</Text>
          <Text style={styles.quickButtonLabel}>{t.messages}</Text>
          {unreadMessagesCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.quickButton} onPress={() => navigation.navigate('Profile', { user, language })}>
          <Text style={styles.quickButtonText}>👤</Text>
          <Text style={styles.quickButtonLabel}>Profile</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.quickButton} onPress={handleLogout}>
          <Text style={styles.quickButtonText}>🚪</Text>
          <Text style={styles.quickButtonLabel}>Exit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF5A5F',
    padding: 20,
    paddingTop: 50,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    borderWidth: 2,
    borderColor: 'white',
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    fontSize: 25,
  },
  editIcon: {
    marginLeft: 'auto',
    fontSize: 18,
    color: 'white',
  },
  welcomeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  ridesContainer: {
    flex: 1,
    paddingTop: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 15,
    marginBottom: 10,
  },
  loader: {
    marginTop: 50,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyEmoji: {
    fontSize: 50,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  quickMenu: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  quickButton: {
    alignItems: 'center',
    paddingHorizontal: 10,
    position: 'relative',
  },
  quickButtonText: {
    fontSize: 22,
  },
  quickButtonLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
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
});