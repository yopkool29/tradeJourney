"""
TradingView to TradeJourney Standard CSV Converter

This script converts a CSV file exported from TradingView to the
TradeJourney standard CSV format for easy import.

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
            
            # In TradingView, "Exit" line appears BEFORE "Entry" line
            if "Sortir" in action_type:
                # Store exit info for later pairing
                pending_exit = {
                    'trade_num': trade_num,
                    'close_date': date_time,
                    'close_price': price,
                    'pnl_net': pnl_net,
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
                        'pnl_net': pending_exit['pnl_net']
                    }
                    trades.append(trade)
                    pending_exit = None
    
    return trades


def convert_to_standard_format(
    trades: List[Dict],
    account_name: str = "TradingView",
    account_fullname: str = "TradingView Trading Account",
    import_name: str = "TradingView",
    symbol: str = "US30",
    commission_percent: float = 0.0,
) -> List[Dict]:
    """
    Convert TradingView trades to TradeJourney standard format
    
    Args:
        trades: List of parsed trades
        account_name: Account short name
        account_fullname: Account display name
        import_name: Import source name
        symbol: Trading symbol
        commission_percent: Percentage applied on net profit to approximate commissions
    
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
                'stopLoss': 0,  # Not available in TradingView
                'takeProfit': 0,  # Not available in TradingView
                'commission': commission,
                'exchange': 0,  # Not available in TradingView
                'extendId': f"TV-{trade['trade_num']}",
                'profit_points': profit_points,
                'mae': None,
                'mfe': None,
                'screenshotUrl': ''
            }
            
            standard_trades.append(standard_trade)
            
        except Exception as e:
            print(f"Error converting trade {trade.get('trade_num', '?')}: {e}", file=sys.stderr)
            continue
    
    return standard_trades


def write_standard_csv(trades: List[Dict], output_path: str):
    """
    Write trades in TradeJourney standard CSV format
    
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
        description='Convert a TradingView CSV file to TradeJourney standard format'
    )
    parser.add_argument('input', help='Input TradingView CSV file')
    parser.add_argument('output', help='Output standard CSV file')
    parser.add_argument('--account-name', default='TradingView', help='Account name (default: TradingView)')
    parser.add_argument('--account-fullname', default='TradingView Trading Account', help='Account full name')
    parser.add_argument('--import-name', default='TradingView', help='Import source name (default: TradingView)')
    parser.add_argument('-s', '--symbol', default='US30', help='Trading symbol (default: US30)')
    parser.add_argument('-c', '--commission-percent', type=float, default=0.0,
                        help='Approximate commission percentage applied on net profit')
    
    args = parser.parse_args()
    
    try:
        print(f"📖 Reading file {args.input}...")
        trades = parse_tradingview_csv(args.input)
        print(f"✓ {len(trades)} trades found")
        
        if len(trades) == 0:
            raise ValueError("No trades found in the file. Please check that the file contains valid TradingView trade data.")
        
        print(f"🔄 Converting to standard format...")
        standard_trades = convert_to_standard_format(
            trades,
            account_name=args.account_name,
            account_fullname=args.account_fullname,
            import_name=args.import_name,
            symbol=args.symbol,
            commission_percent=args.commission_percent,
        )
        
        print(f"💾 Writing to {args.output}...")
        write_standard_csv(standard_trades, args.output)
        
        print(f"\n🎉 Conversion completed successfully!")
        print(f"You can now import {args.output} into TradeJourney")
        print(f"Select report type: 'Standard CSV Format'")
        
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
