# Études Space 🇨🇲

Plateforme éducative mobile-first destinée d'abord aux élèves et étudiants francophones du Cameroun.

## Stack
Next.js App Router, TypeScript, Tailwind CSS, Prisma ORM et **PostgreSQL + Storage via Supabase**.

## Démarrage local
1. Installer Node.js 20+.
2. Copier `.env.example` vers `.env.local`.
3. Créer un projet Supabase.
4. Renseigner l'URL Supabase, la clé publishable, la connexion PostgreSQL Supabase, `SUPER_ADMIN_EMAIL` et `SUPER_ADMIN_PASSWORD`.
5. Installer les dépendances : `npm install`.
6. Appliquer le schéma : `npm run db:push`.
7. Initialiser les rôles, plans et le Super Admin : `npm run db:seed`.
8. Lancer : `npm run dev`.

## Supabase
Supabase est le service unique utilisé pour la base PostgreSQL et le stockage des fichiers (PDF, images et documents). Aucun compte Neon n'est nécessaire.

La variable `DATABASE_URL` doit pointer vers la base PostgreSQL du projet Supabase. Les variables `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` servent à l'intégration Supabase côté application. La clé serveur Supabase ne doit jamais être exposée au navigateur.

## Sécurité
Les mots de passe sont hashés avec bcrypt. Les sessions utilisent un token aléatoire stocké sous forme de hash en base et un cookie HTTP-only. Les secrets ne doivent jamais être commités.

## Déploiement Vercel + Supabase
Connecter le dépôt GitHub à Vercel et ajouter les variables d'environnement dans les réglages du projet. Utiliser uniquement Supabase pour PostgreSQL et Storage. Ne jamais exposer les secrets côté client.

## État V1
La Phase 1 pose l'architecture, la base normalisée, l'authentification, le seed idempotent et les premières pages publiques. Les phases suivantes ajoutent profils, contenu, administration, analytics, recherche/favoris, puis tests et durcissement.

## Architecture
`app/` routes et UI · `lib/` services/auth/validation · `prisma/` schéma et seed.
