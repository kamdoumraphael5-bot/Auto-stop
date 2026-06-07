// services/suggestionService.js
const stringSimilarity = require('string-similarity');

class SuggestionService {
    constructor() {
        this.cityCache = null;
        this.lastCacheTime = null;
        this.cacheDuration = 5 * 60 * 1000; // 5 minutes
    }

    // Nettoyer une ville (enlever accents, mettre en minuscule)
    normalizeCity(city) {
        return city
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Enlève les accents
            .trim();
    }

    // Calculer la similarité entre deux chaînes
    calculateSimilarity(str1, str2) {
        const normalized1 = this.normalizeCity(str1);
        const normalized2 = this.normalizeCity(str2);
        return stringSimilarity.compareTwoStrings(normalized1, normalized2);
    }

    // Récupérer toutes les villes depuis la base (avec cache)
    async getAllCities(prisma) {
        // Vérifier si le cache est encore valide
        if (this.cityCache && this.lastCacheTime && 
            (Date.now() - this.lastCacheTime) < this.cacheDuration) {
            return this.cityCache;
        }

        // Récupérer toutes les villes uniques
        const rides = await prisma.ride.findMany({
            where: {
                status: 'SCHEDULED',
                date: { gte: new Date() },
                isHidden: false
            },
            select: { departure: true, destination: true },
            distinct: ['departure', 'destination']
        });

        // Extraire les villes uniques
        const cities = new Set();
        rides.forEach(ride => {
            cities.add(ride.departure);
            cities.add(ride.destination);
        });

        this.cityCache = Array.from(cities);
        this.lastCacheTime = Date.now();
        
        console.log(`📚 ${this.cityCache.length} villes chargées en cache`);
        return this.cityCache;
    }

    // Trouver des suggestions de villes
    async getSuggestions(prisma, query, type = 'departure', limit = 10) {
        if (!query || query.length < 2) {
            return [];
        }

        const allCities = await this.getAllCities(prisma);
        const normalizedQuery = this.normalizeCity(query);
        
        // Calculer le score pour chaque ville
        const scoredCities = allCities.map(city => {
            const normalizedCity = this.normalizeCity(city);
            
            // Vérifier si la requête est contenue dans la ville
            const contains = normalizedCity.includes(normalizedQuery);
            
            // Calculer la similarité
            const similarity = this.calculateSimilarity(city, query);
            
            // Score final (contient = 1, similarité sinon)
            let score = contains ? 1 : similarity;
            
            // Bonus si la ville commence par la requête
            if (normalizedCity.startsWith(normalizedQuery)) {
                score = Math.max(score, 0.8);
            }
            
            return { city, score };
        });
        
        // Filtrer et trier par score
        const suggestions = scoredCities
            .filter(item => item.score > 0.3) // Seuil de similarité
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(item => item.city);
        
        console.log(`🔍 "${query}" → ${suggestions.length} suggestions`);
        return suggestions;
    }

    // Rechercher des trajets avec tolérance aux fautes
    async searchRidesWithTolerance(prisma, departure, destination) {
        const allCities = await this.getAllCities(prisma);
        
        // Trouver la ville la plus proche pour le départ
        let bestDeparture = departure;
        if (departure && departure.length >= 2) {
            const suggestions = await this.getSuggestions(prisma, departure, 'departure', 1);
            if (suggestions.length > 0) {
                bestDeparture = suggestions[0];
                if (bestDeparture !== departure) {
                    console.log(`🔄 Correction orthographe: "${departure}" → "${bestDeparture}"`);
                }
            }
        }
        
        // Trouver la ville la plus proche pour la destination
        let bestDestination = destination;
        if (destination && destination.length >= 2) {
            const suggestions = await this.getSuggestions(prisma, destination, 'destination', 1);
            if (suggestions.length > 0) {
                bestDestination = suggestions[0];
                if (bestDestination !== destination) {
                    console.log(`🔄 Correction orthographe: "${destination}" → "${bestDestination}"`);
                }
            }
        }
        
        return { bestDeparture, bestDestination };
    }
}

module.exports = new SuggestionService();