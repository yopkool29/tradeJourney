"""
Schwab Options Account Statement to PnlTracker Standard CSV Converter

This script converts a CSV file exported from Charles Schwab (Account Statement)
to the PnlTracker standard CSV format for easy import.

It handles complex option spreads (SINGLE, BUTTERFLY, CALENDAR, etc.) and
stores leg details in the metadata field.

Usage:
    python schwab_options_to_standard-csv.py input.csv output.csv [--account-name NAME]
"""

import csv
import sys
import json
import re
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field, asdict
import argparse


@dataclass
class OptionLeg:
    """Represents a single leg of an option spread"""

    strike: float
    option_type: str  # CALL or PUT
    qty: int
    price: float
    expiration: str


@dataclass
class OptionTrade:
    """Represents a complete option trade (spread or single)"""

    exec_time: datetime
    spread_type: str  # SINGLE, BUTTERFLY, CALENDAR, etc.
    side: str  # BUY or SELL
    pos_effect: str  # TO OPEN or TO CLOSE
    symbol: str
    expiration: str
    primary_strike: float
    option_type: str  # CALL or PUT
    net_price: float
    order_type: str
    legs: List[OptionLeg] = field(default_factory=list)
    ref_id: Optional[str] = None


@dataclass
class CashTransaction:
    """Represents a cash transaction from the Cash Balance section"""

    date: datetime
    ref_id: str
    description: str
    misc_fees: float
    commissions: float
    amount: float


def parse_schwab_date(date_str: str, time_str: str = "00:00:00") -> datetime:
    """
    Parse Schwab date format (e.g., "2/19/26" or "2/19/26 15:32:52")

    Args:
        date_str: Date in "M/D/YY" format
        time_str: Time in "HH:MM:SS" format (optional)

    Returns:
        datetime object
    """
    # Handle combined date/time format
    if " " in date_str:
        parts = date_str.split(" ")
        date_str = parts[0]
        time_str = parts[1] if len(parts) > 1 else time_str

    # Parse date
    date_parts = date_str.strip().split("/")
    month = int(date_parts[0])
    day = int(date_parts[1])
    year = int(date_parts[2])

    # Convert 2-digit year to 4-digit (assuming 2000s)
    if year < 100:
        year += 2000

    # Parse time
    time_parts = time_str.strip().split(":")
    hour = int(time_parts[0]) if len(time_parts) > 0 else 0
    minute = int(time_parts[1]) if len(time_parts) > 1 else 0
    second = int(time_parts[2]) if len(time_parts) > 2 else 0

    return datetime(year, month, day, hour, minute, second)


def parse_expiration_date(exp_str: str) -> str:
    """
    Parse expiration date format (e.g., "27 FEB 26" or "6 MAR 26")

    Returns:
        ISO date string (YYYY-MM-DD)
    """
    months = {"JAN": 1, "FEB": 2, "MAR": 3, "APR": 4, "MAY": 5, "JUN": 6, "JUL": 7, "AUG": 8, "SEP": 9, "OCT": 10, "NOV": 11, "DEC": 12}

    parts = exp_str.strip().split()
    if len(parts) >= 3:
        day = int(parts[0])
        month = months.get(parts[1].upper(), 1)
        year = int(parts[2])
        if year < 100:
            year += 2000
        return f"{year}-{month:02d}-{day:02d}"

    return exp_str


def parse_quantity(qty_str: str) -> int:
    """Parse quantity string (e.g., "+1", "-2") to integer"""
    qty_str = qty_str.strip().replace(",", "")
    return int(qty_str)


def parse_price(price_str: str) -> float:
    """Parse price string, handling special cases like 'CREDIT', 'DEBIT', empty"""
    if not price_str or price_str.strip() in ("", "CREDIT", "DEBIT"):
        return 0.0

    price_str = price_str.strip().replace(",", "").replace("$", "")

    # Handle parentheses for negative numbers
    if price_str.startswith("(") and price_str.endswith(")"):
        price_str = "-" + price_str[1:-1]

    # Handle leading dot (e.g., ".08")
    if price_str.startswith("."):
        price_str = "0" + price_str

    try:
        return float(price_str)
    except ValueError:
        return 0.0


