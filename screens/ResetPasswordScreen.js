import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator
} from 'react-native';
import config from '../config';
//const API_URL = 'http://192.168.0.109:3000';

export default function ResetPasswordScreen({ route, navigation }) {
  const { token } = route.params || {};
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validToken, setValidToken] = useState(false);
  const [checking, setChecking] = useState(true);

  // Vérifier la validité du token au chargement
  useEffect(() => {
    verifyToken();
  }, []);

  const verifyToken = async () => {
    if (!token) {
      Alert.alert('Erreur', 'Lien invalide', [{ text: 'OK', onPress: () => navigation.navigate('Login') }]);
      setChecking(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/verify-reset-token?token=${token}`);
      const data = await response.json();

      if (response.ok && data.valid) {
        setValidToken(true);
      } else {
        Alert.alert('Erreur', 'Lien invalide ou expiré', [{ text: 'OK', onPress: () => navigation.navigate('Login') }]);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Connexion au serveur impossible');
    } finally {
      setChecking(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert('Succès', 'Votre mot de passe a été réinitialisé', [
          { text: 'OK', onPress: () => navigation.navigate('Login') }
        ]);
      } else {
        Alert.alert('Erreur', data.error || 'Une erreur est survenue');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Connexion au serveur impossible');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF5A5F" />
      </View>
    );
  }

  if (!validToken) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔐 Nouveau mot de passe</Text>

      <TextInput
        style={styles.input}
        placeholder="Nouveau mot de passe"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
      />

      <TextInput
        style={styles.input}
        placeholder="Confirmer le mot de passe"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleResetPassword} disabled={loading}>
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Réinitialiser</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20, justifyContent: 'center' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FF5A5F', textAlign: 'center', marginBottom: 40 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 10, marginBottom: 20, fontSize: 16, backgroundColor: '#f8f8f8' },
  button: { backgroundColor: '#4CAF50', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});