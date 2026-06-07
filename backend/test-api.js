const express = require('express');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');

const app = express();
const prisma = new PrismaClient();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Route de test
app.get('/api/rides/dynamic-search', async (req, res) => {
    try {
        const { departure = '', destination = '' } = req.query;
        
        console.log('🔍 TEST - Recherche reçue:', { departure, destination });
        
        const whereClause = {};
        
        if (departure && departure.trim() !== '') {
            whereClause.departure = { contains: departure, mode: 'insensitive' };
        }
        
        if (destination && destination.trim() !== '') {
            whereClause.destination = { contains: destination, mode: 'insensitive' };
        }
        
        const rides = await prisma.ride.findMany({
            where: whereClause,
            include: {
                driver: {
                    select: {
                        id: true,
                        name: true,
                        rating: true,
                        photoUrl: true
                    }
                }
            }
        });
        
        console.log(`📊 ${rides.length} trajets trouvés`);
        res.json({ rides });
    } catch (error) {
        console.error('❌ Erreur:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Test API lancée sur http://0.0.0.0:${PORT}`);
});