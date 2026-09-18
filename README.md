# Études Space 🇨🇲

Plateforme éducative mobile-first destinée d'abord aux élèves et étudiants francophones du Cameroun.

## Stack
Next.js App Router, TypeScript, Tailwind CSS, Prisma ORM et PostgreSQL/Neon.

## Démarrage local
1. Installer Node.js 20+.
2. Copier `.env.example` vers `.env.local`.
3. Renseigner `DATABASE_URL`, `SUPER_ADMIN_EMAIL` et `SUPER_ADMIN_PASSWORD`.
4. Installer les dépendances : `npm install`.
5. Appliquer le schéma : `npm run db:push`.
6. Initialiser les rôles et le Super Admin : `npm run db:seed`.
7. Lancer : `npm run dev`.

## Sécurité
Les mots de passe sont hashés avec bcrypt. Les sessions utilisent un token aléatoire stocké sous forme de hash en base et un cookie HTTP-only. Les secrets ne doivent jamais être commités.

## Déploiement Vercel + Neon
Connecter le dépôt GitHub à Vercel, ajouter les variables d'environnement dans les réglages du projet, puis provisionner la base Neon et exécuter les migrations/schéma avec Prisma. Ne jamais exposer les secrets côté client.

## État V1
La Phase 1 pose l'architecture, la base normalisée, l'authentification, le seed idempotent et les premières pages publiques. Les phases suivantes ajoutent profils, contenu, administration, analytics, recherche/favoris, puis tests et durcissement.

## Architecture
`app/` routes et UI · `lib/` services/auth/validation · `prisma/` schéma et seed.
