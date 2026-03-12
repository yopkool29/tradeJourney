@echo off
if "%~1"=="" (
    echo Usage: %0 input_file.csv [output_file.csv]
    echo Examples:
    echo   %0 input.csv
    echo   %0 input.csv output.csv
    exit /b 1
)

REM Check if parameter contains ":\"

set INPUT_FILE=%1

if "%~2"=="" (
    set OUTPUT_FILE=Tradingview_to_standard.csv
) else (
    set OUTPUT_FILE=%2
)

echo Debug: INPUT_FILE = %INPUT_FILE%
echo Debug: OUTPUT_FILE = %OUTPUT_FILE%

call .\.venv\Scripts\activate.bat && python tradingview_to_standard-csv.py "%INPUT_FILE%" "%OUTPUT_FILE%" --account-name TOKYO_EXIT_US30 --account-fullname "TOKYO_EXIT_US30 TradingView" --symbol YM1! -c 1
