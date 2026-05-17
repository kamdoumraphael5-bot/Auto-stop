import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useSocket } from '../context/SocketContext';
import config from '../config';

//const API_URL = 'http://192.168.0.109:3000';

export default function ChatScreen({ route, navigation }) {
  const { user, otherUser, ride, language = 'fr' } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [uploading, setUploading] = useState(false);
  const { socket, isConnected, emit, on, off } = useSocket();
  const flatListRef = useRef();

  const conversationId = user?.id && otherUser?.id 
    ? `user_${[user.id, otherUser.id].sort().join('_')}`
    : null;

  const translations = {
    fr: { 
      placeholder: 'Écrivez un message...', 
      send: 'Envoyer', 
      voiceCall: 'Appel vocal', 
      videoCall: 'Appel vidéo', 
      ride: 'Trajet',
      uploading: 'Envoi en cours...'
    },
    en: { 
      placeholder: 'Write a message...', 
      send: 'Send', 
      voiceCall: 'Voice call', 
      videoCall: 'Video call', 
      ride: 'Ride',
      uploading: 'Uploading...'
    },
    es: { 
      placeholder: 'Escribe un mensaje...', 
      send: 'Enviar', 
      voiceCall: 'Llamada de voz', 
      videoCall: 'Videollamada', 
      ride: 'Viaje',
      uploading: 'Subiendo...'
    },
    pt: { 
      placeholder: 'Escreva uma mensagem...', 
      send: 'Enviar', 
      voiceCall: 'Chamada de voz', 
      videoCall: 'Chamada de vídeo', 
      ride: 'Viagem',
      uploading: 'Enviando...'
    }
  };

  const t = translations[language];

  useEffect(() => {
    if (!user || !otherUser || !conversationId) {
      Alert.alert('Erreur', 'Impossible de charger la conversation');
      navigation.goBack();
      return;
    }

    loadMessages();
    markMessagesAsRead();

    const handleNewMessage = (message) => {
      console.log('📨 Nouveau message reçu:', message);
      if (message.senderId === otherUser.id || message.receiverId === user.id) {
        setMessages(prev => [...prev, message]);
        flatListRef.current?.scrollToEnd();
        emit('messageDelivered', { messageId: message.id, conversationId });
      }
    };

    const handleMessageRead = ({ messageId }) => {
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, isRead: true } : msg
      ));
    };

    const handleMessageDelivered = ({ messageId }) => {
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, isDelivered: true } : msg
      ));
    };

    on('newMessage', handleNewMessage);
    on('messageRead', handleMessageRead);
    on('messageDelivered', handleMessageDelivered);

    return () => {
      off('newMessage', handleNewMessage);
      off('messageRead', handleMessageRead);
      off('messageDelivered', handleMessageDelivered);
    };
  }, []);

  const loadMessages = async () => {
    try {
      // ✅ CORRIGÉ : Utilise config.API_URL
      const response = await fetch(`${config.API_URL}/api/messages/${conversationId}`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await response.json();
      setMessages(data.messages || []);
      flatListRef.current?.scrollToEnd();
    } catch (error) {
      console.error('Erreur chargement messages:', error);
    }
  };

  const markMessagesAsRead = async () => {
    emit('markAsRead', { conversationId, userId: user.id });
  };

  const sendMessage = () => {
    if (!inputText.trim()) return;
    if (!isConnected) {
      Alert.alert('Erreur', 'Pas de connexion au serveur');
      return;
    }
    
    const messageData = {
      conversationId,
      senderId: user.id,
      receiverId: otherUser.id,
      content: inputText.trim(),
      type: 'text'
    };
    
    const tempMessage = {
      id: Date.now().toString(),
      conversationId,
      senderId: user.id,
      receiverId: otherUser.id,
      content: inputText.trim(),
      type: 'text',
      isRead: false,
      isDelivered: false,
      createdAt: new Date().toISOString(),
      sender: { id: user.id, name: user.name, photoUrl: user.photoUrl }
    };
    
    setMessages(prev => [...prev, tempMessage]);
    setInputText('');
    flatListRef.current?.scrollToEnd();
    
    emit('sendMessage', messageData);
  };

  const pickAndSendFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf', 'application/msword', 'text/plain'],
        copyToCacheDirectory: true
      });
      
      if (result.canceled) return;
      
      setUploading(true);
      
      const fileAsset = result.assets[0];
      
      const formData = new FormData();
      formData.append('file', {
        uri: fileAsset.uri,
        type: fileAsset.mimeType || 'application/octet-stream',
        name: fileAsset.name
      });
      formData.append('conversationId', conversationId);
      formData.append('senderId', user.id);
      formData.append('receiverId', otherUser.id);
      
      // ✅ CORRIGÉ : Utilise config.API_URL
      const response = await fetch(`${config.API_URL}/api/messages/send-file`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'multipart/form-data'
        },
        body: formData
      });
      
      const data = await response.json();
      if (response.ok) {
        setMessages(prev => [...prev, data.message]);
        flatListRef.current?.scrollToEnd();
      } else {
        Alert.alert('Erreur', data.error);
      }
    } catch (error) {
      console.error('Erreur envoi fichier:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer le fichier');
    } finally {
      setUploading(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = item.senderId === user.id;
    const isFile = item.type === 'file';
    
    return (
      <View style={[styles.messageRow, isMyMessage ? styles.myMessageRow : styles.otherMessageRow]}>
        <View style={[styles.messageBubble, isMyMessage ? styles.myBubble : styles.otherBubble]}>
          {isFile ? (
            <TouchableOpacity onPress={() => Alert.alert('Fichier', `Téléchargement: ${item.fileName}`)}>
              <Text style={styles.fileIcon}>📎</Text>
              <Text style={[styles.messageText, isMyMessage ? styles.myBubbleText : styles.otherBubbleText]}>
                {item.fileName}
              </Text>
              <Text style={styles.fileSize}>
                {(item.fileSize / 1024).toFixed(1)} KB
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.messageText, isMyMessage ? styles.myBubbleText : styles.otherBubbleText]}>
              {item.content}
            </Text>
          )}
          <View style={styles.messageFooter}>
            <Text style={styles.messageTime}>
              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isMyMessage && (
              <Text style={styles.statusIcon}>
                {item.isRead ? '✔✔' : item.isDelivered ? '✔' : '✓'}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerName}>{otherUser?.name}</Text>
          <Text style={styles.headerRide}>{t.ride}: {ride?.departure} → {ride?.destination}</Text>
          <Text style={[styles.connectionStatus, isConnected ? styles.connected : styles.disconnected]}>
            {isConnected ? '🟢 Connecté' : '🔴 Déconnecté'}
          </Text>
        </View>
        <View style={styles.callButtons}>
          <TouchableOpacity style={styles.callButton} onPress={() => Alert.alert('Info', 'Appel bientôt disponible')}>
            <Text style={styles.callButtonText}>📞</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.callButton} onPress={() => Alert.alert('Info', 'Appel bientôt disponible')}>
            <Text style={styles.callButtonText}>📹</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />
      
      {uploading && (
        <View style={styles.uploadingContainer}>
          <ActivityIndicator size="small" color="#FF5A5F" />
          <Text style={styles.uploadingText}>{t.uploading}</Text>
        </View>
      )}
      
      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.attachButton} onPress={pickAndSendFile} disabled={uploading}>
          <Text style={styles.attachButtonText}>📎</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder={t.placeholder}
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>{t.send}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#FF5A5F', paddingTop: 50 },
  backButton: { fontSize: 24, color: 'white', marginRight: 15 },
  headerName: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  headerRide: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  connectionStatus: { fontSize: 10, marginTop: 2 },
  connected: { color: '#4CAF50' },
  disconnected: { color: '#F44336' },
  callButtons: { flexDirection: 'row', marginLeft: 'auto' },
  callButton: { backgroundColor: 'white', padding: 8, borderRadius: 30, marginLeft: 10 },
  callButtonText: { fontSize: 18 },
  messagesList: { padding: 15, paddingBottom: 20 },
  messageRow: { marginBottom: 10 },
  myMessageRow: { alignItems: 'flex-end' },
  otherMessageRow: { alignItems: 'flex-start' },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 20 },
  myBubble: { backgroundColor: '#FF5A5F', borderBottomRightRadius: 4 },
  otherBubble: { backgroundColor: '#e0e0e0', borderBottomLeftRadius: 4 },
  messageText: { fontSize: 16 },
  myBubbleText: { color: 'white' },
  otherBubbleText: { color: '#333' },
  fileIcon: { fontSize: 24, marginBottom: 5 },
  fileSize: { fontSize: 10, color: '#666', marginTop: 4 },
  messageFooter: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
  messageTime: { fontSize: 10, color: 'rgba(0,0,0,0.5)' },
  statusIcon: { fontSize: 10, marginLeft: 5, color: 'rgba(0,0,0,0.5)' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#eee' },
  attachButton: { paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#f0f0f0', borderRadius: 25, marginRight: 8 },
  attachButtonText: { fontSize: 20 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 25, paddingHorizontal: 15, paddingVertical: 10, maxHeight: 100, backgroundColor: '#f8f8f8' },
  sendButton: { backgroundColor: '#FF5A5F', borderRadius: 25, paddingHorizontal: 20, justifyContent: 'center', marginLeft: 10 },
  sendButtonText: { color: 'white', fontWeight: 'bold' },
  uploadingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, backgroundColor: 'rgba(0,0,0,0.7)' },
  uploadingText: { color: 'white', marginLeft: 10 }
});