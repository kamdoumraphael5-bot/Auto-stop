import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    FlatList, ActivityIndicator
} from 'react-native';
import config from '../config';

export default function AutocompleteInput({
    placeholder,
    value,
    onChangeText,
    endpoint,
    queryParams = {},
    delay = 300,
    language = 'fr'
}) {
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [loading, setLoading] = useState(false);
    const timeoutRef = useRef(null);

    useEffect(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (!value || value.length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }
        timeoutRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams({ query: value, ...queryParams });
                const url = `${config.API_URL}${endpoint}?${params}`;
                const response = await fetch(url);
                const data = await response.json();
                setSuggestions(data.suggestions || []);
                setShowSuggestions(true);
            } catch (error) {
                console.error('Autocomplete error:', error);
            } finally {
                setLoading(false);
            }
        }, delay);
        return () => clearTimeout(timeoutRef.current);
    }, [value]);

    return (
        <View style={styles.container}>
            <TextInput
                style={styles.input}
                placeholder={placeholder}
                value={value}
                onChangeText={onChangeText}
            />
            {showSuggestions && suggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                    <FlatList
                        data={suggestions}
                        keyExtractor={(item, i) => `${item}-${i}`}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.suggestionItem}
                                onPress={() => {
                                    onChangeText(item);
                                    setShowSuggestions(false);
                                }}
                            >
                                <Text>📍 {item}</Text>
                            </TouchableOpacity>
                        )}
                        keyboardShouldPersistTaps="always"
                    />
                </View>
            )}
            {loading && <ActivityIndicator style={styles.loader} />}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginBottom: 15, position: 'relative', zIndex: 1000 },
    input: { borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 10, fontSize: 16, backgroundColor: '#f8f8f8' },
    suggestionsContainer: { position: 'absolute', top: 50, left: 0, right: 0, backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, maxHeight: 200, zIndex: 1001 },
    suggestionItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
    loader: { marginTop: 10 }
});