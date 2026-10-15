# Études Space 🇨🇲

**Études Space** est une plateforme éducative conçue pour aider les élèves et les étudiants, en particulier au Cameroun, à retrouver et organiser leurs ressources pédagogiques au même endroit : cours, exercices, séquences, anciens sujets et épreuves classées par niveau, série ou filière.

> **Objectif du projet :** proposer un espace d’apprentissage clair, accessible et évolutif, adapté aux parcours scolaires et universitaires camerounais.

[Voir le dépôt GitHub](https://github.com/sergeabena20-max/ETUDES-SPACES)

---

## Sommaire

- [Fonctionnalités](#-fonctionnalités)
- [Organisation des ressources](#-organisation-des-ressources)
- [Administration](#-administration)
- [Technologies](#-technologies)
- [Architecture du projet](#-architecture-du-projet)
- [Installation locale](#-installation-locale)
- [Variables d’environnement](#-variables-denvironnement)
- [Base de données et stockage](#-base-de-données-et-stockage)
- [Sécurité](#-sécurité)
- [Déploiement](#-déploiement)
- [État du projet](#-état-du-projet)

## ✨ Fonctionnalités

### Pour les élèves et étudiants

- Création de compte et connexion.
- Profil associé au type d’utilisateur et à son parcours scolaire ou universitaire.
- Prise en compte du statut **élève** ou **étudiant**, du niveau académique et, selon le parcours, de l’établissement et de la filière/série.
- Consultation des épreuves publiées, organisées par classe, niveau, série ou filière.
- Recherche et filtres des épreuves, notamment par mots-clés, année et catégorie lorsque ces informations sont disponibles.
- Accès aux ressources gratuites et préparation de la prise en charge de contenus premium.
- Espace personnel et gestion de favoris selon les fonctionnalités activées dans l’application.

### Ressources scolaires

Les ressources scolaires sont pensées pour être classées par classe et série, afin d’éviter de mélanger les programmes. Le catalogue comprend notamment les niveaux suivants :

- **Premier cycle :** 6e, 5e, 4e et 3e.
- **Second cycle :** Seconde, Première et Terminale, avec des séries telles que A, C et D.
- **Université :** niveaux Licence et parcours organisés par département et filière.

Les matières proposées dans l’administration s’adaptent à la classe ou à la série sélectionnée. Le catalogue de matières constitue une base de travail alignée sur les programmes camerounais disponibles ; il reste à vérifier et compléter avec les établissements et programmes spécifiques qui ne seraient pas encore couverts.

### Catégories d’épreuves

Selon le niveau et les paramètres définis par l’administration, les ressources peuvent être organisées par catégories :

- Exercices.
- Séquences 1 à 6.
- Contrôle continu (CC).
- Session normale.
- Anciens sujets d’examen.
- Examens blancs lorsque cette option est activée pour la classe.
- Simulation d’examen BTS / DUT pour les parcours universitaires concernés.

Les catégories disponibles dépendent du niveau et de la configuration associée : toutes les catégories ne s’appliquent pas à toutes les classes.

### Pour les administrateurs

- Gestion des ressources pédagogiques et de leurs métadonnées : titre, matière, niveau, série/filière, année et catégorie selon le type de ressource.
- Publication et gestion du statut des contenus (brouillon, publié ou archivé selon le module).
- Configuration des catégories d’épreuves disponibles pour les classes.
- Import de plusieurs fichiers PDF dans une boîte de réception d’import, avec possibilité de compléter les informations et de classer les éléments avant leur publication.
- Gestion des utilisateurs et des rôles selon les droits attribués.
- Flux de demande de réinitialisation du mot de passe soumis à validation du super-administrateur.

**Important :** les fonctionnalités sont décrites à partir du code et des modules du projet. Leur disponibilité sur le site en ligne dépend aussi de la réussite du build et du déploiement Vercel en cours.

## 🗂️ Organisation des ressources

L’objectif est de conserver une séparation claire :

- **Élèves :** classe, série et matière.
- **Étudiants :** département, filière et niveau universitaire.
- **Épreuves :** catégorie, année, matière et niveau associés.
- **Import :** fichiers déposés d’abord dans une zone d’attente, puis complétés et classés avant publication.

Cette organisation facilite l’ajout progressif de ressources sans devoir recréer chaque entrée manuellement.

## 🛠️ Technologies

| Technologie | Utilisation |
|---|---|
| Next.js 15 (App Router) | Application web et routes serveur |
| React 19 | Interface utilisateur |
| TypeScript | Typage du code |
| Tailwind CSS 4 | Styles et interface responsive |
| Prisma ORM | Accès aux données et gestion du schéma |
| PostgreSQL via Supabase | Base de données |
| Supabase Storage | Stockage prévu pour les fichiers, documents et médias |
| bcryptjs | Hachage des mots de passe |
| Zod | Validation des données |

## 🏗️ Architecture du projet

Les principaux dossiers sont organisés comme suit :

- `app/` : pages, interfaces et routes API de l’application.
- `app/admin/` : interfaces d’administration, gestion des épreuves et boîte d’import.
- `app/api/` : endpoints serveur.
- `lib/` : fonctions partagées, sessions, accès aux données et logique métier.
- `prisma/schema.prisma` : modèles et relations de la base de données.
- `prisma/seed.ts` : données initiales et initialisation du super-administrateur.
- `.env.example` : modèle des variables d’environnement nécessaires.

## 🚀 Installation locale

### Prérequis

- Node.js 20 ou version compatible avec le projet.
- npm.
- Un projet Supabase avec une base PostgreSQL.
- Les variables d’environnement nécessaires.

### Étapes

1. Cloner le dépôt :

   ```bash
   git clone https://github.com/sergeabena20-max/ETUDES-SPACES.git
   cd ETUDES-SPACES
   ```

2. Installer les dépendances :

   ```bash
   npm install
   ```

3. Copier le fichier d’exemple des variables :

   **Windows (PowerShell)**
   ```powershell
   Copy-Item .env.example .env.local
   ```

   **macOS / Linux**
   ```bash
   cp .env.example .env.local
   ```

4. Renseigner les variables de connexion dans `.env.local` (voir ci-dessous).

5. Générer/appliquer le schéma de la base de données :

   ```bash
   npm run db:push
   ```

6. Initialiser les données de base et le compte super-administrateur :

   ```bash
   npm run db:seed
   ```

7. Démarrer le serveur de développement :

   ```bash
   npm run dev
   ```

8. Ouvrir [http://localhost:3000](http://localhost:3000).

## 🔐 Variables d’environnement

Le fichier `.env.example` liste les variables utilisées par le projet :

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | URL de connexion à PostgreSQL sur Supabase |
| `AUTH_SECRET` | Secret utilisé par les mécanismes d’authentification |
| `SUPER_ADMIN_EMAIL` | Adresse du compte super-administrateur initial |
| `SUPER_ADMIN_PASSWORD` | Mot de passe initial du super-administrateur |
| `NEXT_PUBLIC_SUPABASE_URL` | URL publique du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clé publishable destinée à l’intégration côté client |
| `SUPABASE_SECRET_KEY` | Clé secrète réservée aux opérations serveur qui en ont besoin |

Ne renseigne jamais de vraies clés ou de mots de passe dans le README, dans un commit ou dans une capture publique. Utilise des valeurs locales et garde les secrets hors du dépôt.

## 🗄️ Base de données et stockage

Le projet utilise **Supabase comme service de données** :

- PostgreSQL héberge les comptes, rôles, niveaux académiques, matières, cours, épreuves et données associées.
- Supabase Storage est prévu pour les fichiers pédagogiques tels que les PDF et documents.

La variable `DATABASE_URL` doit contenir une URL PostgreSQL valide de ton projet Supabase. Les clés serveur ne doivent jamais être exposées dans le navigateur. Aucun compte Neon n’est nécessaire.

## 🔒 Sécurité

- Les mots de passe sont hachés avec bcryptjs.
- Les sessions sont gérées côté serveur avec un cookie HTTP-only et un jeton dont le hash est stocké en base.
- Les rôles et permissions servent à distinguer les accès utilisateurs et administrateurs.
- Les demandes de réinitialisation du mot de passe peuvent suivre un circuit de validation par le super-administrateur.
- Les clés secrètes et variables sensibles doivent rester dans l’environnement d’exécution et ne jamais être versionnées.

## ☁️ Déploiement

Le projet est conçu pour être déployé sur **Vercel**, avec **Supabase** pour la base de données et le stockage.

Pour un déploiement :
1. Importer le dépôt GitHub dans Vercel.
2. Ajouter les variables d’environnement dans les paramètres Vercel.
3. Vérifier la connexion PostgreSQL et les droits d’accès Supabase.
4. Lancer le déploiement et contrôler les logs de build avant de considérer la version comme disponible.

## 📌 État du projet

Études Space est en cours de développement. Les modules de comptes, de structuration scolaire/universitaire, de consultation et de gestion des épreuves, d’import de fichiers et d’administration sont développés progressivement.

Les prochaines étapes sont notamment :
- vérifier le build et le déploiement après chaque changement ;
- tester les parcours complets côté élève, étudiant et administrateur ;
- vérifier et enrichir le programme des matières par classe et série ;
- compléter les tests de sécurité, d’accessibilité et de fonctionnement ;
- confirmer en production les fonctionnalités avant de les annoncer comme disponibles.

---

**Développé pour faciliter l’accès aux ressources éducatives au Cameroun 🇨🇲**
