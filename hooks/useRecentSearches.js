// hooks/useRecentSearches.js
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'recent_searches';
const MAX_RECENT = 5;

export const useRecentSearches = () => {
    const [recentSearches, setRecentSearches] = useState([]);
    const [loading, setLoading] = useState(true);

    // Charger les recherches sauvegardées
    useEffect(() => {
        loadRecentSearches();
    }, []);

    const loadRecentSearches = async () => {
        try {
            setLoading(true);
            const saved = await AsyncStorage.getItem(STORAGE_KEY);
            if (saved) {
                setRecentSearches(JSON.parse(saved));
            }
        } catch (error) {
            console.error('Erreur chargement recherches récentes:', error);
        } finally {
            setLoading(false);
        }
    };

    // Ajouter une recherche
    const addRecentSearch = (search) => {
        if (!search.departure && !search.destination) return;
        
        const newSearch = {
            id: Date.now().toString(),
            departure: search.departure,
            destination: search.destination || '',
            date: search.date ? search.date.toISOString() : null,
            timestamp: new Date().toISOString()
        };
        
        // Éviter les doublons
        const filtered = recentSearches.filter(s => 
            !(s.departure === newSearch.departure && s.destination === newSearch.destination)
        );
        
        const updated = [newSearch, ...filtered].slice(0, MAX_RECENT);
        
        setRecentSearches(updated);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(error => {
            console.error('Erreur sauvegarde recherche:', error);
        });
    };

    // Supprimer une recherche spécifique
    const removeRecentSearch = async (id) => {
        const updated = recentSearches.filter(s => s.id !== id);
        setRecentSearches(updated);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    };

    // Effacer toutes les recherches
    const clearRecentSearches = async () => {
        setRecentSearches([]);
        await AsyncStorage.removeItem(STORAGE_KEY);
    };

    return { 
        recentSearches, 
        addRecentSearch, 
        removeRecentSearch, 
        clearRecentSearches,
        loading 
    };
};