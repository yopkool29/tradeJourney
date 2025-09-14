export default {
    zodI18n: {
        errors: {
            custom: 'Invalid input',
            invalid_arguments: 'Invalid function arguments',
            invalid_date: 'Invalid date',
            invalid_enum_value:
                "Invalid enum value. Expected {options}, received '{received}'",
            invalid_intersection_types:
                'Intersection results could not be merged',
            invalid_literal: 'Invalid literal value, expected {expected}',
            invalid_return_type: 'Invalid function return type',
            invalid_string: {
                cuid: 'Invalid {validation}',
                datetime: 'Invalid {validation}',
                email: 'Invalid {validation}',
                endsWith: 'Invalid input: must end with "{endsWith}"',
                regex: 'Invalid',
                startsWith: 'Invalid input: must start with "{startsWith}"',
                url: 'Invalid {validation}',
                uuid: 'Invalid {validation}',
            },
            invalid_type: 'Expected {expected}, received {received}',
            invalid_type_received_undefined: 'Required',
            invalid_union: 'Invalid input',
            invalid_union_discriminator:
                'Invalid discriminator value. Expected {options}',
            not_finite: 'Number must be finite',
            not_multiple_of: 'Number must be a multiple of {multipleOf}',
            required: 'Required',
            too_big: {
                array: {
                    exact: 'Array must contain exactly {maximum} element(s)',
                    inclusive:
                        'Array must contain at most {maximum} element(s)',
                    not_inclusive:
                        'Array must contain less than {maximum} element(s)',
                },
                date: {
                    exact: 'Date must be exactly {maximum}',
                    inclusive:
                        'Date must be smaller than or equal to {maximum}',
                    not_inclusive: 'Date must be smaller than {maximum}',
                },
                number: {
                    exact: 'Number must be exactly {maximum}',
                    inclusive: 'Number must be less than or equal to {maximum}',
                    not_inclusive: 'Number must be less than {maximum}',
                },
                set: {
                    exact: 'Invalid input',
                    inclusive: 'Invalid input',
                    not_inclusive: 'Invalid input',
                },
                string: {
                    exact: 'String must contain exactly {maximum} character(s)',
                    inclusive:
                        'String must contain at most {maximum} character(s)',
                    not_inclusive:
                        'String must contain under {maximum} character(s)',
                },
            },
            too_small: {
                array: {
                    exact: 'Array must contain exactly {minimum} element(s)',
                    inclusive:
                        'Array must contain at least {minimum} element(s)',
                    not_inclusive:
                        'Array must contain more than {minimum} element(s)',
                },
                date: {
                    exact: 'Date must be exactly {minimum}',
                    inclusive:
                        'Date must be greater than or equal to {minimum}',
                    not_inclusive: 'Date must be greater than {minimum}',
                },
                number: {
                    exact: 'Number must be exactly {minimum}',
                    inclusive:
                        'Number must be greater than or equal to {minimum}',
                    not_inclusive: 'Number must be greater than {minimum}',
                },
                set: {
                    exact: 'Invalid input',
                    inclusive: 'Invalid input',
                    not_inclusive: 'Invalid input',
                },
                string: {
                    exact: 'String must contain exactly {minimum} character(s)',
                    inclusive:
                        'String must contain at least {minimum} character(s)',
                    not_inclusive:
                        'String must contain over {minimum} character(s)',
                },
            },
            unrecognized_keys: 'Unrecognized key(s) in object: {keys}',
        },
        types: {
            array: 'array',
            bigint: 'bigint',
            boolean: 'boolean',
            date: 'date',
            float: 'float',
            function: 'function',
            integer: 'integer',
            map: 'map',
            nan: 'nan',
            never: 'never',
            null: 'null',
            number: 'number',
            object: 'object',
            promise: 'promise',
            set: 'set',
            string: 'string',
            symbol: 'symbol',
            undefined: 'undefined',
            unknown: 'unknown',
            void: 'void',
        },
        validations: {
            cuid: 'cuid',
            datetime: 'datetime',
            email: 'email',
            regex: 'regex',
            url: 'url',
            uuid: 'uuid',
        },

        validation: {
            tag: {
                description_min:
                    'Description must be more than 3 characters or empty',
            },
            symbol: {
                symbol_min: 'Symbol is required',
                digit_min: 'Decimal places must be at least 0',
                digit_max: 'Decimal places cannot exceed 6',
            },
            trade: {
                symbol_required: 'Symbol is required',
                type_invalid: 'Type must be "buy" or "sell"',
                lot_invalid: 'Lot must be a valid number',
                lot_required: 'Lot is required',
                lot_positive: 'Lot must be a positive number',
                open_price_invalid: 'Open price must be a valid number',
                open_price_required: 'Open price is required',
                open_price_positive: 'Open price must be a positive number',
                close_price_invalid: 'Close price must be a valid number',
                close_price_required: 'Close price is required',
                close_price_positive: 'Close price must be a positive number',
                profit_invalid: 'Profit must be a valid number',
                profit_required: 'Profit is required',
                profit_decimal_limit:
                    'Profit cannot have more than 2 decimal places',
                account_id_required: 'Account ID is required',
                account_id_positive: 'Account ID must be specified',
                note_or_tags_required:
                    'You must provide at least a note or select a tag',
            },
            dayTag: {
                note_or_tags_required:
                    'You must provide at least a note or select a tag',
            },
        },
    },
    common: {
        actions: {
            save: 'Save',
            cancel: 'Cancel',
            delete: 'Delete',
            confirm: 'Confirm',
            close: 'Close',
        },
        title: {
            success: 'Success',
            error: 'Error',
        },
        trade_types: {
            buy: 'Buy',
            sell: 'Sell',
        },
    },
    about: 'About',
    language: {
        switch: 'English',
    },
    pages: {
        index: {
            title: 'TradeJourney',
            subtitle: 'Track your performance, analyze your trades',
            journal_title: 'Your personal trading journal',
            journal_description:
                'A simple tool to track and analyze your trades',
            feature_import: 'Import MT5 and Ninja Trader reports (CSV)',
            feature_analysis: 'Performance analysis',
            feature_organization: 'Organization by symbol and type',
            start_button: 'Start now',
            already_user: 'Already a user?',
            login_link: 'Log in',
        },
        trades: {
            tabs: {
                daily: 'Daily',
                trades: 'Trades',
                import: 'Import',
            },
        },
        dashboard: {
            tabs: {
                index: 'General',
            },
        },
        settings: {
            tabs: {
                accounts: 'Accounts',
                tags: 'Tags',
                trading_symbols: 'Trading Symbols',
                backup: 'Backup',
                options: 'Options',
            },
        },
        login: {
            title: 'TradeJourney',
            subtitle: 'Log in to access your trading journal',
            heading: 'Login',
            email: {
                label: 'Email',
                description: 'Enter your email address',
            },
            password: {
                label: 'Password',
                placeholder: 'Password',
            },
            submit_button: 'Log in',
            error_title: 'Login error',
            validation: {
                invalid_email: 'Please enter a valid email address',
                password_min_length:
                    'Password must be at least 4 characters long',
            },
        },
    },
    components: {
        app_footer: {
            copyright: 'All rights reserved',
        },
        app_header: {
            menu: 'Menu',
            logout: 'Log out',
            theme: {
                dark: 'Switch to dark mode',
                light: 'Switch to light mode',
            },
            menu_items: {
                dashboard: 'Dashboard',
                trades: 'Trades',
                settings: 'Settings',
                test: 'Test',
                log: 'Log',
            },
        },
        already_logged_in: {
            title: 'Active session detected',
            alert: {
                title: 'You are already logged in',
                description:
                    'An active session has been detected on this device. What would you like to do?',
            },
            buttons: {
                continue: 'Continue session',
                logout: 'Log out',
            },
        },
        notes_panel: {
            sidebar: {
                title: 'MY NOTES',
                delete_note: 'Delete this note',
            },
            delete_modal: {
                title: 'Delete note',
                content:
                    'Are you sure you want to delete the note from {date}?',
            },
            header: {
                notes_of: 'Notes for {date}',
            },
            editor: {
                toolbar: {
                    bold: 'Bold (Ctrl+B)',
                    italic: 'Italic (Ctrl+I)',
                    underline: 'Underline (Ctrl+U)',
                    strikethrough: 'Strikethrough (Ctrl+Shift+S)',
                    bullet_list: 'Bullet List',
                    ordered_list: 'Numbered List',
                    code_block: 'Code Block (Ctrl+Alt+C)',
                    heading1: 'Heading 1 (Ctrl+Alt+1)',
                    heading2: 'Heading 2 (Ctrl+Alt+2)',
                    heading3: 'Heading 3 (Ctrl+Alt+3)',
                    horizontal_rule: 'Horizontal Line',
                    undo: 'Undo (Ctrl+Z)',
                    redo: 'Redo (Ctrl+Shift+Z)',
                    color: 'Text Color',
                    unset_color: 'Unset Color',
                },
                placeholder: 'Write your notes here...',
            },
            footer: {},
            toast: {
                save_success_title: 'Note saved',
                save_success_desc: 'Your note has been saved successfully',
                delete_success_title: 'Note deleted',
                delete_success_desc: 'The note has been deleted successfully',
            },
            errors: {
                load_failed: 'Unable to load notes',
                save_failed: 'Unable to save note',
                delete_failed: 'Unable to delete note',
            },
        },
        backup_manager: {
            create: {
                title: 'Create Backup',
                description:
                    'Create a complete backup of your database and uploaded files.',
                button: 'Create Backup',
                in_progress: 'Creating backup...',
            },
            restore: {
                title: 'Restore Backup',
                description: 'Upload a backup file to restore your data.',
                select_file: 'Select File',
                button: 'Restore Backup',
                in_progress: 'Restoring...',
            },
            list: {
                title: 'Available Backups',
                refresh: 'Refresh',
                empty: {
                    title: 'No backups available',
                    description: 'Create your first backup to get started',
                },
                item: {
                    archive: 'Archive',
                    size: 'Size',
                },
                actions: {
                    delete_confirm:
                        'Are you sure you want to delete this backup?',
                    download: 'Download',
                },
            },
            restore_confirm: {
                title: 'Confirm Restoration',
                message:
                    'Are you sure you want to restore the backup from {date}?',
                warning:
                    'Warning: This action will overwrite all current data.',
            },
            success: {
                backup_deleted: 'Backup deleted successfully',
                backup_created: 'Backup created successfully',
                backup_restored: 'Backup restored successfully',
            },
            errors: {
                load_failed: 'Unable to load backups',
                delete_failed: 'Unable to delete backup',
                create_failed: 'Failed to create backup',
                download_failed: 'Failed to download backup: {error}',
                no_file_selected: 'No file selected',
                file_too_large:
                    'File too large. Maximum allowed size is {size} MB',
            },
        },
        common: {
            actions: {
                add_notes_tags: 'Add notes/tags',
                edit_notes_tags: 'Edit notes/tags',
                clear_notes_tags: 'Clear notes/tags',
            },
            columns: {
                button: 'Columns',
                headers: {
                    actions: 'Actions',
                    openDate: 'Open Date',
                    closeDate: 'Close Date',
                    openHour: 'Open Hour',
                    closeHour: 'Close Hour',
                    symbol: 'Symbol',
                    account: 'Account',
                    type: 'Type',
                    lot: 'Lot',
                    openPrice: 'Open Price',
                    closePrice: 'Close Price',
                    profit: 'Profit',
                    note: 'Note',
                    tags: 'Tags',
                    screenshots: 'Screenshots',
                },
                screenshots: {
                    multiple: '{count} screenshots available',
                    single: 'Show screenshot',
                    aria_label: 'View screenshots',
                },
            },
        },
        backup: {
            title: 'Export',
            description:
                'Manage your data backups and restore previous versions',
        },
        modal_delete: {
            title: 'Delete confirmation',
        },
        dashboard: {
            appt_chart: {
                title: 'APPT',
                enlarge: 'Enlarge',
                enlarged_title: 'APPT (enlarged)',
            },
            winrate_chart: {
                title: 'Win Rate',
                enlarge: 'Enlarge',
                enlarged_title: 'Win Rate (enlarged)',
            },
            cumulated_pnl_chart: {
                title: 'Cumulated PnL',
                enlarge: 'Enlarge',
                enlarged_title: 'Cumulated PnL (enlarged)',
            },
            intraday_pnl_chart: {
                label: 'Cumulated PnL',
            },
            pl_ratio_chart: {
                title: 'P/L Ratio',
                enlarge: 'Enlarge',
                enlarged_title: 'P/L Ratio (enlarged)',
            },
            index: {
                accounts: 'Accounts',
                select_accounts: 'Select one or more accounts',
                all_accounts: 'All accounts',
                selected_accounts: '{count} account(s) selected',
                period: 'Period',
                filter: 'Filter',
                aggregation: 'Aggregation:',
                by_day: 'By day',
                by_week: 'By week',
                by_month: 'By month',
                all_trades_period: 'For all trades in the period:',
                cumulated_pnl: 'Cumulated P&L',
                cumulated_pnl_tooltip: 'Sum of all profits and losses over time. Formula: Σ(Trade Profits). Shows your account growth trajectory and overall performance. Positive trend indicates consistent profitability.',
                
                appt: 'APPT',
                appt_tooltip: 'Average Profit Per Trade. Formula: Total Net Profit / Number of Trades. Key indicator of trade efficiency regardless of frequency. Higher values indicate more profitable average trades.',
                
                pl_ratio: 'P/L Ratio',
                pl_ratio_tooltip: 'Profit/Loss Ratio. Formula: (Avg Profit of Winners) / (Avg Loss of Losers). Values above 1.5 suggest good risk management. Measures how much you win vs how much you lose on average.',
                
                win_rate: 'Win Rate',
                win_rate_tooltip: 'Percentage of profitable trades. Formula: (Winning Trades / Total Trades) × 100%. Should be evaluated alongside P/L ratio as high win rates with poor P/L ratios can still result in losses.',
                
                profit_factor: 'Profit Factor',
                profit_factor_tooltip: 'Ratio of gross profit to gross loss. Formula: Gross Profit / Gross Loss. MetaTrader standard metric. Values above 1.5 indicate potentially profitable systems; above 2.0 is considered excellent.',
                
                recovery_factor: 'Recovery Factor',
                recovery_factor_tooltip: 'Measures risk vs reward efficiency. Formula: Net Profit / Maximum Drawdown. Higher values indicate better recovery from drawdowns. Values above 3 suggest robust trading systems with good capital preservation.',
                
                sharpe_ratio: 'Sharpe Ratio',
                sharpe_ratio_tooltip: 'Risk-adjusted return metric. Formula: (Mean Return - Risk-Free Rate) / Standard Deviation. Values above 1.0 indicate good risk-adjusted performance; above 2.0 is excellent.',

                cumulated_label: 'Cumulated',
                mobile_avg_label: 'Mobile Average',
                

            },
        },
        import: {
            index: {
                title: 'Import a report',
                intro: 'Import a trade history report here:',
                format_mt5: 'XLSX format for MetaTrader 5',
                format_ninja: 'CSV format for NinjaTrader',
                after_import:
                    'After import, the lines will be automatically analyzed and added to your trade history.',
                warning_title: 'Warning: Deletion of existing data',
                warning_text:
                    'Trades from the imported days will first be deleted before importing new data.',
                warning_note:
                    'This action prevents duplicates when reimporting data.',
                report_type: 'Report type',
                file_mt5: 'MT5 XLSX File',
                file_ninja: 'NinjaTrader CSV File',
                timezone: 'Report timezone',
                import_button: 'Import',
                back_button: 'Back',
                select_file: 'Please select a file to import.',
                import_success:
                    'Import successful! Updated: {updated}, Ignored: {ignored}',
            },
        },
        screenshot: {
            manager: {
                instructions:
                    'Add screenshots of your trading screen to keep a visual record of the operation',
                formats: 'Accepted formats: JPG, PNG, GIF (max {max} files)',
                paste_button: 'Paste',
                paste_title: 'Paste from clipboard (Ctrl+V)',
                max_reached: 'Maximum {max} images allowed',
                image_count: 'Number of images: {current}/{max}',
                max_reached_alert: ' - Maximum reached',
                images_label: 'Images ({current}/{max}):',
                image_preview: 'Image preview',
                toast_success_title: 'Image pasted',
                toast_success_desc:
                    'The image has been added from the clipboard',
                toast_error_title: 'Error',
                toast_error_desc:
                    'Unable to paste from clipboard. Check browser permissions.',
            },
        },
        settings: {
            options: {
                title: 'Application Settings',
                description:
                    'Configure general application settings according to your preferences.',
                interface_section: 'Interface',
                delete_confirmation_trade: 'Trade deletion confirmation',
                delete_confirmation_trade_desc:
                    'Ask for confirmation before deleting a trade',
                delete_confirmation_notes:
                    'Notes and tags deletion confirmation',
                delete_confirmation_notes_desc:
                    'Ask for confirmation before deleting a note or tag',
                show_calendar_daily: 'Show calendar in Daily tab',
                show_calendar_daily_desc: 'Toggle the display of the calendar in the daily view',
                reset_button: 'Reset',
                toast_saved_title: 'Settings saved',
                toast_saved_desc: 'Your preferences have been saved.',
                toast_error_title: 'Error',
                toast_error_desc: 'Unable to save settings.',
                toast_reset_title: 'Settings reset',
                toast_reset_desc: 'Settings have been reset to default values.',
                error_loading: 'Error loading settings',
            },
            accounts: {
                title: 'Accounts',
                description:
                    'Manage your trading accounts here. You can add, edit, or delete accounts.',
                add_account: 'Add account',
                add_account_modal: 'Add a new account',
                edit_account: 'Edit account',
                name_label: 'Name',
                display_name_label: 'Display name',
                name_placeholder: 'Account name',
                fullname_label: 'Full name',
                fullname_placeholder: 'Full account name',
                display_name_placeholder: 'Display name',
                accounts_list: 'Accounts list',
                column_actions: 'Actions',
                column_id: 'ID',
                column_name: 'Name',
                column_fullname: 'Full name',
                column_display_name: 'Display name',
                delete_account: 'Delete account',
                delete_trades: 'Delete trades',
                delete_inactive_trades: 'Delete inactive trades',
                confirm_delete_account:
                    'Are you sure you want to delete this account?',
                confirm_delete_trades:
                    'Are you sure you want to permanently delete all trades?',
                confirm_delete_inactive_trades:
                    'Are you sure you want to delete inactive trades?',
                account_created: 'Account created successfully',
                account_updated: 'Account updated successfully',
                account_deleted: 'Account deleted successfully',
                delete_trades_success: 'Successfully deleted {count} trades',
                error_occurred: 'An error occurred',
            },
            tags: {
                title: 'Tag groups',
                add_group: 'New group',
                add_group_modal: 'Add group',
                edit_group: 'Edit group',
                group_name_label: 'Group name',
                group_name_placeholder: 'Group name',
                no_tags: 'No tag groups',
                add_tag: 'Add tag',
                edit_tag: 'Edit tag',
                tag_name_label: 'Tag name',
                tag_name_placeholder: 'Tag name',
                tag_color_label: 'Color',
                tag_description_label: 'Description',
                tag_description_placeholder: 'Tag description',
                tag_dark_fg_reverse_label: 'Dark foreground reverse',
                result: 'Result',
                delete_group: 'Delete group',
                delete_tag: 'Delete tag',
                confirm_delete_group:
                    'Are you sure you want to delete the group "{name}"?',
                confirm_delete_tag:
                    'Are you sure you want to delete the tag "{name}"?',
                delete_associations: 'Delete associations',
                group_created: 'Group created successfully',
                group_updated: 'Group updated successfully',
                group_deleted: 'Group deleted successfully',
                tag_created: 'Tag created successfully',
                tag_updated: 'Tag updated successfully',
                tag_deleted: 'Tag deleted successfully',
                error_occurred: 'An error occurred',
            },
            tradingSymbols: {
                title: 'Trading Symbols',
                description:
                    'Manage the list of symbols you trade and for which you want to maintain a history.',
                add_symbol: 'Add symbol',
                add_symbol_modal: 'Add symbol',
                edit_symbol_modal: 'Edit symbol',
                new_symbol: 'New symbol',
                symbol_label: 'Symbol',
                symbol_placeholder: 'e.g. EUR/USD',
                digit_label: 'Number of decimals',
                digit_placeholder: 'e.g. 2',
                price_per_point_label: 'Price per point',
                price_per_point_placeholder: 'e.g. 10',
                notes_label: 'Notes',
                notes_placeholder: 'Notes (optional)',
                active: 'Active',
                inactive: 'Inactive',
                edit: 'Edit',
                enable: 'Enable',
                disable: 'Disable',
                confirm_delete: 'Are you sure you want to delete this symbol?',
                no_symbols: 'No symbols configured',
                no_symbols_description: 'Use the form above to add symbols',
                symbol_created: 'Symbol created successfully',
                symbol_updated: 'Symbol updated successfully',
                symbol_deleted: 'Symbol deleted successfully',
                error_occurred: 'An error occurred',
                columns: {
                    symbol: 'Symbol',
                    digit: 'Decimals',
                    pricePerPoint: 'Price per point',
                    active: 'Status',
                    notes: 'Notes',
                    createdAt: 'Created at',
                    actions: 'Actions',
                },
            },
        },
        trade: {
            index: {
                title: 'Trade list',
                button: 'Manual entry',
            },
            formModal: {
                title: 'Add/Edit Trade',
                edit_trade: 'Edit Trade',
                add_trade: 'Add Trade',
                instructions:
                    'Fill in the information below to save your trade.',

                account: {
                    label: 'Account',
                    help: 'Account on which the position was executed',
                    placeholder: 'Select an account',
                },
                openDate: {
                    label: 'Open Date',
                    format: 'Format: DD/MM/YYYY HH:MM',
                },
                closeDate: {
                    label: 'Close Date',
                    format: 'Format: DD/MM/YYYY HH:MM',
                },
                symbol: {
                    label: 'Symbol',
                    help: 'Name of the traded pair or asset',
                    placeholder: 'Select a symbol',
                    no_symbols_error:
                        'No active symbol is configured. You can add some in settings.',
                },
                type: {
                    label: 'Operation Type',
                    help: 'Position direction',
                    buy: 'Buy (Buy)',
                    sell: 'Sell (Sell)',
                },
                openPrice: {
                    label: 'Open Price',
                    help: 'Price at which the position was opened',
                    placeholder: 'e.g.: 1.0521',
                },
                closePrice: {
                    label: 'Close Price',
                    help: 'Price at which the position was closed',
                    placeholder: 'e.g.: 1.0521',
                },
                lot: {
                    label: 'Lot',
                    help: 'Transaction volume (e.g.: 0.1, 1.0)',
                    placeholder: 'e.g.: 0.1',
                },
                profit: {
                    label: 'Profit',
                    help: 'Profit/loss (in base currency)',
                    subhelp: 'Amount won or lost on this position',
                    placeholder: 'e.g.: 10.50',
                },
                screenshots: {
                    label: 'Screenshots',
                },
                errors: {
                    form: 'Please correct the form errors.',
                    specific: 'Please correct the error "{message}: {name}"',
                },
                success: {
                    created_title: 'Trade created',
                    created_description: 'The trade was successfully created.',
                    updated_title: 'Trade updated',
                    updated_description: 'The trade was successfully updated.',
                },
                loading_error: 'Error loading symbols:',
            },
            table: {
                accounts: {
                    title: 'Accounts',
                    placeholder: 'Select one or more accounts',
                    all: 'All accounts',
                    selected: '{count} account(s) selected',
                },
                show_inactive: 'Show inactive trades',
                advanced_filters: {
                    title: 'Advanced filters',
                    add: 'Add filter',
                    apply: 'Apply',
                    reset: 'Reset',
                },
                columns_button: 'Columns',
                results_count: '{count} result(s)',
                empty_state: 'No trades',
                edit_button: 'Edit',
                activate_button: 'Activate',
                deactivate_button: 'Deactivate',
                activate_confirm:
                    'Are you sure you want to activate this trade?',
                deactivate_confirm:
                    'Are you sure you want to deactivate this trade?',
                activate_title: 'Activation Confirmation',
                no_trades: {
                    title: 'No trades yet',
                    description: 'Use the "Add a trade" button to get started',
                },
                filters: {
                    openDate: 'Open Date',
                    closeDate: 'Close Date',
                    account: 'Account',
                    symbol: 'Symbol',
                    type: 'Type',
                    lot: 'Lot',
                    openPrice: 'Open Price',
                    closePrice: 'Close Price',
                    profit: 'Profit',
                },
            },
            tagModal: {
                title: 'Note/Tags',
                titleWithSymbol: 'Note/Tags for trade {symbol}',
                description: 'Manage notes and tags for this trade',
                note: {
                    label: 'Note for the trade',
                    placeholder: 'Note...',
                },
                screenshots: 'Screenshots',
                buttons: {
                    update: 'Update',
                },
                errors: {
                    form: 'Please correct the form errors.',
                    specific: 'Please correct the error "{message}: {name}"',
                    tradeNotFound: 'Trade {id} not found',
                    generic: 'An error occurred',
                },
            },
        },
        daily: {
            day_tag_modal: {
                add_title: 'Add day note',
                edit_title: 'Edit day note',
                note_label: 'Note for the day',
                note_placeholder: 'Add a note for this day...',
                update: 'Update',
                error_form: 'Please correct the form errors.',
                error_field: 'Please correct the error "{message}: {name}"',
            },
            index: {
                accounts: 'Accounts',
                select_accounts: 'Select one or more accounts',
                all_accounts: 'All accounts',
                selected_accounts: '{count} account(s) selected',
                filter: 'Filter',
                expand: 'Expand',
                collapse: 'Collapse',
                no_history: 'No history for this month',
            },
            trade_group: {
                trades: 'Trades',
                win: 'Win',
                loss: 'Loss',
                winrate: 'Winrate',
                pnl: 'PnL',
                edit_note: 'Edit day note',
                add_note: 'Add day note',
                edit: 'Edit',
                add: 'Add',
                delete_day_note_title: 'Delete notes and tags',
                delete_day_note_confirm:
                    'Are you sure you want to delete the note and all tags associated with this day?',
                delete_trade_note_title: 'Delete notes and tags',
                delete_trade_note_confirm:
                    'Are you sure you want to delete the note and all tags associated with this trade?',
                show_trades: 'Show trades',
                hide_trades: 'Hide trades',
            },
        },
    },
    api: {
        account: {
            create: {
                account_exists:
                    'An account with this name already exists in your configuration',
                server_error: 'An error occurred while creating the account',
            },
            list: {
                server_error: 'An error occurred while retrieving accounts',
            },
            delete: {
                invalid_id: 'Invalid account ID',
                has_trades: 'Cannot delete account with existing trades',
                server_error: 'An error occurred while deleting the account',
            },
            update: {
                server_error: 'Error updating account',
                validation_error: 'Invalid account data',
            },
        },
        auth: {
            login: {
                missing_credentials: 'Email and password are required',
                invalid_credentials: 'Invalid email or password',
                server_error: 'An error occurred during authentication',
            },
            settings: {
                update_error: 'An error occurred while updating user settings',
                validation_error: 'Invalid settings data',
            },
            logout: {
                server_error: 'An error occurred during logout',
            },
            verify: {
                unauthorized: 'Unauthorized',
                user_not_found: 'User not found',
                server_error:
                    'An error occurred while verifying authentication',
            },
        },
        backup: {
            import: {
                no_file: 'No backup file provided',
                file_too_large:
                    'The file is too large. Maximum allowed size is {maxSize} MB',
                import_failed: 'Failed to import backup',
                process_failed: 'Failed to process backup file',
                create_failed: 'Failed to create backup',
                create_success: 'Backup created successfully',
                download: {
                    invalid_file: 'Invalid backup file',
                    not_found: 'Backup file not found',
                    download_failed: 'Failed to download backup',
                    access_denied: 'Access to backup file denied',
                    list_failed: 'Failed to retrieve backup list',
                    no_backups: 'No backup files found',
                    invalid_backup: 'Invalid backup file format',
                    no_file: 'No backup file provided',
                    file_too_large:
                        'The file is too large. Maximum allowed size is {maxSizeMB} MB',
                    process_failed: 'Failed to process backup file',
                    import_failed: 'Failed to import backup',
                    import_success: 'Backup imported successfully',
                    create_success: 'Backup created successfully',
                    create_failed: 'Failed to create backup',
                    delete: {
                        success: 'Backup deleted successfully',
                        failed: 'Failed to delete backup',
                        not_found: 'Backup file not found',
                        invalid_file: 'Invalid backup file',
                        access_denied: 'Access to backup file denied',
                    },
                },
            },
        },
        config_symbols: {
            create: {
                error: 'Error while creating symbol',
                validation_error: 'Invalid symbol data',
                symbol_exists:
                    'This symbol already exists in your configuration',
            },
            update: {
                error: 'Error while updating symbol',
                validation_error: 'Invalid symbol data',
                not_found: 'Symbol not found',
            },
            list: {
                get_error: 'Error while fetching symbols',
            },
            active: {
                get_error: 'Error while fetching active symbols',
            },
            delete: {
                invalid_id: 'Invalid symbol ID',
                not_found: 'Symbol not found',
                error: 'Error while deleting symbol',
            },
        },
        day_tags: {
            create: {
                error: 'Error while creating day tag',
                existing_day_tag: 'A day tag already exists for this date',
                invalid_tag: 'One or more specified tags do not exist',
            },
            delete: {
                error: 'Error while deleting day tag',
                invalid_id: 'Invalid day tag ID',
                not_found: 'Day tag not found',
            },
            list: {
                error: 'Error while retrieving day tags',
                invalid_month_format:
                    'Invalid month format. Expected format: YYYY-MM',
                invalid_month_value:
                    'Invalid month value. Month must be between 01 and 12',
            },
            get: {
                error: 'Error while retrieving day tag',
                invalid_id: 'Invalid day tag ID',
                not_found: 'Day tag not found',
            },
            update: {
                error: 'Error while updating day tag',
                invalid_id: 'Invalid day tag ID',
                not_found: 'Day tag not found',
                existing_day_tag: 'A day tag already exists for this date',
                invalid_tag: 'One or more specified tags do not exist',
            },
        },
        image: {
            get: {
                missing_url: 'URL is required',
                file_not_found: 'File not found',
                fetch_error: 'Failed to fetch image',
            },
        },
        notes: {
            get: {
                error: 'Error fetching notes',
            },
            post: {
                error: 'Error saving note',
            },
            delete: {
                error: 'Error deleting note',
                invalid_id: 'Invalid note ID',
                not_found: 'Note not found',
            },
        },
        tags: {
            list: {
                error: 'Error while retrieving tag groups',
            },
            create: {
                group_exists: 'A tag group with this name already exists',
                validation_error: 'Invalid tag group data',
                server_error: 'An error occurred while creating the tag group',
            },
            update: {
                invalid_id: 'Invalid ID',
                group_exists: 'A tag group with this name already exists',
                validation_error: 'Invalid tag group data',
                server_error: 'An error occurred while updating the tag group',
            },
            delete: {
                invalid_id: 'Invalid ID',
                used_tag: 'Cannot delete tag group because it is being used',
                server_error: 'An error occurred while deleting the tag group',
            },
            tag: {
                create: {
                    invalid_group_id: 'Invalid group ID',
                    tag_exists:
                        'A tag with this name already exists in this group',
                    validation_error: 'Invalid tag data',
                    server_error: 'An error occurred while creating the tag',
                },
                update: {
                    invalid_group_id: 'Invalid group ID',
                    invalid_tag_id: 'Invalid tag ID',
                    tag_exists:
                        'A tag with this name already exists in this group',
                    server_error: 'An error occurred while updating the tag',
                },
                delete: {
                    invalid_group_id: 'Invalid group ID',
                    invalid_tag_id: 'Invalid tag ID',
                    used_tag: 'Cannot delete tag because it is being used',
                    server_error: 'An error occurred while deleting the tag',
                },
            },
        },
        test: {
            not_found: 'API not available in production',
            invalid_test: 'Invalid test parameter',
            server_error: 'Internal server error',
        },
        trades: {
            delete: {
                invalid_id: 'Invalid trade ID',
                not_found: 'Trade not found',
                error: 'Error while deleting trade',
            },
            patch: {
                invalid_id: 'Invalid trade ID',
                unauthorized: 'Not authorized to update this trade',
                not_found_or_inactive: 'Trade not found or not active',
                error: 'Error while updating trade',
            },
            get: {
                not_found: 'Trade not found',
                error: 'Error while retrieving trade',
            },
            create: {
                server_error: 'An error occurred while creating the trade',
                invalid_screenshots: 'Invalid screenshots format',
                validation_error: 'Invalid trade data',
            },
            screenshots: {
                delete: {
                    invalid_id: 'Invalid trade ID',
                    not_found: 'Trade not found',
                    error: 'Error while deleting trade',
                },
                undelete: {
                    invalid_id: 'Invalid trade ID',
                    not_found: 'Trade not found',
                    error: 'Error while restoring trade',
                },
                account: {},
                post: {
                    invalid_id: 'Invalid ID',
                    error: 'Error while saving files',
                },
            },
            image: {
                get: {
                    missing_url: 'URL is required',
                    file_not_found: 'File not found',
                    fetch_error: 'Failed to fetch image',
                },
            },
        },
        register: {
            missing_fields: 'Email and password are required',
            email_exists: 'This email is already registered',
            server_error: 'An error occurred during registration',
        },
    },
}
