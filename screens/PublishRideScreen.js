import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Switch
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import config from '../config';

export default function PublishRideScreen({ route, navigation }) {
  const { user, language = 'fr' } = route.params || {};

  // États du formulaire (trajet)
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
  const [durationHours, setDurationHours] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [arrivalTime, setArrivalTime] = useState(null);
  const [showArrivalPicker, setShowArrivalPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);

  // ========== CHAMPS POUR PAIEMENT HYBRIDE ==========
  const [onlinePaymentPercent, setOnlinePaymentPercent] = useState('100'); // 100, 50, 25, 10
  const [displayCurrency, setDisplayCurrency] = useState('XAF');
  
  // ========== NOUVEAUX CHAMPS POUR MODE DE RÉCEPTION ==========
  const [receptionMethod, setReceptionMethod] = useState('mobile_money'); // mobile_money / bank_card
  const [mobileMoneyNumber, setMobileMoneyNumber] = useState('');
  const [bankCardNumber, setBankCardNumber] = useState('');
  const [bankCardExpiry, setBankCardExpiry] = useState('');
  const [bankCardCvv, setBankCardCvv] = useState('');

  // États pour les informations du conducteur
  const [driverFullName, setDriverFullName] = useState(user?.name || '');
  const [driverCniNumber, setDriverCniNumber] = useState('');
  const [driverPassportNumber, setDriverPassportNumber] = useState('');
  const [idIssueDate, setIdIssueDate] = useState(null);
  const [showIssueDatePicker, setShowIssueDatePicker] = useState(false);
  const [idExpiryDate, setIdExpiryDate] = useState(null);
  const [showExpiryDatePicker, setShowExpiryDatePicker] = useState(false);
  const [idDeliveryPlace, setIdDeliveryPlace] = useState('');

  // ========== FONCTIONS DE CONVERSION UTC ==========
  const toUTC = (localDate) => {
    return new Date(localDate.getTime() - (localDate.getTimezoneOffset() * 60 * 1000));
  };

  const fromUTCToLocal = (utcDate) => {
    return new Date(utcDate.getTime() + (utcDate.getTimezoneOffset() * 60 * 1000));
  };

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
      duration: 'Durée du trajet',
      hours: 'Heures',
      minutes: 'Minutes',
      arrivalTime: 'Heure d\'arrivée estimée',
      recurring: 'Trajet récurrent',
      publish: 'Publier le trajet',
      success: 'Trajet publié !',
      error: 'Erreur',
      fillFields: 'Veuillez remplir tous les champs obligatoires',
      driverInfo: 'Informations du conducteur',
      driverFullName: 'Nom complet du conducteur',
      driverCniNumber: 'Numéro de CNI',
      driverPassportNumber: 'Numéro de passeport',
      idIssueDate: 'Date de délivrance',
      idExpiryDate: "Date d'expiration",
      idDeliveryPlace: 'Lieu de délivrance',
      // Paiement hybride
      onlinePayment: 'Paiement en ligne',
      onlinePaymentPercent: 'Pourcentage à payer en ligne',
      onlinePaymentHelp: 'Le reste sera payé en espèces au conducteur',
      displayCurrency: 'Devise d\'affichage',
      percent100: '100% (Paiement complet en ligne)',
      percent50: '50% (Moitié en ligne, moitié espèces)',
      percent25: '25% (Acompte, 75% espèces)',
      percent10: '10% (Petit acompte, 90% espèces)',
      // Mode de réception (NOUVEAU)
      receptionMethod: '📱 Mode de réception de l\'argent',
      mobileMoney: '📱 Mobile Money',
      bankCard: '💳 Carte bancaire',
      mobileMoneyPlaceholder: 'Numéro Mobile Money (ex: 690001122)',
      cardNumberPlaceholder: 'Numéro de carte',
      cardExpiryPlaceholder: 'MM/YY',
      cardCvvPlaceholder: 'CVV',
      currencies: {
        XAF: 'Franc CFA (XAF)',
        XOF: 'Franc CFA (XOF)',
        EUR: 'Euro (EUR)',
        USD: 'Dollar US (USD)'
      },
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
      duration: 'Trip duration',
      hours: 'Hours',
      minutes: 'Minutes',
      arrivalTime: 'Estimated arrival time',
      recurring: 'Recurring ride',
      publish: 'Publish ride',
      success: 'Ride published!',
      error: 'Error',
      fillFields: 'Please fill all required fields',
      driverInfo: 'Driver information',
      driverFullName: 'Driver full name',
      driverCniNumber: 'ID card number',
      driverPassportNumber: 'Passport number',
      idIssueDate: 'Issue date',
      idExpiryDate: 'Expiry date',
      idDeliveryPlace: 'Place of issue',
      onlinePayment: 'Online payment',
      onlinePaymentPercent: 'Percentage to pay online',
      onlinePaymentHelp: 'The rest will be paid in cash to the driver',
      displayCurrency: 'Display currency',
      percent100: '100% (Full online payment)',
      percent50: '50% (Half online, half cash)',
      percent25: '25% (Deposit, 75% cash)',
      percent10: '10% (Small deposit, 90% cash)',
      receptionMethod: '📱 Money reception method',
      mobileMoney: '📱 Mobile Money',
      bankCard: '💳 Bank card',
      mobileMoneyPlaceholder: 'Mobile Money number (ex: 690001122)',
      cardNumberPlaceholder: 'Card number',
      cardExpiryPlaceholder: 'MM/YY',
      cardCvvPlaceholder: 'CVV',
      currencies: {
        XAF: 'CFA Franc (XAF)',
        XOF: 'CFA Franc (XOF)',
        EUR: 'Euro (EUR)',
        USD: 'US Dollar (USD)'
      },
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
      duration: 'Duración del viaje',
      hours: 'Horas',
      minutes: 'Minutos',
      arrivalTime: 'Hora de llegada estimada',
      recurring: 'Viaje recurrente',
      publish: 'Publicar viaje',
      success: '¡Viaje publicado!',
      error: 'Error',
      fillFields: 'Complete todos los campos obligatorios',
      driverInfo: 'Información del conductor',
      driverFullName: 'Nombre completo del conductor',
      driverCniNumber: 'Número de documento de identidad',
      driverPassportNumber: 'Número de pasaporte',
      idIssueDate: 'Fecha de expedición',
      idExpiryDate: 'Fecha de caducidad',
      idDeliveryPlace: 'Lugar de expedición',
      onlinePayment: 'Pago en línea',
      onlinePaymentPercent: 'Porcentaje a pagar en línea',
      onlinePaymentHelp: 'El resto se pagará en efectivo al conductor',
      displayCurrency: 'Moneda de visualización',
      percent100: '100% (Pago completo en línea)',
      percent50: '50% (Mitad en línea, mitad efectivo)',
      percent25: '25% (Depósito, 75% efectivo)',
      percent10: '10% (Pequeño depósito, 90% efectivo)',
      receptionMethod: '📱 Método de recepción del dinero',
      mobileMoney: '📱 Dinero móvil',
      bankCard: '💳 Tarjeta bancaria',
      mobileMoneyPlaceholder: 'Número Mobile Money (ej: 690001122)',
      cardNumberPlaceholder: 'Número de tarjeta',
      cardExpiryPlaceholder: 'MM/AA',
      cardCvvPlaceholder: 'CVV',
      currencies: {
        XAF: 'Franco CFA (XAF)',
        XOF: 'Franco CFA (XOF)',
        EUR: 'Euro (EUR)',
        USD: 'Dólar US (USD)'
      },
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
      duration: 'Duração da viagem',
      hours: 'Horas',
      minutes: 'Minutos',
      arrivalTime: 'Hora de chegada estimada',
      recurring: 'Viagem recorrente',
      publish: 'Publicar viagem',
      success: 'Viagem publicada!',
      error: 'Erro',
      fillFields: 'Preencha todos os campos obrigatórios',
      driverInfo: 'Informações do motorista',
      driverFullName: 'Nome completo do motorista',
      driverCniNumber: 'Número do documento de identidade',
      driverPassportNumber: 'Número do passaporte',
      idIssueDate: 'Data de emissão',
      idExpiryDate: 'Data de validade',
      idDeliveryPlace: 'Local de emissão',
      onlinePayment: 'Pagamento online',
      onlinePaymentPercent: 'Percentual a pagar online',
      onlinePaymentHelp: 'O restante será pago em dinheiro ao motorista',
      displayCurrency: 'Moeda de exibição',
      percent100: '100% (Pagamento completo online)',
      percent50: '50% (Metade online, metade dinheiro)',
      percent25: '25% (Sinal, 75% dinheiro)',
      percent10: '10% (Pequeno sinal, 90% dinheiro)',
      receptionMethod: '📱 Método de recebimento do dinheiro',
      mobileMoney: '📱 Dinheiro móvel',
      bankCard: '💳 Cartão bancário',
      mobileMoneyPlaceholder: 'Número Mobile Money (ex: 690001122)',
      cardNumberPlaceholder: 'Número do cartão',
      cardExpiryPlaceholder: 'MM/AA',
      cardCvvPlaceholder: 'CVV',
      currencies: {
        XAF: 'Franco CFA (XAF)',
        XOF: 'Franco CFA (XOF)',
        EUR: 'Euro (EUR)',
        USD: 'Dólar Americano (USD)'
      },
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

  const displayDate = fromUTCToLocal(date);
  const displayTime = displayDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const displayDateStr = displayDate.toLocaleDateString();

  const getTotalDurationInMinutes = () => {
    const hours = parseInt(durationHours) || 0;
    const minutes = parseInt(durationMinutes) || 0;
    return (hours * 60) + minutes;
  };

  const calculateArrivalTime = () => {
    const totalMinutes = getTotalDurationInMinutes();
    if (totalMinutes > 0) {
      const arrival = new Date(date);
      arrival.setMinutes(arrival.getMinutes() + totalMinutes);
      setArrivalTime(arrival);
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      const oldTime = new Date(date);
      newDate.setHours(oldTime.getUTCHours());
      newDate.setMinutes(oldTime.getUTCMinutes());
      setDate(toUTC(newDate));
      calculateArrivalTime();
    }
  };

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(date);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setDate(toUTC(newDate));
      calculateArrivalTime();
    }
  };

  const onIssueDateChange = (event, selectedDate) => {
    setShowIssueDatePicker(false);
    if (selectedDate) {
      setIdIssueDate(selectedDate);
    }
  };

  const onExpiryDateChange = (event, selectedDate) => {
    setShowExpiryDatePicker(false);
    if (selectedDate) {
      setIdExpiryDate(selectedDate);
    }
  };

  const onArrivalTimeChange = (event, selectedTime) => {
    setShowArrivalPicker(false);
    if (selectedTime) {
      setArrivalTime(selectedTime);
    }
  };

  const handlePublish = async () => {
    if (!departure || !destination || !availableSeats || !price || !vehicleBrand) {
      Alert.alert(t.error, t.fillFields);
      return;
    }

    // Validation du mode de réception
    if (receptionMethod === 'mobile_money' && !mobileMoneyNumber) {
      Alert.alert(t.error, 'Veuillez entrer votre numéro Mobile Money');
      return;
    }
    if (receptionMethod === 'bank_card' && (!bankCardNumber || !bankCardExpiry)) {
      Alert.alert(t.error, 'Veuillez entrer les informations de votre carte bancaire');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${config.API_URL}/api/rides`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          // Informations du trajet
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
          estimatedDuration: getTotalDurationInMinutes(),
          arrivalTime: arrivalTime ? arrivalTime.toISOString() : null,
          isRecurring,
          // Paiement hybride
          onlinePaymentPercent: parseInt(onlinePaymentPercent),
          displayCurrency: displayCurrency,
          // Mode de réception (NOUVEAU)
          receptionMethod: receptionMethod,
          mobileMoneyNumber: receptionMethod === 'mobile_money' ? mobileMoneyNumber : null,
          bankCardNumber: receptionMethod === 'bank_card' ? bankCardNumber : null,
          bankCardExpiry: receptionMethod === 'bank_card' ? bankCardExpiry : null,
          bankCardCvv: receptionMethod === 'bank_card' ? bankCardCvv : null,
          // Informations du conducteur
          driverInfo: {
            fullName: driverFullName,
            cniNumber: driverCniNumber,
            passportNumber: driverPassportNumber,
            idIssueDate: idIssueDate ? idIssueDate.toISOString() : null,
            idExpiryDate: idExpiryDate ? idExpiryDate.toISOString() : null,
            idDeliveryPlace: idDeliveryPlace
          }
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

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🚗 {t.title}</Text>

      {/* ========== SECTION TRAJET ========== */}
      <Text style={styles.sectionTitle}>📍 Informations du trajet</Text>

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

      <View style={styles.row}>
        <View style={styles.halfColumn}>
          <Text style={styles.label}>{t.date} *</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateButtonText}>{displayDateStr}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.halfColumn}>
          <Text style={styles.label}>{t.time} *</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowTimePicker(true)}>
            <Text style={styles.dateButtonText}>{displayTime}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={displayDate}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}
      {showTimePicker && (
        <DateTimePicker
          value={displayDate}
          mode="time"
          display="default"
          onChange={onTimeChange}
        />
      )}

      <Text style={styles.label}>{t.duration}</Text>
      <View style={styles.row}>
        <View style={styles.halfColumn}>
          <TextInput
            style={styles.input}
            placeholder={t.hours}
            keyboardType="numeric"
            value={durationHours}
            onChangeText={(text) => {
              setDurationHours(text);
              setTimeout(calculateArrivalTime, 100);
            }}
          />
        </View>
        <View style={styles.halfColumn}>
          <TextInput
            style={styles.input}
            placeholder={t.minutes}
            keyboardType="numeric"
            value={durationMinutes}
            onChangeText={(text) => {
              setDurationMinutes(text);
              setTimeout(calculateArrivalTime, 100);
            }}
          />
        </View>
      </View>

      <Text style={styles.label}>{t.arrivalTime}</Text>
      <TouchableOpacity style={styles.dateButton} onPress={() => setShowArrivalPicker(true)}>
        <Text style={styles.dateButtonText}>
          {arrivalTime 
            ? new Date(arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'Calculée automatiquement'}
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

      {/* ========== SECTION PAIEMENT HYBRIDE ========== */}
      <Text style={styles.sectionTitle}>💳 {t.onlinePayment}</Text>
      
      <Text style={styles.label}>{t.onlinePaymentPercent}</Text>
      <View style={styles.row}>
        <TouchableOpacity 
          style={[styles.percentButton, onlinePaymentPercent === '100' && styles.percentButtonSelected]}
          onPress={() => setOnlinePaymentPercent('100')}
        >
          <Text style={[styles.percentButtonText, onlinePaymentPercent === '100' && styles.percentButtonTextSelected]}>
            100%
          </Text>
          <Text style={styles.percentLabel}>{t.percent100}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.percentButton, onlinePaymentPercent === '50' && styles.percentButtonSelected]}
          onPress={() => setOnlinePaymentPercent('50')}
        >
          <Text style={[styles.percentButtonText, onlinePaymentPercent === '50' && styles.percentButtonTextSelected]}>
            50%
          </Text>
          <Text style={styles.percentLabel}>{t.percent50}</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.row}>
        <TouchableOpacity 
          style={[styles.percentButton, onlinePaymentPercent === '25' && styles.percentButtonSelected]}
          onPress={() => setOnlinePaymentPercent('25')}
        >
          <Text style={[styles.percentButtonText, onlinePaymentPercent === '25' && styles.percentButtonTextSelected]}>
            25%
          </Text>
          <Text style={styles.percentLabel}>{t.percent25}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.percentButton, onlinePaymentPercent === '10' && styles.percentButtonSelected]}
          onPress={() => setOnlinePaymentPercent('10')}
        >
          <Text style={[styles.percentButtonText, onlinePaymentPercent === '10' && styles.percentButtonTextSelected]}>
            10%
          </Text>
          <Text style={styles.percentLabel}>{t.percent10}</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.helpText}>{t.onlinePaymentHelp}</Text>

      <Text style={styles.label}>{t.displayCurrency}</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={displayCurrency}
          onValueChange={(itemValue) => setDisplayCurrency(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label={t.currencies.XAF} value="XAF" />
          <Picker.Item label={t.currencies.XOF} value="XOF" />
          <Picker.Item label={t.currencies.EUR} value="EUR" />
          <Picker.Item label={t.currencies.USD} value="USD" />
        </Picker>
      </View>

      {/* ========== NOUVEAU : MODE DE RÉCEPTION DE L'ARGENT ========== */}
      <Text style={styles.sectionTitle}>💳 {t.receptionMethod}</Text>
      
      <View style={styles.row}>
        <TouchableOpacity 
          style={[styles.receptionButton, receptionMethod === 'mobile_money' && styles.receptionButtonSelected]}
          onPress={() => setReceptionMethod('mobile_money')}
        >
          <Text style={[styles.receptionButtonText, receptionMethod === 'mobile_money' && styles.receptionButtonTextSelected]}>
            {t.mobileMoney}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.receptionButton, receptionMethod === 'bank_card' && styles.receptionButtonSelected]}
          onPress={() => setReceptionMethod('bank_card')}
        >
          <Text style={[styles.receptionButtonText, receptionMethod === 'bank_card' && styles.receptionButtonTextSelected]}>
            {t.bankCard}
          </Text>
        </TouchableOpacity>
      </View>

      {receptionMethod === 'mobile_money' ? (
        <TextInput
          style={styles.input}
          placeholder={t.mobileMoneyPlaceholder}
          value={mobileMoneyNumber}
          onChangeText={setMobileMoneyNumber}
          keyboardType="phone-pad"
        />
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder={t.cardNumberPlaceholder}
            value={bankCardNumber}
            onChangeText={setBankCardNumber}
            keyboardType="numeric"
          />
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder={t.cardExpiryPlaceholder}
              value={bankCardExpiry}
              onChangeText={setBankCardExpiry}
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder={t.cardCvvPlaceholder}
              value={bankCardCvv}
              onChangeText={setBankCardCvv}
              keyboardType="numeric"
              secureTextEntry
            />
          </View>
        </>
      )}

      {/* ========== SECTION VÉHICULE ========== */}
      <Text style={styles.sectionTitle}>🚗 Véhicule</Text>

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

      <Text style={styles.label}>{t.vehicleBrand} *</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Toyota, Suzuki, Hyundai..."
        value={vehicleBrand}
        onChangeText={setVehicleBrand}
      />

      <Text style={styles.label}>{t.licensePlate}</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: LT 123 AB / CE 456 CD"
        value={licensePlate}
        onChangeText={setLicensePlate}
      />

      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>{t.recurring}</Text>
        <Switch
          value={isRecurring}
          onValueChange={setIsRecurring}
          trackColor={{ false: '#ddd', true: '#FF5A5F' }}
        />
      </View>

      {/* ========== SECTION CONDUCTEUR ========== */}
      <Text style={styles.sectionTitle}>👤 {t.driverInfo}</Text>

      <Text style={styles.label}>{t.driverFullName} *</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Jean Dupont"
        value={driverFullName}
        onChangeText={setDriverFullName}
      />

      <Text style={styles.label}>{t.driverCniNumber}</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: 1234567890"
        keyboardType="numeric"
        value={driverCniNumber}
        onChangeText={setDriverCniNumber}
      />

      <Text style={styles.label}>{t.driverPassportNumber}</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: PA1234567"
        value={driverPassportNumber}
        onChangeText={setDriverPassportNumber}
      />

      <Text style={styles.label}>{t.idIssueDate}</Text>
      <TouchableOpacity style={styles.dateButton} onPress={() => setShowIssueDatePicker(true)}>
        <Text style={styles.dateButtonText}>
          {idIssueDate ? idIssueDate.toLocaleDateString() : 'Sélectionner une date'}
        </Text>
      </TouchableOpacity>

      {showIssueDatePicker && (
        <DateTimePicker
          value={idIssueDate || new Date()}
          mode="date"
          display="default"
          onChange={onIssueDateChange}
        />
      )}

      <Text style={styles.label}>{t.idExpiryDate}</Text>
      <TouchableOpacity style={styles.dateButton} onPress={() => setShowExpiryDatePicker(true)}>
        <Text style={styles.dateButtonText}>
          {idExpiryDate ? idExpiryDate.toLocaleDateString() : 'Sélectionner une date'}
        </Text>
      </TouchableOpacity>

      {showExpiryDatePicker && (
        <DateTimePicker
          value={idExpiryDate || new Date()}
          mode="date"
          display="default"
          onChange={onExpiryDateChange}
        />
      )}

      <Text style={styles.label}>{t.idDeliveryPlace}</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Douala, Yaoundé..."
        value={idDeliveryPlace}
        onChangeText={setIdDeliveryPlace}
      />

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
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 5,
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
    marginBottom: 10,
  },
  halfInput: {
    flex: 1,
    marginRight: 10,
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
    marginBottom: 10,
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
    marginBottom: 10,
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
    marginTop: 30,
    marginBottom: 40,
  },
  publishButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Styles pour les boutons de pourcentage
  percentButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  percentButtonSelected: {
    backgroundColor: '#FF5A5F',
  },
  percentButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  percentButtonTextSelected: {
    color: 'white',
  },
  percentLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  helpText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  // Nouveaux styles pour le mode de réception
  receptionButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  receptionButtonSelected: {
    backgroundColor: '#FF5A5F',
  },
  receptionButtonText: {
    fontSize: 14,
    color: '#333',
  },
  receptionButtonTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
});