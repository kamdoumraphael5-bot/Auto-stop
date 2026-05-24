// services/pushNotificationService.js
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import config from '../config';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export async function registerForPushNotificationsAsync(userId, token) {
    let pushToken;
    
    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
            console.log('❌ Permission push non accordée');
            return;
        }
        
        try {
            const projectId = Constants.expoConfig?.extra?.eas?.projectId;
            if (!projectId) {
                console.log('❌ Pas de projectId EAS');
                return;
            }
            pushToken = (
                await Notifications.getExpoPushTokenAsync({
                    projectId: projectId,
                })
            ).data;
            console.log('📱 Expo Push Token:', pushToken);
            
            // Envoyer le token au backend
            await fetch(`${config.API_URL}/api/users/push-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ pushToken, userId }),
            });
        } catch (error) {
            console.error('❌ Erreur push token:', error);
        }
    } else {
        console.log('❌ Doit être sur un appareil physique');
    }
    
    return pushToken;
}