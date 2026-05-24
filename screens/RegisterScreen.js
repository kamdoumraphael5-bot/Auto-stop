import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import config from '../config';

export default function RegisterScreen({ route, navigation }) {
  const { language = 'fr' } = route.params || {};
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [countryCode, setCountryCode] = useState('CM');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Liste des pays
  const countries = [
    { code: 'CM', name: 'Cameroun (+237)', phoneCode: '+237' },
    { code: 'CI', name: "Côte d'Ivoire (+225)", phoneCode: '+225' },
    { code: 'SN', name: 'Sénégal (+221)', phoneCode: '+221' },
    { code: 'GA', name: 'Gabon (+241)', phoneCode: '+241' },
    { code: 'FR', name: 'France (+33)', phoneCode: '+33' },
    { code: 'BE', name: 'Belgique (+32)', phoneCode: '+32' },
    { code: 'CH', name: 'Suisse (+41)', phoneCode: '+41' },
    { code: 'US', name: 'États-Unis (+1)', phoneCode: '+1' },
    { code: 'CA', name: 'Canada (+1)', phoneCode: '+1' },
    { code: 'GB', name: 'Royaume-Uni (+44)', phoneCode: '+44' },
    { code: 'DE', name: 'Allemagne (+49)', phoneCode: '+49' },
    { code: 'ES', name: 'Espagne (+34)', phoneCode: '+34' },
    { code: 'IT', name: 'Italie (+39)', phoneCode: '+39' },
    { code: 'PT', name: 'Portugal (+351)', phoneCode: '+351' },
    { code: 'NL', name: 'Pays-Bas (+31)', phoneCode: '+31' },
    { code: 'RU', name: 'Russie (+7)', phoneCode: '+7' },
    { code: 'CN', name: 'Chine (+86)', phoneCode: '+86' },
    { code: 'IN', name: 'Inde (+91)', phoneCode: '+91' },
    { code: 'JP', name: 'Japon (+81)', phoneCode: '+81' },
    { code: 'BR', name: 'Brésil (+55)', phoneCode: '+55' },
    { code: 'AU', name: 'Australie (+61)', phoneCode: '+61' },
  ];

  const translations = {
    fr: {
      title: 'Inscription',
      name: 'Nom complet',
      email: 'Email',
      phone: 'Téléphone',
      country: 'Pays',
      password: 'Mot de passe',
      confirmPassword: 'Confirmer le mot de passe',
      register: "S'inscrire",
      alreadyAccount: 'Déjà un compte ? Se connecter',
      error: 'Erreur',
      success: 'Inscription réussie',
      passwordMismatch: 'Les mots de passe ne correspondent pas',
      verificationRequired: 'Code de vérification envoyé',
      verificationMessage: 'Un code de vérification a été envoyé à votre email.'
    },
    en: {
      title: 'Sign up',
      name: 'Full name',
      email: 'Email',
      phone: 'Phone number',
      country: 'Country',
      password: 'Password',
      confirmPassword: 'Confirm password',
      register: 'Sign up',
      alreadyAccount: 'Already have an account? Login',
      error: 'Error',
      success: 'Registration successful',
      passwordMismatch: 'Passwords do not match',
      verificationRequired: 'Verification code sent',
      verificationMessage: 'A verification code has been sent to your email.'
    },
    es: {
      title: 'Registrarse',
      name: 'Nombre completo',
      email: 'Correo electrónico',
      phone: 'Teléfono',
      country: 'País',
      password: 'Contraseña',
      confirmPassword: 'Confirmar contraseña',
      register: 'Registrarse',
      alreadyAccount: '¿Ya tienes una cuenta? Iniciar sesión',
      error: 'Error',
      success: 'Registro exitoso',
      passwordMismatch: 'Las contraseñas no coinciden',
      verificationRequired: 'Código de verificación enviado',
      verificationMessage: 'Se ha enviado un código de verificación a su correo electrónico.'
    },
    pt: {
      title: 'Cadastrar-se',
      name: 'Nome completo',
      email: 'E-mail',
      phone: 'Telefone',
      country: 'País',
      password: 'Senha',
      confirmPassword: 'Confirmar senha',
      register: 'Cadastrar-se',
      alreadyAccount: 'Já tem uma conta? Fazer login',
      error: 'Erro',
      success: 'Cadastro realizado com sucesso',
      passwordMismatch: 'As senhas não coincidem',
      verificationRequired: 'Código de verificação enviado',
      verificationMessage: 'Um código de verificação foi enviado para seu e-mail.'
    }
  };

  const t = translations[language];

  const handleRegister = async () => {
    if (!name || !email || !phone || !password) {
      Alert.alert(t.error, 'Please fill all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(t.error, t.passwordMismatch);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${config.API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          email, 
          phone, 
          password,
          countryCode,
          language
        })
      });

      const data = await response.json();
      
      // Vérifier si la vérification est requise
      if (response.ok && data.requiresVerification) {
        Alert.alert(t.verificationRequired, t.verificationMessage);
        navigation.navigate('VerifyOtp', { 
          email: data.email, 
          phone: data.phone,
          userId: data.userId,
          language
        });
      } else if (response.ok) {
        Alert.alert(t.success, 'Account created successfully!');
        navigation.navigate('Login', { language });
      } else {
        Alert.alert(t.error, data.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Erreur inscription:', error);
      Alert.alert(t.error, 'Server connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🚗 {t.title}</Text>

        <TextInput
          style={styles.input}
          placeholder={t.name}
          value={name}
          onChangeText={setName}
        />

        <TextInput
          style={styles.input}
          placeholder={t.email}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder={t.phone}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>{t.country}</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={countryCode}
            onValueChange={(itemValue) => setCountryCode(itemValue)}
            style={styles.picker}
          >
            {countries.map((country) => (
              <Picker.Item key={country.code} label={country.name} value={country.code} />
            ))}
          </Picker>
        </View>

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder={t.password}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
            <Text>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          placeholder={t.confirmPassword}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showPassword}
        />

        <TouchableOpacity style={styles.registerButton} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.registerButtonText}>{t.register}</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login', { language })}>
          <Text style={styles.loginText}>{t.alreadyAccount}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingTop: 40 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#FF5A5F', textAlign: 'center', marginBottom: 40 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 10, marginBottom: 15, fontSize: 16, backgroundColor: '#f8f8f8' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 5, marginTop: 10 },
  pickerContainer: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, backgroundColor: '#f8f8f8', marginBottom: 15 },
  picker: { height: 50 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  passwordInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 10, fontSize: 16, backgroundColor: '#f8f8f8', paddingRight: 50 },
  eyeButton: { position: 'absolute', right: 15, padding: 10 },
  registerButton: { backgroundColor: '#FF5A5F', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  registerButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  loginText: { textAlign: 'center', color: '#FF5A5F', marginTop: 20, fontSize: 14 }
});