def parse_cash_balance_section(lines: List[str]) -> List[CashTransaction]:
    """
    Parse the Cash Balance section to extract transaction details

    Returns:
        List of CashTransaction objects
    """
    transactions = []
    in_section = False

    for line in lines:
        if "Cash Balance" in line and "DATE,TIME" not in line:
            continue

        if "DATE,TIME,TYPE,REF #" in line:
            in_section = True
            continue

        if in_section:
            # End of section markers
            if line.strip() == "" or "TOTAL" in line or "Futures Statements" in line:
                break

            parts = [p.strip() for p in line.split(",")]
            if len(parts) < 9:
                continue

            # Skip balance lines
            if parts[2] == "BAL":
                continue

            # Only process TRD (trade) lines
            if parts[2] != "TRD":
                continue

            try:
                date = parse_schwab_date(parts[0], parts[1])
                ref_id = parts[3].replace('="', "").replace('"', "")
                description = parts[4]
                misc_fees = parse_price(parts[5])
                commissions = parse_price(parts[6])
                amount = parse_price(parts[7])

                transactions.append(CashTransaction(date=date, ref_id=ref_id, description=description, misc_fees=misc_fees, commissions=commissions, amount=amount))
            except Exception as e:
                print(f"Warning: Could not parse cash line: {line} - {e}", file=sys.stderr)

    return transactions


def parse_trade_history_section(lines: List[str]) -> List[OptionTrade]:
    """
    Parse the Account Trade History section

    Returns:
        List of OptionTrade objects
    """
    trades = []
    in_section = False
    current_trade: Optional[OptionTrade] = None

    for line in lines:
        if "Account Trade History" in line:
            in_section = True
            continue

        if in_section and ",Exec Time,Spread,Side" in line:
            continue

        if in_section:
            # End of section
            if line.strip() == "" or "Options" in line or "Profits and Losses" in line:
                if current_trade:
                    trades.append(current_trade)
                break

            parts = [p.strip() for p in line.split(",")]
            if len(parts) < 12:
                continue

            # Check if this is a new trade (has Exec Time) or a continuation leg
            exec_time_str = parts[1]

            if exec_time_str:
                # Save previous trade if exists
                if current_trade:
                    trades.append(current_trade)

                # New trade
                try:
                    exec_time = parse_schwab_date(exec_time_str)
                    spread_type = parts[2]
                    side = parts[3]
                    qty = parse_quantity(parts[4])
                    pos_effect = parts[5]
                    symbol = parts[6]
                    expiration = parts[7]
                    strike = parse_price(parts[8])
                    option_type = parts[9]
                    price = parse_price(parts[10])
                    net_price = parse_price(parts[11])
                    order_type = parts[12] if len(parts) > 12 else "LMT"

                    current_trade = OptionTrade(
                        exec_time=exec_time,
                        spread_type=spread_type,
                        side=side,
                        pos_effect=pos_effect,
                        symbol=symbol,
                        expiration=expiration,
                        primary_strike=strike,
                        option_type=option_type,
                        net_price=net_price,
                        order_type=order_type,
                        legs=[OptionLeg(strike=strike, option_type=option_type, qty=qty, price=price, expiration=parse_expiration_date(expiration))],
                    )
                except Exception as e:
                    print(f"Warning: Could not parse trade line: {line} - {e}", file=sys.stderr)
            else:
                # Continuation leg for current trade
                if current_trade:
                    try:
                        side = parts[3]
                        qty = parse_quantity(parts[4])
                        pos_effect = parts[5]
                        symbol = parts[6]
                        expiration = parts[7]
                        strike = parse_price(parts[8])
                        option_type = parts[9]
                        price = parse_price(parts[10])

                        current_trade.legs.append(OptionLeg(strike=strike, option_type=option_type, qty=qty, price=price, expiration=parse_expiration_date(expiration)))
                    except Exception as e:
                        print(f"Warning: Could not parse leg line: {line} - {e}", file=sys.stderr)

    # Don't forget the last trade
    if current_trade and current_trade not in trades:
        trades.append(current_trade)

    return trades


