import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Image, Modal, FlatList
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import config from '../config';
// const API_URL = 'http://192.168.0.109:3000';

export default function ProfileScreen({ route, navigation }) {
  const { user, language = 'fr' } = route.params || {};
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [showReviews, setShowReviews] = useState(false);
  
  // Telegram states
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState('');
  
  // Formulaire modification
  const [bio, setBio] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [preferences, setPreferences] = useState('');
  const [cniNumber, setCniNumber] = useState('');
  const [photo, setPhoto] = useState(null);

  const translations = {
    fr: {
      title: 'Mon profil',
      edit: 'Modifier',
      save: 'Enregistrer',
      cancel: 'Annuler',
      age: 'ans',
      experience: 'Expérience de conduite',
      experience0_1: '0 à 1 an',
      experience1_3: '1 à 3 ans',
      experience3_5: '3 à 5 ans',
      experience5_10: '5 à 10 ans',
      experience10: 'Plus de 10 ans',
      rating: 'Note',
      reviews: 'commentaires',
      excellent: 'Excellent',
      good: 'Bien',
      average: 'Normal',
      poor: 'Insatisfait',
      terrible: 'Très mauvais',
      verifiedProfile: 'Profil confirmé',
      cniVerified: 'CNI vérifiée',
      cniNumber: 'Numéro CNI',
      emailVerified: 'Email vérifié',
      phoneVerified: 'Téléphone vérifié',
      about: 'À propos',
      preferences: 'Préférences',
      nonSmoker: 'Voiture non-fumeur',
      noPets: 'Pas d\'animaux',
      chat: 'Discussion possible',
      trips: 'voyages',
      comments: 'commentaires des voyageurs',
      memberSince: 'Membre depuis',
      viewReviews: 'Voir les commentaires',
      close: 'Fermer',
      ratingBreakdown: 'Détail des notes',
      updatePhoto: 'Changer la photo',
      takePhoto: 'Prendre une photo',
      chooseGallery: 'Choisir dans la galerie',
      cancelAction: 'Annuler',
      telegram: 'Telegram',
      telegramSubtitle: 'Recevez vos notifications sur Telegram',
      linkTelegram: 'Lier Telegram',
      unlinkTelegram: 'Dissocier',
      telegramLinked: 'Telegram lié'
    },
    en: {
      title: 'My profile',
      edit: 'Edit',
      save: 'Save',
      cancel: 'Cancel',
      age: 'years',
      experience: 'Driving experience',
      experience0_1: '0 to 1 year',
      experience1_3: '1 to 3 years',
      experience3_5: '3 to 5 years',
      experience5_10: '5 to 10 years',
      experience10: 'More than 10 years',
      rating: 'Rating',
      reviews: 'reviews',
      excellent: 'Excellent',
      good: 'Good',
      average: 'Average',
      poor: 'Poor',
      terrible: 'Terrible',
      verifiedProfile: 'Verified profile',
      cniVerified: 'ID verified',
      cniNumber: 'ID number',
      emailVerified: 'Email verified',
      phoneVerified: 'Phone verified',
      about: 'About',
      preferences: 'Preferences',
      nonSmoker: 'Non-smoking car',
      noPets: 'No pets',
      chat: 'Chat possible',
      trips: 'trips',
      comments: 'traveler comments',
      memberSince: 'Member since',
      viewReviews: 'View comments',
      close: 'Close',
      ratingBreakdown: 'Rating breakdown',
      updatePhoto: 'Change photo',
      takePhoto: 'Take a photo',
      chooseGallery: 'Choose from gallery',
      cancelAction: 'Cancel',
      telegram: 'Telegram',
      telegramSubtitle: 'Receive your notifications on Telegram',
      linkTelegram: 'Link Telegram',
      unlinkTelegram: 'Unlink',
      telegramLinked: 'Telegram linked'
    },
    es: {
      title: 'Mi perfil',
      edit: 'Editar',
      save: 'Guardar',
      cancel: 'Cancelar',
      age: 'años',
      experience: 'Experiencia de conducción',
      experience0_1: '0 a 1 año',
      experience1_3: '1 a 3 años',
      experience3_5: '3 a 5 años',
      experience5_10: '5 a 10 años',
      experience10: 'Más de 10 años',
      rating: 'Puntuación',
      reviews: 'comentarios',
      excellent: 'Excelente',
      good: 'Bueno',
      average: 'Normal',
      poor: 'Insatisfecho',
      terrible: 'Muy malo',
      verifiedProfile: 'Perfil verificado',
      cniVerified: 'DNI verificado',
      cniNumber: 'Número DNI',
      emailVerified: 'Email verificado',
      phoneVerified: 'Teléfono verificado',
      about: 'Acerca de',
      preferences: 'Preferencias',
      nonSmoker: 'Coche no fumador',
      noPets: 'Sin mascotas',
      chat: 'Conversación posible',
      trips: 'viajes',
      comments: 'comentarios de viajeros',
      memberSince: 'Miembro desde',
      viewReviews: 'Ver comentarios',
      close: 'Cerrar',
      ratingBreakdown: 'Desglose de calificaciones',
      updatePhoto: 'Cambiar foto',
      takePhoto: 'Tomar foto',
      chooseGallery: 'Elegir de galería',
      cancelAction: 'Cancelar',
      telegram: 'Telegram',
      telegramSubtitle: 'Recibe tus notificaciones en Telegram',
      linkTelegram: 'Vincular Telegram',
      unlinkTelegram: 'Desvincular',
      telegramLinked: 'Telegram vinculado'
    },
    pt: {
      title: 'Meu perfil',
      edit: 'Editar',
      save: 'Salvar',
      cancel: 'Cancelar',
      age: 'anos',
      experience: 'Experiência de condução',
      experience0_1: '0 a 1 ano',
      experience1_3: '1 a 3 anos',
      experience3_5: '3 a 5 anos',
      experience5_10: '5 a 10 anos',
      experience10: 'Mais de 10 anos',
      rating: 'Avaliação',
      reviews: 'comentários',
      excellent: 'Excelente',
      good: 'Bom',
      average: 'Normal',
      poor: 'Insatisfeito',
      terrible: 'Muito mau',
      verifiedProfile: 'Perfil verificado',
      cniVerified: 'BI verificado',
      cniNumber: 'Número BI',
      emailVerified: 'Email verificado',
      phoneVerified: 'Telefone verificado',
      about: 'Sobre',
      preferences: 'Preferências',
      nonSmoker: 'Carro não fumador',
      noPets: 'Sem animais',
      chat: 'Conversa possível',
      trips: 'viagens',
      comments: 'comentários de viajantes',
      memberSince: 'Membro desde',
      viewReviews: 'Ver comentários',
      close: 'Fechar',
      ratingBreakdown: 'Detalhe das avaliações',
      updatePhoto: 'Mudar foto',
      takePhoto: 'Tirar foto',
      chooseGallery: 'Escolher da galeria',
      cancelAction: 'Cancelar',
      telegram: 'Telegram',
      telegramSubtitle: 'Receba suas notificações no Telegram',
      linkTelegram: 'Vincular Telegram',
      unlinkTelegram: 'Desvincular',
      telegramLinked: 'Telegram vinculado'
    }
  };

  const t = translations[language];

  useEffect(() => {
    fetchProfile();
    fetchReviews();
    checkTelegramStatus();
  }, []);

  const fetchProfile = async () => {
    try {
      // ✅ CORRIGÉ: utilise config.API_URL
      const response = await fetch(`${config.API_URL}/api/users/profile`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await response.json();
      setProfile(data.profile);
      setBio(data.profile.bio || '');
      setExperienceLevel(data.profile.experienceLevel || '');
      setPreferences(data.profile.preferences || '');
      setCniNumber(data.profile.cniNumber || '');
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      // ✅ CORRIGÉ: utilise config.API_URL
      const response = await fetch(`${config.API_URL}/api/users/${user?.id}/reviews`);
      const data = await response.json();
      setReviews(data.reviews || []);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const checkTelegramStatus = async () => {
    try {
      const response = await fetch(`${config.API_URL}/api/users/telegram-id`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await response.json();
      if (data.telegramChatId) {
        setTelegramLinked(true);
        setTelegramChatId(data.telegramChatId);
      }
    } catch (error) {
      console.error('Erreur vérification Telegram:', error);
    }
  };

  const linkTelegram = () => {
    Alert.prompt(
      t.linkTelegram,
      language === 'fr' ? '1. Envoyez /start à @Autoostopbot sur Telegram\n2. Entrez votre ID Telegram ci-dessous :' :
      language === 'en' ? '1. Send /start to @Autoostopbot on Telegram\n2. Enter your Telegram ID below:' :
      language === 'es' ? '1. Envía /start a @Autoostopbot en Telegram\n2. Ingresa tu ID de Telegram a continuación:' :
      '1. Envie /start para @Autoostopbot no Telegram\n2. Digite seu ID do Telegram abaixo:',
      [
        { text: t.cancelAction, style: 'cancel' },
        { 
          text: t.linkTelegram, 
          onPress: async (chatId) => {
            if (!chatId || chatId.trim() === '') {
              Alert.alert(t.error, language === 'fr' ? 'ID Telegram invalide' : 'Invalid Telegram ID');
              return;
            }
            
            try {
              const response = await fetch(`${config.API_URL}/api/users/link-telegram`, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${user?.token}` 
                },
                body: JSON.stringify({ telegramChatId: chatId.trim() })
              });
              
              const data = await response.json();
              
              if (response.ok) {
                Alert.alert('Succès', t.telegramLinked);
                setTelegramLinked(true);
                setTelegramChatId(chatId.trim());
              } else {
                Alert.alert('Erreur', data.error || 'Impossible de lier Telegram');
              }
            } catch (error) {
              Alert.alert('Erreur', 'Connexion au serveur impossible');
            }
          }
        }
      ]
    );
  };

  const unlinkTelegram = () => {
    Alert.alert(
      t.unlinkTelegram,
      language === 'fr' ? 'Voulez-vous vraiment dissocier votre compte Telegram ?' :
      language === 'en' ? 'Do you really want to unlink your Telegram account?' :
      language === 'es' ? '¿Realmente quieres desvincular tu cuenta de Telegram?' :
      'Deseja realmente desvincular sua conta do Telegram?',
      [
        { text: t.cancelAction, style: 'cancel' },
        { 
          text: t.unlinkTelegram, 
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${config.API_URL}/api/users/unlink-telegram`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${user?.token}` }
              });
              
              if (response.ok) {
                Alert.alert('Succès', 'Telegram dissocié');
                setTelegramLinked(false);
                setTelegramChatId('');
              } else {
                Alert.alert('Erreur', 'Impossible de dissocier Telegram');
              }
            } catch (error) {
              Alert.alert('Erreur', 'Connexion au serveur impossible');
            }
          }
        }
      ]
    );
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission', 'Nous avons besoin de la caméra');
      return;
    }
    
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    
    if (!result.canceled) {
      uploadPhoto(result.assets[0].uri);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission', 'Nous avons besoin de la galerie');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    
    if (!result.canceled) {
      uploadPhoto(result.assets[0].uri);
    }
  };

  const uploadPhoto = async (uri) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('photo', {
      uri: uri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    });
    
    try {
      // ✅ CORRIGÉ: utilise config.API_URL
      const response = await fetch(`${config.API_URL}/api/users/upload-photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });
      
      const data = await response.json();
      if (response.ok) {
        Alert.alert('Succès', 'Photo mise à jour');
        fetchProfile();
      } else {
        Alert.alert('Erreur', data.error);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Connexion au serveur impossible');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      // ✅ CORRIGÉ: utilise config.API_URL
      const response = await fetch(`${config.API_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          bio,
          experienceLevel,
          preferences,
          cniNumber
        })
      });
      
      if (response.ok) {
        Alert.alert('Succès', 'Profil mis à jour');
        setEditMode(false);
        fetchProfile();
      } else {
        Alert.alert('Erreur', 'Impossible de mettre à jour');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Connexion au serveur impossible');
    } finally {
      setLoading(false);
    }
  };

  const getExperienceText = (level) => {
    switch(level) {
      case '0-1': return t.experience0_1;
      case '1-3': return t.experience1_3;
      case '3-5': return t.experience3_5;
      case '5-10': return t.experience5_10;
      case '10+': return t.experience10;
      default: return 'Non spécifié';
    }
  };

  const getRatingBreakdown = () => {
    const total = reviews.length;
    if (total === 0) return { excellent: 0, good: 0, average: 0, poor: 0, terrible: 0 };
    
    const counts = { excellent: 0, good: 0, average: 0, poor: 0, terrible: 0 };
    reviews.forEach(r => {
      if (r.rating >= 4.5) counts.excellent++;
      else if (r.rating >= 3.5) counts.good++;
      else if (r.rating >= 2.5) counts.average++;
      else if (r.rating >= 1.5) counts.poor++;
      else counts.terrible++;
    });
    
    return counts;
  };

  const breakdown = getRatingBreakdown();
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(2)
    : (profile?.rating || '4.97');

  if (loading && !profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF5A5F" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Photo et nom */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          Alert.alert(
            t.updatePhoto,
            t.updatePhoto,
            [
              { text: t.takePhoto, onPress: takePhoto },
              { text: t.chooseGallery, onPress: pickImage },
              { text: t.cancelAction, style: 'cancel' }
            ]
          );
        }}>
          {profile?.photoUrl ? (
            <Image source={{ uri: profile.photoUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>📸</Text>
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.name}>{profile?.name}</Text>
        {profile?.age && <Text style={styles.age}>{profile.age} {t.age}</Text>}
        
        <View style={styles.verifiedBadge}>
          <Text style={styles.verifiedText}>✓ {t.verifiedProfile}</Text>
        </View>
      </View>

      {/* Statistiques */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{averageRating}</Text>
          <Text style={styles.statLabel}>⭐ {t.rating}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{totalReviews}</Text>
          <Text style={styles.statLabel}>{t.reviews}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{profile?.totalTrips || 0}</Text>
          <Text style={styles.statLabel}>{t.trips}</Text>
        </View>
      </View>

      {/* Détail des notes */}
      <TouchableOpacity style={styles.ratingBreakdown} onPress={() => setShowReviews(true)}>
        <Text style={styles.sectionTitle}>📊 {t.ratingBreakdown}</Text>
        <View style={styles.ratingBar}>
          <Text style={styles.ratingLabel}>⭐ {t.excellent}</Text>
          <View style={styles.barContainer}>
            <View style={[styles.barFill, { width: `${(breakdown.excellent / totalReviews) * 100 || 0}%`, backgroundColor: '#4CAF50' }]} />
          </View>
          <Text style={styles.ratingCount}>{breakdown.excellent}</Text>
        </View>
        <View style={styles.ratingBar}>
          <Text style={styles.ratingLabel}>👍 {t.good}</Text>
          <View style={styles.barContainer}>
            <View style={[styles.barFill, { width: `${(breakdown.good / totalReviews) * 100 || 0}%`, backgroundColor: '#8BC34A' }]} />
          </View>
          <Text style={styles.ratingCount}>{breakdown.good}</Text>
        </View>
        <View style={styles.ratingBar}>
          <Text style={styles.ratingLabel}>😐 {t.average}</Text>
          <View style={styles.barContainer}>
            <View style={[styles.barFill, { width: `${(breakdown.average / totalReviews) * 100 || 0}%`, backgroundColor: '#FFC107' }]} />
          </View>
          <Text style={styles.ratingCount}>{breakdown.average}</Text>
        </View>
        <View style={styles.ratingBar}>
          <Text style={styles.ratingLabel}>😞 {t.poor}</Text>
          <View style={styles.barContainer}>
            <View style={[styles.barFill, { width: `${(breakdown.poor / totalReviews) * 100 || 0}%`, backgroundColor: '#FF9800' }]} />
          </View>
          <Text style={styles.ratingCount}>{breakdown.poor}</Text>
        </View>
        <View style={styles.ratingBar}>
          <Text style={styles.ratingLabel}>💀 {t.terrible}</Text>
          <View style={styles.barContainer}>
            <View style={[styles.barFill, { width: `${(breakdown.terrible / totalReviews) * 100 || 0}%`, backgroundColor: '#F44336' }]} />
          </View>
          <Text style={styles.ratingCount}>{breakdown.terrible}</Text>
        </View>
      </TouchableOpacity>

      {/* Verifications */}
      <View style={styles.verifications}>
        <Text style={styles.sectionTitle}>✓ {t.verifiedProfile}</Text>
        <View style={styles.verificationItem}>
          <Text style={styles.verificationIcon}>{profile?.cniVerified ? '✅' : '⏳'}</Text>
          <Text style={styles.verificationText}>{t.cniVerified}</Text>
        </View>
        <View style={styles.verificationItem}>
          <Text style={styles.verificationIcon}>✅</Text>
          <Text style={styles.verificationText}>{t.emailVerified}</Text>
        </View>
        <View style={styles.verificationItem}>
          <Text style={styles.verificationIcon}>{profile?.phoneVerified ? '✅' : '⏳'}</Text>
          <Text style={styles.verificationText}>{t.phoneVerified}</Text>
        </View>
        {editMode && (
          <View style={styles.verificationItem}>
            <TextInput
              style={styles.cniInput}
              placeholder={t.cniNumber}
              value={cniNumber}
              onChangeText={setCniNumber}
              keyboardType="default"
            />
          </View>
        )}
      </View>

      {/* SECTION TELEGRAM */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🤖 {t.telegram}</Text>
        <Text style={styles.sectionSubtitle}>{t.telegramSubtitle}</Text>
        
        {telegramLinked ? (
          <View style={styles.linkedContainer}>
            <Text style={styles.linkedText}>✅ {t.telegramLinked}</Text>
            <TouchableOpacity style={styles.unlinkButton} onPress={unlinkTelegram}>
              <Text style={styles.unlinkButtonText}>{t.unlinkTelegram}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.telegramButton} onPress={linkTelegram}>
            <Text style={styles.telegramButtonText}>🤖 {t.linkTelegram}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Expérience */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚗 {t.experience}</Text>
        {editMode ? (
          <View style={styles.experiencePicker}>
            {['0-1', '1-3', '3-5', '5-10', '10+'].map(level => (
              <TouchableOpacity
                key={level}
                style={[styles.expOption, experienceLevel === level && styles.expOptionSelected]}
                onPress={() => setExperienceLevel(level)}
              >
                <Text style={[styles.expOptionText, experienceLevel === level && styles.expOptionTextSelected]}>
                  {getExperienceText(level)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={styles.sectionText}>{getExperienceText(profile?.experienceLevel)}</Text>
        )}
      </View>

      {/* À propos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📝 {t.about}</Text>
        {editMode ? (
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={4}
            value={bio}
            onChangeText={setBio}
            placeholder="Décrivez-vous..."
          />
        ) : (
          <Text style={styles.sectionText}>{profile?.bio || 'Aucune description'}</Text>
        )}
      </View>

      {/* Préférences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚙️ {t.preferences}</Text>
        <View style={styles.preferencesList}>
          <View style={styles.preferenceItem}>
            <Text style={styles.preferenceIcon}>🚭</Text>
            <Text style={styles.preferenceText}>{t.nonSmoker}</Text>
          </View>
          <View style={styles.preferenceItem}>
            <Text style={styles.preferenceIcon}>🐾</Text>
            <Text style={styles.preferenceText}>{t.noPets}</Text>
          </View>
          <View style={styles.preferenceItem}>
            <Text style={styles.preferenceIcon}>💬</Text>
            <Text style={styles.preferenceText}>{t.chat}</Text>
          </View>
        </View>
      </View>

      {/* Date d'inscription */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📅 {t.memberSince}</Text>
        <Text style={styles.sectionText}>
          {profile?.registrationDate ? new Date(profile.registrationDate).toLocaleDateString() : '2026'}
        </Text>
      </View>

      {/* Bouton modifier */}
      <TouchableOpacity 
        style={styles.editButton}
        onPress={() => editMode ? handleUpdateProfile() : setEditMode(true)}
      >
        <Text style={styles.editButtonText}>{editMode ? t.save : t.edit}</Text>
      </TouchableOpacity>

      {editMode && (
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => {
            setEditMode(false);
            setBio(profile?.bio || '');
            setExperienceLevel(profile?.experienceLevel || '');
            setCniNumber(profile?.cniNumber || '');
          }}
        >
          <Text style={styles.cancelButtonText}>{t.cancel}</Text>
        </TouchableOpacity>
      )}

      {/* Modal des commentaires */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showReviews}
        onRequestClose={() => setShowReviews(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>💬 {t.comments} ({totalReviews})</Text>
              <TouchableOpacity onPress={() => setShowReviews(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {reviews.length === 0 ? (
              <Text style={styles.modalEmpty}>Aucun commentaire</Text>
            ) : (
              <FlatList
                data={reviews}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <Text style={styles.reviewerName}>{item.reviewer?.name}</Text>
                      <Text style={styles.reviewRating}>⭐ {item.rating}</Text>
                    </View>
                    <Text style={styles.reviewDate}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                    <Text style={styles.reviewComment}>{item.comment}</Text>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#FF5A5F',
    padding: 30,
    paddingTop: 50,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: 'white',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 15,
  },
  age: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 5,
  },
  verifiedBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 10,
  },
  verifiedText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    padding: 15,
    marginTop: -20,
    marginHorizontal: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF5A5F',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  ratingBreakdown: {
    backgroundColor: 'white',
    margin: 15,
    padding: 15,
    borderRadius: 12,
  },
  ratingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  ratingLabel: {
    width: 70,
    fontSize: 12,
    color: '#666',
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#eee',
    borderRadius: 4,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  ratingCount: {
    width: 30,
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  verifications: {
    backgroundColor: 'white',
    margin: 15,
    padding: 15,
    borderRadius: 12,
  },
  verificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  verificationIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  verificationText: {
    fontSize: 14,
    color: '#333',
  },
  cniInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 8,
    fontSize: 14,
    backgroundColor: '#f8f8f8',
  },
  section: {
    backgroundColor: 'white',
    margin: 15,
    padding: 15,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15,
  },
  sectionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#f8f8f8',
    textAlignVertical: 'top',
  },
  preferencesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
  },
  preferenceIcon: {
    fontSize: 14,
    marginRight: 5,
  },
  preferenceText: {
    fontSize: 12,
    color: '#666',
  },
  editButton: {
    backgroundColor: '#FF5A5F',
    margin: 15,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  editButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    marginHorizontal: 15,
    marginBottom: 30,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FF5A5F',
    fontSize: 16,
    fontWeight: 'bold',
  },
  experiencePicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  expOption: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
  },
  expOptionSelected: {
    backgroundColor: '#FF5A5F',
  },
  expOptionText: {
    fontSize: 12,
    color: '#666',
  },
  expOptionTextSelected: {
    color: 'white',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 15,
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalClose: {
    fontSize: 24,
    color: '#999',
  },
  modalEmpty: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    padding: 30,
  },
  reviewCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  reviewRating: {
    fontSize: 14,
    color: '#FF5A5F',
  },
  reviewDate: {
    fontSize: 11,
    color: '#999',
    marginBottom: 8,
  },
  reviewComment: {
    fontSize: 13,
    color: '#666',
  },
  // Styles Telegram
  telegramButton: {
    backgroundColor: '#26A5E4',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 5,
  },
  telegramButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkedContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 10,
  },
  linkedText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: 'bold',
  },
  unlinkButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  unlinkButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});