// screens/DynamicSearchScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    ScrollView, Alert, ActivityIndicator, FlatList,
    RefreshControl, TextInput
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import RideCard from '../components/RideCard';
import AutocompleteInput from '../components/AutocompleteInput';
import config from '../config';
import debounce from 'lodash/debounce';

export default function DynamicSearchScreen({ route, navigation }) {
    const { user, language = 'fr' } = route.params || {};

    const [departure, setDeparture] = useState('');
    const [destination, setDestination] = useState('');
    const [date, setDate] = useState(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [minSeats, setMinSeats] = useState('1');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const translations = {
        fr: {
            title: 'Rechercher un trajet',
            departure: 'Départ',
            destination: 'Destination',
            date: 'Date de voyage',
            seats: 'Places minimum',
            reset: 'Réinitialiser',
            results: 'Résultats',
            noResults: 'Aucun trajet trouvé',
            enterDeparture: 'Commencez par entrer une ville de départ',
            dynamicSearch: 'Recherche dynamique',
            clear: 'Effacer'
        },
        en: {
            title: 'Search a ride',
            departure: 'Departure',
            destination: 'Destination',
            date: 'Travel date',
            seats: 'Minimum seats',
            reset: 'Reset',
            results: 'Results',
            noResults: 'No rides found',
            enterDeparture: 'Start by entering a departure city',
            dynamicSearch: 'Dynamic search',
            clear: 'Clear'
        },
        es: {
            title: 'Buscar viaje',
            departure: 'Salida',
            destination: 'Destino',
            date: 'Fecha de viaje',
            seats: 'Asientos mínimos',
            reset: 'Reiniciar',
            results: 'Resultados',
            noResults: 'No se encontraron viajes',
            enterDeparture: 'Comience por ingresar una ciudad de salida',
            dynamicSearch: 'Búsqueda dinámica',
            clear: 'Limpiar'
        },
        pt: {
            title: 'Buscar viagem',
            departure: 'Partida',
            destination: 'Destino',
            date: 'Data de viagem',
            seats: 'Lugares mínimos',
            reset: 'Redefinir',
            results: 'Resultados',
            noResults: 'Nenhuma viagem encontrada',
            enterDeparture: 'Comece digitando uma cidade de partida',
            dynamicSearch: 'Busca dinâmica',
            clear: 'Limpar'
        }
    };

    const t = translations[language];

    // ✅ Recherche dynamique - CORRIGÉE
    const performSearch = useCallback(
        debounce(async (dep, dest, searchDate, seats) => {
            // Même si seulement le départ est rempli, on recherche !
            if (!dep && !dest && !searchDate) {
                setResults([]);
                setHasSearched(false);
                return;
            }

            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (dep) params.append('departure', dep);
                if (dest) params.append('destination', dest);
                if (searchDate) params.append('date', searchDate.toISOString());
                if (seats) params.append('minSeats', seats);

                const url = `${config.API_URL}/api/rides/dynamic-search?${params}`;
                console.log('🌐 URL recherchée:', url);
                
                const response = await fetch(url);
                const data = await response.json();
                
                console.log('📊 Résultats reçus:', data.rides?.length || 0);
                setResults(data.rides || []);
                setHasSearched(true);
            } catch (error) {
                console.error('❌ Erreur recherche dynamique:', error);
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 500),
        []
    );

    // ✅ Déclencher la recherche dès que departure change
    useEffect(() => {
        if (departure && departure.length > 0) {
            performSearch(departure, destination, date, minSeats);
        } else if (!departure && !destination) {
            setResults([]);
            setHasSearched(false);
        }
    }, [departure, destination, date, minSeats]);

    const handleRidePress = (rideData) => {
        navigation.navigate('Booking', { ride: rideData, user, language });
    };

    const resetFilters = () => {
        setDeparture('');
        setDestination('');
        setDate(null);
        setMinSeats('1');
        setResults([]);
        setHasSearched(false);
    };

    const onDateChange = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) setDate(selectedDate);
    };

    const handleDepartureSelect = (selected) => {
        setDeparture(selected);
        setDestination('');
    };

    return (
        <ScrollView 
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => performSearch(departure, destination, date, minSeats)} />
            }
        >
            <Text style={styles.title}>🔍 {t.title}</Text>

            {/* Champ Départ avec autocomplétion */}
            <Text style={styles.label}>{t.departure}</Text>
            <AutocompleteInput
                placeholder="Ex: Douala, Yaoundé..."
                value={departure}
                onChangeText={setDeparture}
                onSelect={handleDepartureSelect}
                endpoint="/api/rides/autocomplete/departures"
                language={language}
            />

            {/* Champ Destination - apparaît si départ est rempli */}
            {departure.length > 0 && (
                <>
                    <Text style={styles.label}>{t.destination}</Text>
                    <AutocompleteInput
                        placeholder="Ex: Douala, Yaoundé..."
                        value={destination}
                        onChangeText={setDestination}
                        endpoint="/api/rides/autocomplete/destinations"
                        queryParams={{ departure }}
                        language={language}
                    />
                </>
            )}

            {/* Date (optionnelle) */}
            <Text style={styles.label}>{t.date}</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.dateButtonText}>
                    {date ? date.toLocaleDateString() : 'Toutes dates'}
                </Text>
            </TouchableOpacity>

            {showDatePicker && (
                <DateTimePicker
                    value={date || new Date()}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                />
            )}

            {/* Nombre de places */}
            <Text style={styles.label}>{t.seats}</Text>
            <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={minSeats}
                onChangeText={setMinSeats}
                placeholder="1"
            />

            {/* Bouton réinitialiser */}
            {(departure || destination || date || minSeats !== '1') && (
                <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                    <Text style={styles.resetButtonText}>{t.reset}</Text>
                </TouchableOpacity>
            )}

            {/* Résultats */}
            <View style={styles.resultsContainer}>
                <Text style={styles.resultsTitle}>
                    📋 {t.results} ({results.length})
                </Text>

                {loading ? (
                    <ActivityIndicator size="large" color="#FF5A5F" style={styles.loader} />
                ) : hasSearched && results.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyEmoji}>🚗💨</Text>
                        <Text style={styles.emptyText}>
                            {!departure ? t.enterDeparture : t.noResults}
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={results}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <RideCard
                                ride={item}
                                onPress={handleRidePress}
                                language={language}
                            />
                        )}
                        scrollEnabled={false}
                    />
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FF5A5F',
        textAlign: 'center',
        marginTop: 20,
        marginBottom: 30,
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
        marginTop: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 12,
        borderRadius: 10,
        fontSize: 16,
        backgroundColor: '#f8f8f8',
        marginBottom: 15,
    },
    dateButton: {
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 12,
        borderRadius: 10,
        backgroundColor: '#f8f8f8',
        alignItems: 'center',
        marginBottom: 15,
    },
    dateButtonText: {
        fontSize: 16,
        color: '#333',
    },
    resetButton: {
        backgroundColor: '#f0f0f0',
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 20,
    },
    resetButtonText: {
        color: '#FF5A5F',
        fontSize: 14,
        fontWeight: 'bold',
    },
    resultsContainer: {
        marginTop: 10,
        marginBottom: 30,
    },
    resultsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
    },
    loader: {
        marginTop: 30,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 30,
        padding: 20,
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