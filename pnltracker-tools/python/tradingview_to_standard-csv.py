"""
TradingView to PnlTracker Standard CSV Converter

This script converts a CSV file exported from TradingView to the
PnlTracker standard CSV format for easy import.

Usage:
    python tradingview_to_standard.py input.csv output.csv [--account-name NAME] [--import-name NAME]
"""

import csv
import sys
from datetime import datetime
from typing import List, Dict, Optional
import argparse


def parse_tradingview_date(date_str: str) -> datetime:
    """
    Parse a TradingView date (e.g., "2026-01-05 14:08")
    
    Args:
        date_str: Date in "YYYY-MM-DD HH:MM" format
    
    Returns:
        datetime object in UTC
    """
    return datetime.strptime(date_str.strip(), "%Y-%m-%d %H:%M")


def estimate_stop_loss_points(trades: List[Dict]) -> Optional[float]:
    """
    Estime le nombre de points du stop loss depuis les trades perdants.
    
    Logique :
    - On garde uniquement les trades perdants (pnl < 0) — ce sont ceux où le SL a été touché.
    - Pour chaque trade perdant, on calcule la distance SL = |closePrice - openPrice| en points.
      (le SL a été touché → le close price = SL price pour un perdant)
    - On calcule la moyenne de ces distances.
    - On vérifie avec le MAE que le SL ne "déborde" pas :
      pour un perdant, MAE ≈ -pnl (le pire point = la sortie). Si MAE est très différent de -pnl,
      cela signifie que le trade a dépassé le SL (slippage) ou que le SL n'a pas été touché.
      On exclut ces trades de l'estimation.
    
    Returns:
        Nombre de points estimé pour le SL, ou None si pas assez de trades perdants.
    """
    losing_trades = []
    for trade in trades:
        try:
            pnl = float(trade.get('pnl_net', '0') or '0')
            if pnl >= 0:
                continue
            open_price = float(trade['open_price'])
            close_price = float(trade['close_price'])
            mae_usd = float(trade.get('mae_usd', '0') or '0')
            
            # Distance SL en points = |close - open| (le SL a été touché)
            sl_points = abs(close_price - open_price)
            
            # Vérification MAE : pour un perdant où SL touché, MAE ≈ -pnl
            # Si |MAE - pnl| > 20% de |pnl|, on exclut le trade (slippage ou SL non touché)
            if mae_usd != 0:
                mae_diff_ratio = abs(abs(mae_usd) - abs(pnl)) / abs(pnl) if pnl != 0 else 0
                if mae_diff_ratio > 0.20:
                    continue
            
            losing_trades.append(sl_points)
        except (ValueError, KeyError):
            continue
    
    if len(losing_trades) < 3:
        return None
    
    avg_sl = sum(losing_trades) / len(losing_trades)
    return round(avg_sl, 2)


def parse_tradingview_csv(filepath: str) -> List[Dict]:
    """
    Parse a TradingView CSV file and extract trades
    
    The TradingView format has 2 lines per trade in order:
    - "Exit" line (close) - appears first
    - "Entry" line (open) - appears second
    
    Args:
        filepath: Path to the TradingView CSV file
    
    Returns:
        List of dictionaries containing trades
    """
    trades = []
    pending_exit = None
    
    with open(filepath, 'r', encoding='utf-8') as f:
        # Read the entire content and clean it
        content = f.read()
        
        # The TradingView file has a specific format with newlines in cells
        # We will parse line by line
        lines = content.strip().split('\n')
        
        # Ignore the first line (header)
        for line in lines[1:]:
            if not line.strip():
                continue
            
            # Parse the line
            parts = [p.strip() for p in line.split(',')]
            
            if len(parts) < 8:
                continue
            
            trade_num = parts[0]
            action_type = parts[1]
            date_time = parts[2]
            signal = parts[3]
            price = parts[4]
            position_qty = parts[5]
            position_value = parts[6]
            pnl_net = parts[7]
            # Colonnes optionnelles (présentes selon l'export TradingView)
            # Index 10: Excursion favorable USD (MFE)
            # Index 11: Excursion favorable %
            # Index 12: Excursion adverse USD (MAE)
            # Index 13: Excursion adverse %
            mfe_usd = parts[10] if len(parts) > 10 else '0'
            mae_usd = parts[12] if len(parts) > 12 else '0'

            # In TradingView, "Exit" line appears BEFORE "Entry" line
            if "Sortir" in action_type:
                # Store exit info for later pairing
                pending_exit = {
                    'trade_num': trade_num,
                    'close_date': date_time,
                    'close_price': price,
                    'pnl_net': pnl_net,
                    'mfe_usd': mfe_usd,
                    'mae_usd': mae_usd,
                    'type': 'buy' if 'long' in action_type.lower() else 'sell'
                }
            elif "Entrer" in action_type and pending_exit:
                # Pair with previous exit
                if pending_exit['trade_num'] == trade_num:
                    trade = {
                        'trade_num': trade_num,
                        'type': pending_exit['type'],
                        'open_date': date_time,
                        'open_price': price,
                        'position_qty': position_qty,
                        'close_date': pending_exit['close_date'],
                        'close_price': pending_exit['close_price'],
                        'pnl_net': pending_exit['pnl_net'],
                        'mfe_usd': pending_exit['mfe_usd'],
                        'mae_usd': pending_exit['mae_usd'],
                    }
                    trades.append(trade)
                    pending_exit = None
    
    return trades


