// backend/seed-countries.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const countries = [
    // Afrique du Nord
    { code: 'DZ', name: 'Algérie', flag: '🇩🇿', phoneCode: '+213', currency: 'DZD' },
    { code: 'EG', name: 'Égypte', flag: '🇪🇬', phoneCode: '+20', currency: 'EGP' },
    { code: 'LY', name: 'Libye', flag: '🇱🇾', phoneCode: '+218', currency: 'LYD' },
    { code: 'MA', name: 'Maroc', flag: '🇲🇦', phoneCode: '+212', currency: 'MAD' },
    { code: 'TN', name: 'Tunisie', flag: '🇹🇳', phoneCode: '+216', currency: 'TND' },
    { code: 'SD', name: 'Soudan', flag: '🇸🇩', phoneCode: '+249', currency: 'SDG' },
    { code: 'SS', name: 'Soudan du Sud', flag: '🇸🇸', phoneCode: '+211', currency: 'SSP' },
    { code: 'MR', name: 'Mauritanie', flag: '🇲🇷', phoneCode: '+222', currency: 'MRU' },
    
    // Afrique de l'Ouest
    { code: 'BJ', name: 'Bénin', flag: '🇧🇯', phoneCode: '+229', currency: 'XOF' },
    { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫', phoneCode: '+226', currency: 'XOF' },
    { code: 'CV', name: 'Cap-Vert', flag: '🇨🇻', phoneCode: '+238', currency: 'CVE' },
    { code: 'CI', name: 'Côte d\'Ivoire', flag: '🇨🇮', phoneCode: '+225', currency: 'XOF' },
    { code: 'GM', name: 'Gambie', flag: '🇬🇲', phoneCode: '+220', currency: 'GMD' },
    { code: 'GH', name: 'Ghana', flag: '🇬🇭', phoneCode: '+233', currency: 'GHS' },
    { code: 'GN', name: 'Guinée', flag: '🇬🇳', phoneCode: '+224', currency: 'GNF' },
    { code: 'GW', name: 'Guinée-Bissau', flag: '🇬🇼', phoneCode: '+245', currency: 'XOF' },
    { code: 'LR', name: 'Liberia', flag: '🇱🇷', phoneCode: '+231', currency: 'LRD' },
    { code: 'ML', name: 'Mali', flag: '🇲🇱', phoneCode: '+223', currency: 'XOF' },
    { code: 'NE', name: 'Niger', flag: '🇳🇪', phoneCode: '+227', currency: 'XOF' },
    { code: 'NG', name: 'Nigeria', flag: '🇳🇬', phoneCode: '+234', currency: 'NGN' },
    { code: 'SN', name: 'Sénégal', flag: '🇸🇳', phoneCode: '+221', currency: 'XOF' },
    { code: 'SL', name: 'Sierra Leone', flag: '🇸🇱', phoneCode: '+232', currency: 'SLL' },
    { code: 'TG', name: 'Togo', flag: '🇹🇬', phoneCode: '+228', currency: 'XOF' },
    
    // Afrique centrale
    { code: 'CM', name: 'Cameroun', flag: '🇨🇲', phoneCode: '+237', currency: 'XAF' },
    { code: 'CF', name: 'République centrafricaine', flag: '🇨🇫', phoneCode: '+236', currency: 'XAF' },
    { code: 'TD', name: 'Tchad', flag: '🇹🇩', phoneCode: '+235', currency: 'XAF' },
    { code: 'CG', name: 'Congo', flag: '🇨🇬', phoneCode: '+242', currency: 'XAF' },
    { code: 'CD', name: 'République démocratique du Congo', flag: '🇨🇩', phoneCode: '+243', currency: 'CDF' },
    { code: 'GQ', name: 'Guinée équatoriale', flag: '🇬🇶', phoneCode: '+240', currency: 'XAF' },
    { code: 'GA', name: 'Gabon', flag: '🇬🇦', phoneCode: '+241', currency: 'XAF' },
    { code: 'ST', name: 'Sao Tomé-et-Principe', flag: '🇸🇹', phoneCode: '+239', currency: 'STD' },
    
    // Afrique de l'Est
    { code: 'BI', name: 'Burundi', flag: '🇧🇮', phoneCode: '+257', currency: 'BIF' },
    { code: 'DJ', name: 'Djibouti', flag: '🇩🇯', phoneCode: '+253', currency: 'DJF' },
    { code: 'ER', name: 'Érythrée', flag: '🇪🇷', phoneCode: '+291', currency: 'ERN' },
    { code: 'ET', name: 'Éthiopie', flag: '🇪🇹', phoneCode: '+251', currency: 'ETB' },
    { code: 'KE', name: 'Kenya', flag: '🇰🇪', phoneCode: '+254', currency: 'KES' },
    { code: 'MG', name: 'Madagascar', flag: '🇲🇬', phoneCode: '+261', currency: 'MGA' },
    { code: 'MW', name: 'Malawi', flag: '🇲🇼', phoneCode: '+265', currency: 'MWK' },
    { code: 'MU', name: 'Maurice', flag: '🇲🇺', phoneCode: '+230', currency: 'MUR' },
    { code: 'MZ', name: 'Mozambique', flag: '🇲🇿', phoneCode: '+258', currency: 'MZN' },
    { code: 'RW', name: 'Rwanda', flag: '🇷🇼', phoneCode: '+250', currency: 'RWF' },
    { code: 'SC', name: 'Seychelles', flag: '🇸🇨', phoneCode: '+248', currency: 'SCR' },
    { code: 'SO', name: 'Somalie', flag: '🇸🇴', phoneCode: '+252', currency: 'SOS' },
    { code: 'TZ', name: 'Tanzanie', flag: '🇹🇿', phoneCode: '+255', currency: 'TZS' },
    { code: 'UG', name: 'Ouganda', flag: '🇺🇬', phoneCode: '+256', currency: 'UGX' },
    
    // Afrique australe
    { code: 'ZA', name: 'Afrique du Sud', flag: '🇿🇦', phoneCode: '+27', currency: 'ZAR' },
    { code: 'AO', name: 'Angola', flag: '🇦🇴', phoneCode: '+244', currency: 'AOA' },
    { code: 'BW', name: 'Botswana', flag: '🇧🇼', phoneCode: '+267', currency: 'BWP' },
    { code: 'KM', name: 'Comores', flag: '🇰🇲', phoneCode: '+269', currency: 'KMF' },
    { code: 'LS', name: 'Lesotho', flag: '🇱🇸', phoneCode: '+266', currency: 'LSL' },
    { code: 'NA', name: 'Namibie', flag: '🇳🇦', phoneCode: '+264', currency: 'NAD' },
    { code: 'SZ', name: 'Eswatini', flag: '🇸🇿', phoneCode: '+268', currency: 'SZL' },
    { code: 'ZM', name: 'Zambie', flag: '🇿🇲', phoneCode: '+260', currency: 'ZMW' },
    { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼', phoneCode: '+263', currency: 'ZWL' }
];

async function seedCountries() {
    console.log('🌍 Ajout des pays...');
    
    for (const country of countries) {
        await prisma.country.upsert({
            where: { code: country.code },
            update: {},
            create: {
                code: country.code,
                name: country.name,
                isActive: true,
                flag: country.flag,
                phoneCode: country.phoneCode,
                currency: country.currency
            }
        });
        console.log(`✅ ${country.name} (${country.code}) ajouté`);
    }
    
    console.log('🎉 Tous les pays ont été ajoutés avec succès !');
}

seedCountries()
    .catch(console.error)
    .finally(() => prisma.$disconnect());