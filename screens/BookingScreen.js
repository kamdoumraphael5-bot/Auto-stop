import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator
} from 'react-native';
import config from '../config';
//const API_URL = 'http://192.168.0.109:3000';

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
  const [selectedPaymentType, setSelectedPaymentType] = useState('mobile_money');
  const [mobileMoneyNumber, setMobileMoneyNumber] = useState('');
  const [loading, setLoading] = useState(false);
  
  // ========== NOUVEAUX STATES POUR L'AFFICHAGE HYBRIDE ==========
  const [onlinePercent, setOnlinePercent] = useState(ride?.onlinePercent || 25);
  const [onlineAmount, setOnlineAmount] = useState(0);
  const [cashAmount, setCashAmount] = useState(0);
  const [displayCurrency, setDisplayCurrency] = useState(ride?.displayCurrency || 'XAF');
  // ==============================================================
  
  const [trustedContact1, setTrustedContact1] = useState('');
  const [trustedContact2, setTrustedContact2] = useState('');
  const [trustedContact3, setTrustedContact3] = useState('');
  
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

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

  // ========== CALCUL DES MONTANTS AU CHARGEMENT ==========
  React.useEffect(() => {
    if (ride?.price) {
      const price = parseFloat(ride.price);
      const online = (price * (onlinePercent / 100)).toFixed(0);
      const cash = price - online;
      setOnlineAmount(online);
      setCashAmount(cash);
      setAmount(online.toString());
    }
  }, [ride?.price, onlinePercent]);

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
      amount: 'Montant à payer en ligne (FCFA)',
      paymentMethod: 'Moyen de paiement',
      mobileMoney: '📱 Mobile Money',
      mobileMoneyDesc: 'Orange Money, MTN Mobile Money, Wave',
      mobileMoneyPlaceholder: 'Votre numéro de paiement (ex: 6XXXXXXXX)',
      card: '💳 Carte bancaire',
      cardDesc: 'Visa, Mastercard',
      // ========== NOUVELLES TRADUCTIONS ==========
      paymentBreakdown: '💰 Détail du paiement',
      onlinePayment: '💻 Paiement en ligne',
      cashPayment: '💵 À payer en espèces au conducteur',
      currencyXAF: 'FCFA',
      // ==========================================
      trustedContacts: 'Contacts de confiance (3 numéros)',
      trustedContactHelp: 'Ces numéros seront utilisés pour les alertes de sécurité',
      contact1: '1er numéro de confiance',
      contact2: '2ème numéro de confiance',
      contact3: '3ème numéro de confiance',
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
      amount: 'Online payment amount (FCFA)',
      paymentMethod: 'Payment method',
      mobileMoney: '📱 Mobile Money',
      mobileMoneyDesc: 'Orange Money, MTN Mobile Money, Wave',
      mobileMoneyPlaceholder: 'Your payment number (ex: 6XXXXXXXX)',
      card: '💳 Card',
      cardDesc: 'Visa, Mastercard',
      paymentBreakdown: '💰 Payment breakdown',
      onlinePayment: '💻 Online payment',
      cashPayment: '💵 Cash payment to driver',
      currencyXAF: 'FCFA',
      trustedContacts: 'Trusted contacts (3 numbers)',
      trustedContactHelp: 'These numbers will be used for security alerts',
      contact1: '1st trusted number',
      contact2: '2nd trusted number',
      contact3: '3rd trusted number',
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
      amount: 'Monto a pagar en línea (FCFA)',
      paymentMethod: 'Método de pago',
      mobileMoney: '📱 Dinero móvil',
      mobileMoneyDesc: 'Orange Money, MTN Mobile Money, Wave',
      mobileMoneyPlaceholder: 'Su número de pago (ej: 6XXXXXXXX)',
      card: '💳 Tarjeta',
      cardDesc: 'Visa, Mastercard',
      paymentBreakdown: '💰 Desglose del pago',
      onlinePayment: '💻 Pago en línea',
      cashPayment: '💵 Pago en efectivo al conductor',
      currencyXAF: 'FCFA',
      trustedContacts: 'Contactos de confianza (3 números)',
      trustedContactHelp: 'Estos números se usarán para alertas de seguridad',
      contact1: '1er número de confianza',
      contact2: '2º número de confianza',
      contact3: '3er número de confianza',
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
      amount: 'Valor do pagamento online (FCFA)',
      paymentMethod: 'Método de pagamento',
      mobileMoney: '📱 Dinheiro móvel',
      mobileMoneyDesc: 'Orange Money, MTN Mobile Money, Wave',
      mobileMoneyPlaceholder: 'Seu número de pagamento (ex: 6XXXXXXXX)',
      card: '💳 Cartão',
      cardDesc: 'Visa, Mastercard',
      paymentBreakdown: '💰 Detalhamento do pagamento',
      onlinePayment: '💻 Pagamento online',
      cashPayment: '💵 Pagamento em dinheiro ao motorista',
      currencyXAF: 'FCFA',
      trustedContacts: 'Contactos de confiança (3 números)',
      trustedContactHelp: 'Estes números serão usados para alertas de segurança',
      contact1: '1º número de confiança',
      contact2: '2º número de confiança',
      contact3: '3º número de confiança',
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
    
    if (selectedPaymentType === 'mobile_money' && !validatePhone(mobileMoneyNumber)) {
      newErrors.mobileMoneyNumber = t.phoneInvalid;
    }
    
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
      const rideIdToUse = ride?.rideId || ride?.id;
      
      console.log('📝 rideId à utiliser:', rideIdToUse);
      console.log('📝 Moyen de paiement choisi:', selectedPaymentType);
      console.log('📝 Numéro de paiement:', mobileMoneyNumber);
      
      if (!rideIdToUse) {
        Alert.alert(t.error, 'Erreur: Trajet non trouvé');
        setLoading(false);
        return;
      }

      const paymentResponse = await fetch(`${config.API_URL}/api/payment/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          rideId: rideIdToUse,
          paymentMethod: selectedPaymentType,
          phoneNumber: selectedPaymentType === 'mobile_money' ? `${phoneCode}${mobileMoneyNumber}` : `${phoneCode}${bookerPhone}`,
          isInternational: false,
          onlinePercent: onlinePercent
        })
      });

      const paymentData = await paymentResponse.json();

      if (paymentResponse.ok && paymentData.paymentUrl) {
        const bookingInfo = {
          rideId: rideIdToUse,
          seats: 1,
          bookerName,
          bookerPhone: `${phoneCode}${bookerPhone}`,
          travelerName,
          travelerPhone: `${phoneCode}${travelerPhone}`,
          idNumber,
          idExpiryDate: idExpiryDate.split('/').reverse().join('-'),
          amount: paymentData.amount,
          onlineAmount: onlineAmount,
          cashAmount: cashAmount,
          paymentMethod: selectedPaymentType,
          mobileMoneyNumber: selectedPaymentType === 'mobile_money' ? mobileMoneyNumber : null,
          trustedContact1: `${phoneCode}${trustedContact1}`,
          trustedContact2: `${phoneCode}${trustedContact2}`,
          trustedContact3: `${phoneCode}${trustedContact3}`
        };
        
        await AsyncStorage.setItem('pendingBooking', JSON.stringify(bookingInfo));
        await AsyncStorage.setItem('pendingPaymentRef', paymentData.reference);
        
        Linking.openURL(paymentData.paymentUrl);
        
      } else {
        Alert.alert(t.error, paymentData.error || 'Impossible d\'initier le paiement');
      }
    } catch (error) {
      console.error('❌ Erreur:', error);
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

  // ========== FORMATAGE DES MONTANTS ==========
  const formatAmount = (amount) => {
    return parseInt(amount).toLocaleString();
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📝 {t.title}</Text>

      <View style={styles.rideInfoCard}>
        <Text style={styles.rideTitle}>🚗 {t.rideInfo}</Text>
        <Text style={styles.rideRoute}>
          {t.from} {ride?.departure} {t.to} {ride?.destination}
        </Text>
        <Text style={styles.rideDetails}>
          👤 {ride?.driverName} • {ride?.vehicleBrand} {ride?.licensePlate ? `[${ride?.licensePlate}]` : ''}
        </Text>
        <Text style={styles.ridePrice}>💰 {parseFloat(ride?.price).toLocaleString()} FCFA</Text>
      </View>

      {/* ========== NOUVELLE SECTION DÉTAIL PAIEMENT HYBRIDE ========== */}
      <View style={styles.paymentBreakdownCard}>
        <Text style={styles.sectionTitle}>{t.paymentBreakdown}</Text>
        
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>📊 {onlinePercent}% en ligne</Text>
          <Text style={styles.breakdownValue}>{formatAmount(onlineAmount)} {t.currencyXAF}</Text>
        </View>
        
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>{t.onlinePayment}</Text>
          <Text style={styles.onlineAmount}>{formatAmount(onlineAmount)} {t.currencyXAF}</Text>
        </View>
        
        <View style={styles.breakdownDivider} />
        
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>{t.cashPayment}</Text>
          <Text style={styles.cashAmount}>{formatAmount(cashAmount)} {t.currencyXAF}</Text>
        </View>
        
        <View style={styles.breakdownTotalRow}>
          <Text style={styles.breakdownTotalLabel}>💰 Total</Text>
          <Text style={styles.breakdownTotalValue}>{formatAmount(parseFloat(ride?.price))} {t.currencyXAF}</Text>
        </View>
        
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>🔒 Le paiement en ligne est sécurisé et ne sera débloqué qu'après votre trajet.</Text>
          <Text style={styles.infoText}>💵 Le paiement en espèces se fait directement au conducteur.</Text>
        </View>
      </View>
      {/* ============================================================= */}

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

      <Text style={styles.sectionTitle}>💳 {t.paymentInfo}</Text>

      {/* ========== MONTANT MODIFIÉ POUR N'ÊTRE QUE LA PARTIE EN LIGNE ========== */}
      <View style={styles.onlineAmountContainer}>
        <TextInput
          style={[getInputStyle('amount'), styles.onlineAmountInput]}
          placeholder={t.amount}
          value={onlineAmount.toString()}
          editable={false}
          keyboardType="numeric"
        />
        <Text style={styles.onlinePercentText}> ({onlinePercent}% du trajet)</Text>
      </View>
      {errors.amount && touched.amount && <Text style={styles.errorText}>{errors.amount}</Text>}

      <View style={styles.paymentMethodContainer}>
        <TouchableOpacity 
          style={[styles.paymentMethodButton, selectedPaymentType === 'mobile_money' && styles.paymentMethodSelected]}
          onPress={() => setSelectedPaymentType('mobile_money')}
        >
          <Text style={[styles.paymentMethodText, selectedPaymentType === 'mobile_money' && styles.paymentMethodTextSelected]}>
            {t.mobileMoney}
          </Text>
          <Text style={styles.paymentMethodDesc}>{t.mobileMoneyDesc}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.paymentMethodButton, selectedPaymentType === 'card' && styles.paymentMethodSelected]}
          onPress={() => setSelectedPaymentType('card')}
        >
          <Text style={[styles.paymentMethodText, selectedPaymentType === 'card' && styles.paymentMethodTextSelected]}>
            {t.card}
          </Text>
          <Text style={styles.paymentMethodDesc}>{t.cardDesc}</Text>
        </TouchableOpacity>
      </View>

      {selectedPaymentType === 'mobile_money' && (
        <View style={styles.mobileMoneyContainer}>
          <View style={styles.phoneCodeContainer}>
            <Text style={styles.phoneCodeText}>{phoneCode}</Text>
          </View>
          <TextInput
            style={[styles.phoneInput, errors.mobileMoneyNumber && touched.mobileMoneyNumber && styles.inputError]}
            placeholder={t.mobileMoneyPlaceholder}
            value={mobileMoneyNumber}
            onChangeText={setMobileMoneyNumber}
            onBlur={() => handleFieldBlur('mobileMoneyNumber', mobileMoneyNumber, validatePhone)}
            keyboardType="phone-pad"
          />
        </View>
      )}
      {errors.mobileMoneyNumber && touched.mobileMoneyNumber && <Text style={styles.errorText}>{errors.mobileMoneyNumber}</Text>}

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
  
  // ========== NOUVEAUX STYLES POUR LE PAIEMENT HYBRIDE ==========
  paymentBreakdownCard: { 
    backgroundColor: '#E8F5E9', 
    borderRadius: 12, 
    padding: 15, 
    marginBottom: 20, 
    borderWidth: 1, 
    borderColor: '#C8E6C9' 
  },
  breakdownRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 10 
  },
  breakdownLabel: { 
    fontSize: 14, 
    color: '#555' 
  },
  breakdownValue: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    color: '#333' 
  },
  onlineAmount: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#4CAF50' 
  },
  cashAmount: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#FF9800' 
  },
  breakdownDivider: { 
    height: 1, 
    backgroundColor: '#C8E6C9', 
    marginVertical: 10 
  },
  breakdownTotalRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 5,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#A5D6A7'
  },
  breakdownTotalLabel: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#333' 
  },
  breakdownTotalValue: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#FF5A5F' 
  },
  infoBox: {
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  infoText: {
    fontSize: 12,
    color: '#E65100',
    marginBottom: 5,
  },
  onlineAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  onlineAmountInput: {
    flex: 1,
  },
  onlinePercentText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  // =============================================================
  
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
  mobileMoneyContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  confirmButton: { backgroundColor: '#4CAF50', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  confirmButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  cancelButton: { backgroundColor: '#f0f0f0', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, marginBottom: 30 },
  cancelButtonText: { color: '#FF5A5F', fontSize: 16, fontWeight: 'bold' },
  paymentMethodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
    marginBottom: 20,
  },
  paymentMethodButton: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  paymentMethodSelected: {
    borderColor: '#FF5A5F',
    backgroundColor: '#fff5f5',
  },
  paymentMethodText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  paymentMethodTextSelected: {
    color: '#FF5A5F',
  },
  paymentMethodDesc: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});