import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, FlatList
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import RideCard from '../components/RideCard';
import config from '../config';
//const API_URL = 'http://192.168.0.109:3000';

export default function SearchRideScreen({ route, navigation }) {
  const { user, language = 'fr' } = route.params || {};
  
  const [departure, setDeparture] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [minSeats, setMinSeats] = useState('1');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const translations = {
    fr: {
      title: 'Rechercher un trajet',
      departure: 'Départ (ville)',
      destination: 'Destination (ville)',
      date: 'Date de voyage',
      seats: 'Nombre de places',
      search: '🔍 Rechercher',
      results: 'Résultats',
      noResults: 'Aucun trajet trouvé',
      searching: 'Recherche en cours...',
      fillFields: 'Veuillez remplir le départ et la destination'
    },
    en: {
      title: 'Search a ride',
      departure: 'Departure (city)',
      destination: 'Destination (city)',
      date: 'Travel date',
      seats: 'Number of seats',
      search: '🔍 Search',
      results: 'Results',
      noResults: 'No rides found',
      searching: 'Searching...',
      fillFields: 'Please fill departure and destination'
    },
    es: {
      title: 'Buscar viaje',
      departure: 'Salida (ciudad)',
      destination: 'Destino (ciudad)',
      date: 'Fecha de viaje',
      seats: 'Número de asientos',
      search: '🔍 Buscar',
      results: 'Resultados',
      noResults: 'No se encontraron viajes',
      searching: 'Buscando...',
      fillFields: 'Complete salida y destino'
    },
    pt: {
      title: 'Buscar viagem',
      departure: 'Partida (cidade)',
      destination: 'Destino (cidade)',
      date: 'Data de viagem',
      seats: 'Número de lugares',
      search: '🔍 Buscar',
      results: 'Resultados',
      noResults: 'Nenhuma viagem encontrada',
      searching: 'Buscando...',
      fillFields: 'Preencha partida e destino'
    }
  };

  const t = translations[language];

  const handleSearch = async () => {
    // Vérifier que les champs sont remplis
    if (!departure || departure.trim() === '') {
      Alert.alert('Info', t.fillFields);
      return;
    }
    if (!destination || destination.trim() === '') {
      Alert.alert('Info', t.fillFields);
      return;
    }

    setLoading(true);
    setSearched(true);
    
    try {
      // Formater la date pour l'URL
      const formattedDate = date.toISOString().split('T')[0];
      
      // Construire l'URL avec les paramètres
      const url = `${API_URL}/api/rides/search?departure=${encodeURIComponent(departure.trim())}&destination=${encodeURIComponent(destination.trim())}&minSeats=${minSeats}&date=${formattedDate}`;
      
      console.log('🔍 Recherche URL:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('📋 Résultats:', data.rides?.length || 0);
      
      setResults(data.rides || []);
    } catch (error) {
      console.error('Erreur recherche:', error);
      Alert.alert('Erreur', 'Impossible de rechercher les trajets');
    } finally {
      setLoading(false);
    }
  };

  const handleRidePress = (rideData) => {
    navigation.navigate('Booking', { ride: rideData, user, language });
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔍 {t.title}</Text>

      {/* Départ */}
      <Text style={styles.label}>{t.departure}</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Douala, Yaoundé..."
        value={departure}
        onChangeText={setDeparture}
      />

      {/* Destination */}
      <Text style={styles.label}>{t.destination}</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Douala, Yaoundé..."
        value={destination}
        onChangeText={setDestination}
      />

      {/* Date */}
      <Text style={styles.label}>{t.date}</Text>
      <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
        <Text style={styles.dateButtonText}>{date.toLocaleDateString()}</Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}

      {/* Nombre de places */}
      <Text style={styles.label}>{t.seats}</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={minSeats}
        onChangeText={setMinSeats}
        placeholder="1"
      />

      {/* Bouton rechercher */}
      <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
        <Text style={styles.searchButtonText}>{t.search}</Text>
      </TouchableOpacity>

      {/* Résultats */}
      {searched && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>📋 {t.results} ({results.length})</Text>
          
          {loading ? (
            <ActivityIndicator size="large" color="#FF5A5F" style={styles.loader} />
          ) : results.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🚗💨</Text>
              <Text style={styles.emptyText}>{t.noResults}</Text>
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <RideCard 
                  ride={item} 
                  onPress={handleRidePress} 
                  language={language} 
                />
              )}
              scrollEnabled={false}
            />
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF5A5F',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
    backgroundColor: '#f8f8f8',
    marginBottom: 15,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f8f8f8',
    alignItems: 'center',
    marginBottom: 15,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  searchButton: {
    backgroundColor: '#FF5A5F',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  searchButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultsContainer: {
    marginTop: 10,
    marginBottom: 30,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  loader: {
    marginTop: 30,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 30,
    padding: 20,
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
});