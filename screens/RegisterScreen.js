import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Modal
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

const API_URL = 'http://192.168.0.109:3000';

export default function RegisterScreen({ route, navigation }) {
  const { language = 'fr' } = route.params || {};
  
  // États du formulaire
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [countryCode, setCountryCode] = useState('CM');
  const [cniNumber, setCniNumber] = useState('');
  const [cniExpiryDate, setCniExpiryDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // États pour la validation SMS
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [tempUserId, setTempUserId] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);

  const translations = {
    fr: {
      title: 'Inscription',
      lastName: 'Nom',
      firstName: 'Prénom',
      email: 'Email',
      phone: 'Téléphone',
      password: 'Mot de passe',
      confirmPassword: 'Confirmer le mot de passe',
      country: 'Pays',
      cniNumber: 'Numéro CNI / Passeport',
      cniExpiryDate: "Date d'expiration CNI",
      expiryWarning: "La date d'expiration doit être postérieure à aujourd'hui",
      register: "S'inscrire",
      alreadyAccount: 'Déjà un compte ? Se connecter',
      verificationTitle: 'Vérification SMS',
      verificationSubtitle: 'Un code a été envoyé par SMS au',
      verificationPlaceholder: 'Entrez le code à 6 chiffres',
      verify: 'Vérifier',
      resend: 'Renvoyer le code',
      resendWait: 'Attendez {seconds}s',
      invalidCode: 'Code invalide',
      codeSent: 'Code envoyé',
      success: 'Inscription réussie !'
    },
    en: {
      title: 'Sign up',
      lastName: 'Last name',
      firstName: 'First name',
      email: 'Email',
      phone: 'Phone',
      password: 'Password',
      confirmPassword: 'Confirm password',
      country: 'Country',
      cniNumber: 'ID / Passport number',
      cniExpiryDate: 'ID expiry date',
      expiryWarning: 'Expiry date must be after today',
      register: 'Sign up',
      alreadyAccount: 'Already have an account? Log in',
      verificationTitle: 'SMS Verification',
      verificationSubtitle: 'A code has been sent via SMS to',
      verificationPlaceholder: 'Enter 6-digit code',
      verify: 'Verify',
      resend: 'Resend code',
      resendWait: 'Wait {seconds}s',
      invalidCode: 'Invalid code',
      codeSent: 'Code sent',
      success: 'Registration successful!'
    },
    es: {
      title: 'Registro',
      lastName: 'Apellido',
      firstName: 'Nombre',
      email: 'Correo',
      phone: 'Teléfono',
      password: 'Contraseña',
      confirmPassword: 'Confirmar contraseña',
      country: 'País',
      cniNumber: 'Nº CI / Pasaporte',
      cniExpiryDate: 'Fecha de expiración',
      expiryWarning: 'La fecha debe ser posterior a hoy',
      register: 'Registrarse',
      alreadyAccount: '¿Ya tienes cuenta? Iniciar sesión',
      verificationTitle: 'Verificación SMS',
      verificationSubtitle: 'Se envió un código por SMS a',
      verificationPlaceholder: 'Ingrese el código de 6 dígitos',
      verify: 'Verificar',
      resend: 'Reenviar código',
      resendWait: 'Espere {seconds}s',
      invalidCode: 'Código inválido',
      codeSent: 'Código enviado',
      success: '¡Registro exitoso!'
    },
    pt: {
      title: 'Cadastro',
      lastName: 'Sobrenome',
      firstName: 'Nome',
      email: 'Email',
      phone: 'Telefone',
      password: 'Senha',
      confirmPassword: 'Confirmar senha',
      country: 'País',
      cniNumber: 'Nº BI / Passaporte',
      cniExpiryDate: 'Data de expiração',
      expiryWarning: 'A data deve ser posterior a hoje',
      register: 'Cadastrar',
      alreadyAccount: 'Já tem conta? Entrar',
      verificationTitle: 'Verificação SMS',
      verificationSubtitle: 'Um código foi enviado por SMS para',
      verificationPlaceholder: 'Digite o código de 6 dígitos',
      verify: 'Verificar',
      resend: 'Reenviar código',
      resendWait: 'Aguarde {seconds}s',
      invalidCode: 'Código inválido',
      codeSent: 'Código enviado',
      success: 'Cadastro realizado!'
    }
  };

  const t = translations[language];

  const countries = [
    { code: 'CM', name: 'Cameroun', phoneCode: '+237' },
    { code: 'CI', name: "Côte d'Ivoire", phoneCode: '+225' },
    { code: 'SN', name: 'Sénégal', phoneCode: '+221' },
    { code: 'GA', name: 'Gabon', phoneCode: '+241' }
  ];

  // Vérifier que la date d'expiration est valide
  const isExpiryDateValid = (dateStr) => {
    if (!dateStr) return false;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return false;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const expiryDate = new Date(year, month, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return expiryDate > today;
  };

  // Formater la date pour l'API
  const formatDateForAPI = (dateStr) => {
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };

  // Première étape : créer l'utilisateur et envoyer le code SMS
  const handleRegister = async () => {
    // Validation des champs
    if (!lastName || !firstName || !email || !phone || !password || !confirmPassword || !cniNumber || !cniExpiryDate) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (!isExpiryDateValid(cniExpiryDate)) {
      Alert.alert('Erreur', t.expiryWarning);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${firstName} ${lastName}`,
          email,
          phone: `${countries.find(c => c.code === countryCode).phoneCode}${phone}`,
          password,
          countryCode,
          cniNumber,
          cniExpiryDate: formatDateForAPI(cniExpiryDate)
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setTempUserId(data.userId);
        setShowVerificationModal(true);
        startResendTimer();
      } else {
        Alert.alert('Erreur', data.error);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Connexion au serveur impossible');
    } finally {
      setLoading(false);
    }
  };

  // Vérifier le code SMS
  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      Alert.alert('Erreur', 'Code à 6 chiffres requis');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/verify-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: tempUserId,
          code: verificationCode
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setShowVerificationModal(false);
        Alert.alert(t.success, t.success);
        navigation.navigate('Login', { language });
      } else {
        Alert.alert('Erreur', data.error || t.invalidCode);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Connexion au serveur impossible');
    } finally {
      setLoading(false);
    }
  };

  // Renvoyer le code SMS
  const handleResendCode = async () => {
    if (!canResend) return;

    setCanResend(false);
    try {
      const response = await fetch(`${API_URL}/api/resend-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: tempUserId })
      });

      if (response.ok) {
        Alert.alert(t.codeSent, t.codeSent);
        startResendTimer();
      } else {
        Alert.alert('Erreur', 'Impossible de renvoyer le code');
        setCanResend(true);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Connexion au serveur impossible');
      setCanResend(true);
    }
  };

  // Timer pour le renvoi de SMS
  const startResendTimer = () => {
    setResendTimer(60);
    setCanResend(false);
    const timer = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📝 {t.title}</Text>

      <TextInput style={styles.input} placeholder={t.lastName} value={lastName} onChangeText={setLastName} />
      <TextInput style={styles.input} placeholder={t.firstName} value={firstName} onChangeText={setFirstName} />
      <TextInput style={styles.input} placeholder={t.email} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      
      <View style={styles.phoneContainer}>
        <View style={styles.phoneCodeContainer}>
          <Text style={styles.phoneCodeText}>{countries.find(c => c.code === countryCode)?.phoneCode}</Text>
        </View>
        <TextInput style={styles.phoneInput} placeholder={t.phone} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      </View>

      <View style={styles.pickerContainer}>
        <Picker selectedValue={countryCode} onValueChange={setCountryCode} style={styles.picker}>
          {countries.map(c => <Picker.Item key={c.code} label={c.name} value={c.code} />)}
        </Picker>
      </View>

      <TextInput style={styles.input} placeholder={t.cniNumber} value={cniNumber} onChangeText={setCniNumber} />
      
      {/* Champ date d'expiration avec petit label */}
      <Text style={styles.smallLabel}>{t.cniExpiryDate}</Text>
      <TextInput 
        style={styles.input} 
        placeholder="DD/MM/YYYY" 
        value={cniExpiryDate} 
        onChangeText={setCniExpiryDate} 
      />

      <View style={styles.passwordContainer}>
        <TextInput style={styles.passwordInput} placeholder={t.password} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
          <Text style={styles.eyeButtonText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
        </TouchableOpacity>
      </View>

      <TextInput style={styles.input} placeholder={t.confirmPassword} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPassword} />

      <TouchableOpacity style={styles.registerButton} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.registerButtonText}>{t.register}</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login', { language })}>
        <Text style={styles.loginLink}>{t.alreadyAccount}</Text>
      </TouchableOpacity>

      {/* Modal de vérification SMS */}
      <Modal visible={showVerificationModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📱 {t.verificationTitle}</Text>
            <Text style={styles.modalSubtitle}>
              {t.verificationSubtitle} {phone}
            </Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder={t.verificationPlaceholder}
              value={verificationCode}
              onChangeText={setVerificationCode}
              keyboardType="numeric"
              maxLength={6}
            />

            <TouchableOpacity style={styles.modalButton} onPress={handleVerifyCode}>
              <Text style={styles.modalButtonText}>{t.verify}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleResendCode} disabled={!canResend}>
              <Text style={[styles.resendText, !canResend && styles.resendTextDisabled]}>
                {canResend ? t.resend : t.resendWait.replace('{seconds}', resendTimer)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FF5A5F', textAlign: 'center', marginTop: 40, marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 10, marginBottom: 15, fontSize: 16, backgroundColor: '#f8f8f8' },
  smallLabel: { fontSize: 12, color: '#666', marginBottom: 5, marginLeft: 5 },
  phoneContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  phoneCodeContainer: { backgroundColor: '#f0f0f0', paddingHorizontal: 15, paddingVertical: 15, borderRadius: 10, borderWidth: 1, borderColor: '#ddd' },
  phoneCodeText: { fontSize: 16, color: '#333' },
  phoneInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 10, fontSize: 16, backgroundColor: '#f8f8f8', marginLeft: 10 },
  pickerContainer: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, backgroundColor: '#f8f8f8', marginBottom: 15 },
  picker: { height: 50 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  passwordInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 10, fontSize: 16, backgroundColor: '#f8f8f8', paddingRight: 50 },
  eyeButton: { position: 'absolute', right: 15, padding: 10 },
  eyeButtonText: { fontSize: 20 },
  registerButton: { backgroundColor: '#FF5A5F', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  registerButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  loginLink: { textAlign: 'center', color: '#FF5A5F', marginTop: 20, marginBottom: 40, fontSize: 14 },
  
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 20, width: '85%' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#FF5A5F', textAlign: 'center', marginBottom: 10 },
  modalSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  modalInput: { borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 10, fontSize: 20, textAlign: 'center', letterSpacing: 5, backgroundColor: '#f8f8f8', marginBottom: 20 },
  modalButton: { backgroundColor: '#FF5A5F', padding: 15, borderRadius: 10, alignItems: 'center' },
  modalButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  resendText: { textAlign: 'center', color: '#FF5A5F', marginTop: 15, fontSize: 14 },
  resendTextDisabled: { color: '#ccc' }
});