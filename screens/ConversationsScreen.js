import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, RefreshControl, Image
} from 'react-native';
import { useSocket } from '../context/SocketContext';
import config from '../config';
//const API_URL = 'http://192.168.0.109:3000';

export default function ConversationsScreen({ route, navigation }) {
  const { user, language = 'fr' } = route.params || {};
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { on, off } = useSocket();

  const translations = {
    fr: {
      title: 'Messages',
      noConversations: 'Aucune conversation',
      newMessage: 'Nouveau message',
      you: 'Vous: '
    },
    en: {
      title: 'Messages',
      noConversations: 'No conversations',
      newMessage: 'New message',
      you: 'You: '
    },
    es: {
      title: 'Mensajes',
      noConversations: 'Sin conversaciones',
      newMessage: 'Nuevo mensaje',
      you: 'Tú: '
    },
    pt: {
      title: 'Mensagens',
      noConversations: 'Sem conversas',
      newMessage: 'Nova mensagem',
      you: 'Você: '
    }
  };

  const t = translations[language];

  useEffect(() => {
    fetchConversations();
    
    const handleNewMessage = (message) => {
      // Mettre à jour la liste des conversations quand un nouveau message arrive
      fetchConversations();
    };
    
    on('newMessage', handleNewMessage);
    
    return () => {
      off('newMessage', handleNewMessage);
    };
  }, []);

  const fetchConversations = async () => {
    try {
      // ✅ CORRIGÉ : Utilise config.API_URL au lieu de API_URL
      const response = await fetch(`${config.API_URL}/api/conversations`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  const openConversation = (conversation) => {
    // Trouver l'autre participant
    const otherParticipant = conversation.participants.find(p => p.userId !== user?.id);
    const lastMessage = conversation.messages[0];
    
    navigation.navigate('Chat', {
      user: user,
      conversation: conversation,
      ride: conversation.ride || { departure: 'Discussion', destination: '' },
      otherUser: {
        id: otherParticipant?.userId,
        name: otherParticipant?.user?.name,
        photoUrl: otherParticipant?.user?.photoUrl
      },
      language: language
    });
  };

  const getLastMessagePreview = (conversation) => {
    if (!conversation.messages || conversation.messages.length === 0) {
      return t.newMessage;
    }
    const lastMessage = conversation.messages[0];
    const isMe = lastMessage.senderId === user?.id;
    return `${isMe ? t.you : ''}${lastMessage.content.substring(0, 50)}${lastMessage.content.length > 50 ? '...' : ''}`;
  };

  const getUnreadCount = (conversation) => {
    if (!conversation.messages) return 0;
    return conversation.messages.filter(m => m.receiverId === user?.id && !m.isRead).length;
  };

  const renderConversation = ({ item }) => {
    const otherParticipant = item.participants.find(p => p.userId !== user?.id);
    const unreadCount = getUnreadCount(item);
    
    return (
      <TouchableOpacity 
        style={[styles.conversationItem, unreadCount > 0 && styles.unreadConversation]} 
        onPress={() => openConversation(item)}
      >
        {otherParticipant?.user?.photoUrl ? (
          <Image source={{ uri: otherParticipant.user.photoUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
        )}
        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.conversationName, unreadCount > 0 && styles.unreadName]}>
              {otherParticipant?.user?.name || 'Utilisateur'}
            </Text>
            {item.ride && (
              <Text style={styles.rideInfo}>
                {item.ride.departure} → {item.ride.destination}
              </Text>
            )}
          </View>
          <Text style={[styles.lastMessage, unreadCount > 0 && styles.unreadMessage]} numberOfLines={1}>
            {getLastMessagePreview(item)}
          </Text>
        </View>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF5A5F" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>💬 {t.title}</Text>
      
      {conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={styles.emptyText}>{t.noConversations}</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversation}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF5A5F']} />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF5A5F',
    textAlign: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  listContent: {
    paddingBottom: 20,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 15,
    marginVertical: 5,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadConversation: {
    backgroundColor: '#FFF9C4',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    fontSize: 24,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
    flexWrap: 'wrap',
  },
  conversationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  unreadName: {
    color: '#FF5A5F',
    fontWeight: 'bold',
  },
  rideInfo: {
    fontSize: 11,
    color: '#FF5A5F',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  lastMessage: {
    fontSize: 13,
    color: '#666',
  },
  unreadMessage: {
    color: '#333',
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: '#F44336',
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyEmoji: {
    fontSize: 50,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});