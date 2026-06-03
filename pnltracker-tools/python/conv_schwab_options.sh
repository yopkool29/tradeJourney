#!/bin/bash

if [ $# -eq 0 ]; then
    echo "Usage: $0 input_file.csv [output_file.csv]"
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
    OUTPUT_FILE="Schwab_Options_to_standard.csv"
fi

echo "Debug: INPUT_FILE = $INPUT_FILE"
echo "Debug: OUTPUT_FILE = $OUTPUT_FILE"

source .venv/bin/activate
python3 schwab_options_to_standard-csv.py "$INPUT_FILE" "$OUTPUT_FILE" --account-name Schwab --account-fullname "Charles Schwab Options" --import-name SchwabOptions