def match_trades_with_cash(trades: List[OptionTrade], cash_transactions: List[CashTransaction]) -> List[Tuple[OptionTrade, Optional[CashTransaction]]]:
    """
    Match trades with their corresponding cash transactions to get commissions

    Returns:
        List of tuples (trade, cash_transaction or None)
    """
    matched = []
    used_cash = set()  # Track used cash transactions to avoid duplicates

    for trade in trades:
        # Find matching cash transaction by time and spread type
        matching_cash = None
        best_match_score = -1.0

        for i, cash in enumerate(cash_transactions):
            if i in used_cash:
                continue

            time_diff = abs((trade.exec_time - cash.date).total_seconds())
            if time_diff > 60:  # Not within 1 minute
                continue

            # Check if spread type matches description
            spread_match = trade.spread_type.upper() in cash.description.upper()

            # Calculate match score (lower time diff and spread match = better)
            match_score = (1000 if spread_match else 0) - time_diff

            if match_score > best_match_score:
                best_match_score = match_score
                matching_cash = cash
                matching_index = i

        if matching_cash:
            used_cash.add(matching_index)

        matched.append((trade, matching_cash))

    return matched


def pair_open_close_trades(matched_trades: List[Tuple[OptionTrade, Optional[CashTransaction]]]) -> List[Dict]:
    """
    Pair TO OPEN trades with TO CLOSE trades to create complete trades

    Matches trades by symbol, spread type, and strikes to create complete round-trip trades.
    Open positions (TO OPEN without matching TO CLOSE) are kept as separate entries.

    Returns:
        List of complete trade dictionaries
    """
    complete_trades = []
    open_positions: Dict[Tuple[str, str, Tuple[float, ...], str], List[Dict]] = {}  # Key: (symbol, spread_type, strikes_tuple, option_type)

    # First pass: collect all trades
    for trade, cash in matched_trades:
        # Create a unique key for matching
        strikes_key = tuple(sorted([leg.strike for leg in trade.legs]))
        position_key = (trade.symbol, trade.spread_type, strikes_key, trade.option_type)

        # Calculate profit and commission from cash transaction
        profit = cash.amount if cash else 0.0
        commission = abs(cash.commissions) + abs(cash.misc_fees) if cash else 0.0

        # Build metadata with legs
        legs_data = []
        for leg in trade.legs:
            legs_data.append({"strike": leg.strike, "type": leg.option_type, "qty": leg.qty, "price": leg.price, "expiration": leg.expiration})

        metadata = {"spreadType": trade.spread_type, "posEffect": trade.pos_effect, "orderType": trade.order_type, "legs": legs_data}

        trade_data = {
            "exec_time": trade.exec_time,
            "symbol": trade.symbol,
            "side": trade.side,
            "spread_type": trade.spread_type,
            "pos_effect": trade.pos_effect,
            "expiration": parse_expiration_date(trade.expiration),
            "primary_strike": trade.primary_strike,
            "option_type": trade.option_type.lower(),
            "net_price": trade.net_price,
            "profit": profit,
            "commission": commission,
            "metadata": metadata,
            "legs": trade.legs,
        }

        if trade.pos_effect == "TO OPEN":
            # Store as open position
            if position_key not in open_positions:
                open_positions[position_key] = []
            open_positions[position_key].append(trade_data)
        else:  # TO CLOSE
            # Try to match with an open position
            if position_key in open_positions and len(open_positions[position_key]) > 0:
                # Found matching open position
                open_trade = open_positions[position_key].pop(0)

                # Determine trade type based on opening side
                if open_trade["side"] == "BUY":
                    trade_type = "buy"  # Opened long
                else:
                    trade_type = "sell"  # Opened short

                # Calculate total profit: open_amount + close_amount
                # For BUY TO OPEN: open_amount is negative (cost)
                # For SELL TO OPEN: open_amount is positive (credit)
                # For SELL TO CLOSE: close_amount is positive (credit)
                # For BUY TO CLOSE: close_amount is negative (cost)
                total_profit = open_trade["profit"] + trade_data["profit"]

                # Create complete round-trip trade
                complete_trades.append(
                    {
                        "open_time": open_trade["exec_time"],
                        "close_time": trade_data["exec_time"],
                        "symbol": trade_data["symbol"],
                        "type": trade_type,
                        "spread_type": trade_data["spread_type"],
                        "expiration": trade_data["expiration"],
                        "primary_strike": trade_data["primary_strike"],
                        "option_type": trade_data["option_type"],
                        "open_price": open_trade["net_price"],
                        "close_price": trade_data["net_price"],
                        "profit": total_profit,
                        "commission": open_trade["commission"] + trade_data["commission"],
                        "metadata": trade_data["metadata"],
                        "legs": trade_data["legs"],
                        "is_closed": True,
                    }
                )

                # Clean up empty lists
                if len(open_positions[position_key]) == 0:
                    del open_positions[position_key]
            else:
                # No matching open position - this is a closing trade without open data
                # Treat as a single transaction (might be from before the report period)
                trade_type = "sell" if trade_data["side"] == "SELL" else "buy"

                complete_trades.append(
                    {
                        "open_time": trade_data["exec_time"],
                        "close_time": trade_data["exec_time"],
                        "symbol": trade_data["symbol"],
                        "type": trade_type,
                        "spread_type": trade_data["spread_type"],
                        "expiration": trade_data["expiration"],
                        "primary_strike": trade_data["primary_strike"],
                        "option_type": trade_data["option_type"],
                        "open_price": trade_data["net_price"],
                        "close_price": trade_data["net_price"],
                        "profit": trade_data["profit"],
                        "commission": trade_data["commission"],
                        "metadata": trade_data["metadata"],
                        "legs": trade_data["legs"],
                        "is_closed": True,
                    }
                )

    # Add remaining open positions (not yet closed)
    for position_key, trades in open_positions.items():
        for trade_data in trades:
            trade_type = "buy" if trade_data["side"] == "BUY" else "sell"

            complete_trades.append(
                {
                    "open_time": trade_data["exec_time"],
                    "close_time": trade_data["exec_time"],  # Same as open for open positions
                    "symbol": trade_data["symbol"],
                    "type": trade_type,
                    "spread_type": trade_data["spread_type"],
                    "expiration": trade_data["expiration"],
                    "primary_strike": trade_data["primary_strike"],
                    "option_type": trade_data["option_type"],
                    "open_price": trade_data["net_price"],
                    "close_price": trade_data["net_price"],
                    "profit": trade_data["profit"],  # Unrealized P&L
                    "commission": trade_data["commission"],
                    "metadata": trade_data["metadata"],
                    "legs": trade_data["legs"],
                    "is_closed": False,
                }
            )

    return complete_trades


