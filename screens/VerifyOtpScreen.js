import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import config from '../config';

export default function VerifyOtpScreen({ route, navigation }) {
    const { userId, email, phone, method = 'email', language = 'fr' } = route.params || {};
    const [otpCode, setOtpCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);

    const translations = {
        fr: {
            title: 'Vérification',
            subtitle: 'Entrez le code à 6 chiffres reçu par email',
            placeholder: 'Code à 6 chiffres',
            verify: 'Vérifier',
            resend: 'Renvoyer le code',
            error: 'Erreur',
            invalidCode: 'Code invalide',
            resendSuccess: 'Un nouveau code a été envoyé',
            resendError: 'Impossible d\'envoyer le code'
        },
        en: {
            title: 'Verification',
            subtitle: 'Enter the 6-digit code received by email',
            placeholder: '6-digit code',
            verify: 'Verify',
            resend: 'Resend code',
            error: 'Error',
            invalidCode: 'Invalid code',
            resendSuccess: 'A new code has been sent',
            resendError: 'Unable to send code'
        },
        es: {
            title: 'Verificación',
            subtitle: 'Ingrese el código de 6 dígitos recibido por email',
            placeholder: 'Código de 6 dígitos',
            verify: 'Verificar',
            resend: 'Reenviar código',
            error: 'Error',
            invalidCode: 'Código inválido',
            resendSuccess: 'Se ha enviado un nuevo código',
            resendError: 'No se puede enviar el código'
        },
        pt: {
            title: 'Verificação',
            subtitle: 'Digite o código de 6 dígitos recebido por email',
            placeholder: 'Código de 6 dígitos',
            verify: 'Verificar',
            resend: 'Reenviar código',
            error: 'Erro',
            invalidCode: 'Código inválido',
            resendSuccess: 'Um novo código foi enviado',
            resendError: 'Não foi possível enviar o código'
        }
    };

    const t = translations[language];

    const handleVerify = async () => {
        if (!otpCode || otpCode.length !== 6) {
            Alert.alert(t.error, 'Code à 6 chiffres requis');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${config.API_URL}/api/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, phone, otpCode })
            });

            const data = await response.json();

            if (response.ok) {
                Alert.alert('Succès', data.message);
                navigation.replace('Login');
            } else {
                Alert.alert(t.error, data.error || t.invalidCode);
            }
        } catch (error) {
            Alert.alert(t.error, 'Connexion au serveur impossible');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setResending(true);
        try {
            const response = await fetch(`${config.API_URL}/api/auth/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, phone, method })
            });

            if (response.ok) {
                Alert.alert('Succès', t.resendSuccess);
            } else {
                Alert.alert(t.error, t.resendError);
            }
        } catch (error) {
            Alert.alert(t.error, 'Connexion au serveur impossible');
        } finally {
            setResending(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>🔐 {t.title}</Text>
                <Text style={styles.subtitle}>{t.subtitle}</Text>

                <TextInput
                    style={styles.input}
                    placeholder={t.placeholder}
                    value={otpCode}
                    onChangeText={setOtpCode}
                    keyboardType="number-pad"
                    maxLength={6}
                    textAlign="center"
                />

                <TouchableOpacity style={styles.verifyButton} onPress={handleVerify} disabled={loading}>
                    {loading ? <ActivityIndicator color="white" /> : <Text style={styles.verifyButtonText}>{t.verify}</Text>}
                </TouchableOpacity>

                <TouchableOpacity onPress={handleResend} disabled={resending}>
                    <Text style={styles.resendText}>{resending ? '...' : t.resend}</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    content: { flex: 1, justifyContent: 'center', padding: 20 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#FF5A5F', textAlign: 'center', marginBottom: 10 },
    subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 30 },
    input: { borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 10, fontSize: 24, fontWeight: 'bold', backgroundColor: '#f8f8f8', marginBottom: 20, letterSpacing: 10 },
    verifyButton: { backgroundColor: '#FF5A5F', padding: 16, borderRadius: 10, alignItems: 'center', marginBottom: 15 },
    verifyButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    resendText: { textAlign: 'center', color: '#FF5A5F', fontSize: 14 }
});