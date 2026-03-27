---
layout: default
title: Documentation - TradeJourney
description: Guide complet d'utilisation de TradeJourney
---

# 📖 Documentation TradeJourney

Guide complet pour utiliser TradeJourney et analyser vos performances de trading.

## Table des matières

- [Démarrage rapide](#getting-started)
- [Import de trades](#import)
- [Configuration des comptes](#accounts)
- [Utilisation des tags](#tags)
- [Dashboard et métriques](#metrics)
- [Calendrier de trading](#calendar)
- [Filtres et recherche](#filters)
- [Export de données](#export)

---

## 🚀 Démarrage rapide {#getting-started}

### Première connexion

1. Accédez à l'application sur `http://localhost:3000`
2. Créez votre compte utilisateur
3. Créez votre première base de données
4. Configurez vos comptes de trading

### Créer une base de données

TradeJourney utilise SQLite pour stocker vos données localement :

1. Cliquez sur **"Nouvelle base de données"**
2. Donnez un nom à votre base (ex: "Trading 2024")
3. La base est créée automatiquement

Vous pouvez gérer plusieurs bases de données pour séparer différentes périodes ou stratégies.

---

## 📥 Import de trades {#import}

TradeJourney supporte plusieurs formats d'import pour faciliter l'intégration avec votre plateforme de trading.

### Import depuis MT5 (MetaTrader 5)

1. Dans MT5, allez dans **Historique des comptes**
2. Clic droit → **Rapport** → **Enregistrer en HTML**
3. Dans TradeJourney : **Import** → **MT5**
4. Sélectionnez le fichier HTML
5. Configurez le fuseau horaire
6. Cliquez sur **Importer**

**Format attendu :**
- Fichier HTML exporté depuis MT5
- Contient les colonnes : Time, Position, Symbol, Type, Volume, Price, S/L, T/P, Commission, Swap, Profit

### Import depuis NinjaTrader

1. Exportez vos trades depuis NinjaTrader
2. Dans TradeJourney : **Import** → **NinjaTrader**
3. Sélectionnez le fichier
4. Vérifiez la correspondance des colonnes
5. Importez

### Import CSV personnalisé

Pour les autres plateformes, utilisez l'import CSV :

1. Préparez un fichier CSV avec les colonnes :
   - `symbol` : Symbole tradé
   - `openDate` : Date d'ouverture (format ISO)
   - `closeDate` : Date de fermeture
   - `type` : "buy" ou "sell"
   - `lot` : Taille de position
   - `openPrice` : Prix d'entrée
   - `closePrice` : Prix de sortie
   - `profit` : Profit brut
   - `commission` : Commission (positif)
   - `swap` : Frais de swap

2. Dans TradeJourney : **Import** → **CSV**
3. Mappez les colonnes
4. Importez

**Exemple de CSV :**
```csv
symbol,openDate,closeDate,type,lot,openPrice,closePrice,profit,commission,swap
EURUSD,2024-01-15T09:30:00Z,2024-01-15T14:20:00Z,buy,0.1,1.0850,1.0870,20.00,2.50,0
GBPUSD,2024-01-16T10:00:00Z,2024-01-16T15:30:00Z,sell,0.2,1.2650,1.2630,40.00,5.00,0
```

### Gestion des fuseaux horaires

TradeJourney gère automatiquement les fuseaux horaires :

- **Mode UTC** : Les dates sont converties en UTC
- **Mode Local** : Les dates sont conservées en heure locale
- **Par compte** : Configurez un fuseau horaire spécifique par compte

---

## 💰 Configuration des comptes {#accounts}

### Créer un compte

1. Allez dans **Paramètres** → **Comptes**
2. Cliquez sur **Nouveau compte**
3. Remplissez les informations :
   - **Nom** : Identifiant unique (ex: "MT5-123456")
   - **Nom affiché** : Nom convivial (ex: "Compte Principal")
   - **Nom complet** : Description complète
   - **Alias** : Noms alternatifs (séparés par virgules)
   - **Capital de départ** : Montant initial (optionnel)

### Capital de départ

Le capital de départ permet d'afficher votre PnL cumulé en partant de votre capital initial :

- Sans capital : Le graphique part de 0
- Avec capital : Le graphique part de votre capital et affiche le total (capital + gains/pertes)

**Exemple :**
- Capital de départ : 10 000 €
- PnL cumulé : +2 500 €
- Graphique affiche : 12 500 €

### Gérer plusieurs comptes

Vous pouvez :
- Créer autant de comptes que nécessaire
- Filtrer les données par compte
- Voir les performances consolidées ou par compte
- Comparer les performances entre comptes

---

## 🎯 Utilisation des tags {#tags}

Les tags permettent d'organiser et d'analyser vos trades par catégorie.

### Créer des groupes de tags

1. **Paramètres** → **Tags**
2. Créez des groupes (ex: "Stratégie", "Setup", "Marché")
3. Ajoutez des tags dans chaque groupe

**Exemples de groupes :**
- **Stratégie** : Breakout, Pullback, Reversal
- **Setup** : Morning Range, Afternoon Trend, News
- **Marché** : Forex, Indices, Commodities
- **Qualité** : A+, A, B, C

### Assigner des tags aux trades

1. Ouvrez un trade dans le calendrier
2. Sélectionnez les tags appropriés
3. Sauvegardez

### Analyser par tags

Le dashboard vous permet de :
- Filtrer par tags
- Comparer les performances entre tags
- Identifier vos setups les plus rentables
- Analyser le win rate par stratégie

---

## 📊 Dashboard et métriques {#metrics}

### Métriques principales

**PnL Cumulé**
- Évolution de votre capital dans le temps
- Graphique avec capital de départ si configuré

**Win Rate**
- Pourcentage de trades gagnants
- Formule : `(Trades gagnants / Total trades) × 100`

**Profit Factor**
- Ratio gains/pertes
- Formule : `Total gains / Total pertes`
- > 1 = Profitable, > 2 = Excellent

**Sharpe Ratio**
- Performance ajustée au risque
- Mesure la régularité des gains
- > 1 = Bon, > 2 = Excellent

**Recovery Factor**
- Capacité à récupérer après une perte
- Formule : `Profit net / Drawdown max`

**Expectancy (APPT)**
- Gain moyen par trade
- Formule : `(Win Rate × Avg Win) - (Loss Rate × Avg Loss)`

### Graphiques disponibles

- **PnL Cumulé** : Évolution du capital
- **PnL par jour** : Performance quotidienne
- **Win Rate** : Évolution du taux de réussite
- **APPT** : Expectancy dans le temps

### Filtres du dashboard

- **Période** : Aujourd'hui, Cette semaine, Ce mois, Personnalisé
- **Comptes** : Un ou plusieurs comptes
- **Agrégation** : Par jour, semaine ou mois

---

## 📅 Calendrier de trading {#calendar}

Le calendrier affiche vos trades jour par jour.

### Vue calendrier

- **Vert** : Jour profitable
- **Rouge** : Jour en perte
- **Gris** : Pas de trades
- **Intensité** : Proportionnelle au PnL

### Détails d'un jour

Cliquez sur un jour pour voir :
- Liste des trades
- PnL total du jour
- Win rate du jour
- Meilleur/pire trade

### Modifier un trade

1. Cliquez sur un trade
2. Modifiez les informations
3. Ajoutez des tags
4. Ajoutez un screenshot
5. Sauvegardez

### Ajouter un screenshot

Les screenshots vous aident à revoir vos trades :

1. Ouvrez un trade
2. Cliquez sur **Ajouter screenshot**
3. Sélectionnez l'image
4. L'image est stockée localement

---

## 🔍 Filtres et recherche {#filters}

### Filtres avancés

Disponibles sur toutes les pages :

- **Symbole** : Filtrer par instrument
- **Type** : Buy/Sell
- **Date** : Période personnalisée
- **Tags** : Un ou plusieurs tags
- **Compte** : Un ou plusieurs comptes
- **PnL** : Min/Max
- **Durée** : Trades courts/longs

### Opérateurs de filtre

- `=` : Égal
- `!=` : Différent
- `>` : Supérieur
- `>=` : Supérieur ou égal
- `<` : Inférieur
- `<=` : Inférieur ou égal
- `in` : Dans la liste

### Sauvegarder des filtres

Les filtres sont automatiquement sauvegardés dans votre session.

---

## 📤 Export de données {#export}

### Exporter en CSV

1. Appliquez vos filtres
2. Cliquez sur **Export** → **CSV**
3. Le fichier est téléchargé

### Exporter en JSON

Pour une sauvegarde complète :

1. **Paramètres** → **Export**
2. Sélectionnez **JSON**
3. Téléchargez le fichier

### Backup de la base de données

La base SQLite peut être sauvegardée directement :

```bash
# Copier le fichier de base de données
cp data/your-database.db backup/your-database-backup.db
```

---

## 🔧 Configuration avancée

### Variables d'environnement

Configurez TradeJourney via le fichier `.env` :

```bash
# Port de l'application
PORT=3000

# Mode debug
DEBUG_MODE=false

# Taille max des fichiers (en bytes)
MAX_FILE_SIZE=10485760

# Clés API (optionnel)
POLYGON_API_KEY=your_key_here
```

### Fuseau horaire par compte

Pour gérer différents fuseaux horaires :

1. **Paramètres** → **Comptes**
2. Éditez un compte
3. Activez **Gérer le fuseau horaire au niveau du compte**
4. Sélectionnez le fuseau horaire

---

## ❓ FAQ

**Q: Mes commissions s'affichent en négatif, est-ce normal ?**  
A: Non, les commissions doivent être positives. Utilisez le bouton "Fix" dans la console LogView pour corriger.

**Q: Puis-je importer des trades d'options ?**  
A: Oui, via l'import CSV personnalisé. Utilisez le symbole complet de l'option.

**Q: Comment supprimer des trades ?**  
A: Ouvrez le trade dans le calendrier et cliquez sur "Supprimer".

**Q: Puis-je utiliser TradeJourney hors ligne ?**  
A: Oui, TradeJourney fonctionne entièrement en local.

**Q: Les données sont-elles sécurisées ?**  
A: Oui, toutes les données restent sur votre machine. Rien n'est envoyé vers des serveurs externes.

---

## 🆘 Support

Besoin d'aide ?

- 📖 [Guide d'installation](/installation)
- 💬 [GitHub Issues](https://github.com/yourusername/tradeJourney/issues)
- 📧 Email : contact@tradejourney.com

---

[← Retour à l'accueil](/) | [Installation →](/installation)
