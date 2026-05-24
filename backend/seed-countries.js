// backend/seed-countries.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const countries = [
    // Afrique
    { code: 'CM', name: 'Cameroun', phoneCode: '+237', currency: 'XAF' },
    { code: 'CI', name: "Côte d'Ivoire", phoneCode: '+225', currency: 'XOF' },
    { code: 'SN', name: 'Sénégal', phoneCode: '+221', currency: 'XOF' },
    { code: 'GA', name: 'Gabon', phoneCode: '+241', currency: 'XAF' },
    { code: 'MA', name: 'Maroc', phoneCode: '+212', currency: 'MAD' },
    { code: 'TN', name: 'Tunisie', phoneCode: '+216', currency: 'TND' },
    { code: 'DZ', name: 'Algérie', phoneCode: '+213', currency: 'DZD' },
    { code: 'EG', name: 'Égypte', phoneCode: '+20', currency: 'EGP' },
    { code: 'NG', name: 'Nigéria', phoneCode: '+234', currency: 'NGN' },
    { code: 'GH', name: 'Ghana', phoneCode: '+233', currency: 'GHS' },
    { code: 'KE', name: 'Kenya', phoneCode: '+254', currency: 'KES' },
    { code: 'ZA', name: 'Afrique du Sud', phoneCode: '+27', currency: 'ZAR' },
    // Europe
    { code: 'FR', name: 'France', phoneCode: '+33', currency: 'EUR' },
    { code: 'BE', name: 'Belgique', phoneCode: '+32', currency: 'EUR' },
    { code: 'CH', name: 'Suisse', phoneCode: '+41', currency: 'CHF' },
    { code: 'DE', name: 'Allemagne', phoneCode: '+49', currency: 'EUR' },
    { code: 'ES', name: 'Espagne', phoneCode: '+34', currency: 'EUR' },
    { code: 'IT', name: 'Italie', phoneCode: '+39', currency: 'EUR' },
    { code: 'PT', name: 'Portugal', phoneCode: '+351', currency: 'EUR' },
    { code: 'GB', name: 'Royaume-Uni', phoneCode: '+44', currency: 'GBP' },
    { code: 'NL', name: 'Pays-Bas', phoneCode: '+31', currency: 'EUR' },
    // Amériques
    { code: 'US', name: 'États-Unis', phoneCode: '+1', currency: 'USD' },
    { code: 'CA', name: 'Canada', phoneCode: '+1', currency: 'CAD' },
    { code: 'MX', name: 'Mexique', phoneCode: '+52', currency: 'MXN' },
    { code: 'BR', name: 'Brésil', phoneCode: '+55', currency: 'BRL' },
    // Asie
    { code: 'IN', name: 'Inde', phoneCode: '+91', currency: 'INR' },
    { code: 'CN', name: 'Chine', phoneCode: '+86', currency: 'CNY' },
    { code: 'JP', name: 'Japon', phoneCode: '+81', currency: 'JPY' },
    { code: 'KR', name: 'Corée du Sud', phoneCode: '+82', currency: 'KRW' },
    // Océanie
    { code: 'AU', name: 'Australie', phoneCode: '+61', currency: 'AUD' },
    { code: 'NZ', name: 'Nouvelle-Zélande', phoneCode: '+64', currency: 'NZD' },
];

async function main() {
    for (const country of countries) {
        await prisma.country.upsert({
            where: { code: country.code },
            update: {},
            create: country
        });
        console.log(`✅ ${country.name} ajouté`);
    }
    console.log('🎉 Tous les pays ont été ajoutés avec succès !');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());