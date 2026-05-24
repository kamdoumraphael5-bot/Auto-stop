import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import config from '../config';

export default function ResetPasswordWithOtpScreen({ navigation, route }) {
  const { email, language = 'fr' } = route.params || {};
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const translations = {
    fr: {
      title: 'Nouveau mot de passe',
      subtitle: `Entrez le code reçu par email à ${email}`,
      otp_code: 'Code à 6 chiffres',
      new_password: 'Nouveau mot de passe',
      confirm_password: 'Confirmer le mot de passe',
      reset: 'Réinitialiser',
      back: 'Retour à la connexion',
      success: 'Succès',
      success_message: 'Votre mot de passe a été réinitialisé avec succès.',
      error: 'Erreur',
      invalid_code: 'Code invalide',
      password_mismatch: 'Les mots de passe ne correspondent pas',
      password_too_short: 'Le mot de passe doit contenir au moins 6 caractères'
    },
    en: {
      title: 'New password',
      subtitle: `Enter the code sent to ${email}`,
      otp_code: '6-digit code',
      new_password: 'New password',
      confirm_password: 'Confirm password',
      reset: 'Reset password',
      back: 'Back to login',
      success: 'Success',
      success_message: 'Your password has been reset successfully.',
      error: 'Error',
      invalid_code: 'Invalid code',
      password_mismatch: 'Passwords do not match',
      password_too_short: 'Password must be at least 6 characters'
    },
    es: {
      title: 'Nueva contraseña',
      subtitle: `Ingrese el código enviado a ${email}`,
      otp_code: 'Código de 6 dígitos',
      new_password: 'Nueva contraseña',
      confirm_password: 'Confirmar contraseña',
      reset: 'Restablecer',
      back: 'Volver al inicio',
      success: 'Éxito',
      success_message: 'Tu contraseña ha sido restablecida.',
      error: 'Error',
      invalid_code: 'Código inválido',
      password_mismatch: 'Las contraseñas no coinciden',
      password_too_short: 'La contraseña debe tener al menos 6 caracteres'
    },
    pt: {
      title: 'Nova senha',
      subtitle: `Digite o código enviado para ${email}`,
      otp_code: 'Código de 6 dígitos',
      new_password: 'Nova senha',
      confirm_password: 'Confirmar senha',
      reset: 'Redefinir',
      back: 'Voltar ao login',
      success: 'Sucesso',
      success_message: 'Sua senha foi redefinida com sucesso.',
      error: 'Erro',
      invalid_code: 'Código inválido',
      password_mismatch: 'As senhas não coincidem',
      password_too_short: 'A senha deve ter pelo menos 6 caracteres'
    }
  };

  const t = translations[language];

  const handleResetPassword = async () => {
    if (!otpCode || otpCode.length !== 6) {
      Alert.alert(t.error, t.invalid_code);
      return;
    }

    if (!newPassword) {
      Alert.alert(t.error, t.password_too_short);
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t.error, t.password_mismatch);
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(t.error, t.password_too_short);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${config.API_URL}/api/auth/reset-password-with-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          otpCode, 
          newPassword, 
          confirmPassword,
          language 
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert(t.success, t.success_message, [
          { text: 'OK', onPress: () => navigation.navigate('Login') }
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
          placeholder={t.otp_code}
          placeholderTextColor="#999"
          value={otpCode}
          onChangeText={setOtpCode}
          keyboardType="number-pad"
          maxLength={6}
          editable={!loading}
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder={t.new_password}
            placeholderTextColor="#999"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showPassword}
            editable={!loading}
          />
        </View>

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder={t.confirm_password}
            placeholderTextColor="#999"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            editable={!loading}
          />
        </View>

        <TouchableOpacity 
          style={styles.eyeButton} 
          onPress={() => setShowPassword(!showPassword)}
        >
          <Text style={styles.eyeButtonText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.resetButton, loading && styles.disabledButton]} 
          onPress={handleResetPassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.resetButtonText}>{t.reset}</Text>
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
    textAlign: 'center',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  passwordInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    backgroundColor: '#f8f8f8',
  },
  eyeButton: {
    position: 'absolute',
    right: 20,
    top: 270,
    padding: 10,
  },
  eyeButtonText: {
    fontSize: 20,
  },
  resetButton: {
    backgroundColor: '#FF5A5F',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  resetButtonText: {
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