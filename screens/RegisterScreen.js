import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import config from '../config';

export default function RegisterScreen({ route, navigation }) {
  const { language = 'fr' } = route.params || {};
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [countryCode, setCountryCode] = useState('CM');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Liste complète des pays du monde (code, nom, indicatif)
  const countries = [
    // Afrique
    { code: 'CM', name: 'Cameroun (+237)', phoneCode: '+237' },
    { code: 'CI', name: "Côte d'Ivoire (+225)", phoneCode: '+225' },
    { code: 'SN', name: 'Sénégal (+221)', phoneCode: '+221' },
    { code: 'GA', name: 'Gabon (+241)', phoneCode: '+241' },
    { code: 'MA', name: 'Maroc (+212)', phoneCode: '+212' },
    { code: 'TN', name: 'Tunisie (+216)', phoneCode: '+216' },
    { code: 'DZ', name: 'Algérie (+213)', phoneCode: '+213' },
    { code: 'EG', name: 'Égypte (+20)', phoneCode: '+20' },
    { code: 'NG', name: 'Nigéria (+234)', phoneCode: '+234' },
    { code: 'GH', name: 'Ghana (+233)', phoneCode: '+233' },
    { code: 'KE', name: 'Kenya (+254)', phoneCode: '+254' },
    { code: 'ZA', name: 'Afrique du Sud (+27)', phoneCode: '+27' },
    { code: 'AO', name: 'Angola (+244)', phoneCode: '+244' },
    { code: 'BJ', name: 'Bénin (+229)', phoneCode: '+229' },
    { code: 'BF', name: 'Burkina Faso (+226)', phoneCode: '+226' },
    { code: 'BI', name: 'Burundi (+257)', phoneCode: '+257' },
    { code: 'CV', name: 'Cap-Vert (+238)', phoneCode: '+238' },
    { code: 'CF', name: 'République centrafricaine (+236)', phoneCode: '+236' },
    { code: 'TD', name: 'Tchad (+235)', phoneCode: '+235' },
    { code: 'KM', name: 'Comores (+269)', phoneCode: '+269' },
    { code: 'CG', name: 'Congo (+242)', phoneCode: '+242' },
    { code: 'CD', name: 'République démocratique du Congo (+243)', phoneCode: '+243' },
    { code: 'DJ', name: 'Djibouti (+253)', phoneCode: '+253' },
    { code: 'GQ', name: 'Guinée équatoriale (+240)', phoneCode: '+240' },
    { code: 'ER', name: 'Érythrée (+291)', phoneCode: '+291' },
    { code: 'ET', name: 'Éthiopie (+251)', phoneCode: '+251' },
    { code: 'GM', name: 'Gambie (+220)', phoneCode: '+220' },
    { code: 'GN', name: 'Guinée (+224)', phoneCode: '+224' },
    { code: 'GW', name: 'Guinée-Bissau (+245)', phoneCode: '+245' },
    { code: 'LS', name: 'Lesotho (+266)', phoneCode: '+266' },
    { code: 'LR', name: 'Liberia (+231)', phoneCode: '+231' },
    { code: 'LY', name: 'Libye (+218)', phoneCode: '+218' },
    { code: 'MG', name: 'Madagascar (+261)', phoneCode: '+261' },
    { code: 'MW', name: 'Malawi (+265)', phoneCode: '+265' },
    { code: 'ML', name: 'Mali (+223)', phoneCode: '+223' },
    { code: 'MR', name: 'Mauritanie (+222)', phoneCode: '+222' },
    { code: 'MU', name: 'Maurice (+230)', phoneCode: '+230' },
    { code: 'MA', name: 'Maroc (+212)', phoneCode: '+212' },
    { code: 'MZ', name: 'Mozambique (+258)', phoneCode: '+258' },
    { code: 'NA', name: 'Namibie (+264)', phoneCode: '+264' },
    { code: 'NE', name: 'Niger (+227)', phoneCode: '+227' },
    { code: 'NG', name: 'Nigéria (+234)', phoneCode: '+234' },
    { code: 'RW', name: 'Rwanda (+250)', phoneCode: '+250' },
    { code: 'ST', name: 'Sao Tomé-et-Principe (+239)', phoneCode: '+239' },
    { code: 'SC', name: 'Seychelles (+248)', phoneCode: '+248' },
    { code: 'SL', name: 'Sierra Leone (+232)', phoneCode: '+232' },
    { code: 'SO', name: 'Somalie (+252)', phoneCode: '+252' },
    { code: 'SS', name: 'Soudan du Sud (+211)', phoneCode: '+211' },
    { code: 'SD', name: 'Soudan (+249)', phoneCode: '+249' },
    { code: 'SZ', name: 'Eswatini (+268)', phoneCode: '+268' },
    { code: 'TZ', name: 'Tanzanie (+255)', phoneCode: '+255' },
    { code: 'TG', name: 'Togo (+228)', phoneCode: '+228' },
    { code: 'UG', name: 'Ouganda (+256)', phoneCode: '+256' },
    { code: 'ZM', name: 'Zambie (+260)', phoneCode: '+260' },
    { code: 'ZW', name: 'Zimbabwe (+263)', phoneCode: '+263' },
    // Europe
    { code: 'FR', name: 'France (+33)', phoneCode: '+33' },
    { code: 'BE', name: 'Belgique (+32)', phoneCode: '+32' },
    { code: 'CH', name: 'Suisse (+41)', phoneCode: '+41' },
    { code: 'LU', name: 'Luxembourg (+352)', phoneCode: '+352' },
    { code: 'DE', name: 'Allemagne (+49)', phoneCode: '+49' },
    { code: 'ES', name: 'Espagne (+34)', phoneCode: '+34' },
    { code: 'IT', name: 'Italie (+39)', phoneCode: '+39' },
    { code: 'PT', name: 'Portugal (+351)', phoneCode: '+351' },
    { code: 'NL', name: 'Pays-Bas (+31)', phoneCode: '+31' },
    { code: 'GB', name: 'Royaume-Uni (+44)', phoneCode: '+44' },
    { code: 'IE', name: 'Irlande (+353)', phoneCode: '+353' },
    { code: 'AT', name: 'Autriche (+43)', phoneCode: '+43' },
    { code: 'DK', name: 'Danemark (+45)', phoneCode: '+45' },
    { code: 'FI', name: 'Finlande (+358)', phoneCode: '+358' },
    { code: 'SE', name: 'Suède (+46)', phoneCode: '+46' },
    { code: 'NO', name: 'Norvège (+47)', phoneCode: '+47' },
    { code: 'IS', name: 'Islande (+354)', phoneCode: '+354' },
    { code: 'GR', name: 'Grèce (+30)', phoneCode: '+30' },
    { code: 'TR', name: 'Turquie (+90)', phoneCode: '+90' },
    { code: 'RU', name: 'Russie (+7)', phoneCode: '+7' },
    { code: 'UA', name: 'Ukraine (+380)', phoneCode: '+380' },
    { code: 'PL', name: 'Pologne (+48)', phoneCode: '+48' },
    { code: 'CZ', name: 'République tchèque (+420)', phoneCode: '+420' },
    { code: 'SK', name: 'Slovaquie (+421)', phoneCode: '+421' },
    { code: 'HU', name: 'Hongrie (+36)', phoneCode: '+36' },
    { code: 'RO', name: 'Roumanie (+40)', phoneCode: '+40' },
    { code: 'BG', name: 'Bulgarie (+359)', phoneCode: '+359' },
    { code: 'HR', name: 'Croatie (+385)', phoneCode: '+385' },
    { code: 'RS', name: 'Serbie (+381)', phoneCode: '+381' },
    { code: 'BA', name: 'Bosnie-Herzégovine (+387)', phoneCode: '+387' },
    { code: 'AL', name: 'Albanie (+355)', phoneCode: '+355' },
    { code: 'MK', name: 'Macédoine du Nord (+389)', phoneCode: '+389' },
    { code: 'ME', name: 'Monténégro (+382)', phoneCode: '+382' },
    { code: 'LT', name: 'Lituanie (+370)', phoneCode: '+370' },
    { code: 'LV', name: 'Lettonie (+371)', phoneCode: '+371' },
    { code: 'EE', name: 'Estonie (+372)', phoneCode: '+372' },
    { code: 'BY', name: 'Biélorussie (+375)', phoneCode: '+375' },
    { code: 'MD', name: 'Moldavie (+373)', phoneCode: '+373' },
    { code: 'AM', name: 'Arménie (+374)', phoneCode: '+374' },
    { code: 'GE', name: 'Géorgie (+995)', phoneCode: '+995' },
    { code: 'AZ', name: 'Azerbaïdjan (+994)', phoneCode: '+994' },
    // Amérique du Nord
    { code: 'US', name: 'États-Unis (+1)', phoneCode: '+1' },
    { code: 'CA', name: 'Canada (+1)', phoneCode: '+1' },
    { code: 'MX', name: 'Mexique (+52)', phoneCode: '+52' },
    // Amérique centrale et Caraïbes
    { code: 'GT', name: 'Guatemala (+502)', phoneCode: '+502' },
    { code: 'HN', name: 'Honduras (+504)', phoneCode: '+504' },
    { code: 'SV', name: 'Salvador (+503)', phoneCode: '+503' },
    { code: 'NI', name: 'Nicaragua (+505)', phoneCode: '+505' },
    { code: 'CR', name: 'Costa Rica (+506)', phoneCode: '+506' },
    { code: 'PA', name: 'Panama (+507)', phoneCode: '+507' },
    { code: 'CU', name: 'Cuba (+53)', phoneCode: '+53' },
    { code: 'DO', name: 'République dominicaine (+1)', phoneCode: '+1' },
    { code: 'PR', name: 'Porto Rico (+1)', phoneCode: '+1' },
    { code: 'JM', name: 'Jamaïque (+1)', phoneCode: '+1' },
    { code: 'HT', name: 'Haïti (+509)', phoneCode: '+509' },
    { code: 'BS', name: 'Bahamas (+1)', phoneCode: '+1' },
    { code: 'TT', name: 'Trinité-et-Tobago (+1)', phoneCode: '+1' },
    // Amérique du Sud
    { code: 'BR', name: 'Brésil (+55)', phoneCode: '+55' },
    { code: 'AR', name: 'Argentine (+54)', phoneCode: '+54' },
    { code: 'CL', name: 'Chili (+56)', phoneCode: '+56' },
    { code: 'PE', name: 'Pérou (+51)', phoneCode: '+51' },
    { code: 'CO', name: 'Colombie (+57)', phoneCode: '+57' },
    { code: 'VE', name: 'Venezuela (+58)', phoneCode: '+58' },
    { code: 'EC', name: 'Équateur (+593)', phoneCode: '+593' },
    { code: 'BO', name: 'Bolivie (+591)', phoneCode: '+591' },
    { code: 'PY', name: 'Paraguay (+595)', phoneCode: '+595' },
    { code: 'UY', name: 'Uruguay (+598)', phoneCode: '+598' },
    { code: 'GY', name: 'Guyana (+592)', phoneCode: '+592' },
    { code: 'SR', name: 'Suriname (+597)', phoneCode: '+597' },
    // Asie
    { code: 'IN', name: 'Inde (+91)', phoneCode: '+91' },
    { code: 'CN', name: 'Chine (+86)', phoneCode: '+86' },
    { code: 'JP', name: 'Japon (+81)', phoneCode: '+81' },
    { code: 'KR', name: 'Corée du Sud (+82)', phoneCode: '+82' },
    { code: 'ID', name: 'Indonésie (+62)', phoneCode: '+62' },
    { code: 'TH', name: 'Thaïlande (+66)', phoneCode: '+66' },
    { code: 'VN', name: 'Vietnam (+84)', phoneCode: '+84' },
    { code: 'MY', name: 'Malaisie (+60)', phoneCode: '+60' },
    { code: 'SG', name: 'Singapour (+65)', phoneCode: '+65' },
    { code: 'PH', name: 'Philippines (+63)', phoneCode: '+63' },
    { code: 'PK', name: 'Pakistan (+92)', phoneCode: '+92' },
    { code: 'BD', name: 'Bangladesh (+880)', phoneCode: '+880' },
    { code: 'LK', name: 'Sri Lanka (+94)', phoneCode: '+94' },
    { code: 'NP', name: 'Népal (+977)', phoneCode: '+977' },
    { code: 'KH', name: 'Cambodge (+855)', phoneCode: '+855' },
    { code: 'LA', name: 'Laos (+856)', phoneCode: '+856' },
    { code: 'MM', name: 'Myanmar (+95)', phoneCode: '+95' },
    { code: 'MN', name: 'Mongolie (+976)', phoneCode: '+976' },
    { code: 'AF', name: 'Afghanistan (+93)', phoneCode: '+93' },
    { code: 'IR', name: 'Iran (+98)', phoneCode: '+98' },
    { code: 'IQ', name: 'Irak (+964)', phoneCode: '+964' },
    { code: 'SA', name: 'Arabie saoudite (+966)', phoneCode: '+966' },
    { code: 'YE', name: 'Yémen (+967)', phoneCode: '+967' },
    { code: 'OM', name: 'Oman (+968)', phoneCode: '+968' },
    { code: 'AE', name: 'Émirats arabes unis (+971)', phoneCode: '+971' },
    { code: 'QA', name: 'Qatar (+974)', phoneCode: '+974' },
    { code: 'BH', name: 'Bahreïn (+973)', phoneCode: '+973' },
    { code: 'KW', name: 'Koweït (+965)', phoneCode: '+965' },
    { code: 'LB', name: 'Liban (+961)', phoneCode: '+961' },
    { code: 'SY', name: 'Syrie (+963)', phoneCode: '+963' },
    { code: 'JO', name: 'Jordanie (+962)', phoneCode: '+962' },
    { code: 'IL', name: 'Israël (+972)', phoneCode: '+972' },
    { code: 'PS', name: 'Palestine (+970)', phoneCode: '+970' },
    { code: 'CY', name: 'Chypre (+357)', phoneCode: '+357' },
    // Océanie
    { code: 'AU', name: 'Australie (+61)', phoneCode: '+61' },
    { code: 'NZ', name: 'Nouvelle-Zélande (+64)', phoneCode: '+64' },
    { code: 'FJ', name: 'Fidji (+679)', phoneCode: '+679' },
    { code: 'PG', name: 'Papouasie-Nouvelle-Guinée (+675)', phoneCode: '+675' },
    { code: 'SB', name: 'Îles Salomon (+677)', phoneCode: '+677' },
    { code: 'VU', name: 'Vanuatu (+678)', phoneCode: '+678' },
    { code: 'NC', name: 'Nouvelle-Calédonie (+687)', phoneCode: '+687' },
    { code: 'PF', name: 'Polynésie française (+689)', phoneCode: '+689' },
  ];

  const translations = {
    fr: {
      title: 'Inscription',
      name: 'Nom complet',
      email: 'Email',
      phone: 'Téléphone',
      country: 'Pays',
      password: 'Mot de passe',
      confirmPassword: 'Confirmer le mot de passe',
      register: "S'inscrire",
      alreadyAccount: 'Déjà un compte ? Se connecter',
      error: 'Erreur',
      success: 'Inscription réussie',
      passwordMismatch: 'Les mots de passe ne correspondent pas'
    },
    en: {
      title: 'Sign up',
      name: 'Full name',
      email: 'Email',
      phone: 'Phone number',
      country: 'Country',
      password: 'Password',
      confirmPassword: 'Confirm password',
      register: 'Sign up',
      alreadyAccount: 'Already have an account? Login',
      error: 'Error',
      success: 'Registration successful',
      passwordMismatch: 'Passwords do not match'
    }
  };

  const t = translations[language];

  const handleRegister = async () => {
    if (!name || !email || !phone || !password) {
      Alert.alert(t.error, 'Please fill all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(t.error, t.passwordMismatch);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${config.API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          email, 
          phone, 
          password,
          countryCode
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        Alert.alert(t.success, 'Account created successfully!');
        navigation.navigate('Login', { language });
      } else {
        Alert.alert(t.error, data.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Erreur inscription:', error);
      Alert.alert(t.error, 'Server connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🚗 {t.title}</Text>

        <TextInput
          style={styles.input}
          placeholder={t.name}
          value={name}
          onChangeText={setName}
        />

        <TextInput
          style={styles.input}
          placeholder={t.email}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder={t.phone}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>{t.country}</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={countryCode}
            onValueChange={(itemValue) => setCountryCode(itemValue)}
            style={styles.picker}
          >
            {countries.map((country) => (
              <Picker.Item key={country.code} label={country.name} value={country.code} />
            ))}
          </Picker>
        </View>

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder={t.password}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
            <Text>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          placeholder={t.confirmPassword}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showPassword}
        />

        <TouchableOpacity style={styles.registerButton} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.registerButtonText}>{t.register}</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login', { language })}>
          <Text style={styles.loginText}>{t.alreadyAccount}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingTop: 40 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#FF5A5F', textAlign: 'center', marginBottom: 40 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 10, marginBottom: 15, fontSize: 16, backgroundColor: '#f8f8f8' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 5, marginTop: 10 },
  pickerContainer: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, backgroundColor: '#f8f8f8', marginBottom: 15 },
  picker: { height: 50 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  passwordInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 10, fontSize: 16, backgroundColor: '#f8f8f8', paddingRight: 50 },
  eyeButton: { position: 'absolute', right: 15, padding: 10 },
  registerButton: { backgroundColor: '#FF5A5F', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  registerButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  loginText: { textAlign: 'center', color: '#FF5A5F', marginTop: 20, fontSize: 14 }
});