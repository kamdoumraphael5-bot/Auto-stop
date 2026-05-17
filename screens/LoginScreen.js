import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import config from '../config';  // ← AJOUTÉ

// SUPPRIMÉ : const API_URL = 'http://192.168.0.109:3000';

export default function LoginScreen({ navigation, updateUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const translations = {
    fr: {
      title: 'Connexion',
      email: 'Email',
      password: 'Mot de passe',
      login: 'Se connecter',
      noAccount: 'Pas encore de compte ? S\'inscrire',
      forgotPassword: 'Mot de passe oublié ?',
      error: 'Erreur',
      success: 'Connexion réussie',
      invalid: 'Email ou mot de passe incorrect'
    },
    en: {
      title: 'Login',
      email: 'Email',
      password: 'Password',
      login: 'Login',
      noAccount: 'Don\'t have an account? Sign up',
      forgotPassword: 'Forgot password?',
      error: 'Error',
      success: 'Login successful',
      invalid: 'Invalid email or password'
    },
    es: {
      title: 'Iniciar sesión',
      email: 'Correo',
      password: 'Contraseña',
      login: 'Iniciar sesión',
      noAccount: '¿No tienes cuenta? Regístrate',
      forgotPassword: '¿Olvidaste tu contraseña?',
      error: 'Error',
      success: 'Sesión iniciada',
      invalid: 'Correo o contraseña incorrectos'
    },
    pt: {
      title: 'Entrar',
      email: 'Email',
      password: 'Senha',
      login: 'Entrar',
      noAccount: 'Não tem conta? Cadastre-se',
      forgotPassword: 'Esqueceu a senha?',
      error: 'Erro',
      success: 'Login bem-sucedido',
      invalid: 'Email ou senha incorretos'
    }
  };

  const t = translations.fr;

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t.error, 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      // ✅ CORRIGÉ : Utilise config.API_URL au lieu de l'URL en dur
      const response = await fetch(`${config.API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (response.ok) {
        console.log('📱 Connexion réussie, utilisateur:', data.user.id);
        
        if (updateUser) {
          updateUser(data.user);
        } else {
          console.log('❌ updateUser est undefined!');
        }
        
        Alert.alert(t.success, `Bienvenue ${data.user.name} !`);
        navigation.replace('HomeScreen', { 
          user: { 
            ...data.user, 
            token: data.token,
            countryCode: data.user.countryCode || 'CM'
          }
        });
      } else {
        Alert.alert(t.error, data.error || t.invalid);
      }
    } catch (error) {
      console.error('Erreur connexion:', error);
      Alert.alert(t.error, 'Connexion au serveur impossible');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🚗 {t.title}</Text>

        <TextInput
          style={styles.input}
          placeholder={t.email}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder={t.password}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
            <Text style={styles.eyeButtonText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={styles.forgotText}>{t.forgotPassword}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.loginButtonText}>{t.login}</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.registerText}>{t.noAccount}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#FF5A5F', textAlign: 'center', marginBottom: 40 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 10, marginBottom: 15, fontSize: 16, backgroundColor: '#f8f8f8' },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  passwordInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 10, fontSize: 16, backgroundColor: '#f8f8f8', paddingRight: 50 },
  eyeButton: { position: 'absolute', right: 15, padding: 10 },
  eyeButtonText: { fontSize: 20 },
  forgotText: { textAlign: 'right', color: '#FF5A5F', marginBottom: 20, fontSize: 14 },
  loginButton: { backgroundColor: '#FF5A5F', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  loginButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  registerText: { textAlign: 'center', color: '#FF5A5F', marginTop: 20, fontSize: 14 },
});