def convert_to_standard_format(
    trades: List[Dict],
    account_name: str = "TradingView",
    account_fullname: str = "TradingView Trading Account",
    import_name: str = "TradingView",
    symbol: str = "MYM",
    commission_percent: float = 0.0,
    stop_loss_points: Optional[float] = None,
) -> List[Dict]:
    """
    Convert TradingView trades to PnlTracker standard format
    
    Args:
        trades: List of parsed trades
        account_name: Account short name
        account_fullname: Account display name
        import_name: Import source name
        symbol: Trading symbol
        commission_percent: Percentage applied on net profit to approximate commissions
        stop_loss_points: Nombre de points du stop loss depuis l'entry price (ex: 50 pour MYM).
                         Si fourni, calcule le prix du SL pour chaque trade.
    
    Returns:
        List of trades in standard format
    """
    standard_trades = []
    
    for trade in trades:
        try:
            # Parse dates
            open_date = parse_tradingview_date(trade['open_date'])
            close_date = parse_tradingview_date(trade['close_date'])
            
            # Convert to ISO 8601 UTC
            open_date_iso = open_date.strftime("%Y-%m-%dT%H:%M:%S.000Z")
            close_date_iso = close_date.strftime("%Y-%m-%dT%H:%M:%S.000Z")
            
            # Parse numeric values
            open_price = float(trade['open_price'])
            close_price = float(trade['close_price'])
            lot = float(trade['position_qty'])
            profit = float(trade['pnl_net'])
            
            # Calculate profit in points
            if trade['type'] == 'buy':
                profit_points = close_price - open_price
            else:  # sell
                profit_points = open_price - close_price
            
            commission = abs(profit) * (commission_percent / 100) if commission_percent > 0 else 0

            # MAE/MFE : TradingView exporte en USD, PnlTracker attend en USD (cohérent avec MT5)
            # MAE est négatif (excursion adverse), MFE positif (excursion favorable)
            mae_usd = float(trade.get('mae_usd', '0') or '0')
            mfe_usd = float(trade.get('mfe_usd', '0') or '0')
            # Garder le signe pour rester cohérent (MAE < 0, MFE > 0)
            mae = mae_usd if mae_usd != 0 else None
            mfe = mfe_usd if mfe_usd != 0 else None

            # Calculer le stopLoss depuis le nombre de points fourni par l'utilisateur
            # L'utilisateur connaît sa stratégie (SL fixe à X points depuis l'entry)
            # Buy  : SL = entry - points (sous l'entry)
            # Sell : SL = entry + points (au-dessus de l'entry)
            stop_loss: float = 0.0
            if stop_loss_points is not None and stop_loss_points > 0:
                if trade['type'] == 'buy':
                    stop_loss = open_price - stop_loss_points
                else:
                    stop_loss = open_price + stop_loss_points

            standard_trade = {
                'importName': import_name,
                'accountName': account_name,
                'accountFullname': account_fullname,
                'openDate': open_date_iso,
                'closeDate': close_date_iso,
                'symbol': symbol,
                'type': trade['type'],
                'lot': lot,
                'openPrice': open_price,
                'closePrice': close_price,
                'profit': profit,
                'stopLoss': stop_loss,
                'takeProfit': 0,  # Non disponible dans l'export TradingView
                'commission': commission,
                'exchange': 0,  # Not available in TradingView
                'extendId': f"TV-{trade['trade_num']}",
                'profit_points': profit_points,
                'mae': mae,
                'mfe': mfe,
                'screenshotUrl': ''
            }
            
            standard_trades.append(standard_trade)
            
        except Exception as e:
            print(f"Error converting trade {trade.get('trade_num', '?')}: {e}", file=sys.stderr)
            continue
    
    return standard_trades