def convert_to_standard_format(trades: List[Dict], account_name: str = "Schwab", account_fullname: str = "Charles Schwab Options", import_name: str = "SchwabOptions") -> List[Dict]:
    """
    Convert parsed trades to PnlTracker standard format

    Args:
        trades: List of complete trade dictionaries
        account_name: Account short name
        account_fullname: Account display name
        import_name: Import source name

    Returns:
        List of trades in standard format
    """
    standard_trades = []

    for i, trade in enumerate(trades):
        try:
            open_time = trade["open_time"]
            close_time = trade["close_time"]

            # Convert to ISO 8601 UTC
            open_date_iso = open_time.strftime("%Y-%m-%dT%H:%M:%S.000Z")
            close_date_iso = close_time.strftime("%Y-%m-%dT%H:%M:%S.000Z")

            # Calculate lot from primary leg
            lot = abs(trade["legs"][0].qty) if trade["legs"] else 1

            # For options, profit_points is the price difference
            open_price = trade["open_price"]
            close_price = trade["close_price"]

            if trade["type"] == "buy":
                profit_points = close_price - open_price
            else:  # sell
                profit_points = open_price - close_price

            # Generate unique ID
            ext_id = f"SCHW-{open_time.strftime('%Y%m%d%H%M%S')}-{i}"

            standard_trade = {
                "importName": import_name,
                "accountName": account_name,
                "accountFullname": account_fullname,
                "openDate": open_date_iso,
                "closeDate": close_date_iso,
                "symbol": trade["symbol"],
                "type": trade["type"],
                "lot": lot,
                "openPrice": open_price,
                "closePrice": close_price,
                "profit": trade["profit"],
                "stopLoss": 0,
                "takeProfit": 0,
                "commission": trade["commission"],
                "exchange": 0,
                "extendId": ext_id,
                "profit_points": profit_points,
                "mae": None,
                "mfe": None,
                "screenshotUrl": "",
                "instrumentType": "option",
                "strikePrice": trade["primary_strike"],
                "expirationDate": trade["expiration"],
                "optionType": trade["option_type"],
                "premium": open_price,
                "metadata": json.dumps(trade["metadata"]),
            }

            standard_trades.append(standard_trade)

        except Exception as e:
            print(f"Error converting trade {i}: {e}", file=sys.stderr)
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
        "importName",
        "accountName",
        "accountFullname",
        "openDate",
        "closeDate",
        "symbol",
        "type",
        "lot",
        "openPrice",
        "closePrice",
        "profit",
        "stopLoss",
        "takeProfit",
        "commission",
        "exchange",
        "extendId",
        "profit_points",
        "screenshotUrl",
        "mae",
        "mfe",
        "instrumentType",
        "strikePrice",
        "expirationDate",
        "optionType",
        "premium",
        "metadata",
    ]

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, quoting=csv.QUOTE_MINIMAL)
        writer.writeheader()
        writer.writerows(trades)

    print(f"✅ {len(trades)} trades successfully converted to {output_path}")


