# MT5 Export API Documentation

## Overview

The MT5 ExportHistory Expert Advisor can now automatically upload trading history directly to TradeJourney via the API, eliminating the need for manual file transfers.

## Setup

### 1. Get Your API Token

1. Log in to TradeJourney
2. Go to Settings → Account
3. Copy your API Token (if not visible, generate a new one)

### 2. Configure the EA

In MetaTrader 5, open the ExportHistory EA and set the following inputs:

| Input | Value | Description |
|-------|-------|-------------|
| `daysToExport` | 1 | Number of days to export from today |
| `importName` | MT5Export | Import name for TradeJourney (used to identify the source) |
| `accountFullname` | MetaTrader 5 | Account display name |
| `defaultExchange` | Forex | Default exchange name |
| `uploadToAPI` | true | Enable API upload |
| `apiURL` | http://localhost:3000/api/mt5-export | TradeJourney API endpoint (adjust host/port if needed) |
| `apiToken` | YOUR_TOKEN_HERE | Your API token from TradeJourney |

### 3. Allow WebRequest in MT5

For the EA to communicate with the API, you must whitelist the URL:

1. In MetaTrader 5: **Tools → Options → Expert Advisors**
2. Check **"Allow WebRequest for listed URLs"**
3. Add your TradeJourney URL to the list:
   - For local: `http://localhost:3000`
   - For remote: `https://yourdomain.com`

## Usage

### Manual Export

1. Open any chart in MetaTrader 5 with the ExportHistory EA attached
2. Click the **"EXPORT H."** button in the top-right corner
3. The EA will:
   - Export trading history for the specified number of days
   - Save it locally to the MT5 common files folder
   - Upload it to TradeJourney API (if enabled)
   - Show a confirmation message

### Automated Export

You can schedule the EA to export automatically using MT5's scheduler or by attaching it to a chart with `OnTick()` logic.

## API Endpoint Details

**POST** `/api/mt5-export`

### Headers
```
X-API-Token: YOUR_API_TOKEN
```

### Request Body
Multipart form data with:
- `file`: CSV file containing trading history
- `filename`: (optional) Custom filename for the export

### Response
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "userId": 1,
  "filename": "mt5-export-1708079400000.csv",
  "path": "/path/to/temp/imports/user_1/mt5-export-1708079400000.csv"
}
```

### Error Responses

| Status | Message | Cause |
|--------|---------|-------|
| 401 | API token required | Missing `X-API-Token` header |
| 401 | Invalid API token | Token doesn't match any user |
| 400 | No file provided | File field is missing |
| 400 | Invalid filename | Filename contains invalid characters |
| 500 | Failed to upload file | Server error during file save |

## File Format

The exported CSV file contains the following columns:

```
importName, accountName, accountFullname, openDate, closeDate, symbol, type, lot, 
openPrice, closePrice, profit, stopLoss, takeProfit, commission, exchange, extendId, 
profit_points, screenshotUrl, mae, mfe
```

### Column Descriptions

- **importName**: Source identifier (e.g., "MT5Export")
- **accountName**: Account number
- **accountFullname**: Account display name
- **openDate**: Trade open time (ISO 8601 format)
- **closeDate**: Trade close time (ISO 8601 format)
- **symbol**: Trading instrument (e.g., "EURUSD")
- **type**: "buy" or "sell"
- **lot**: Position size
- **openPrice**: Entry price
- **closePrice**: Exit price
- **profit**: Profit/loss in account currency
- **stopLoss**: Stop loss level
- **takeProfit**: Take profit level
- **commission**: Trading commission
- **exchange**: Exchange name
- **extendId**: Unique identifier (MT5-{PositionID})
- **profit_points**: Profit in points (profit/lot)
- **screenshotUrl**: Empty (for future use)
- **mae**: Maximum Adverse Excursion
- **mfe**: Maximum Favorable Excursion

## Troubleshooting

### "WebRequest error" in EA logs

**Solution**: Add the TradeJourney URL to the allowed URLs list in MT5:
- Tools → Options → Expert Advisors → Allow WebRequest for listed URLs

### "API token required" error

**Solution**: 
1. Verify the `apiToken` input is set correctly
2. Check that the token hasn't expired
3. Generate a new token in TradeJourney settings if needed

### "Invalid API token" error

**Solution**:
1. Copy the token again from TradeJourney settings
2. Ensure there are no extra spaces or characters
3. Verify the token is for the correct user account

### File uploaded but not appearing in TradeJourney

**Solution**:
1. Check that the file was saved to `temp/imports/user_{userId}/`
2. Verify the file format matches the expected CSV structure
3. Use the manual import feature to import the file

## Security Notes

- **Never share your API token** - treat it like a password
- The token is sent in the `X-API-Token` header (not in the URL)
- Use HTTPS in production environments
- Rotate your token periodically in settings

## Advanced Configuration

### Custom API URL

If running TradeJourney on a different host/port:

```
apiURL = "https://trading.example.com/api/mt5-export"
```

### Disable API Upload

To export locally without uploading to the API:

```
uploadToAPI = false
```

The file will still be saved to the MT5 common files folder.

## Support

For issues or questions:
1. Check the EA logs in MT5 (View → Toolbox → Experts)
2. Verify all configuration inputs are correct
3. Ensure the TradeJourney server is running and accessible
