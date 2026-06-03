#!/bin/bash

if [ $# -eq 0 ]; then
    echo "Usage: $0 filename.csv or $0 /path/to/filename.csv"
    echo "Examples:"
    echo "  $0 input.csv"
    echo "  $0 input.csv output.csv"
    exit 1
fi

INPUT_PARAM="$1"
INPUT_FILE="$INPUT_PARAM"

if [ $# -eq 2 ]; then
    OUTPUT_FILE="$2"
else
    OUTPUT_FILE="Tradingview_to_standard.csv"
fi

echo "Debug: INPUT_FILE = $INPUT_FILE"
echo "Debug: OUTPUT_FILE = $OUTPUT_FILE"

source .venv/bin/activate
python3 tradingview_to_standard-csv.py "$INPUT_FILE" "$OUTPUT_FILE" --account-name "TradingView_backtest" --account-fullname "TradingView backtest import" --symbol US30 -c 1
