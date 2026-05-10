import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Switch
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';

const API_URL = 'http://192.168.0.109:3000';

export default function PublishRideScreen({ route, navigation }) {
  const { user, language = 'fr' } = route.params || {};

  // États du formulaire
  const [departure, setDeparture] = useState('');
  const [meetingPoint, setMeetingPoint] = useState('');
  const [destination, setDestination] = useState('');
  const [dropoffPoint, setDropoffPoint] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [availableSeats, setAvailableSeats] = useState('1');
  const [price, setPrice] = useState('');
  const [vehicleType, setVehicleType] = useState('MOTO');
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [arrivalTime, setArrivalTime] = useState(null);
  const [showArrivalPicker, setShowArrivalPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);

  const translations = {
    fr: {
      title: 'Publier un trajet',
      departure: 'Départ (ville)',
      meetingPoint: 'Point de rencontre',
      destination: 'Destination (ville)',
      dropoffPoint: 'Point de dépôt',
      date: 'Date',
      time: 'Heure de départ',
      seats: 'Places disponibles',
      price: 'Prix (FCFA)',
      vehicleType: 'Type de véhicule',
      vehicleBrand: 'Marque du véhicule',
      licensePlate: 'Plaque d\'immatriculation',
      estimatedDuration: 'Durée estimée (minutes)',
      arrivalTime: 'Heure d\'arrivée estimée',
      recurring: 'Trajet récurrent',
      publish: 'Publier le trajet',
      success: 'Trajet publié !',
      error: 'Erreur',
      fillFields: 'Veuillez remplir tous les champs obligatoires',
      vehicleTypes: {
        MOTO: '🏍️ Moto',
        TAXI: '🚖 Taxi',
        MINIBUS: '🚐 Mini bus',
        BUS: '🚌 Bus',
        COASTER: '🚍 Coaster',
        CAMION: '🚛 Camion',
        AUTRE: '🚗 Autre'
      }
    },
    en: {
      title: 'Publish a ride',
      departure: 'Departure (city)',
      meetingPoint: 'Meeting point',
      destination: 'Destination (city)',
      dropoffPoint: 'Drop-off point',
      date: 'Date',
      time: 'Departure time',
      seats: 'Available seats',
      price: 'Price (FCFA)',
      vehicleType: 'Vehicle type',
      vehicleBrand: 'Vehicle brand',
      licensePlate: 'License plate',
      estimatedDuration: 'Estimated duration (minutes)',
      arrivalTime: 'Estimated arrival time',
      recurring: 'Recurring ride',
      publish: 'Publish ride',
      success: 'Ride published!',
      error: 'Error',
      fillFields: 'Please fill all required fields',
      vehicleTypes: {
        MOTO: '🏍️ Moto',
        TAXI: '🚖 Taxi',
        MINIBUS: '🚐 Mini bus',
        BUS: '🚌 Bus',
        COASTER: '🚍 Coaster',
        CAMION: '🚛 Truck',
        AUTRE: '🚗 Other'
      }
    },
    es: {
      title: 'Publicar viaje',
      departure: 'Salida (ciudad)',
      meetingPoint: 'Punto de encuentro',
      destination: 'Destino (ciudad)',
      dropoffPoint: 'Punto de entrega',
      date: 'Fecha',
      time: 'Hora de salida',
      seats: 'Asientos disponibles',
      price: 'Precio (FCFA)',
      vehicleType: 'Tipo de vehículo',
      vehicleBrand: 'Marca del vehículo',
      licensePlate: 'Matrícula',
      estimatedDuration: 'Duración estimada (minutos)',
      arrivalTime: 'Hora de llegada estimada',
      recurring: 'Viaje recurrente',
      publish: 'Publicar viaje',
      success: '¡Viaje publicado!',
      error: 'Error',
      fillFields: 'Complete todos los campos obligatorios',
      vehicleTypes: {
        MOTO: '🏍️ Moto',
        TAXI: '🚖 Taxi',
        MINIBUS: '🚐 Mini bus',
        BUS: '🚌 Bus',
        COASTER: '🚍 Coaster',
        CAMION: '🚛 Camión',
        AUTRE: '🚗 Otro'
      }
    },
    pt: {
      title: 'Publicar viagem',
      departure: 'Partida (cidade)',
      meetingPoint: 'Ponto de encontro',
      destination: 'Destino (cidade)',
      dropoffPoint: 'Ponto de entrega',
      date: 'Data',
      time: 'Hora de partida',
      seats: 'Lugares disponíveis',
      price: 'Preço (FCFA)',
      vehicleType: 'Tipo de veículo',
      vehicleBrand: 'Marca do veículo',
      licensePlate: 'Matrícula',
      estimatedDuration: 'Duração estimada (minutos)',
      arrivalTime: 'Hora de chegada estimada',
      recurring: 'Viagem recorrente',
      publish: 'Publicar viagem',
      success: 'Viagem publicada!',
      error: 'Erro',
      fillFields: 'Preencha todos os campos obrigatórios',
      vehicleTypes: {
        MOTO: '🏍️ Moto',
        TAXI: '🚖 Táxi',
        MINIBUS: '🚐 Mini bus',
        BUS: '🚌 Autocarro',
        COASTER: '🚍 Coaster',
        CAMION: '🚛 Camião',
        AUTRE: '🚗 Outro'
      }
    }
  };

  const t = translations[language];

  const handlePublish = async () => {
    if (!departure || !destination || !availableSeats || !price || !vehicleBrand) {
      Alert.alert(t.error, t.fillFields);
      return;
    }

    setLoading(true);
    try {
      console.log('📝 Envoi du trajet:', { departure, destination, price, licensePlate });
      console.log('🔑 Token:', user?.token);

      const response = await fetch(`${API_URL}/api/rides`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          departure,
          meetingPoint,
          destination,
          dropoffPoint,
          date: date.toISOString(),
          availableSeats: parseInt(availableSeats),
          price: parseFloat(price),
          vehicleType,
          vehicleBrand,
          licensePlate,
          estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : null,
          arrivalTime: arrivalTime ? arrivalTime.toISOString() : null,
          isRecurring
        }),
      });

      const data = await response.json();
      console.log('📥 Réponse:', data);

      if (response.ok) {
        Alert.alert(t.success, 'Trajet publié avec succès !');
        navigation.goBack();
      } else {
        Alert.alert(t.error, data.error || 'Erreur inconnue');
      }
    } catch (error) {
      console.error('❌ Erreur:', error);
      Alert.alert(t.error, 'Connexion au serveur impossible');
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(date);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setDate(newDate);
    }
  };

  const onArrivalTimeChange = (event, selectedTime) => {
    setShowArrivalPicker(false);
    if (selectedTime) {
      setArrivalTime(selectedTime);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🚗 {t.title}</Text>

      {/* Départ */}
      <Text style={styles.label}>{t.departure} *</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Douala"
        value={departure}
        onChangeText={setDeparture}
      />

      <Text style={styles.label}>{t.meetingPoint}</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Rond-point Deïdo, Carrefour Bessengue..."
        value={meetingPoint}
        onChangeText={setMeetingPoint}
      />

      {/* Destination */}
      <Text style={styles.label}>{t.destination} *</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Yaoundé"
        value={destination}
        onChangeText={setDestination}
      />

      <Text style={styles.label}>{t.dropoffPoint}</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Mvan, Nlongkak, Elig-Essono..."
        value={dropoffPoint}
        onChangeText={setDropoffPoint}
      />

      {/* Date et Heure de départ */}
      <View style={styles.row}>
        <View style={styles.halfColumn}>
          <Text style={styles.label}>{t.date} *</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateButtonText}>{date.toLocaleDateString()}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.halfColumn}>
          <Text style={styles.label}>{t.time} *</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowTimePicker(true)}>
            <Text style={styles.dateButtonText}>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}
      {showTimePicker && (
        <DateTimePicker
          value={date}
          mode="time"
          display="default"
          onChange={onTimeChange}
        />
      )}

      {/* Places et Prix */}
      <View style={styles.row}>
        <View style={styles.halfColumn}>
          <Text style={styles.label}>{t.seats} *</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={availableSeats}
            onChangeText={setAvailableSeats}
          />
        </View>
        <View style={styles.halfColumn}>
          <Text style={styles.label}>{t.price} *</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="0"
            value={price}
            onChangeText={setPrice}
          />
        </View>
      </View>

      {/* Type de véhicule */}
      <Text style={styles.label}>{t.vehicleType}</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={vehicleType}
          onValueChange={(itemValue) => setVehicleType(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label={t.vehicleTypes.MOTO} value="MOTO" />
          <Picker.Item label={t.vehicleTypes.TAXI} value="TAXI" />
          <Picker.Item label={t.vehicleTypes.MINIBUS} value="MINIBUS" />
          <Picker.Item label={t.vehicleTypes.BUS} value="BUS" />
          <Picker.Item label={t.vehicleTypes.COASTER} value="COASTER" />
          <Picker.Item label={t.vehicleTypes.CAMION} value="CAMION" />
          <Picker.Item label={t.vehicleTypes.AUTRE} value="AUTRE" />
        </Picker>
      </View>

      {/* Marque du véhicule */}
      <Text style={styles.label}>{t.vehicleBrand} *</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Toyota, Suzuki, Hyundai..."
        value={vehicleBrand}
        onChangeText={setVehicleBrand}
      />

      {/* Plaque d'immatriculation */}
      <Text style={styles.label}>{t.licensePlate}</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: LT 123 AB / CE 456 CD"
        value={licensePlate}
        onChangeText={setLicensePlate}
      />

      {/* Durée estimée */}
      <Text style={styles.label}>{t.estimatedDuration}</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: 240 (pour 4 heures)"
        keyboardType="numeric"
        value={estimatedDuration}
        onChangeText={setEstimatedDuration}
      />

      {/* Heure d'arrivée estimée */}
      <Text style={styles.label}>{t.arrivalTime}</Text>
      <TouchableOpacity style={styles.dateButton} onPress={() => setShowArrivalPicker(true)}>
        <Text style={styles.dateButtonText}>
          {arrivalTime 
            ? arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
            : 'Sélectionner une heure'}
        </Text>
      </TouchableOpacity>

      {showArrivalPicker && (
        <DateTimePicker
          value={arrivalTime || new Date()}
          mode="time"
          display="default"
          onChange={onArrivalTimeChange}
        />
      )}

      {/* Trajet récurrent */}
      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>{t.recurring}</Text>
        <Switch
          value={isRecurring}
          onValueChange={setIsRecurring}
          trackColor={{ false: '#ddd', true: '#FF5A5F' }}
        />
      </View>

      {/* Bouton publier */}
      <TouchableOpacity style={styles.publishButton} onPress={handlePublish} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.publishButtonText}>{t.publish}</Text>
        )}
      </TouchableOpacity>
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
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfColumn: {
    flex: 1,
    marginRight: 10,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f8f8f8',
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    backgroundColor: '#f8f8f8',
    marginBottom: 10,
  },
  picker: {
    height: 50,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
    paddingVertical: 10,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  publishButton: {
    backgroundColor: '#FF5A5F',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 40,
  },
  publishButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});