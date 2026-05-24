import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from './services/pushNotificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import des écrans
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import PublishRideScreen from './screens/PublishRideScreen';
import BookingScreen from './screens/BookingScreen';
import SearchRideScreen from './screens/SearchRideScreen';
import MyRidesScreen from './screens/MyRidesScreen';
import ProfileScreen from './screens/ProfileScreen';
import PublicProfileScreen from './screens/PublicProfileScreen';
import ChatScreen from './screens/ChatScreen';
import ConversationsScreen from './screens/ConversationsScreen';
import RideDetailsScreen from './screens/RideDetailsScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import RateRideScreen from './screens/RateRideScreen';
import VerifyOtpScreen from './screens/VerifyOtpScreen';
import ResetPasswordWithOtpScreen from './screens/ResetPasswordWithOtpScreen';

// Context
import { SocketProvider } from './context/SocketContext';
import config from './config';

const Stack = createStackNavigator();

// Configuration du handler de notifications
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigationRef = useRef();
    let notificationListener = null;
    let responseListener = null;

    // Charger l'utilisateur depuis AsyncStorage au démarrage
    useEffect(() => {
        loadUser();
    }, []);

    // Gestionnaire de notifications
    useEffect(() => {
        // Écouter les notifications reçues pendant que l'app est ouverte
        notificationListener = Notifications.addNotificationReceivedListener(notification => {
            console.log('📱 Notification reçue en premier plan:', notification);
        });

        // Écouter la réponse à une notification (clic)
        responseListener = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data;
            console.log('🔔 Clic sur notification:', data);
            
            // Navigation vers l'écran approprié selon le type de notification
            if (navigationRef.current && data?.rideId) {
                if (data.type === 'new_booking' || data.type === 'ride_started') {
                    navigationRef.current.navigate('RideDetails', { 
                        rideId: data.rideId, 
                        user 
                    });
                } else if (data.type === 'booking_confirmed') {
                    navigationRef.current.navigate('MyRides', { 
                        user, 
                        activeTab: 'booked' 
                    });
                } else if (data.type === 'ride_completed') {
                    navigationRef.current.navigate('RateRide', { 
                        rideId: data.rideId, 
                        user 
                    });
                } else if (data?.conversationId) {
                    navigationRef.current.navigate('Chat', {
                        user,
                        conversation: { id: data.conversationId, messages: [] },
                        otherUser: { id: data.otherUserId, name: data.otherUserName }
                    });
                }
            }
        });

        return () => {
            if (notificationListener) notificationListener.remove();
            if (responseListener) responseListener.remove();
        };
    }, [user]);

    const loadUser = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const userData = await AsyncStorage.getItem('user');
            
            if (token && userData) {
                const parsedUser = JSON.parse(userData);
                setUser({ ...parsedUser, token });
                console.log('👤 Utilisateur chargé depuis storage:', parsedUser.id);
                
                // Enregistrer le token push
                await registerForPushNotificationsAsync(parsedUser.id, token);
            }
        } catch (error) {
            console.error('Erreur chargement utilisateur:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateUser = (userData) => {
        console.log('📱 App - Mise à jour utilisateur:', userData?.id);
        setUser(userData);
        
        // Enregistrer le token push après connexion/inscription
        if (userData?.token) {
            registerForPushNotificationsAsync(userData.id, userData.token);
        }
    };

    console.log('👤 App - Utilisateur actuel:', user?.id || 'Aucun');

    if (loading) {
        return null;
    }

    return (
        <SocketProvider user={user}>
            <NavigationContainer ref={navigationRef}>
                <Stack.Navigator initialRouteName={user ? "HomeScreen" : "Welcome"}>
                    <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
                    <Stack.Screen name="Login" options={{ title: 'Connexion', headerBackTitle: 'Retour' }}>
                        {(props) => <LoginScreen {...props} updateUser={updateUser} />}
                    </Stack.Screen>
                    <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Inscription', headerBackTitle: 'Retour' }} />
                    <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} options={{ title: 'Vérification', headerBackTitle: 'Retour' }} />
                    
                    {/* Mot de passe oublié */}
                    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Mot de passe oublié', headerBackTitle: 'Retour' }} />
                    <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ title: 'Nouveau mot de passe', headerBackTitle: 'Retour' }} />
                    
                    {/* Écrans principaux */}
                    <Stack.Screen name="HomeScreen" component={HomeScreen} options={{ headerShown: false }} />
                    <Stack.Screen name="PublishRide" component={PublishRideScreen} options={{ title: 'Publier un trajet', headerBackTitle: 'Retour' }} />
                    <Stack.Screen name="Booking" component={BookingScreen} options={{ title: 'Réservation', headerBackTitle: 'Retour' }} />
                    <Stack.Screen name="SearchRide" component={SearchRideScreen} options={{ title: 'Rechercher', headerBackTitle: 'Retour' }} />
                    <Stack.Screen name="MyRides" component={MyRidesScreen} options={{ title: 'Mes trajets', headerBackTitle: 'Retour' }} />
                    <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Mon profil', headerBackTitle: 'Retour' }} />
                    <Stack.Screen name="PublicProfile" component={PublicProfileScreen} options={{ title: 'Profil conducteur', headerBackTitle: 'Retour' }} />
                    <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
                    <Stack.Screen name="Conversations" component={ConversationsScreen} options={{ title: 'Messages', headerBackTitle: 'Retour' }} />
                    <Stack.Screen name="RideDetails" component={RideDetailsScreen} options={{ title: 'Détails du trajet', headerBackTitle: 'Retour' }} />
                    <Stack.Screen name="RateRide" component={RateRideScreen} options={{ title: 'Noter un trajet', headerBackTitle: 'Retour' }} />
		    <Stack.Screen name="ResetPasswordWithOtp" component={ResetPasswordWithOtpScreen} options={{ title: 'Code de vérification', headerBackTitle: 'Retour' }} />
                </Stack.Navigator>
            </NavigationContainer>
        </SocketProvider>
    );
}