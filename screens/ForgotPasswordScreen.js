import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator
} from 'react-native';
import config from '../config';
//const API_URL = 'http://192.168.0.109:3000';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendLink = async () => {
    if (!email) {
      Alert.alert('Erreur', 'Veuillez entrer votre email');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok || data.success) {
        Alert.alert(
          'Email envoyé',
          'Consultez votre boîte mail pour réinitialiser votre mot de passe',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
      } else {
        Alert.alert('Erreur', data.error || 'Une erreur est survenue');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Connexion au serveur impossible');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔐 Mot de passe oublié</Text>
      <Text style={styles.subtitle}>
        Entrez votre email, nous vous enverrons un lien pour réinitialiser votre mot de passe
      </Text>

      <TextInput
        style={styles.input}
        placeholder="votre@email.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TouchableOpacity style={styles.button} onPress={handleSendLink} disabled={loading}>
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Envoyer le lien</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>Retour à la connexion</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FF5A5F', textAlign: 'center', marginTop: 40, marginBottom: 20 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 40 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 10, marginBottom: 20, fontSize: 16, backgroundColor: '#f8f8f8' },
  button: { backgroundColor: '#FF5A5F', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  backText: { color: '#FF5A5F', fontSize: 16, textAlign: 'center', marginTop: 20 }
});