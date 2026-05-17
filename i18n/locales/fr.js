export default {
    zodI18n: {
        errors: {
            custom: 'Champ invalide',
            invalid_arguments: 'La fonction a reçu des arguments invalides',
            invalid_date: 'Date invalide',
            invalid_enum_value:
                "La valeur '{received}' n'existe pas dans les options: {options}",
            invalid_intersection_types:
                "Les résultats d'intersection n'ont pas pu être fusionnés",
            invalid_literal: 'La valeur doit être {expected}',
            invalid_return_type: 'La fonction a retourné un type invalide',
            invalid_string: {
                cuid: '{validation} invalide',
                datetime: '{validation} invalide',
                email: '{validation} invalide',
                endsWith: 'Champ invalide: doit se terminer par "{endsWith}"',
                regex: '{validation} invalide',
                startsWith: 'Champ invalide: doit commencer par "{startsWith}"',
                url: '{validation} invalide',
                uuid: '{validation} invalide',
            },
            invalid_type:
                'Type invalide: {expected} doit être fourni(e), mais {received} a été reçu(e)',
            invalid_type_received_undefined: 'Obligatoire',
            invalid_union: 'Champ invalide',
            invalid_union_discriminator:
                'La valeur du discriminateur est invalide. Options attendus: {options}',
            not_finite: 'Le nombre doit être fini',
            not_multiple_of: 'Le nombre doit être un multiple de {multipleOf}',
            required: 'Requis',
            too_big: {
                array: {
                    exact: 'La liste doit contenir exactement {maximum} élément(s)',
                    inclusive:
                        'La liste doit contenir au plus {maximum} élément(s)',
                    not_inclusive:
                        'La liste doit contenir moins de {maximum} élément(s)',
                },
                date: {
                    exact: 'La date doit être égale au {maximum}',
                    inclusive:
                        'La date doit être inférieure ou égale au {maximum}',
                    not_inclusive: 'La date doit être inférieure au {maximum}',
                },
                number: {
                    exact: 'Le nombre doit être égale à {maximum}',
                    inclusive:
                        'Le nombre doit être inférieur ou égal à {maximum}',
                    not_inclusive: 'Le nombre doit être inférieur à {maximum}',
                },
                set: {
                    exact: 'Champ invalide',
                    inclusive: 'Champ invalide',
                    not_inclusive: 'Champ invalide',
                },
                string: {
                    exact: 'Le texte doit contenir exactement {maximum} caractère(s)',
                    inclusive:
                        'Le texte doit contenir au plus {maximum} caractère(s)',
                    not_inclusive:
                        'Le texte doit contenir moins de {maximum} caractère(s)',
                },
            },
            too_small: {
                array: {
                    exact: 'La liste doit contenir exactement {minimum} élément(s)',
                    inclusive:
                        'La liste doit contenir au moins {minimum} élément(s)',
                    not_inclusive:
                        'La liste doit contenir plus de {minimum} élément(s)',
                },
                date: {
                    exact: 'La date doit être égale au {minimum}',
                    inclusive:
                        'La date doit être supérieure ou égale au {minimum} ',
                    not_inclusive: 'La date doit être supérieure au {minimum}',
                },
                number: {
                    exact: 'Le nombre doit être égal à {minimum}',
                    inclusive:
                        'Le nombre doit être supérieur ou égal à {minimum}',
                    not_inclusive: 'Le nombre doit être supérieur à {minimum}',
                },
                set: {
                    exact: 'Champ invalide',
                    inclusive: 'Champ invalide',
                    not_inclusive: 'Champ invalide',
                },
                string: {
                    exact: 'Le texte doit contenir exactement {minimum} caractère(s)',
                    inclusive:
                        'Le texte doit contenir au moins {minimum} caractère(s)',
                    not_inclusive:
                        'Le texte doit centenir plus de {minimum} caractère(s)',
                },
            },
            unrecognized_keys:
                "Une ou plusieurs clé(s) non reconnue(s) dans l'objet: {keys}",
        },
        types: {
            array: 'liste',
            bigint: 'grand entier',
            boolean: 'booléen',
            date: 'date',
            float: 'décimal',
            function: 'fonction',
            integer: 'entier',
            map: 'map',
            nan: 'NaN',
            never: 'never',
            null: 'null',
            number: 'nombre',
            object: 'objet',
            promise: 'promise',
            set: 'ensemble',
            string: 'chaîne de caractères',
            symbol: 'symbole',
            undefined: 'non défini',
            unknown: 'inconnu',
            void: 'void',
        },
        validations: {
            cuid: 'CUID',
            datetime: 'datetime',
            email: 'e-mail',
            regex: 'expression régulière',
            url: 'lien',
            uuid: 'UUID',
        },
        validation: {
            tag: {
                description_min:
                    'La description doit faire plus de 3 caractères ou être vide',
            },
            symbol: {
                symbol_min: 'Le symbole est requis',
                digit_min: 'Le nombre de décimales doit être au moins 0',
                digit_max: 'Le nombre de décimales ne peut pas dépasser 6',
            },
            trade: {
                symbol_required: 'Le symbole est requis',
                type_invalid: 'Le type doit être "buy" ou "sell"',
                lot_invalid: 'Le lot doit être un nombre valide',
                lot_required: 'Le lot est requis',
                lot_positive: 'Le lot doit être un nombre positif',
                open_price_invalid:
                    "Le prix d'ouverture doit être un nombre valide",
                open_price_required: "Le prix d'ouverture est requis",
                open_price_positive:
                    "Le prix d'ouverture doit être un nombre positif",
                close_price_invalid:
                    'Le prix de clôture doit être un nombre valide',
                close_price_required: 'Le prix de clôture est requis',
                close_price_positive:
                    'Le prix de clôture doit être un nombre positif',
                profit_invalid: 'Le profit doit être un nombre valide',
                profit_required: 'Le profit est requis',
                profit_decimal_limit:
                    'Le profit ne peut pas avoir plus de 2 décimales',
                account_id_required: "L'ID du compte est requis",
                account_id_positive: "L'ID du compte doit être indiqué",
                note_or_tags_required:
                    'Vous devez fournir au moins une note ou sélectionner un tag',
            },
            dayTag: {
                note_or_tags_required:
                    'Vous devez fournir au moins une note ou sélectionner un tag',
            },
            name_format: 'Ne doit contenir que des lettres (accents inclus), chiffres ou _',
        },
    },
    layout: {
        default: {
            multiple_tabs: {
                title: 'Attention : Plusieurs onglets ouverts',
                description:
                    'Seul le dernier onglet actif sera synchronisé. Veuillez fermer les autres onglets pour éviter tout problème.',
            },
        },
    },
    common: {
        yes: 'Oui',
        no: 'Non',
        cancel: 'Annuler',
        loading: 'Chargement...',
        actions: {
            convert: 'Convertir',
            save: 'Enregistrer',
            save_and_close: 'Enregistrer & Quitter',
            cancel: 'Annuler',
            delete: 'Supprimer',
            confirm: 'Confirmer',
            close: 'Fermer',
            reset: 'Réinitialiser',
            back: 'Retour',
            create: 'Créer',
            update: 'Mettre à jour'
        },
        title: {
            success: 'Success',
            error: 'Error',
        },
        trade_types: {
            buy: 'Achat',
            sell: 'Vente',
        },
        weekdays: {
            short: {
                monday: 'Lun',
                tuesday: 'Mar',
                wednesday: 'Mer',
                thursday: 'Jeu',
                friday: 'Ven',
                saturday: 'Sam',
                sunday: 'Dim',
            },
        },
    },
    about: 'À propos',
    language: {
        switch: 'Français',
    },
    locale: 'fr',
    database: {
        select: {
            title: 'Sélectionner une base de données',
            no_databases: 'Aucune base de données disponible',
            create_new: 'Créer une nouvelle base de données',
            default: 'Par défaut',
            confirm: 'Confirmer',
        },
        create: {
            title: 'Créer une base de données',
            display_name: 'Nom affiché',
            display_name_placeholder: 'Mon journal de trading',
            technical_name: 'Nom technique',
            technical_name_placeholder: 'mon_journal',
            technical_name_help: 'Lettres minuscules, chiffres et underscores uniquement',
            submit: 'Créer',
            error: 'Erreur lors de la création de la base de données',
        },
    },
    pages: {
        index: {
            title: 'TradeJourney',
            subtitle: 'Suivez vos performances, analysez vos trades',
            journal_title: 'Votre journal de trading personnel',
            journal_description:
                'Un outil simple pour suivre et analyser vos trades',
            feature_import: 'Import de rapports MT5 et Ninja Trader (CSV)',
            feature_analysis: 'Analyse de performance',
            feature_organization: 'Organisation par symbole et type',
            start_button: 'Commencer maintenant',
            already_user: 'Déjà utilisateur ?',
            login_link: 'Se connecter',
        },
        trades: {
            tabs: {
                daily: 'Journalier',
                calendar: 'Calendrier',
                trades: 'Transactions',
                import: 'Importer',
            },
        },
        dashboard: {
            tabs: {
                index: 'Géneral',
            },
        },
        settings: {
            tabs: {
                accounts: 'Comptes',
                tags: 'Tags',
                trading_symbols: 'Symboles de trading',
                backup: 'Sauvegarde',
                tools: 'Outils',
                options: 'Options',
                plugins: 'Plugins',
            },
            plugins: {
                title: 'Plugins',
                description: 'Gérez les plugins installés',
                empty: 'Aucun plugin trouvé',
                empty_hint: 'Importez un plugin via le bouton Importer',
                load_error: 'Erreur lors du chargement des plugins',
                enabled: 'Plugin activé',
                disabled: 'Plugin désactivé',
                toggle_error: 'Erreur lors du changement détat du plugin',
                import: 'Importer',
                import_success: 'Plugin importé avec succès',
                import_error: 'Erreur lors de l\'import du plugin',
                import_error_invalid_type: 'Le fichier doit être au format .zip',
                delete_confirm: 'Êtes-vous sûr de vouloir supprimer ce plugin ?',
                delete_success: 'Plugin supprimé avec succès',
                delete_error: 'Erreur lors de la suppression du plugin',
            },
        },
        login: {
            title: 'TradeJourney',
            subtitle: 'Connectez-vous pour accéder à votre journal de trading',
            heading: 'Connexion',
            email: {
                label: 'Email',
                description: 'Entrez votre adresse email',
            },
            password: {
                label: 'Mot de passe',
                placeholder: 'Mot de passe',
            },
            database: {
                label: 'Base de données',
                description: 'Sélectionnez votre base de données',
            },
            submit_button: 'Se connecter',
            error_title: 'Erreur de connexion',
            validation: {
                invalid_email: 'Veuillez entrer une adresse email valide',
                password_min_length:
                    'Le mot de passe doit contenir au moins 4 caractères',
            },
        },
        select_database: {
            title: 'Sélectionner une base de données',
            subtitle: 'Choisissez une base de données existante ou créez-en une nouvelle',
            existing_databases: 'Bases de données disponibles',
            no_databases: 'Aucune base de données trouvée. Créez-en une pour commencer.',
            default: 'Par défaut',
            continue: 'Continuer',
            or: 'ou',
            create_new: 'Créer une nouvelle base de données',
            delete_database: 'Supprimer la base de données',
            delete_confirmation: 'Êtes-vous sûr de vouloir supprimer cette base de données ? Cette action est irréversible.',
            password: 'Mot de passe',
            enter_password: 'Entrez votre mot de passe pour confirmer',
            delete: 'Supprimer',
            rename_database: 'Renommer la base de données',
            display_name: 'Nom affiché',
            enter_display_name: 'Entrez le nouveau nom affiché',
            rename_success: 'Base de données renommée avec succès',
        },
    },
    components: {
        notes_panel: {
            sidebar: {
                title: 'MES NOTES',
                delete_note: 'Supprimer cette note',
                add_note: 'Ajouter',
            },
            unsaved_modal: {
                title: 'Modifications non sauvegardées',
                content: 'Vous avez des modifications non sauvegardées. Voulez-vous sauvegarder avant de continuer ?',
                discard: 'Ignorer',
            },
            delete_modal: {
                title: 'Supprimer la note',
                content:
                    'Êtes-vous sûr de vouloir supprimer la note du {date} ?',
            },
            create_modal: {
                title: 'Nouvelle note',
                date_label: 'Date',
                time_label: 'Heure',
                subtitle_label: 'Sous-titre',
            },
            change_datetime_modal: {
                title: 'Modifier la date et l\'heure',
                success: 'Date et heure de la note mises à jour avec succès',
            },
            header: {
                notes_of: 'Notes du {date}',
                subtitle_placeholder: 'Ajouter un sous-titre...',
                change_date_time: 'Modifier la date et l\'heure',
            },
            editor: {
                no_note_selected: 'Sélectionnez ou créez une note',
                placeholder: 'Commencez à écrire votre note...',
                insert_image: 'Insérer une image',
                toolbar: {
                    bold: 'Gras',
                    italic: 'Italique',
                    code: 'Code inline',
                    code_block: 'Bloc de code',
                    heading1: 'Titre 1',
                    heading2: 'Titre 2',
                    heading3: 'Titre 3',
                    bullet_list: 'Liste à puces',
                    ordered_list: 'Liste numérotée',
                    quote: 'Citation',
                    link: 'Lien',
                    horizontal_rule: 'Ligne horizontale',
                },
            },
            toast: {
                save_success_title: 'Note sauvegardée',
                save_success_desc:
                    'Votre note a été sauvegardée avec succès',
                delete_success_title: 'Note supprimée',
                delete_success_desc:
                    'Votre note a été supprimée avec succès',
            },
            errors: {
                load_failed: 'Impossible de charger les notes',
                save_failed: "Impossible d'enregistrer la note",
                delete_failed: 'Impossible de supprimer la note',
            },
        },
        backup_manager: {
            create: {
                title: 'Créer une sauvegarde',
                description:
                    'Créez une sauvegarde complète de votre base de données et des fichiers uploadés.',
                button: 'Créer une sauvegarde',
                in_progress: 'Création en cours...',
            },
            restore: {
                title: 'Restaurer une sauvegarde',
                description:
                    'Téléchargez un fichier de sauvegarde pour restaurer vos données.',
                select_file: 'Sélectionner un fichier',
                button: 'Restaurer la sauvegarde',
                in_progress: 'Restauration en cours...',
            },
            list: {
                title: 'Sauvegardes disponibles',
                refresh: 'Actualiser',
                empty: {
                    title: 'Aucune sauvegarde disponible',
                    description:
                        'Créez votre première sauvegarde pour commencer',
                },
                item: {
                    archive: 'Archive',
                    size: 'Taille',
                },
                actions: {
                    delete_confirm:
                        'Êtes-vous sûr de vouloir supprimer cette sauvegarde ?',
                    download: 'Télécharger',
                },
            },
            restore_confirm: {
                title: 'Confirmer la restauration',
                message:
                    'Êtes-vous sûr de vouloir restaurer la sauvegarde du {date} ?',
                warning:
                    'Attention : Cette action écrasera toutes les données actuelles.',
            },
            success: {
                backup_deleted: 'Sauvegarde supprimée avec succès',
                backup_created: 'Sauvegarde créée avec succès',
                backup_restored: 'Sauvegarde restaurée avec succès',
            },
            errors: {
                load_failed: 'Impossible de charger les sauvegardes',
                delete_failed: 'Impossible de supprimer la sauvegarde',
                create_failed: 'Échec de la création de la sauvegarde',
                download_failed:
                    'Échec du téléchargement de la sauvegarde: {error}',
                no_file_selected: 'Aucun fichier sélectionné',
                file_too_large:
                    'Fichier trop volumineux. La taille maximale autorisée est de {size} Mo',
                restore_failed: 'Échec de la restauration de la sauvegarde',
            },
        },

        app_footer: {
            copyright: 'Tous droits réservés',
        },
        app_header: {
            menu: 'Menu',
            logout: 'Déconnexion',
            theme: {
                dark: 'Passer en mode sombre',
                light: 'Passer en mode clair',
            },
            menu_items: {
                dashboard: 'Tableau de bord',
                trades: 'Trades',
                settings: 'Paramètres',
                test: 'Test',
                log: 'Log',
            },
        },
        already_logged_in: {
            title: 'Session active détectée',
            alert: {
                title: 'Vous êtes déjà connecté',
                description:
                    'Une session active a été détectée sur cet appareil. Que souhaitez-vous faire ?',
            },
            buttons: {
                continue: 'Continuer la session',
                logout: 'Se déconnecter',
            },
        },
        common: {
            customFields: {
                label: 'Champs personnalisés',
                edit: 'Modifier',
                collapse: 'Replier',
                empty: 'Aucun champ',
                add: 'Ajouter un champ',
                key_placeholder: 'Nom du champ',
                value_placeholder: 'Valeur',
                duplicate_key_error: 'Les clés des champs doivent être uniques',
                empty_key_error: 'Le nom du champ ne peut pas être vide',
            },
            actions: {
                add_notes_tags: 'Ajouter notes/tags',
                edit_notes_tags: 'Modifier notes/tags',
                clear_notes_tags: 'Effacer notes/tags',
            },
            tagSelector: {
                manage_tags: 'Gérer les tags',
            },
            columns: {
                button: 'Colonnes',
                headers: {
                    actions: 'Actions',
                    openDate: 'Date ouverture',
                    closeDate: 'Date clôture',
                    openHour: 'H. ouverture',
                    closeHour: 'H. clotûre',
                    symbol: 'Symbole',
                    type: 'Type',
                    account: 'Compte',
                    lot: 'Lot',
                    openPrice: 'Prix entrée',
                    closePrice: 'Prix sortie',
                    profit: 'Profit Net',
                    grossProfit: 'Profit Brut',
                    commission: 'Commission',
                    note: 'Note',
                    tags: 'Tags',
                    screenshots: 'Screenshots',
                },
                screenshots: {
                    multiple: "{count} captures d'écran disponibles",
                    single: "Afficher la capture d'écran",
                    aria_label: "Voir les captures d'écran",
                },
            },
        },
        backup: {
            title: 'Exporter',
            description:
                'Gérez vos sauvegardes de données et restaurez des versions précédentes',
        },
        modal_delete: {
            title: 'Confirmation de suppression',
        },
        dashboard: {
            appt_chart: {
                title: 'APPT',
                enlarge: 'Agrandir',
                enlarged_title: 'APPT (agrandi)',
            },
            winrate_chart: {
                title: 'Win Rate',
                enlarge: 'Agrandir',
                enlarged_title: 'Win Rate (agrandi)',
            },
            cumulated_pnl_chart: {
                title: 'PnL Cumulé',
                enlarge: 'Agrandir',
                enlarged_title: 'PnL Cumulé (agrandi)',
            },
            intraday_pnl_chart: {
                label: 'PnL Cumulé',
            },
            pl_ratio_chart: {
                title: 'Ratio P/L',
                enlarge: 'Agrandir',
                enlarged_title: 'Ratio P/L (agrandi)',
            },
            index: {
                accounts: 'Comptes',
                select_accounts: 'Sélectionnez un ou plusieurs comptes',
                all_accounts: 'Tous les comptes',
                selected_accounts: '{count} compte(s) sélectionné(s)',
                period: 'Période',
                filter: 'Filtrer',
                aggregation: 'Agrégation:',
                by_day: 'Par jour',
                by_week: 'Par semaine',
                by_month: 'Par mois',
                all_trades_period: 'Pour tous les trades de la période:',
                
                cumulated_pnl: 'PnL Cumulé',
                cumulated_pnl_tooltip: 'Somme de tous les profits et pertes au fil du temps. Formule : Σ(Profits des Trades). Montre la trajectoire de croissance du compte et la performance globale. Une tendance positive indique une rentabilité constante.',
                
                trades_count: 'Nombre de Trades',
                trades_count_tooltip: 'Nombre total de trades exécutés pendant la période sélectionnée. Indicateur de votre activité de trading.',
                
                expectancy: 'Espérance',
                expectancy_tooltip: 'Espérance de gain par trade. Formule : Profit Net Total / Nombre de Trades. Indicateur clé de l’efficacité des trades indépendamment de leur fréquence. Des valeurs plus élevées indiquent des trades plus rentables en moyenne.',
                
                pl_ratio: 'Ratio P/L',
                pl_ratio_tooltip: 'Ratio Profit/Perte. Formule : (Profit Moyen des Gagnants) / (Perte Moyenne des Perdants). Les valeurs supérieures à 1,5 suggèrent une bonne gestion du risque. Mesure combien vous gagnez vs combien vous perdez en moyenne.',
                
                win_rate: 'Taux de Gain (wr)',
                win_rate_tooltip: 'Pourcentage de trades rentables. Formule : (Trades Gagnants / Total des Trades) × 100%. Doit être évalué avec le ratio P/L car un taux de gain élevé avec un mauvais ratio P/L peut quand même entraîner des pertes.',
                
                profit_factor: 'Facteur de Profit',
                profit_factor_tooltip: 'Ratio entre le profit brut et la perte brute. Formule : Profit Brut / Perte Brute. Métrique standard de MetaTrader. Les valeurs supérieures à 1,5 indiquent des systèmes potentiellement rentables ; au-dessus de 2,0 est considéré comme excellent.',
                
                recovery_factor: 'Facteur de Récupération',
                recovery_factor_tooltip: 'Mesure l’efficacité risque/récompense. Formule : Profit Net / Drawdown Maximum. Des valeurs plus élevées indiquent une meilleure récupération après les drawdowns. Les valeurs supérieures à 3 suggèrent des systèmes de trading robustes avec une bonne préservation du capital.',
                
                sharpe_ratio: 'Ratio de Sharpe',
                sharpe_ratio_tooltip: 'Mesure du rendement ajusté au risque. Formule : (Rendement Moyen - Taux Sans Risque) / Écart-Type. Les valeurs supérieures à 1,0 indiquent une bonne performance ajustée au risque ; au-dessus de 2,0 est excellent.',

                cumulated_label: 'Cumulé',
                mobile_avg_label: 'Moyenne mobile',
                quick_metrics: 'Métriques rapides',
            },
            all_trades: {
                title: 'TOUS LES TRADES',
                gross_pnl: 'PnL Brut',
                trades_count: 'Nombre de Trades',
                contracts: 'Nombre de Contrats',
                avg_trade_time: 'Durée Moyenne',
                longest_trade_time: 'Durée Maximale',
                winrate: 'Taux de Gain (wr)',
                expectancy: 'Espérance',
                commission: 'Commission Totale',
                total_pnl: 'PnL Total',
                winning: 'Gagnants',
                losing: 'Perdants',
                breakeven: 'Nuls'                
            },
            profit_trades: {
                title: 'TRADES GAGNANTS',
                total_profit: 'Profit Total',
                commission: 'Commission',
                winning_trades: 'Nombre de Trades Gagnants',
                winning_contracts: 'Nombre de Contrats Gagnants',
                largest_win: 'Plus Grand Gain',
                avg_win: 'Gain Moyen',
                std_dev: 'Écart-Type',
                avg_win_time: 'Durée Moyenne',
                longest_win_time: 'Durée Maximale',
                max_run_up: 'Max Run-Up',
                max_run_up_from: 'Max Run-Up du',
                max_run_up_to: 'Max Run-Up au',
                max_winning_streak: 'Série Gagnante Maximale',
            },
            losing_trades: {
                title: 'TRADES PERDANTS',
                total_loss: 'Perte Totale',
                losing_trades: 'Nombre de Trades Perdants',
                losing_contracts: 'Nombre de Contrats Perdants',
                largest_loss: 'Plus Grande Perte',
                avg_loss: 'Perte Moyenne',
                std_dev: 'Écart-Type',
                commission: 'Commission',
                avg_loss_time: 'Durée Moyenne',
                longest_loss_time: 'Durée Maximale',
                max_losing_streak: 'Série Perdante Maximale',
                max_drawdown: 'Max Drawdown',
                max_drawdown_from: 'Max Drawdown du',
                max_drawdown_to: 'Max Drawdown au',
            },
            comparison: {
                title: 'GAGNANTS VS PERDANTS',
                winning_trades: 'Trades Gagnants',
                breakeven_trades: 'Trades Breakeven',
                losing_trades: 'Trades Perdants',
                profit_factor: 'Facteur de Profit',
                pl_ratio: 'Ratio P/L',
                recovery_factor: 'Facteur de Récupération',
                sharpe_ratio: 'Ratio de Sharpe',
            },
            net_gross_toggle: {
                label: 'P&L Affichage',
                net: 'Net',
                gross: 'Brut',
            },
            pnl_bar_chart: {
                title: 'Historique P&L par Trade',
                enlarge: 'Agrandir le graphique',
                enlarged_title: 'Historique P&L par Trade  (agrandi)',
            },
        },
        import: {
            index: {
                title: 'Importer un rapport',
                intro: "Importez ici un rapport d'historique de trades:",
                format_mt5: 'Format XLSX pour MetaTrader 5',
                format_ninja: 'Format CSV pour NinjaTrader',
                format_quantower: 'Format CSV pour Quantower',
                after_import:
                    'Après import, les lignes seront automatiquement analysées et ajoutées à votre historique de trades.',
                warning_title: 'Comportement par défaut : Réimportation complète',
                warning_text:
                    "Tous les trades des journées importées seront supprimés puis recréés avec les nouvelles données et tags.",
                warning_note:
                    "Pour un import incrémental (ajouter uniquement les nouveaux trades), cochez l'option 'Conserver les trades existants'.",
                timezone_warning:
                    "Pensez à vérifier que les données sont bien importées en heure d'été ou d'hiver selon la saison, et utilisez le système de fuseau horaire si nécessaire.",
                report_type: 'Type de rapport',
                file_mt5: 'Fichier XLSX MT5',
                file_ninja: 'Fichier CSV NinjaTrader',
                file_quantower: 'Fichier CSV Quantower',
                file_ibkr: 'Fichier CSV Interactive Brokers',
                file_standard: 'Fichier CSV Standard TradeJourney',
                file_standard_live: 'Fichier CSV depuis serveur cloud',
                timezone: 'Fuseau horaire du rapport',
                keep_existing_trades: 'Conserver les trades existants des journées importées (import incrémental : seuls les nouveaux trades sont ajoutés, les tags des trades existants sont remplacés)',
                default_day_tags: 'Tags par défaut pour les journées',
                default_trade_tags: 'Tags par défaut pour les trades',
                import_mode: 'Mode d\'importation',
                import_mode_local: 'Local (données en heure locale)',
                import_mode_utc: 'UTC (données déjà en UTC)',
                import_button: 'Importer',
                back_button: 'Retour',
                select_file: 'Veuillez sélectionner un fichier à importer.',
                import_success:
                    'Import réussi ! Mis à jour: {updated}, Ignorés: {ignored}',
                api_info: "L'addon NinjaTrader doit être installé et en cours d'exécution sur http://localhost:8080",
                api_account: 'Compte (optionnel)',
                api_account_placeholder: 'Filtrer par nom de compte',
                api_start_date: 'Date de début (optionnel)',
                api_end_date: 'Date de fin (optionnel)',
                test_api: 'Tester la connexion',
                api_connected: 'API connectée',
                api_error: 'Erreur de connexion',
                account_timezone_info_title: 'Gestion des fuseaux horaires par compte',
                account_timezone_warning: 'Les comptes suivants ont un fuseau horaire défini : {accounts}. Le sélecteur de fuseau horaire global est désactivé car ces comptes utiliseront leur propre configuration.',
                api_import_error: "Erreur lors de l'import depuis l'API",
            },
            profile_execute: {
                api_info: 'Import automatique depuis l\'API',
                ibkr_api_desc: 'Les trades seront récupérés automatiquement depuis Interactive Brokers Flex Query.',
                storage_info: 'Import depuis le serveur de stockage',
                storage_desc: 'Sélectionnez un fichier disponible sur votre serveur de stockage cloud.',
                storage_api_desc: 'Les fichiers seront récupérés automatiquement depuis votre serveur de stockage.',
                refresh_files: 'Actualiser la liste',
                no_files: 'Aucun fichier disponible sur le serveur',
                already_retrieved: 'Déjà récupéré',
                select_file_from_storage: 'Veuillez sélectionner un fichier depuis le serveur de stockage.',
                api_info_live: 'Cet import utilise une connexion API en direct.',
                ibkr_api_desc_live: 'La Flex Query sera exécutée avec le token et le query ID configurés dans ce profil.',
            },
            profiles: {
                title: "Profils d'import",
                add_profile: 'Ajouter un profil',
                empty_title: "Aucun profil d'import",
                empty_desc: "Créez un profil d'import pour commencer. Chaque profil sauvegarde vos paramètres d'import pour une source de données spécifique.",
                timezone: 'Fuseau horaire',
                keep_existing: 'Conserver existants',
                day_tags: 'Tags journée',
                trade_tags: 'Tags trades',
                use: 'Utiliser',
                edit: 'Modifier',
                delete: 'Supprimer',
                confirm_delete: 'Êtes-vous sûr de vouloir supprimer le profil "{name}" ?',
                toast_saved: "Profil d'import sauvegardé",
                toast_deleted: "Profil d'import supprimé",
            },
            profile_form: {
                add_title: "Nouveau profil d'import",
                edit_title: "Modifier le profil d'import",
                name: 'Nom du profil',
                name_placeholder: 'ex. Mon compte IBKR, NinjaTrader Sim...',
                provider: "Fournisseur d'import",
                instrument_type: "Type d'instrument",
                instrument_type_desc: "Type d'instrument par défaut pour les trades importés avec ce profil.",
                use_cloud_storage: 'Utiliser le serveur de stockage cloud',
                use_cloud_storage_desc: 'Récupérer les fichiers depuis votre serveur de stockage cloud au lieu de les uploader manuellement.',
                create: 'Créer le profil',
            },
        },
        screenshot: {
            manager: {
                instructions:
                    "Ajoutez des images de votre écran de trading pour garder une trace visuelle de l'opération",
                formats:
                    'Formats acceptés : JPG, PNG, GIF (max {max} fichiers)',
                paste_button: 'Coller',
                paste_title: 'Coller depuis le presse-papiers (Ctrl+V)',
                max_reached: 'Maximum {max} images autorisées',
                image_count: "Nombre d'images: {current}/{max}",
                max_reached_alert: ' - Maximum atteint',
                images_label: 'Images ({current}/{max}) :',
                image_preview: "Aperçu de l'image",
                toast_success_title: 'Image collée',
                toast_success_desc:
                    "L'image a été ajoutée depuis le presse-papiers",
                toast_error_title: 'Erreur',
                toast_error_desc:
                    'Impossible de coller depuis le presse-papiers. Vérifiez les permissions du navigateur.',
            },
        },
        settings: {
            tools: {
                title: 'Outils de conversion',
                description: 'Convertissez vos fichiers CSV vers le format standard TradeJourney',
                csv_converter: {
                    title: 'Convertisseur CSV',
                    conversion_type: 'Type de conversion',
                    account_name: 'Nom du compte',
                    account_name_placeholder: 'Ex: Schwab, IBKR, etc.',
                    account_fullname: 'Nom complet du compte',
                    account_fullname_placeholder: 'Ex: Charles Schwab Options',
                    import_name: 'Nom d\'import',
                    import_name_placeholder: 'Ex: SchwabOptions, TradingView',
                    select_file: 'Sélectionner un fichier',
                    success: 'Conversion réussie',
                    success_description: 'Le fichier a été converti avec succès. Le téléchargement va démarrer automatiquement.',
                    error: 'Erreur de conversion',
                    unknown_error: 'Une erreur inconnue est survenue',
                    params_validation_error: 'Les paramètres du convertisseur doivent contenir au moins 4 caractères',
                    types: {
                        schwab_options: 'Schwab Options',
                        schwab_options_desc: 'Convertir un relevé de compte Schwab Options vers le format standard',
                        tradingview: 'TradingView',
                        tradingview_desc: 'Convertir un export TradingView vers le format standard',
                    },
                },
            },            
            options: {
                title: "Paramètres de l'application",
                description:
                    "Configurez les paramètres généraux de l'application selon vos préférences.",
                interface_section: 'Interface',
                delete_confirmation_trade:
                    'Confirmation de suppression des trades',
                delete_confirmation_trade_desc:
                    'Permet de demander une confirmation avant de supprimer un trade',
                delete_confirmation_notes:
                    'Confirmation de suppression des notes et tags',
                delete_confirmation_notes_desc:
                    'Permet de demander une confirmation avant de supprimer une note ou un tag',
                show_calendar_daily: 'Afficher le calendrier dans l\'onglet Daily',
                show_calendar_daily_desc: 'Permet d\'afficher ou de masquer le calendrier dans la vue journalière',
                show_calendar_calendar: 'Afficher le calendrier dans l\'onglet Calendrier',
                show_calendar_calendar_desc: 'Permet d\'afficher ou de masquer le calendrier de navigation dans la vue calendrier',
                auto_data_sync: 'Synchronisation automatique des données',
                auto_data_sync_desc: 'Rafraîchir automatiquement les données lors de la navigation vers Dashboard, Calendrier ou Journalier',
                show_quick_nav: 'Afficher le menu rapide',
                show_quick_nav_desc: 'Affiche un menu de navigation rapide dans l\'en-tête',
                dashboard_section: 'Tableau de bord',
                pnl_threshold: 'Seuil minimum P&L',
                pnl_threshold_desc: 'Ne pas afficher les trades dont le P&L absolu est inférieur à ce montant dans le graphique Historique P&L par Trade et les statistiques du tableau de bord (0 = pas de filtre).',
                storage_section: 'Stockage Cloud',
                storage_url: 'URL du serveur',
                storage_url_desc: 'URL du serveur de stockage pour les exports (ex: https://abc123.ngrok.io).',
                storage_token: 'Token d\'authentification',
                storage_token_desc: 'Token unique pour authentifier vos exports vers le serveur.',
                storage_password: 'Mot de passe de chiffrement',
                storage_password_desc: 'Mot de passe utilisé pour chiffrer vos fichiers avant envoi.',
                show: 'Afficher',
                hide: 'Masquer',
                copy: 'Copier',
                copied_title: 'Copié !',
                copied_desc: 'Le texte a été copié dans le presse-papiers.',
                ninja_api_section: 'API NinjaTrader',
                ninja_api_port: 'Port de l\'API',
                ninja_api_port_desc: 'Port HTTP sur lequel l\'addon NinjaTrader écoute (par défaut: 8080). Redémarrez l\'addon après modification.',
                ninja_api_days: 'Nombre de jours à importer',
                ninja_api_days_desc: 'Nombre de jours d\'historique à récupérer lors de l\'import via l\'API (par défaut: 1 jour).',
                timezone_display_section: 'Affichage des dates - Fuseau horaire',
                timezone_display_mode: 'Mode d\'affichage du fuseau horaire',
                timezone_display_mode_desc: 'Choisissez comment les dates doivent être affichées: fuseau actuel (auto-détecté), fuseau horaire spécifique (IANA), ou décalage UTC fixe.',
                timezone_mode_current: 'Fuseau actuel (auto-détecté)',
                timezone_mode_local: 'Fuseau horaire local (IANA)',
                timezone_mode_utc: 'Décalage UTC fixe',
                timezone_local: 'Fuseau horaire IANA',
                timezone_local_desc: 'Sélectionnez votre fuseau horaire (ex: Europe/Paris, America/New_York).',
                timezone_utc_offset: 'Décalage UTC',
                timezone_utc_offset_desc: 'Sélectionnez votre décalage par rapport à UTC (ex: +1 pour UTC+1, -5 pour UTC-5).',
                timezone_current_desc: 'Les dates seront affichées dans le fuseau horaire de votre navigateur.',
                timezone_current_detected: 'Fuseau détecté',
                display_section: 'Affichage',
                reverse_days_order: 'Inverser l\'ordre des jours',
                reverse_days_order_desc: 'Afficher les jours du début du mois vers la fin au lieu de la fin vers le début.',
                chart_colors_section: 'Couleurs des graphiques',
                chart_cumulated_pnl: 'Graphique P&L Cumulé',
                chart_appt: 'Graphique APPT',
                chart_pl_ratio: 'Graphique Ratio P/L',
                chart_winrate: 'Graphique Win Rate',
                color_bar: 'Couleur des barres',
                color_point: 'Couleur de la ligne',
                color_moving_average: 'Couleur de la moyenne mobile',
                color_profit: 'Couleur des profits',
                color_loss: 'Couleur des pertes',
                color_breakeven: 'Couleur des breakeven',
                color_buy: 'Couleur Achat',
                color_sell: 'Couleur Vente',
                pnl_bar_chart: 'Couleurs générales',
                trade_type_badges: 'Badges Achat/Vente',
                reset_button: 'Réinitialiser',
                toast_saved_title: 'Paramètres enregistrés',
                toast_saved_desc: 'Vos préférences ont été sauvegardées.',
                toast_error_title: 'Erreur',
                toast_error_desc: 'Impossible de sauvegarder les paramètres.',
                toast_reset_title: 'Paramètres réinitialisés',
                toast_reset_desc:
                    'Les paramètres ont été réinitialisés aux valeurs par défaut.',
                error_loading: 'Erreur lors du chargement des paramètres',
            },
            accounts: {
                title: 'Comptes',
                description:
                    'Gérez vos comptes de trading ici. Vous pouvez ajouter, modifier ou supprimer des comptes.',
                add_account: 'Ajouter un compte',
                add_account_modal: 'Ajouter un nouveau compte',
                edit_account: 'Modifier le compte',
                name_label: 'Nom',
                display_name_label: 'Nom affiché',
                name_placeholder: 'Nom du compte',
                fullname_label: 'Nom complet',
                fullname_placeholder: 'Nom complet du compte',
                display_name_placeholder: 'Nom affiché',
                aliases_label: 'Alias',
                aliases_placeholder: 'Alias séparés par des virgules (ex: compte1, compte2)',
                starting_capital_label: 'Capital de départ',
                starting_capital_placeholder: 'Capital initial du compte',
                column_aliases: 'Alias',
                column_starting_capital: 'Capital de départ',
                accounts_list: 'Liste des comptes',
                column_actions: 'Actions',
                column_id: 'ID',
                column_name: 'Nom',
                column_display_name: 'Nom affiché',
                column_fullname: 'Nom complet',
                column_timezone: 'Fuseau horaire',
                delete_account: 'Supprimer le compte',
                delete_trades: 'Supprimer les trades',
                delete_inactive_trades: 'Supprimer les trades inactifs',
                confirm_delete_account:
                    'Êtes-vous sûr de vouloir supprimer ce compte ?',
                confirm_delete_trades:
                    'Êtes-vous sûr de vouloir effacer durablement tous les trades ?',
                confirm_delete_inactive_trades:
                    'Êtes-vous sûr de vouloir effacer les trades désactivés ?',
                account_created: 'Compte créé avec succès',
                account_updated: 'Compte mis à jour avec succès',
                account_deleted: 'Compte supprimé avec succès',
                delete_trades_success:
                    'Effacement de {count} trades effectué avec succès',
                error_occurred: 'Une erreur est survenue',
                use_timezone_label: 'Gérer le fuseau horaire au niveau du compte',
            },
            tags: {
                title: 'Groupes de tags',
                add_group: 'Nouveau groupe',
                add_group_modal: 'Ajouter un groupe',
                edit_group: 'Modifier le groupe',
                group_name_label: 'Nom du groupe',
                group_name_placeholder: 'Nom du groupe',
                no_tags: 'Aucun groupe de tags',
                add_tag: 'Ajouter un tag',
                edit_tag: 'Modifier le tag',
                tag_name_label: 'Nom du tag',
                tag_name_placeholder: 'Nom du tag',
                tag_color_label: 'Couleur',
                tag_description_label: 'Description',
                tag_description_placeholder: 'Description du tag',
                tag_dark_fg_reverse_label:
                    'Inverser la couleur du texte en mode sombre',
                result: 'Résultat',
                delete_group: 'Supprimer le groupe',
                delete_tag: 'Supprimer le tag',
                confirm_delete_group:
                    'Êtes-vous sûr de vouloir supprimer le groupe "{name}" ?',
                confirm_delete_tag:
                    'Êtes-vous sûr de vouloir supprimer le tag "{name}" ?',
                delete_associations: 'Supprimer les associations',
                group_created: 'Groupe créé avec succès',
                group_updated: 'Groupe mis à jour avec succès',
                group_deleted: 'Groupe supprimé avec succès',
                tag_created: 'Tag créé avec succès',
                tag_updated: 'Tag mis à jour avec succès',
                tag_deleted: 'Tag supprimé avec succès',
                error_occurred: 'Une erreur est survenue',
            },
            tradingSymbols: {
                title: 'Symboles de trading',
                description:
                    'Gérez la liste des symboles sur lesquels vous tradez et pour lesquels vous souhaitez maintenir un historique.',
                add_symbol: 'Ajouter un symbole',
                add_symbol_modal: 'Ajouter un symbole',
                edit_symbol_modal: 'Modifier le symbole',
                new_symbol: 'Nouveau symbole',
                symbol_label: 'Symbole',
                symbol_placeholder: 'ex: EUR/USD',
                digit_label: 'Nombre de décimales',
                digit_placeholder: 'ex: 2',
                price_per_point_label: 'Prix par point',
                price_per_point_placeholder: 'ex: 10',
                notes_label: 'Notes',
                notes_placeholder: 'Notes (optionnel)',
                aliases_label: 'Alias',
                aliases_placeholder: 'Alias séparés par des virgules (ex: ES, SPX500, MES*)',
                active: 'Actif',
                inactive: 'Inactif',
                edit: 'Éditer',
                enable: 'Activer',
                disable: 'Désactiver',
                confirm_delete:
                    'Êtes-vous sûr de vouloir supprimer ce symbole ?',
                no_symbols: 'Aucun symbole configuré',
                no_symbols_description:
                    'Utilisez le formulaire ci-dessus pour ajouter des symboles',
                symbol_created: 'Symbole créé avec succès',
                symbol_updated: 'Symbole mis à jour avec succès',
                symbol_deleted: 'Symbole supprimé avec succès',
                error_occurred: 'Une erreur est survenue',
                columns: {
                    symbol: 'Symbole',
                    digit: 'Décimales',
                    pricePerPoint: 'Prix par point',
                    active: 'Statut',
                    aliases: 'Aliases',
                    notes: 'Notes',
                    createdAt: 'Créé le',
                    actions: 'Actions',
                },
            },
        },
        trade: {
            index: {
                title: 'Liste des trades',
                button: 'Saisie manuelle',
            },
            formModal: {
                title: 'Ajouter/Modifier un trade',
                edit_trade: 'Modifier le trade',
                add_trade: 'Ajouter un trade',
                instructions:
                    'Remplissez les informations ci-dessous pour enregistrer votre trade.',

                account: {
                    label: 'Compte',
                    help: 'Compte sur lequel a été effectuée la position',
                    placeholder: 'Sélectionnez un compte',
                },
                openDate: {
                    label: "Date d'ouverture",
                    format: 'Format: JJ/MM/AAAA HH:MM',
                },
                closeDate: {
                    label: 'Date de clôture',
                    format: 'Format: JJ/MM/AAAA HH:MM',
                },
                symbol: {
                    label: 'Symbole',
                    help: "Nom de la paire ou de l'actif négocié",
                    placeholder: 'Sélectionnez un symbole',
                    no_symbols_error:
                        "Aucun symbole actif n'est configuré. Vous pouvez en ajouter dans les paramètres.",
                },
                type: {
                    label: "Type d'opération",
                    help: 'Direction de la position',
                    buy: 'Achat (Buy)',
                    sell: 'Vente (Sell)',
                },
                instrumentType: {
                    label: "Type d'instrument",
                    help: "Type d'instrument financier",
                },
                openPrice: {
                    label: "Prix d'ouverture",
                    help: 'Prix auquel la position a été ouverte',
                    placeholder: 'ex: 1.0521',
                },
                closePrice: {
                    label: 'Prix de clôture',
                    help: 'Prix auquel la position a été fermée',
                    placeholder: 'ex: 1.0521',
                },
                lot: {
                    label: 'Lot',
                    help: 'Volume de la transaction (ex: 0.1, 1.0)',
                    placeholder: 'ex: 0.1',
                },
                profit: {
                    label: 'Profit',
                    help: 'Profit/perte (en devise de base)',
                    subhelp: 'Montant gagné ou perdu sur cette position',
                    placeholder: 'ex: 10.50',
                },
                screenshots: {
                    label: "Captures d'écran",
                },
                errors: {
                    form: 'Veuillez corriger les erreurs du formulaire.',
                    specific:
                        'Veuillez corriger l\'erreur "{message} : {name}"',
                },
                success: {
                    created_title: 'Trade créé',
                    created_description: 'Le trade a été créé avec succès.',
                    updated_title: 'Trade mis à jour',
                    updated_description:
                        'Le trade a été mis à jour avec succès.',
                },
                loading_error: 'Erreur lors du chargement des symboles :',
                detailedNote: {
                    label: 'Note détaillée',
                    from_notes: 'Lier depuis les Notes',
                },
            },
            noteEditor: {
                label: 'Note détaillée',
                clear: 'Effacer la note',
                clear_note_title: 'Effacer la note',
                clear_note_tooltip: 'Effacer la note',
                clear_note_confirm: 'Êtes-vous sûr de vouloir effacer cette note ?',
                fullscreen: 'Plein écran',
                exit_fullscreen: 'Quitter le plein écran',
            },
            notePicker: {
                title: 'Sélectionner une note à associer',
                search_placeholder: 'Rechercher par sous-titre ou contenu...',
                filter_date: 'Filtrer par date',
                empty: 'Aucune note trouvée',
                assoc_mode_label: 'Que souhaitez-vous faire avec la note originale ?',
                copy: 'Copier',
                move: 'Déplacer',
                copy_hint: 'La note sera copiée — l\'originale reste dans le panneau Notes.',
                move_hint: 'La note sera déplacée — l\'originale sera supprimée du panneau Notes.',
                associate: 'Associer',
            },
            table: {
                accounts: {
                    title: 'Comptes',
                    placeholder: 'Sélectionnez un ou plusieurs comptes',
                    all: 'Tous les comptes',
                    selected: '{count} compte(s) sélectionné(s)',
                },
                show_inactive: 'Montrer les trades inactifs',
                detailed_note: 'Note détaillée',
                show_detailed_note: 'Notes détaillées',
                advanced_filters: {
                    title: 'Filtres avancés',
                    add: 'Ajouter un filtre',
                    apply: 'Appliquer',
                    reset: 'Réinitialiser',
                    placeholder: 'Valeur',
                },
                columns_button: 'Colonnes',
                results_count: '{count} résultat(s)',
                empty_state: 'Aucun trade',
                edit_button: 'Éditer',
                activate_button: 'Activer',
                deactivate_button: 'Désactiver',
                activate_confirm: 'Êtes-vous sûr de vouloir activer ce trade ?',
                deactivate_confirm:
                    'Êtes-vous sûr de vouloir désactiver ce trade ?',
                activate_title: "Confirmation d'activation",
                bulk_activate_title: "Confirmation d'activation groupée",
                bulk_activate_confirm: 'Êtes-vous sûr de vouloir activer tous les trades affichés sur cette page ?',
                bulk_deactivate_title: 'Confirmation de désactivation groupée',
                bulk_deactivate_confirm: 'Êtes-vous sûr de vouloir désactiver tous les trades affichés sur cette page ?',
                no_trades: {
                    title: 'Aucun trade pour le moment',
                    description:
                        'Utilisez le bouton "Ajouter un trade" pour commencer',
                },
                filters: {
                    openDate: 'Date ouverture',
                    closeDate: 'Date clôture',
                    symbol: 'Symbole',
                    account: 'Compte',
                    type: 'Type',
                    lot: 'Lot',
                    openPrice: 'Prix entrée',
                    closePrice: 'Prix sortie',
                    profit: 'Profit',
                },
            },
            tagModal: {
                title: 'Note/Tags',
                titleWithSymbol: 'Note/Tags sur le trade {symbol}',
                description: 'Gérer les notes et tags pour ce trade',
                note: {
                    label: 'Note pour le trade',
                    placeholder: 'Note...',
                },
                screenshots: "Captures d'écran",
                buttons: {
                    update: 'Mettre à jour',
                },
                success: {
                    saved: 'Note et tags mis à jour avec succès',
                },
                errors: {
                    form: 'Veuillez corriger les erreurs du formulaire.',
                    specific:
                        'Veuillez corriger l\'erreur "{message} : {name}"',
                    tradeNotFound: 'Trade {id} non trouvé',
                    generic: 'Une erreur est survenue',
                },
            },
        },
        daily: {
            day_tag_modal: {
                add_title: 'Ajouter une note du jour',
                edit_title: 'Modifier la note du jour',
                note_label: 'Note pour la journée',
                note_placeholder: 'Ajouter une note pour cette journée...',
                update: 'Mettre à jour',
                error_form: 'Veuillez corriger les erreurs du formulaire.',
                error_field: 'Veuillez corriger l\'erreur "{message} : {name}"',
                success_updated: 'Note du jour mise à jour avec succès',
                success_created: 'Note du jour créée avec succès',
            },
            index: {
                accounts: 'Comptes',
                select_accounts: 'Sélectionnez un ou plusieurs comptes',
                all_accounts: 'Tous les comptes',
                selected_accounts: '{count} compte(s) sélectionné(s)',
                filter: 'Filtrer',
                expand: 'Déplier',
                collapse: 'Replier',
                no_history: 'Aucun historique ce mois-ci',
            },
            trade_group: {
                trades: 'Trades',
                win: 'Gain',
                loss: 'Perte',
                winrate: 'Winrate',
                pnl: 'PnL',
                edit_note: 'Modifier la note du jour',
                add_note: 'Ajouter une note du jour',
                edit: 'Modifier',
                add: 'Ajouter',
                delete_day_note_title: 'Effacer les notes et tags',
                delete_day_note_confirm:
                    'Êtes-vous sûr de vouloir effacer la note et tous les tags associés à ce jour ?',
                delete_trade_note_title: 'Effacer les notes, tags et screenshots',
                delete_trade_note_confirm:
                    'Êtes-vous sûr de vouloir effacer la note, tous les tags et screenshots associés à ce trade ?',
                delete_detailed_note_title: 'Effacer la note détaillée',
                delete_detailed_note_confirm:
                    'Êtes-vous sûr de vouloir effacer la note détaillée associée à ce trade ?',
                show_trades: 'Afficher trades',
                hide_trades: 'Masquer trades',
                activate_button: 'Activer',
                deactivate_button: 'Désactiver',
                trade_details: 'Détails du trade',
                view_details: 'Voir les détails',
            },
        },
        calendar: {
            index: {
                accounts: 'Comptes',
                select_accounts: 'Sélectionnez un ou plusieurs comptes',
                all_accounts: 'Tous les comptes',
                selected_accounts: '{count} compte(s) sélectionné(s)',
                filter: 'Filtrer',
                no_history: 'Aucun historique de trades pour ce mois',
                trades: 'Trades',
                winrate: 'Winrate',
                pnl: 'PnL',
                week_total: 'Total Semaine',
                total: 'Total',
            },
        },
    },
    api: {
        account: {
            create: {
                account_exists:
                    'Un compte avec ce nom existe déjà dans votre configuration',
                server_error:
                    'Une erreur est survenue lors de la création du compte',
            },
            list: {
                server_error:
                    'Une erreur est survenue lors de la récupération des comptes',
            },
            delete: {
                invalid_id: 'ID de compte invalide',
                has_trades:
                    'Impossible de supprimer un compte contenant des trades',
                server_error:
                    'Une erreur est survenue lors de la suppression du compte',
            },
            update: {
                server_error: 'Erreur lors de la mise à jour du compte',
                validation_error: 'Données de compte invalides',
            },
        },
        auth: {
            login: {
                missing_credentials: 'Email et mot de passe requis',
                invalid_credentials: 'Email ou mot de passe incorrect',
                server_error:
                    "Une erreur est survenue lors de l'authentification",
            },
            settings: {
                update_error:
                    'Une erreur est survenue lors de la mise à jour des paramètres utilisateur',
                validation_error: 'Données de configuration invalides',
            },
            logout: {
                server_error: 'Une erreur est survenue lors de la déconnexion',
            },
            verify: {
                unauthorized: 'Non autorisé',
                user_not_found: 'Utilisateur non trouvé',
                server_error:
                    "Une erreur est survenue lors de la vérification de l'authentification",
            },
        },
        backup: {
            import: {
                no_file: 'Aucun fichier de sauvegarde fourni',
                file_too_large:
                    'Le fichier est trop volumineux. La taille maximale autorisée est de {maxSize} Mo',
                import_failed: "Échec de l'import de la sauvegarde",
                process_failed: 'Échec du traitement du fichier de sauvegarde',
                create_failed: 'Échec de la création de la sauvegarde',
                create_success: 'Sauvegarde créée avec succès',
                no_database: 'Aucune base de données sélectionnée',
                download: {
                    invalid_file: 'Fichier de sauvegarde invalide',
                    not_found: 'Fichier de sauvegarde introuvable',
                    download_failed: 'Échec du téléchargement de la sauvegarde',
                    access_denied: 'Accès au fichier de sauvegarde refusé',
                    list_failed:
                        'Échec de la récupération de la liste des sauvegardes',
                    no_backups: 'Aucune sauvegarde trouvée',
                    invalid_backup: 'Format de fichier de sauvegarde invalide',
                    no_file: 'Aucun fichier de sauvegarde fourni',
                    file_too_large:
                        'Le fichier est trop volumineux. La taille maximale autorisée est de {maxSizeMB} Mo',
                    process_failed:
                        'Échec du traitement du fichier de sauvegarde',
                    import_failed: "Échec de l'importation de la sauvegarde",
                    import_success: 'Sauvegarde importée avec succès',
                    create_success: 'Sauvegarde créée avec succès',
                    create_failed: 'Échec de la création de la sauvegarde',
                    delete: {
                        success: 'Sauvegarde supprimée avec succès',
                        failed: 'Échec de la suppression de la sauvegarde',
                        not_found: 'Fichier de sauvegarde introuvable',
                        invalid_file: 'Fichier de sauvegarde invalide',
                        access_denied: 'Accès au fichier de sauvegarde refusé',
                    },
                },
            },
        },
        config_symbols: {
            create: {
                error: 'Erreur lors de la création du symbole',
                validation_error: 'Données du symbole invalides',
                symbol_exists:
                    'Ce symbole existe déjà dans votre configuration',
            },
            update: {
                error: 'Erreur lors de la mise à jour du symbole',
                validation_error: 'Données du symbole invalides',
                not_found: 'Symbole non trouvé',
            },
            list: {
                get_error: 'Erreur lors de la récupération des symboles',
            },
            active: {
                get_error: 'Erreur lors de la récupération des symboles actifs',
            },
            delete: {
                invalid_id: 'ID de symbole invalide',
                not_found: 'Symbole non trouvé',
                error: 'Erreur lors de la suppression du symbole',
            },
        },
        day_tags: {
            create: {
                error: 'Erreur lors de la création du tag journalier',
                existing_day_tag:
                    'Un tag journalier existe déjà pour cette date',
                invalid_tag: "Un ou plusieurs tags spécifiés n'existent pas",
            },
            delete: {
                error: 'Erreur lors de la suppression du tag journalier',
                invalid_id: 'ID de tag journalier invalide',
                not_found: 'Tag journalier non trouvé',
            },
            list: {
                error: 'Erreur lors de la récupération des tags journaliers',
                invalid_month_format:
                    'Format de mois invalide. Format attendu : AAAA-MM',
                invalid_month_value:
                    'Valeur de mois invalide. Le mois doit être compris entre 01 et 12',
            },
            get: {
                error: 'Erreur lors de la récupération du tag journalier',
                invalid_id: 'ID de tag journalier invalide',
                not_found: 'Tag journalier non trouvé',
            },
            update: {
                error: 'Erreur lors de la mise à jour du tag journalier',
                invalid_id: 'ID de tag journalier invalide',
                not_found: 'Tag journalier non trouvé',
                existing_day_tag:
                    'Un tag journalier existe déjà pour cette date',
                invalid_tag: "Un ou plusieurs tags spécifiés n'existent pas",
            },
        },
        import: {
            processing_error: "Erreur lors du traitement de l'import",
        },
        import_profiles: {
            create: {
                name_exists: "Un profil d'import avec ce nom existe déjà",
                server_error: "Erreur lors de la création du profil d'import",
            },
            update: {
                name_exists: "Un profil d'import avec ce nom existe déjà",
                server_error: "Erreur lors de la mise à jour du profil d'import",
            },
            list: {
                server_error: "Erreur lors de la récupération des profils d'import",
            },
            delete: {
                invalid_id: "ID de profil d'import invalide",
                server_error: "Erreur lors de la suppression du profil d'import",
            },
        },
        image: {
            get: {
                missing_url: "L'URL est requise",
                file_not_found: 'Fichier non trouvé',
                fetch_error: "Échec du chargement de l'image",
            },
        },
        notes: {
            get: {
                error: 'Erreur lors de la récupération des notes',
            },
            post: {
                error: 'Erreur lors de la sauvegarde de la note',
            },
            delete: {
                error: 'Erreur lors de la suppression de la note',
                invalid_id: 'ID de note invalide',
                not_found: 'Note non trouvée',
            },
        },
        tags: {
            list: {
                error: 'Erreur lors de la récupération des groupes de tags',
            },
            create: {
                group_exists: 'Un groupe de tags avec ce nom existe déjà',
                validation_error: 'Données du groupe de tags invalides',
                server_error:
                    'Une erreur est survenue lors de la création du groupe de tags',
            },
            update: {
                invalid_id: 'ID invalide',
                group_exists: 'Un groupe de tags avec ce nom existe déjà',
                validation_error: 'Données du groupe de tags invalides',
                server_error:
                    'Une erreur est survenue lors de la mise à jour du groupe de tags',
            },
            delete: {
                invalid_id: 'ID invalide',
                used_tag:
                    'Impossible de supprimer ce groupe de tags car il est utilisé',
                server_error:
                    'Une erreur est survenue lors de la suppression du groupe de tags',
            },
            tag: {
                create: {
                    invalid_group_id: 'ID de groupe invalide',
                    tag_exists: 'Un tag avec ce nom existe déjà dans ce groupe',
                    validation_error: 'Données de tag invalides',
                    server_error:
                        'Une erreur est survenue lors de la création du tag',
                },
                update: {
                    invalid_group_id: 'ID de groupe invalide',
                    invalid_tag_id: 'ID de tag invalide',
                    tag_exists: 'Un tag avec ce nom existe déjà dans ce groupe',
                    server_error:
                        'Une erreur est survenue lors de la mise à jour du tag',
                },
                delete: {
                    invalid_group_id: 'ID de groupe invalide',
                    invalid_tag_id: 'ID de tag invalide',
                    used_tag:
                        'Impossible de supprimer ce tag car il est utilisé',
                    server_error:
                        'Une erreur est survenue lors de la suppression du tag',
                },
            },
        },
        test: {
            not_found: 'API non disponible en production',
            invalid_test: 'Paramètre de test invalide',
            server_error: 'Erreur interne du serveur',
        },
        trades: {
            delete: {
                invalid_id: 'ID de trade invalide',
                not_found: 'Trade non trouvé',
                error: 'Erreur lors de la suppression du trade',
            },
            patch: {
                invalid_id: 'ID de trade invalide',
                unauthorized: 'Non autorisé à mettre à jour ce trade',
                not_found_or_inactive: 'Trade non trouvé ou inactif',
                error: 'Erreur lors de la mise à jour du trade',
            },
            get: {
                not_found: 'Trade non trouvé',
                error: 'Erreur lors de la récupération du trade',
            },
            create: {
                server_error:
                    'Une erreur est survenue lors de la création du trade',
                invalid_screenshots: "Format des captures d'écran invalide",
                validation_error: 'Données du trade invalides',
            },
            screenshots: {
                delete: {
                    invalid_id: 'ID de trade invalide',
                    not_found: 'Trade non trouvé',
                    error: 'Erreur lors de la suppression du trade',
                },
                undelete: {
                    invalid_id: 'ID de trade invalide',
                    not_found: 'Trade non trouvé',
                    error: 'Erreur lors de la restauration du trade',
                },
                account: {},
                post: {
                    invalid_id: 'ID invalide',
                    error: 'Erreur lors de la sauvegarde des fichiers',
                },
            },
            image: {
                get: {
                    missing_url: "L'URL est requise",
                    file_not_found: 'Fichier non trouvé',
                    fetch_error: "Échec du chargement de l'image",
                },
            },
        },
        database: {
            common: {
                unauthorized: 'Non autorisé',
                not_found: 'Base de données non trouvée',
                server_error: 'Une erreur est survenue'
            },
            create: {
                missing_fields: 'Nom et nom d\'affichage requis',
                invalid_name: 'Le nom ne peut contenir que des lettres minuscules, chiffres et tirets bas',
                duplicate_name: 'Une base de données avec ce nom existe déjà'
            },
            delete: {
                missing_params: 'ID de base de données et mot de passe requis',
                invalid_password: 'Mot de passe invalide',
                schema_error: 'Échec de la suppression du schéma de base de données'
            },
            list: {
            },
            select: {
                missing_id: 'ID de base de données requis'
            }
        },
        register: {
            missing_fields: 'Email et mot de passe requis',
            email_exists: 'Cet email est déjà enregistré',
            server_error: "Une erreur est survenue lors de l'inscription",
        },
    },
}
