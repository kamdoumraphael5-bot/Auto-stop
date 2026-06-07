// screens/DynamicSearchScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    FlatList,
    RefreshControl,
    TextInput,
    Modal,
    ScrollView  // ← IMPORTANT !!!
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import RideCard from '../components/RideCard';
import AutocompleteInput from '../components/AutocompleteInput';
import { useRecentSearches } from '../hooks/useRecentSearches';
import config from '../config';

export default function DynamicSearchScreen({ route, navigation }) {
    const { user, language = 'fr' } = route.params || {};

    // États pour la recherche
    const [departure, setDeparture] = useState('');
    const [destination, setDestination] = useState('');
    const [date, setDate] = useState(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [minSeats, setMinSeats] = useState('1');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    
    // États pour le tri
    const [sortBy, setSortBy] = useState('date');
    const [sortOrder, setSortOrder] = useState('asc');
    const [showSortMenu, setShowSortMenu] = useState(false);
    
    // Hook des recherches récentes
    const { recentSearches, addRecentSearch, removeRecentSearch, clearRecentSearches } = useRecentSearches();
    
    const searchTimeoutRef = useRef(null);

    // Traductions
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
            sort: 'Trier',
            sortBy: 'Trier par',
            dateClosest: '📅 Date (plus proche)',
            dateFarthest: '📅 Date (plus loin)',
            priceAsc: '💰 Prix (croissant)',
            priceDesc: '💰 Prix (décroissant)',
            durationAsc: '⏱️ Durée (plus court)',
            correction: 'Correction orthographique',
            correctedFrom: 'Nous avons corrigé',
            recentSearches: '🔍 Recherches récentes',
            clearAll: 'Tout effacer'
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
            sort: 'Sort',
            sortBy: 'Sort by',
            dateClosest: '📅 Date (closest)',
            dateFarthest: '📅 Date (farthest)',
            priceAsc: '💰 Price (lowest)',
            priceDesc: '💰 Price (highest)',
            durationAsc: '⏱️ Duration (shortest)',
            correction: 'Spelling correction',
            correctedFrom: 'We corrected',
            recentSearches: '🔍 Recent searches',
            clearAll: 'Clear all'
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
            sort: 'Ordenar',
            sortBy: 'Ordenar por',
            dateClosest: '📅 Fecha (más cercana)',
            dateFarthest: '📅 Fecha (más lejana)',
            priceAsc: '💰 Precio (menor)',
            priceDesc: '💰 Precio (mayor)',
            durationAsc: '⏱️ Duración (más corta)',
            correction: 'Corrección ortográfica',
            correctedFrom: 'Corregimos',
            recentSearches: '🔍 Búsquedas recientes',
            clearAll: 'Borrar todo'
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
            sort: 'Ordenar',
            sortBy: 'Ordenar por',
            dateClosest: '📅 Data (mais próxima)',
            dateFarthest: '📅 Data (mais longe)',
            priceAsc: '💰 Preço (menor)',
            priceDesc: '💰 Preço (maior)',
            durationAsc: '⏱️ Duração (mais curta)',
            correction: 'Correção ortográfica',
            correctedFrom: 'Corrigimos',
            recentSearches: '🔍 Pesquisas recentes',
            clearAll: 'Limpar tudo'
        }
    };

    const t = translations[language];

    // Options de tri
    const sortOptions = {
        fr: [
            { value: 'date_asc', label: t.dateClosest, sortBy: 'date', sortOrder: 'asc' },
            { value: 'date_desc', label: t.dateFarthest, sortBy: 'date', sortOrder: 'desc' },
            { value: 'price_asc', label: t.priceAsc, sortBy: 'price', sortOrder: 'asc' },
            { value: 'price_desc', label: t.priceDesc, sortBy: 'price', sortOrder: 'desc' },
            { value: 'duration_asc', label: t.durationAsc, sortBy: 'duration', sortOrder: 'asc' }
        ],
        en: [
            { value: 'date_asc', label: t.dateClosest, sortBy: 'date', sortOrder: 'asc' },
            { value: 'date_desc', label: t.dateFarthest, sortBy: 'date', sortOrder: 'desc' },
            { value: 'price_asc', label: t.priceAsc, sortBy: 'price', sortOrder: 'asc' },
            { value: 'price_desc', label: t.priceDesc, sortBy: 'price', sortOrder: 'desc' },
            { value: 'duration_asc', label: t.durationAsc, sortBy: 'duration', sortOrder: 'asc' }
        ],
        es: [
            { value: 'date_asc', label: t.dateClosest, sortBy: 'date', sortOrder: 'asc' },
            { value: 'date_desc', label: t.dateFarthest, sortBy: 'date', sortOrder: 'desc' },
            { value: 'price_asc', label: t.priceAsc, sortBy: 'price', sortOrder: 'asc' },
            { value: 'price_desc', label: t.priceDesc, sortBy: 'price', sortOrder: 'desc' },
            { value: 'duration_asc', label: t.durationAsc, sortBy: 'duration', sortOrder: 'asc' }
        ],
        pt: [
            { value: 'date_asc', label: t.dateClosest, sortBy: 'date', sortOrder: 'asc' },
            { value: 'date_desc', label: t.dateFarthest, sortBy: 'date', sortOrder: 'desc' },
            { value: 'price_asc', label: t.priceAsc, sortBy: 'price', sortOrder: 'asc' },
            { value: 'price_desc', label: t.priceDesc, sortBy: 'price', sortOrder: 'desc' },
            { value: 'duration_asc', label: t.durationAsc, sortBy: 'duration', sortOrder: 'asc' }
        ]
    };

    const currentSortOptions = sortOptions[language] || sortOptions.fr;

    // Recherche dynamique
    const performSearch = useCallback(
        async (dep, dest, searchDate, seats, sortByParam, sortOrderParam) => {
            if (!dep && !dest) {
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
                if (seats && seats !== '1') params.append('minSeats', seats);
                
                params.append('sortBy', sortByParam || sortBy);
                params.append('sortOrder', sortOrderParam || sortOrder);

                const url = `${config.API_URL}/api/rides/dynamic-search?${params.toString()}`;
                console.log('🌐 URL recherchée:', url);
                
                const response = await fetch(url);
                const data = await response.json();
                
                console.log('📊 Résultats reçus:', data.rides?.length || 0);
                
                // Sauvegarder la recherche si des résultats sont trouvés
                if (data.rides && data.rides.length > 0 && dep) {
                    addRecentSearch({ 
                        departure: dep, 
                        destination: dest || '', 
                        date: searchDate 
                    });
                }
                
                // Vérifier si une correction orthographique a été appliquée
                if (data.corrected) {
                    let correctionMessage = '';
                    if (data.corrected.departure && data.corrected.original.departure !== data.corrected.corrected.departure) {
                        correctionMessage += `${t.correctedFrom} "${data.corrected.original.departure}" → "${data.corrected.corrected.departure}"\n`;
                    }
                    if (data.corrected.destination && data.corrected.original.destination !== data.corrected.corrected.destination) {
                        correctionMessage += `${t.correctedFrom} "${data.corrected.original.destination}" → "${data.corrected.corrected.destination}"`;
                    }
                    if (correctionMessage) {
                        Alert.alert(t.correction, correctionMessage);
                    }
                }
                
                setResults(data.rides || []);
                setHasSearched(true);
            } catch (error) {
                console.error('❌ Erreur recherche dynamique:', error);
                setResults([]);
            } finally {
                setLoading(false);
            }
        },
        [sortBy, sortOrder, t, addRecentSearch]
    );

    // Déclencher la recherche avec debounce
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        
        searchTimeoutRef.current = setTimeout(() => {
            if (departure && departure.length > 0) {
                performSearch(departure, destination, date, minSeats, sortBy, sortOrder);
            } else if (!departure && !destination) {
                setResults([]);
                setHasSearched(false);
            }
        }, 500);
        
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [departure, destination, date, minSeats, sortBy, sortOrder]);

    // Modal de tri
    const SortMenu = () => {
        return (
            <Modal
                transparent={true}
                visible={showSortMenu}
                animationType="fade"
                onRequestClose={() => setShowSortMenu(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay} 
                    activeOpacity={1} 
                    onPress={() => setShowSortMenu(false)}
                >
                    <View style={styles.sortMenu}>
                        <Text style={styles.sortMenuTitle}>{t.sortBy}</Text>
                        {currentSortOptions.map(option => (
                            <TouchableOpacity
                                key={option.value}
                                style={[
                                    styles.sortMenuItem,
                                    sortBy === option.sortBy && sortOrder === option.sortOrder && styles.sortMenuItemSelected
                                ]}
                                onPress={() => {
                                    setSortBy(option.sortBy);
                                    setSortOrder(option.sortOrder);
                                    setShowSortMenu(false);
                                }}
                            >
                                <Text style={[
                                    styles.sortMenuItemText,
                                    sortBy === option.sortBy && sortOrder === option.sortOrder && styles.sortMenuItemTextSelected
                                ]}>
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        );
    };

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

    const applyRecentSearch = (search) => {
        setDeparture(search.departure);
        setDestination(search.destination || '');
        if (search.date) {
            setDate(new Date(search.date));
        }
    };

    const getCurrentSortLabel = () => {
        const current = currentSortOptions.find(
            option => option.sortBy === sortBy && option.sortOrder === sortOrder
        );
        return current ? current.label : t.dateClosest;
    };

    return (
        <ScrollView 
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => performSearch(departure, destination, date, minSeats, sortBy, sortOrder)} />
            }
        >
            <Text style={styles.title}>🔍 {t.title}</Text>

            {/* Recherches récentes */}
            {recentSearches.length > 0 && !departure && !destination && results.length === 0 && (
                <View style={styles.recentContainer}>
                    <View style={styles.recentHeader}>
                        <Text style={styles.recentTitle}>{t.recentSearches}</Text>
                        <TouchableOpacity onPress={clearRecentSearches}>
                            <Text style={styles.clearAllText}>{t.clearAll}</Text>
                        </TouchableOpacity>
                    </View>
                    {recentSearches.map(search => (
                        <TouchableOpacity
                            key={search.id}
                            style={styles.recentItem}
                            onPress={() => applyRecentSearch(search)}
                        >
                            <View style={styles.recentItemContent}>
                                <Text style={styles.recentItemIcon}>📍</Text>
                                <View style={styles.recentItemTexts}>
                                    <Text style={styles.recentItemText}>
                                        {search.departure} {search.destination ? `→ ${search.destination}` : ''}
                                    </Text>
                                    {search.date && (
                                        <Text style={styles.recentItemDate}>
                                            {new Date(search.date).toLocaleDateString()}
                                        </Text>
                                    )}
                                </View>
                            </View>
                            <TouchableOpacity 
                                onPress={(e) => {
                                    e.stopPropagation();
                                    removeRecentSearch(search.id);
                                }}
                            >
                                <Text style={styles.removeText}>✕</Text>
                            </TouchableOpacity>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* Champ Départ */}
            <Text style={styles.label}>{t.departure}</Text>
            <AutocompleteInput
                placeholder="Ex: Douala, Yaoundé..."
                value={departure}
                onChangeText={setDeparture}
                onSelect={handleDepartureSelect}
                endpoint="/api/rides/autocomplete/departures"
                language={language}
            />

            {/* Champ Destination */}
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

            {/* Date */}
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

            {/* Places */}
            <Text style={styles.label}>{t.seats}</Text>
            <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={minSeats}
                onChangeText={setMinSeats}
                placeholder="1"
            />

            {/* Boutons */}
            <View style={styles.buttonRow}>
                {(departure || destination || date || minSeats !== '1') && (
                    <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                        <Text style={styles.resetButtonText}>{t.reset}</Text>
                    </TouchableOpacity>
                )}
                
                <TouchableOpacity style={styles.sortButton} onPress={() => setShowSortMenu(true)}>
                    <Text style={styles.sortButtonText}>🔽 {t.sort}</Text>
                </TouchableOpacity>
            </View>

            {/* Info tri */}
            {hasSearched && results.length > 0 && (
                <View style={styles.sortInfoContainer}>
                    <Text style={styles.sortInfoText}>
                        📊 Tri actuel : {getCurrentSortLabel()}
                    </Text>
                </View>
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

            <SortMenu />
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
    buttonRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 15,
    },
    resetButton: {
        flex: 1,
        backgroundColor: '#f0f0f0',
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    resetButtonText: {
        color: '#FF5A5F',
        fontSize: 14,
        fontWeight: 'bold',
    },
    sortButton: {
        flex: 1,
        backgroundColor: '#f0f0f0',
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    sortButtonText: {
        color: '#333',
        fontSize: 14,
        fontWeight: 'bold',
    },
    sortInfoContainer: {
        backgroundColor: '#f8f8f8',
        padding: 8,
        borderRadius: 8,
        marginBottom: 10,
        alignItems: 'center',
    },
    sortInfoText: {
        fontSize: 12,
        color: '#666',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sortMenu: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        width: '80%',
        maxWidth: 300,
    },
    sortMenuTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
        color: '#333',
    },
    sortMenuItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    sortMenuItemSelected: {
        backgroundColor: '#FF5A5F20',
        borderRadius: 8,
    },
    sortMenuItemText: {
        fontSize: 16,
        color: '#333',
    },
    sortMenuItemTextSelected: {
        color: '#FF5A5F',
        fontWeight: 'bold',
    },
    recentContainer: {
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        marginBottom: 20,
        padding: 12,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    recentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    recentTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FF5A5F',
    },
    clearAllText: {
        fontSize: 12,
        color: '#999',
    },
    recentItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    recentItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    recentItemIcon: {
        fontSize: 16,
        marginRight: 10,
    },
    recentItemTexts: {
        flex: 1,
    },
    recentItemText: {
        fontSize: 14,
        color: '#333',
    },
    recentItemDate: {
        fontSize: 11,
        color: '#999',
        marginTop: 2,
    },
    removeText: {
        fontSize: 16,
        color: '#999',
        paddingHorizontal: 8,
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