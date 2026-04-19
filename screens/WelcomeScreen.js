import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ImageBackground,
  StyleSheet,
  StatusBar,
  Platform,
  Alert
} from 'react-native';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 44;

export default function WelcomeScreen({ navigation }) {
  const [language, setLanguage] = useState('fr');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  const languages = [
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' }
  ];

  // Traductions selon la langue sélectionnée
  const translations = {
    fr: {
      login: 'Connexion',
      register: 'Inscription',
      title: 'AutoStop',
      subtitle: 'Voyagez autrement, ensemble',
      button: 'Commencer',
      bottomText: 'AutoStop – Le covoiturage africain'
    },
    en: {
      login: 'Login',
      register: 'Sign up',
      title: 'AutoStop',
      subtitle: 'Travel differently, together',
      button: 'Get started',
      bottomText: 'AutoStop – African carpooling'
    },
    es: {
      login: 'Iniciar sesión',
      register: 'Registrarse',
      title: 'AutoStop',
      subtitle: 'Viaja diferente, juntos',
      button: 'Comenzar',
      bottomText: 'AutoStop – El coviaje africano'
    },
    pt: {
      login: 'Entrar',
      register: 'Cadastrar',
      title: 'AutoStop',
      subtitle: 'Viaje diferente, juntos',
      button: 'Começar',
      bottomText: 'AutoStop – O covoojamento africano'
    }
  };

  const t = translations[language];

  const handleNavigation = (screenName) => {
    try {
      navigation.navigate(screenName, { language });
    } catch (error) {
      console.error('Erreur navigation:', error);
      Alert.alert('Erreur', `Impossible de naviguer vers ${screenName}`);
    }
  };

  return (
    <ImageBackground
      source={require('../assets/background.jpg')}
      style={styles.container}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Overlay sombre */}
      <View style={styles.overlay} />

      <View style={styles.content}>

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => handleNavigation('Login')}>
            <Text style={styles.headerText}>{t.login}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleNavigation('Register')}>
            <Text style={styles.headerText}>{t.register}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowLanguageMenu(!showLanguageMenu)}>
            <Text style={styles.headerText}>
              {languages.find(l => l.code === language).flag}
            </Text>
          </TouchableOpacity>
        </View>

        {/* MENU LANGUE */}
        {showLanguageMenu && (
          <View style={styles.languageMenu}>
            {languages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={styles.languageItem}
                onPress={() => {
                  setLanguage(lang.code);
                  setShowLanguageMenu(false);
                }}
              >
                <Text style={styles.languageText}>
                  {lang.flag} {lang.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* CENTRE */}
        <View style={styles.center}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>🚗</Text>
          </View>

          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.subtitle}>{t.subtitle}</Text>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => handleNavigation('Register')}
          >
            <Text style={styles.buttonText}>{t.button}</Text>
          </TouchableOpacity>

          <Text style={styles.bottomText}>{t.bottomText}</Text>
        </View>

      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)'
  },

  content: {
    flex: 1,
    justifyContent: 'space-between'
  },

  header: {
    marginTop: STATUSBAR_HEIGHT + 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20
  },

  headerText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500'
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -40
  },

  logoContainer: {
    backgroundColor: '#2ecc71',
    padding: 14,
    borderRadius: 50,
    marginBottom: 12
  },

  logoIcon: {
    fontSize: 28
  },

  title: {
    color: '#fff',
    fontSize: 34,
    fontWeight: 'bold',
    letterSpacing: 1
  },

  subtitle: {
    color: '#fff',
    fontSize: 16,
    marginTop: 6,
    opacity: 0.9
  },

  footer: {
    alignItems: 'center',
    marginBottom: 40
  },

  button: {
    backgroundColor: '#2ecc71',
    paddingVertical: 14,
    paddingHorizontal: 50,
    borderRadius: 30,
    marginBottom: 15,
    elevation: 3
  },

  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },

  bottomText: {
    color: '#2ecc71',
    fontSize: 14,
    opacity: 0.95
  },

  languageMenu: {
    position: 'absolute',
    top: STATUSBAR_HEIGHT + 50,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 10,
    padding: 10,
    zIndex: 100
  },

  languageItem: {
    paddingVertical: 5
  },

  languageText: {
    color: '#fff',
    fontSize: 14
  }
});