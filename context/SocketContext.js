import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();
const SOCKET_URL = 'http://192.168.0.109:3000';

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children, user }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    console.log('🔌 SocketProvider - useEffect déclenché');
    console.log('🔌 SocketProvider - user reçu:', user?.id);

    if (socketRef.current) {
      console.log('🔌 Nettoyage ancienne connexion');
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    if (!user?.id) {
      console.log('🔌 Socket: Pas d\'utilisateur, pas de connexion');
      setIsConnected(false);
      setSocket(null);
      return;
    }

    console.log('🔌 Socket: Connexion pour utilisateur', user.id);
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('🔌 Socket connecté pour', user.id);
      setIsConnected(true);
      newSocket.emit('register', user.id);
      console.log('📤 Émission register pour', user.id);
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Socket déconnecté pour', user.id);
      setIsConnected(false);
    });

    newSocket.on('registered', (data) => {
      console.log('✅ Enregistrement confirmé:', data);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Erreur connexion socket:', error.message);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user?.id]);

  const emit = (event, data) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data);
      console.log(`📤 Émission ${event}:`, data);
    } else {
      console.warn(`⚠️ Socket non connecté, impossible d'émettre ${event}`);
    }
  };

  const on = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
      console.log(`📥 Écoute ${event} ajoutée`);
    }
  };

  const off = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, emit, on, off }}>
      {children}
    </SocketContext.Provider>
  );
};