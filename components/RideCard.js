import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';

export default function RideCard({ ride, onPress, onPressDriver, onPressChat, currentUserId, language = 'fr' }) {
    const formatDate = (date) => {
        const d = new Date(date);
        return d.toLocaleDateString(language === 'fr' ? 'fr-FR' : language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'pt-PT');
    };

    const formatTime = (date) => {
        const d = new Date(date);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDuration = (minutes) => {
        if (!minutes) return 'Non spécifiée';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours === 0) return `${mins} minutes`;
        if (mins === 0) return `${hours} heure${hours > 1 ? 's' : ''}`;
        return `${hours}h ${mins}min`;
    };

    const vehicleLabel = {
        fr: 'Véhicule',
        en: 'Vehicle',
        es: 'Vehículo',
        pt: 'Veículo'
    };

    const getVehicleIcon = (type) => {
        switch(type) {
            case 'MOTO': return '🏍️';
            case 'TAXI': return '🚖';
            case 'MINIBUS': return '🚐';
            case 'BUS': return '🚌';
            case 'COASTER': return '🚍';
            case 'CAMION': return '🚛';
            default: return '🚗';
        }
    };

    const totalSeats = ride.totalSeats || ride.availableSeats + (ride.bookedSeats || 0);
    const availableSeats = ride.availableSeats;
    const bookedSeats = ride.bookedSeats || 0;

    const departureTime = new Date(ride.date);
    const departureTimeStr = formatTime(departureTime);

    let arrivalTimeStr = 'Non spécifiée';
    let durationText = 'Non spécifiée';

    if (ride.arrivalTime) {
        const arrivalDate = new Date(ride.arrivalTime);
        arrivalTimeStr = formatTime(arrivalDate);
        const diffMinutes = Math.round((arrivalDate - departureTime) / 60000);
        if (diffMinutes > 0) durationText = formatDuration(diffMinutes);
    } else if (ride.estimatedDuration) {
        durationText = formatDuration(ride.estimatedDuration);
        const arrivalDate = new Date(departureTime.getTime() + ride.estimatedDuration * 60000);
        arrivalTimeStr = formatTime(arrivalDate);
    }

    const showRideDetails = () => {
        onPress({
            rideId: ride.id,
            departure: ride.departure,
            destination: ride.destination,
            departureTime: departureTimeStr,
            arrivalTime: arrivalTimeStr,
            duration: durationText,
            driverName: ride.driver?.name,
            driverId: ride.driver?.id,
            vehicleBrand: ride.vehicleBrand,
            vehicleType: ride.vehicleType,
            licensePlate: ride.licensePlate,
            price: ride.price,
            availableSeats: ride.availableSeats,
            totalSeats: totalSeats,
            bookedSeats: bookedSeats,
            meetingPoint: ride.meetingPoint,
            dropoffPoint: ride.dropoffPoint,
            date: formatDate(ride.date)
        });
    };

    const openChat = () => {
        if (!ride.driver?.id) return;
        if (currentUserId === ride.driver?.id) return;
        if (onPressChat) {
            onPressChat({
                rideId: ride.id,
                driverId: ride.driver?.id,
                driverName: ride.driver?.name || 'Conducteur',
                driverPhoto: ride.driver?.photoUrl,
                departure: ride.departure,
                destination: ride.destination
            });
        }
    };

    const showChatButton = onPressChat && currentUserId !== ride.driver?.id;

    return (
        <TouchableOpacity style={styles.card} onPress={showRideDetails}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.driverInfo} onPress={() => onPressDriver(ride.driver?.id)} activeOpacity={0.7}>
                    {ride.driver?.photoUrl ? (
                        <Image source={{ uri: ride.driver.photoUrl }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarText}>👤</Text>
                        </View>
                    )}
                    <View>
                        <Text style={styles.driverName}>{ride.driver?.name || 'Conducteur'}</Text>
                        <View style={styles.ratingContainer}>
                            <Text style={styles.ratingStar}>⭐</Text>
                            <Text style={styles.rating}>{ride.driver?.rating || '4.5'}</Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </View>

            <View style={styles.routeContainer}>
                <View style={styles.locationRow}>
                    <View style={styles.dotGreen} />
                    <View style={styles.locationContent}>
                        <Text style={styles.locationCity}>{ride.departure}</Text>
                        <Text style={styles.locationTime}>🚀 {departureTimeStr}</Text>
                    </View>
                </View>

                {ride.meetingPoint && (
                    <View style={styles.locationRow}>
                        <View style={styles.dotLine} />
                        <Text style={styles.meetingPointText}>📍 {ride.meetingPoint}</Text>
                    </View>
                )}

                {durationText !== 'Non spécifiée' && (
                    <View style={styles.durationRow}>
                        <View style={styles.durationLineLeft} />
                        <View style={styles.durationBadge}>
                            <Text style={styles.durationArrow}>↓</Text>
                            <Text style={styles.durationText}>{durationText}</Text>
                            <Text style={styles.durationArrow}>↓</Text>
                        </View>
                        <View style={styles.durationLineRight} />
                    </View>
                )}

                <View style={styles.locationRow}>
                    <View style={styles.dotRed} />
                    <View style={styles.locationContent}>
                        <Text style={styles.locationCity}>{ride.destination}</Text>
                        {arrivalTimeStr !== 'Non spécifiée' && <Text style={styles.arrivalTime}>🏁 {arrivalTimeStr}</Text>}
                    </View>
                </View>

                {ride.dropoffPoint && (
                    <View style={styles.locationRow}>
                        <View style={styles.dotLine} />
                        <Text style={styles.dropoffPointText}>📍 {ride.dropoffPoint}</Text>
                    </View>
                )}
            </View>

            {/* Informations véhicule sous le trajet */}
            <View style={styles.vehicleContainer}>
                <Text style={styles.vehicleLabel}>{vehicleLabel[language]}</Text>
                <View style={styles.vehicleInfoRow}>
                    <Text style={styles.vehicleIcon}>{getVehicleIcon(ride.vehicleType)}</Text>
                    <Text style={styles.vehicleBrand}>{ride.vehicleBrand}</Text>
                    {ride.licensePlate && <Text style={styles.licensePlate}> [{ride.licensePlate}]</Text>}
                    <Text style={styles.totalSeats}> • {totalSeats} places</Text>
                </View>
            </View>

            {/* Footer avec date à gauche et infos à droite */}
            <View style={styles.footer}>
                <View style={styles.dateContainer}>
                    <Text style={styles.dateIcon}>📅</Text>
                    <Text style={styles.dateText}>{formatDate(ride.date)}</Text>
                </View>
                
                <View style={styles.rightContainer}>
                    <View style={styles.placesContainer}>
                        <Text style={[styles.placesText, styles.availablePlaces]}>🟢 {availableSeats} places dispo</Text>
                        <Text style={[styles.placesText, styles.bookedPlaces]}>🔴 {bookedSeats} places réservées</Text>
                    </View>
                    <Text style={styles.priceText}>{ride.price?.toLocaleString()} FCFA</Text>
                    {showChatButton && (
                        <TouchableOpacity style={styles.chatButton} onPress={openChat}>
                            <Text style={styles.chatButtonText}>💬</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: { backgroundColor: '#fff', borderRadius: 15, marginHorizontal: 15, marginVertical: 8, padding: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, borderWidth: 1, borderColor: '#eee' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    driverInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    avatar: { width: 45, height: 45, borderRadius: 22.5, marginRight: 10 },
    avatarPlaceholder: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    avatarText: { fontSize: 22 },
    driverName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    ratingContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    ratingStar: { fontSize: 12, marginRight: 2 },
    rating: { fontSize: 12, color: '#666' },
    routeContainer: { marginBottom: 15 },
    locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    locationContent: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    locationCity: { fontSize: 15, fontWeight: 'bold', color: '#333' },
    locationTime: { fontSize: 12, color: '#4CAF50', fontWeight: 'bold' },
    arrivalTime: { fontSize: 12, color: '#FF5A5F', fontWeight: 'bold' },
    dotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4CAF50', marginRight: 12 },
    dotRed: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF5A5F', marginRight: 12 },
    dotLine: { width: 2, height: 20, backgroundColor: '#ddd', marginLeft: 4, marginRight: 12 },
    meetingPointText: { fontSize: 12, color: '#666', fontStyle: 'italic' },
    dropoffPointText: { fontSize: 12, color: '#666', fontStyle: 'italic' },
    durationRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8, marginLeft: 4 },
    durationLineLeft: { flex: 1, height: 1, backgroundColor: '#FF5A5F' },
    durationLineRight: { flex: 1, height: 1, backgroundColor: '#FF5A5F' },
    durationBadge: { flexDirection: 'row', backgroundColor: '#FF5A5F', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, alignItems: 'center', marginHorizontal: 8 },
    durationArrow: { fontSize: 12, color: 'white', fontWeight: 'bold' },
    durationText: { fontSize: 11, color: 'white', fontWeight: 'bold', marginHorizontal: 6 },
    // Styles pour la section véhicule
    vehicleContainer: { marginBottom: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#eee' },
    vehicleLabel: { fontSize: 11, color: '#999', marginBottom: 4 },
    vehicleInfoRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
    vehicleIcon: { fontSize: 12, marginRight: 4 },
    vehicleBrand: { fontSize: 12, color: '#666', fontWeight: 'bold' },
    licensePlate: { fontSize: 10, color: '#FF5A5F', fontWeight: 'bold', marginLeft: 2 },
    totalSeats: { fontSize: 10, color: '#666', marginLeft: 2 },
    // Footer avec date à gauche et infos à droite
    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 12 },
    dateContainer: { flexDirection: 'row', alignItems: 'center' },
    dateIcon: { fontSize: 14, marginRight: 5 },
    dateText: { fontSize: 12, color: '#666' },
    rightContainer: { alignItems: 'flex-end' },
    placesContainer: { alignItems: 'flex-end', marginBottom: 5 },
    placesText: { fontSize: 12, fontWeight: 'bold' },
    availablePlaces: { color: '#4CAF50' },
    bookedPlaces: { color: '#F44336', marginTop: 2 },
    priceText: { fontSize: 16, fontWeight: 'bold', color: '#FF5A5F', marginBottom: 5 },
    chatButton: { backgroundColor: '#2196F3', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginTop: 5 },
    chatButtonText: { color: 'white', fontSize: 14, fontWeight: 'bold' }
});