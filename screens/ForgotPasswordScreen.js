import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import config from '../config';

export default function ForgotPasswordScreen({ navigation, route }) {
  const { language = 'fr' } = route.params || {};
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const translations = {
    fr: {
      title: 'Mot de passe oublié',
      subtitle: 'Entrez votre email pour recevoir un code de réinitialisation',
      email: 'Email',
      send: 'Envoyer le code',
      back: 'Retour à la connexion',
      sending: 'Envoi en cours...',
      success: 'Code envoyé',
      success_message: 'Un code de vérification a été envoyé à votre email.',
      error: 'Erreur',
      invalid_email: 'Veuillez entrer un email valide'
    },
    en: {
      title: 'Forgot password',
      subtitle: 'Enter your email to receive a reset code',
      email: 'Email',
      send: 'Send code',
      back: 'Back to login',
      sending: 'Sending...',
      success: 'Code sent',
      success_message: 'A verification code has been sent to your email.',
      error: 'Error',
      invalid_email: 'Please enter a valid email'
    },
    es: {
      title: 'Olvidé mi contraseña',
      subtitle: 'Ingrese su email para recibir un código',
      email: 'Email',
      send: 'Enviar código',
      back: 'Volver al inicio',
      sending: 'Enviando...',
      success: 'Código enviado',
      success_message: 'Se ha enviado un código a su email.',
      error: 'Error',
      invalid_email: 'Ingrese un email válido'
    },
    pt: {
      title: 'Esqueci a senha',
      subtitle: 'Digite seu email para receber um código',
      email: 'Email',
      send: 'Enviar código',
      back: 'Voltar ao login',
      sending: 'Enviando...',
      success: 'Código enviado',
      success_message: 'Um código foi enviado para seu email.',
      error: 'Erro',
      invalid_email: 'Digite um email válido'
    }
  };

  const t = translations[language];

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleSendCode = async () => {
    if (!email) {
      Alert.alert(t.error, t.invalid_email);
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert(t.error, t.invalid_email);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${config.API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, language }),
      });

      const data = await response.json();

      if (response.ok || data.success) {
        Alert.alert(t.success, t.success_message, [
          { 
            text: 'OK', 
            onPress: () => navigation.navigate('ResetPasswordWithOtp', { email, language })
          }
        ]);
      } else {
        Alert.alert(t.error, data.error || 'Une erreur est survenue');
      }
    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert(t.error, 'Connexion au serveur impossible');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>🔐 {t.title}</Text>
        <Text style={styles.subtitle}>{t.subtitle}</Text>

        <TextInput
          style={styles.input}
          placeholder={t.email}
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />

        <TouchableOpacity 
          style={[styles.sendButton, loading && styles.disabledButton]} 
          onPress={handleSendCode}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.sendButtonText}>{t.send}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.backButtonText}>{t.back}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF5A5F',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#f8f8f8',
  },
  sendButton: {
    backgroundColor: '#FF5A5F',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  sendButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  backButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FF5A5F',
    fontSize: 14,
  },
});