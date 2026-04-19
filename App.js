import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
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
import { SocketProvider } from './context/SocketContext';

const Stack = createStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);

  const updateUser = (userData) => {
    console.log('📱 App - Mise à jour utilisateur:', userData?.id);
    console.log('📱 App - Nom utilisateur:', userData?.name);
    setUser(userData);
  };

  console.log('👤 App - Utilisateur actuel:', user?.id || 'Aucun');

  return (
    <SocketProvider user={user}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Welcome">
          <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Login" options={{ title: 'Connexion', headerBackTitle: 'Retour' }}>
            {(props) => <LoginScreen {...props} updateUser={updateUser} />}
          </Stack.Screen>
          <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Inscription', headerBackTitle: 'Retour' }} />
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
        </Stack.Navigator>
      </NavigationContainer>
    </SocketProvider>
  );
}