def parse_schwab_csv(filepath: str) -> Tuple[List[OptionTrade], List[CashTransaction]]:
    """
    Parse a Schwab Account Statement CSV file

    Args:
        filepath: Path to the Schwab CSV file

    Returns:
        Tuple of (trades, cash_transactions)
    """
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    lines = content.split("\n")

    # Parse both sections
    cash_transactions = parse_cash_balance_section(lines)
    trades = parse_trade_history_section(lines)

    return trades, cash_transactions


def main():
    parser = argparse.ArgumentParser(description="Convert a Schwab Options Account Statement CSV to PnlTracker standard format")
    parser.add_argument("input", help="Input Schwab CSV file")
    parser.add_argument("output", help="Output standard CSV file")
    parser.add_argument("--account-name", default="Schwab", help="Account name (default: Schwab)")
    parser.add_argument("--account-fullname", default="Charles Schwab Options", help="Account full name")
    parser.add_argument("--import-name", default="SchwabOptions", help="Import source name (default: SchwabOptions)")

    args = parser.parse_args()

    try:
        print(f"📖 Reading file {args.input}...")
        trades, cash_transactions = parse_schwab_csv(args.input)
        print(f"✓ {len(trades)} trades found in Trade History")
        print(f"✓ {len(cash_transactions)} cash transactions found")

        if len(trades) == 0:
            raise ValueError("No trades found in the file. Please check that the file contains valid trades data.")

        print(f"🔗 Matching trades with cash transactions...")
        matched = match_trades_with_cash(trades, cash_transactions)

        print(f"🔄 Processing trades...")
        complete_trades = pair_open_close_trades(matched)

        print(f"📊 Converting to standard format...")
        standard_trades = convert_to_standard_format(complete_trades, account_name=args.account_name, account_fullname=args.account_fullname, import_name=args.import_name)

        print(f"💾 Writing to {args.output}...")
        write_standard_csv(standard_trades, args.output)

        print(f"\n🎉 Conversion completed successfully!")
        print(f"You can now import {args.output} into PnlTracker")
        print(f"Select report type: 'Standard CSV Format'")

        # Summary
        print(f"\n📈 Summary:")
        total_profit = sum(t["profit"] for t in standard_trades)
        total_commission = sum(t["commission"] for t in standard_trades)
        print(f"   Total trades: {len(standard_trades)}")
        print(f"   Total profit: ${total_profit:.2f}")
        print(f"   Total commissions: ${total_commission:.2f}")

    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