def write_standard_csv(trades: List[Dict], output_path: str):
    """
    Write trades in PnlTracker standard CSV format
    
    Args:
        trades: List of trades in standard format
        output_path: Output file path
    """
    fieldnames = [
        'importName', 'accountName', 'accountFullname', 'openDate', 'closeDate',
        'symbol', 'type', 'lot', 'openPrice', 'closePrice', 'profit',
        'stopLoss', 'takeProfit', 'commission', 'exchange',
        'extendId', 'profit_points', 'screenshotUrl', 'mae', 'mfe'
    ]
    
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(trades)
    
    print(f"✅ {len(trades)} trades successfully converted to {output_path}")


def main():
    parser = argparse.ArgumentParser(
        description='Convert a TradingView CSV file to PnlTracker standard format'
    )
    parser.add_argument('input', help='Input TradingView CSV file')
    parser.add_argument('output', help='Output standard CSV file')
    parser.add_argument('--account-name', default='TradingView', help='Account name (default: TradingView)')
    parser.add_argument('--account-fullname', default='TradingView Trading Account', help='Account full name')
    parser.add_argument('--import-name', default='TradingView', help='Import source name (default: TradingView)')
    parser.add_argument('-s', '--symbol', default='MYM', help='Trading symbol (default: MYM)')
    parser.add_argument('-c', '--commission-percent', type=float, default=0.0,
                        help='Approximate commission percentage applied on net profit')
    parser.add_argument('--stop-loss-points', type=float, default=None,
                        help='Nombre de points du stop loss depuis l\'entry price (ex: 50 pour MYM). '
                             'Si fourni, calcule le prix du SL pour chaque trade (active le R-multiple fiable).')
    parser.add_argument('--auto-estimate-stop-loss', action='store_true',
                        help='Estime automatiquement le nombre de points du SL depuis les trades perdants '
                             '(moyenne des distances close-open sur les perdants, filtrés par MAE). '
                             'Utilisé si --stop-loss-points n\'est pas fourni.')
    parser.add_argument('--estimate-only', action='store_true',
                        help='Mode estimation uniquement : affiche le résultat en JSON sur stdout et quitte '
                             'sans convertir le fichier. Utilisé par le plugin UI pour le bouton "Auto-estimate".')

    args = parser.parse_args()
    
    try:
        # En mode estimate-only, les logs vont sur stderr pour ne pas polluer le JSON stdout
        log_stream = sys.stderr if args.estimate_only else sys.stdout
        print(f"📖 Reading file {args.input}...", file=log_stream)
        trades = parse_tradingview_csv(args.input)
        print(f"✓ {len(trades)} trades found", file=log_stream)
        
        if len(trades) == 0:
            raise ValueError("No trades found in the file. Please check that the file contains valid TradingView trade data.")

        # Mode estimation uniquement : afficher le résultat en JSON sur stdout et quitter
        if args.estimate_only:
            import json
            estimated = estimate_stop_loss_points(trades)
            result = {
                'stopLossPoints': estimated,
                'tradesCount': len(trades),
            }
            print(json.dumps(result))
            return

        # Déterminer le stop_loss_points à utiliser
        stop_loss_points = args.stop_loss_points
        if stop_loss_points is None and args.auto_estimate_stop_loss:
            print(f"� Estimating stop loss points from losing trades...")
            estimated = estimate_stop_loss_points(trades)
            if estimated is not None:
                print(f"✓ Estimated stop loss: {estimated} points")
                stop_loss_points = estimated
            else:
                print(f"⚠️  Could not estimate stop loss (not enough losing trades with valid MAE).")
        
        if stop_loss_points is not None:
            print(f"🎯 Using stop loss: {stop_loss_points} points from entry price")
        
        print(f"�🔄 Converting to standard format...")
        standard_trades = convert_to_standard_format(
            trades,
            account_name=args.account_name,
            account_fullname=args.account_fullname,
            import_name=args.import_name,
            symbol=args.symbol,
            commission_percent=args.commission_percent,
            stop_loss_points=stop_loss_points,
        )
        
        print(f"💾 Writing to {args.output}...")
        write_standard_csv(standard_trades, args.output)
        
        print(f"\n🎉 Conversion completed successfully!")
        print(f"You can now import {args.output} into PnlTracker")
        print(f"Select report type: 'Standard CSV Format'")
        
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
