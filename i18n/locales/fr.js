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
            undefined: 'undefined',
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
        },
    },
    common: {
        actions: {
            save: 'Enregistrer',
            cancel: 'Annuler',
            delete: 'Supprimer',
            confirm: 'Confirmer',
            close: 'Fermer',
        },
        title: {
            success: 'Success',
            error: 'Error',
        },
        trade_types: {
            buy: 'Achat',
            sell: 'Vente',
        },
    },
    about: 'À propos',
    language: {
        switch: 'Français',
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
                options: 'Options',
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
            submit_button: 'Se connecter',
            error_title: 'Erreur de connexion',
            validation: {
                invalid_email: 'Veuillez entrer une adresse email valide',
                password_min_length:
                    'Le mot de passe doit contenir au moins 4 caractères',
            },
        },
    },
    components: {
        notes_panel: {
            sidebar: {
                title: 'MES NOTES',
                delete_note: 'Supprimer cette note',
            },
            delete_modal: {
                title: 'Supprimer la note',
                content:
                    'Êtes-vous sûr de vouloir supprimer la note du {date} ?',
            },
            header: {
                notes_of: 'Notes du {date}',
            },
            editor: {
                toolbar: {
                    bold: 'Gras (Ctrl+B)',
                    italic: 'Italique (Ctrl+I)',
                    underline: 'Souligné (Ctrl+U)',
                    strikethrough: 'Barré (Ctrl+Shift+S)',
                    bullet_list: 'Liste à puces',
                    ordered_list: 'Liste numérotée',
                    code_block: 'Bloc de code (Ctrl+Alt+C)',
                    heading1: 'Titre 1 (Ctrl+Alt+1)',
                    heading2: 'Titre 2 (Ctrl+Alt+2)',
                    heading3: 'Titre 3 (Ctrl+Alt+3)',
                    horizontal_rule: 'Ligne horizontale',
                    undo: 'Annuler (Ctrl+Z)',
                    redo: 'Rétablir (Ctrl+Shift+Z)',
                    color: 'Couleur du texte',
                    unset_color: 'Supprimer la couleur',
                },
                placeholder: 'Écrivez vos notes ici...',
            },
            footer: {},
            toast: {
                save_success_title: 'Note enregistrée',
                save_success_desc: 'Votre note a été enregistrée avec succès',
                delete_success_title: 'Note supprimée',
                delete_success_desc: 'La note a été supprimée avec succès',
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
            actions: {
                add_notes_tags: 'Ajouter notes/tags',
                edit_notes_tags: 'Modifier notes/tags',
                clear_notes_tags: 'Effacer notes/tags',
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
                    profit: 'Profit',
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
                
                appt: 'APPT',
                appt_tooltip: 'Profit Moyen Par Trade. Formule : Profit Net Total / Nombre de Trades. Indicateur clé de l’efficacité des trades indépendamment de leur fréquence. Des valeurs plus élevées indiquent des trades plus rentables en moyenne.',
                
                pl_ratio: 'Ratio P/L',
                pl_ratio_tooltip: 'Ratio Profit/Perte. Formule : (Profit Moyen des Gagnants) / (Perte Moyenne des Perdants). Les valeurs supérieures à 1,5 suggèrent une bonne gestion du risque. Mesure combien vous gagnez vs combien vous perdez en moyenne.',
                
                win_rate: 'Taux de Gain',
                win_rate_tooltip: 'Pourcentage de trades rentables. Formule : (Trades Gagnants / Total des Trades) × 100%. Doit être évalué avec le ratio P/L car un taux de gain élevé avec un mauvais ratio P/L peut quand même entraîner des pertes.',
                
                profit_factor: 'Facteur de Profit',
                profit_factor_tooltip: 'Ratio entre le profit brut et la perte brute. Formule : Profit Brut / Perte Brute. Métrique standard de MetaTrader. Les valeurs supérieures à 1,5 indiquent des systèmes potentiellement rentables ; au-dessus de 2,0 est considéré comme excellent.',
                
                recovery_factor: 'Facteur de Récupération',
                recovery_factor_tooltip: 'Mesure l’efficacité risque/récompense. Formule : Profit Net / Drawdown Maximum. Des valeurs plus élevées indiquent une meilleure récupération après les drawdowns. Les valeurs supérieures à 3 suggèrent des systèmes de trading robustes avec une bonne préservation du capital.',
                
                sharpe_ratio: 'Ratio de Sharpe',
                sharpe_ratio_tooltip: 'Mesure du rendement ajusté au risque. Formule : (Rendement Moyen - Taux Sans Risque) / Écart-Type. Les valeurs supérieures à 1,0 indiquent une bonne performance ajustée au risque ; au-dessus de 2,0 est excellent.',

                cumulated_label: 'Cumulé',
                mobile_avg_label: 'Moyenne mobile',
            },
        },
        import: {
            index: {
                title: 'Importer un rapport',
                intro: "Importez ici un rapport d'historique de trades:",
                format_mt5: 'Format XLSX pour MetaTrader 5',
                format_ninja: 'Format CSV pour NinjaTrader',
                after_import:
                    'Après import, les lignes seront automatiquement analysées et ajoutées à votre historique de trades.',
                warning_title: 'Attention : Suppression des données existantes',
                warning_text:
                    "Les trades des journées importées seront d'abord supprimés avant l'importation des nouvelles données.",
                warning_note:
                    "Cette action permet d'éviter les doublons lors de la réimportation de données.",
                report_type: 'Type de rapport',
                file_mt5: 'Fichier XLSX MT5',
                file_ninja: 'Fichier CSV NinjaTrader',
                timezone: 'Fuseau horaire du rapport',
                import_button: 'Importer',
                back_button: 'Retour',
                select_file: 'Veuillez sélectionner un fichier à importer.',
                import_success:
                    'Import réussi ! Mis à jour: {updated}, Ignorés: {ignored}',
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
                accounts_list: 'Liste des comptes',
                column_actions: 'Actions',
                column_id: 'ID',
                column_name: 'Nom',
                column_fullname: 'Nom complet',
                column_display_name: 'Nom affiché',
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
            },
            table: {
                accounts: {
                    title: 'Comptes',
                    placeholder: 'Sélectionnez un ou plusieurs comptes',
                    all: 'Tous les comptes',
                    selected: '{count} compte(s) sélectionné(s)',
                },
                show_inactive: 'Montrer les trades inactifs',
                advanced_filters: {
                    title: 'Filtres avancés',
                    add: 'Ajouter un filtre',
                    apply: 'Appliquer',
                    reset: 'Réinitialiser',
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
                delete_trade_note_title: 'Effacer les notes et tags',
                delete_trade_note_confirm:
                    'Êtes-vous sûr de vouloir effacer la note et tous les tags associés à ce trade ?',
                show_trades: 'Afficher trades',
                hide_trades: 'Masquer trades',
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
        register: {
            missing_fields: 'Email et mot de passe requis',
            email_exists: 'Cet email est déjà enregistré',
            server_error: "Une erreur est survenue lors de l'inscription",
        },
    },
}
