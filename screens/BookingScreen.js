import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

const API_URL = 'http://192.168.0.109:3000';

export default function BookingScreen({ route, navigation }) {
  const { ride, user, language = 'fr' } = route.params || {};
  
  // États du formulaire
  const [bookerName, setBookerName] = useState(user?.name || '');
  const [bookerPhone, setBookerPhone] = useState('');
  const [travelerName, setTravelerName] = useState('');
  const [travelerPhone, setTravelerPhone] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [idExpiryDate, setIdExpiryDate] = useState('');
  const [amount, setAmount] = useState(ride?.price?.toString() || '');
  const [paymentMethod, setPaymentMethod] = useState('ORANGE_MONEY');
  const [loading, setLoading] = useState(false);
  
  // 3 numéros de confiance
  const [trustedContact1, setTrustedContact1] = useState('');
  const [trustedContact2, setTrustedContact2] = useState('');
  const [trustedContact3, setTrustedContact3] = useState('');
  
  // États pour la validation (surlignage rouge)
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Indicatif téléphonique par défaut basé sur le pays de l'utilisateur
  const getDefaultPhoneCode = () => {
    const countryCodes = {
      'Cameroun': '+237',
      'Côte d\'Ivoire': '+225',
      'Sénégal': '+221',
      'Gabon': '+241'
    };
    return countryCodes[user?.country] || '+237';
  };

  const [phoneCode, setPhoneCode] = useState(getDefaultPhoneCode());

  const translations = {
    fr: {
      title: 'Réservation',
      rideInfo: 'Trajet',
      from: 'de',
      to: 'à',
      bookerInfo: 'Informations du réservateur',
      bookerName: 'Nom et prénom (réservateur)',
      bookerPhone: 'Téléphone (réservateur)',
      travelerInfo: 'Informations du voyageur',
      travelerName: 'Nom et prénom (voyageur)',
      travelerPhone: 'Téléphone (voyageur)',
      idNumber: 'Numéro CNI / Passeport',
      idExpiryDate: "Date d'expiration",
      paymentInfo: 'Informations de paiement',
      amount: 'Somme à payer (FCFA)',
      paymentMethod: 'Mode de paiement',
      trustedContacts: 'Contacts de confiance (3 numéros)',
      trustedContactHelp: 'Ces numéros seront utilisés pour les alertes de sécurité',
      contact1: '1er numéro de confiance',
      contact2: '2ème numéro de confiance',
      contact3: '3ème numéro de confiance',
      methods: {
        ORANGE_MONEY: '💰 Orange Money',
        MTN_MONEY: '💛 MTN Mobile Money',
        CASH: '💵 Espèces (au conducteur)',
        WAVE: '📱 Wave'
      },
      confirm: 'Confirmer la réservation',
      cancel: 'Annuler',
      success: 'Réservation confirmée !',
      error: 'Erreur',
      fillFields: 'Veuillez remplir tous les champs correctement',
      expiryWarning: "La date d'expiration doit être postérieure à aujourd'hui",
      phoneInvalid: 'Numéro de téléphone invalide (9-12 chiffres)',
      expiryFormat: 'Format DD/MM/YYYY',
      required: 'Champ obligatoire'
    },
    en: {
      title: 'Booking',
      rideInfo: 'Ride',
      from: 'from',
      to: 'to',
      bookerInfo: 'Booker information',
      bookerName: 'Full name (booker)',
      bookerPhone: 'Phone (booker)',
      travelerInfo: 'Traveler information',
      travelerName: 'Full name (traveler)',
      travelerPhone: 'Phone (traveler)',
      idNumber: 'ID / Passport number',
      idExpiryDate: 'Expiry date',
      paymentInfo: 'Payment information',
      amount: 'Amount (FCFA)',
      paymentMethod: 'Payment method',
      trustedContacts: 'Trusted contacts (3 numbers)',
      trustedContactHelp: 'These numbers will be used for security alerts',
      contact1: '1st trusted number',
      contact2: '2nd trusted number',
      contact3: '3rd trusted number',
      methods: {
        ORANGE_MONEY: '💰 Orange Money',
        MTN_MONEY: '💛 MTN Mobile Money',
        CASH: '💵 Cash (to driver)',
        WAVE: '📱 Wave'
      },
      confirm: 'Confirm booking',
      cancel: 'Cancel',
      success: 'Booking confirmed!',
      error: 'Error',
      fillFields: 'Please fill all fields correctly',
      expiryWarning: 'Expiry date must be after today',
      phoneInvalid: 'Invalid phone number (9-12 digits)',
      expiryFormat: 'Format DD/MM/YYYY',
      required: 'Required field'
    },
    es: {
      title: 'Reserva',
      rideInfo: 'Viaje',
      from: 'de',
      to: 'a',
      bookerInfo: 'Información del reservante',
      bookerName: 'Nombre completo (reservante)',
      bookerPhone: 'Teléfono (reservante)',
      travelerInfo: 'Información del viajero',
      travelerName: 'Nombre completo (viajero)',
      travelerPhone: 'Teléfono (viajero)',
      idNumber: 'Nº CI / Pasaporte',
      idExpiryDate: 'Fecha de expiración',
      paymentInfo: 'Información de pago',
      amount: 'Monto (FCFA)',
      paymentMethod: 'Método de pago',
      trustedContacts: 'Contactos de confianza (3 números)',
      trustedContactHelp: 'Estos números se usarán para alertas de seguridad',
      contact1: '1er número de confianza',
      contact2: '2º número de confianza',
      contact3: '3er número de confianza',
      methods: {
        ORANGE_MONEY: '💰 Orange Money',
        MTN_MONEY: '💛 MTN Mobile Money',
        CASH: '💵 Efectivo (al conductor)',
        WAVE: '📱 Wave'
      },
      confirm: 'Confirmar reserva',
      cancel: 'Cancelar',
      success: '¡Reserva confirmada!',
      error: 'Error',
      fillFields: 'Complete todos los campos correctamente',
      expiryWarning: 'La fecha debe ser posterior a hoy',
      phoneInvalid: 'Número inválido (9-12 dígitos)',
      expiryFormat: 'Formato DD/MM/YYYY',
      required: 'Campo obligatorio'
    },
    pt: {
      title: 'Reserva',
      rideInfo: 'Viagem',
      from: 'de',
      to: 'para',
      bookerInfo: 'Informação do reservante',
      bookerName: 'Nome completo (reservante)',
      bookerPhone: 'Telefone (reservante)',
      travelerInfo: 'Informação do viajante',
      travelerName: 'Nome completo (viajante)',
      travelerPhone: 'Telefone (viajante)',
      idNumber: 'Nº BI / Passaporte',
      idExpiryDate: 'Data de expiração',
      paymentInfo: 'Informação de pagamento',
      amount: 'Valor (FCFA)',
      paymentMethod: 'Método de pagamento',
      trustedContacts: 'Contactos de confiança (3 números)',
      trustedContactHelp: 'Estes números serão usados para alertas de segurança',
      contact1: '1º número de confiança',
      contact2: '2º número de confiança',
      contact3: '3º número de confiança',
      methods: {
        ORANGE_MONEY: '💰 Orange Money',
        MTN_MONEY: '💛 MTN Mobile Money',
        CASH: '💵 Dinheiro (ao motorista)',
        WAVE: '📱 Wave'
      },
      confirm: 'Confirmar reserva',
      cancel: 'Cancelar',
      success: 'Reserva confirmada!',
      error: 'Erro',
      fillFields: 'Preencha todos os campos corretamente',
      expiryWarning: 'A data deve ser posterior a hoje',
      phoneInvalid: 'Número inválido (9-12 dígitos)',
      expiryFormat: 'Formato DD/MM/YYYY',
      required: 'Campo obrigatório'
    }
  };

  const t = translations[language];

  // Validation des champs
  const validatePhone = (phone) => {
    const phoneRegex = /^[0-9]{9,12}$/;
    return phoneRegex.test(phone);
  };

  const validateDate = (dateStr) => {
    if (!dateStr) return false;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return false;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
    const expiryDate = new Date(year, month, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return expiryDate > today;
  };

  const validateRequired = (value) => {
    return value && value.trim().length > 0;
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!validateRequired(bookerName)) newErrors.bookerName = t.required;
    if (!validatePhone(bookerPhone)) newErrors.bookerPhone = t.phoneInvalid;
    if (!validateRequired(travelerName)) newErrors.travelerName = t.required;
    if (!validatePhone(travelerPhone)) newErrors.travelerPhone = t.phoneInvalid;
    if (!validateRequired(idNumber)) newErrors.idNumber = t.required;
    if (!validateDate(idExpiryDate)) newErrors.idExpiryDate = t.expiryWarning;
    if (!validateRequired(amount)) newErrors.amount = t.required;
    if (!validatePhone(trustedContact1)) newErrors.trustedContact1 = t.phoneInvalid;
    if (!validatePhone(trustedContact2)) newErrors.trustedContact2 = t.phoneInvalid;
    if (!validatePhone(trustedContact3)) newErrors.trustedContact3 = t.phoneInvalid;
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldBlur = (field, value, validator) => {
    setTouched({ ...touched, [field]: true });
    if (!validator(value)) {
      setErrors({ ...errors, [field]: field === 'idExpiryDate' ? t.expiryWarning : t.required });
    } else {
      setErrors({ ...errors, [field]: null });
    }
  };

  const handleBooking = async () => {
    if (!validateForm()) {
      Alert.alert(t.error, t.fillFields);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          rideId: ride.rideId,
          seats: 1,
          bookerName,
          bookerPhone: `${phoneCode}${bookerPhone}`,
          travelerName,
          travelerPhone: `${phoneCode}${travelerPhone}`,
          idNumber,
          idExpiryDate: idExpiryDate.split('/').reverse().join('-'),
          amount: parseFloat(amount),
          paymentMethod,
          trustedContact1: `${phoneCode}${trustedContact1}`,
          trustedContact2: `${phoneCode}${trustedContact2}`,
          trustedContact3: `${phoneCode}${trustedContact3}`
        }),
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert(t.success, 'Votre place a été réservée avec succès !');
        navigation.goBack();
      } else {
        Alert.alert(t.error, data.error);
      }
    } catch (error) {
      Alert.alert(t.error, 'Connexion au serveur impossible');
    } finally {
      setLoading(false);
    }
  };

  const getInputStyle = (field) => {
    return [
      styles.input,
      errors[field] && touched[field] && styles.inputError
    ];
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📝 {t.title}</Text>

      {/* Informations du trajet */}
      <View style={styles.rideInfoCard}>
        <Text style={styles.rideTitle}>🚗 {t.rideInfo}</Text>
        <Text style={styles.rideRoute}>
          {t.from} {ride?.departure} {t.to} {ride?.destination}
        </Text>
        <Text style={styles.rideDetails}>
          🚀 {ride?.departureTime} → 🏁 {ride?.arrivalTime} ({ride?.duration})
        </Text>
        <Text style={styles.rideDetails}>
          👤 {ride?.driverName} • {ride?.vehicleBrand} {ride?.licensePlate ? `[${ride?.licensePlate}]` : ''}
        </Text>
        <Text style={styles.ridePrice}>💰 {ride?.price?.toLocaleString()} FCFA</Text>
      </View>

      {/* Informations du réservateur */}
      <Text style={styles.sectionTitle}>📝 {t.bookerInfo}</Text>
      
      <TextInput
        style={getInputStyle('bookerName')}
        placeholder={t.bookerName}
        value={bookerName}
        onChangeText={setBookerName}
        onBlur={() => handleFieldBlur('bookerName', bookerName, validateRequired)}
      />
      {errors.bookerName && touched.bookerName && <Text style={styles.errorText}>{errors.bookerName}</Text>}

      <View style={styles.phoneContainer}>
        <View style={styles.phoneCodeContainer}>
          <Text style={styles.phoneCodeText}>{phoneCode}</Text>
        </View>
        <TextInput
          style={[styles.phoneInput, errors.bookerPhone && touched.bookerPhone && styles.inputError]}
          placeholder={t.bookerPhone}
          value={bookerPhone}
          onChangeText={setBookerPhone}
          onBlur={() => handleFieldBlur('bookerPhone', bookerPhone, validatePhone)}
          keyboardType="phone-pad"
        />
      </View>
      {errors.bookerPhone && touched.bookerPhone && <Text style={styles.errorText}>{errors.bookerPhone}</Text>}

      {/* Informations du voyageur */}
      <Text style={styles.sectionTitle}>👤 {t.travelerInfo}</Text>

      <TextInput
        style={getInputStyle('travelerName')}
        placeholder={t.travelerName}
        value={travelerName}
        onChangeText={setTravelerName}
        onBlur={() => handleFieldBlur('travelerName', travelerName, validateRequired)}
      />
      {errors.travelerName && touched.travelerName && <Text style={styles.errorText}>{errors.travelerName}</Text>}

      <View style={styles.phoneContainer}>
        <View style={styles.phoneCodeContainer}>
          <Text style={styles.phoneCodeText}>{phoneCode}</Text>
        </View>
        <TextInput
          style={[styles.phoneInput, errors.travelerPhone && touched.travelerPhone && styles.inputError]}
          placeholder={t.travelerPhone}
          value={travelerPhone}
          onChangeText={setTravelerPhone}
          onBlur={() => handleFieldBlur('travelerPhone', travelerPhone, validatePhone)}
          keyboardType="phone-pad"
        />
      </View>
      {errors.travelerPhone && touched.travelerPhone && <Text style={styles.errorText}>{errors.travelerPhone}</Text>}

      <TextInput
        style={getInputStyle('idNumber')}
        placeholder={t.idNumber}
        value={idNumber}
        onChangeText={setIdNumber}
        onBlur={() => handleFieldBlur('idNumber', idNumber, validateRequired)}
      />
      {errors.idNumber && touched.idNumber && <Text style={styles.errorText}>{errors.idNumber}</Text>}

      <Text style={styles.smallLabel}>{t.idExpiryDate}</Text>
      <TextInput
        style={getInputStyle('idExpiryDate')}
        placeholder="DD/MM/YYYY"
        value={idExpiryDate}
        onChangeText={setIdExpiryDate}
        onBlur={() => handleFieldBlur('idExpiryDate', idExpiryDate, validateDate)}
      />
      {errors.idExpiryDate && touched.idExpiryDate && <Text style={styles.errorText}>{errors.idExpiryDate}</Text>}

      {/* 3 numéros de confiance */}
      <Text style={styles.sectionTitle}>🔐 {t.trustedContacts}</Text>
      <Text style={styles.helpText}>{t.trustedContactHelp}</Text>

      <View style={styles.phoneContainer}>
        <View style={styles.phoneCodeContainer}>
          <Text style={styles.phoneCodeText}>{phoneCode}</Text>
        </View>
        <TextInput
          style={[styles.phoneInput, errors.trustedContact1 && touched.trustedContact1 && styles.inputError]}
          placeholder={t.contact1}
          value={trustedContact1}
          onChangeText={setTrustedContact1}
          onBlur={() => handleFieldBlur('trustedContact1', trustedContact1, validatePhone)}
          keyboardType="phone-pad"
        />
      </View>
      {errors.trustedContact1 && touched.trustedContact1 && <Text style={styles.errorText}>{errors.trustedContact1}</Text>}

      <View style={styles.phoneContainer}>
        <View style={styles.phoneCodeContainer}>
          <Text style={styles.phoneCodeText}>{phoneCode}</Text>
        </View>
        <TextInput
          style={[styles.phoneInput, errors.trustedContact2 && touched.trustedContact2 && styles.inputError]}
          placeholder={t.contact2}
          value={trustedContact2}
          onChangeText={setTrustedContact2}
          onBlur={() => handleFieldBlur('trustedContact2', trustedContact2, validatePhone)}
          keyboardType="phone-pad"
        />
      </View>
      {errors.trustedContact2 && touched.trustedContact2 && <Text style={styles.errorText}>{errors.trustedContact2}</Text>}

      <View style={styles.phoneContainer}>
        <View style={styles.phoneCodeContainer}>
          <Text style={styles.phoneCodeText}>{phoneCode}</Text>
        </View>
        <TextInput
          style={[styles.phoneInput, errors.trustedContact3 && touched.trustedContact3 && styles.inputError]}
          placeholder={t.contact3}
          value={trustedContact3}
          onChangeText={setTrustedContact3}
          onBlur={() => handleFieldBlur('trustedContact3', trustedContact3, validatePhone)}
          keyboardType="phone-pad"
        />
      </View>
      {errors.trustedContact3 && touched.trustedContact3 && <Text style={styles.errorText}>{errors.trustedContact3}</Text>}

      {/* Informations de paiement */}
      <Text style={styles.sectionTitle}>💳 {t.paymentInfo}</Text>

      <TextInput
        style={getInputStyle('amount')}
        placeholder={t.amount}
        value={amount}
        onChangeText={setAmount}
        onBlur={() => handleFieldBlur('amount', amount, validateRequired)}
        keyboardType="numeric"
      />
      {errors.amount && touched.amount && <Text style={styles.errorText}>{errors.amount}</Text>}

      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={paymentMethod}
          onValueChange={(itemValue) => setPaymentMethod(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label={t.methods.ORANGE_MONEY} value="ORANGE_MONEY" />
          <Picker.Item label={t.methods.MTN_MONEY} value="MTN_MONEY" />
          <Picker.Item label={t.methods.CASH} value="CASH" />
          <Picker.Item label={t.methods.WAVE} value="WAVE" />
        </Picker>
      </View>

      {/* Boutons */}
      <TouchableOpacity style={styles.confirmButton} onPress={handleBooking} disabled={loading}>
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.confirmButtonText}>{t.confirm}</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
        <Text style={styles.cancelButtonText}>{t.cancel}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FF5A5F', textAlign: 'center', marginTop: 20, marginBottom: 20 },
  rideInfoCard: { backgroundColor: '#f8f8f8', borderRadius: 12, padding: 15, marginBottom: 20, borderWidth: 1, borderColor: '#eee' },
  rideTitle: { fontSize: 16, fontWeight: 'bold', color: '#FF5A5F', marginBottom: 8 },
  rideRoute: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  rideDetails: { fontSize: 14, color: '#666', marginBottom: 4 },
  ridePrice: { fontSize: 20, fontWeight: 'bold', color: '#FF5A5F', marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 10, marginBottom: 15 },
  smallLabel: { fontSize: 12, color: '#666', marginBottom: 5, marginLeft: 5 },
  helpText: { fontSize: 12, color: '#888', marginBottom: 15, marginLeft: 5, fontStyle: 'italic' },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 10, marginBottom: 15, fontSize: 16, backgroundColor: '#f8f8f8' },
  inputError: { borderColor: '#F44336', borderWidth: 2, backgroundColor: '#FFEBEE' },
  errorText: { color: '#F44336', fontSize: 12, marginBottom: 10, marginLeft: 5 },
  phoneContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  phoneCodeContainer: { backgroundColor: '#f0f0f0', paddingHorizontal: 15, paddingVertical: 15, borderRadius: 10, borderWidth: 1, borderColor: '#ddd' },
  phoneCodeText: { fontSize: 16, color: '#333' },
  phoneInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 10, fontSize: 16, backgroundColor: '#f8f8f8', marginLeft: 10 },
  pickerContainer: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, backgroundColor: '#f8f8f8', marginBottom: 20 },
  picker: { height: 50 },
  confirmButton: { backgroundColor: '#4CAF50', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  confirmButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  cancelButton: { backgroundColor: '#f0f0f0', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, marginBottom: 30 },
  cancelButtonText: { color: '#FF5A5F', fontSize: 16, fontWeight: 'bold' }
});