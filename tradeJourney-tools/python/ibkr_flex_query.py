import requests # type: ignore
import time
import sys
import os
import xml.etree.ElementTree as ET
from dotenv import load_dotenv # type: ignore
from datetime import datetime, timedelta

# Charger les variables d'environnement depuis .env
load_dotenv()

class IBKRFlexQueryClient:
    """IBKR Flex Query API Client"""

    def __init__(self, token, query_id, base_url="https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService"):
        self.token = token
        self.query_id = query_id
        self.base_url = base_url
        self.flex_version = 3
        self.headers = {"User-Agent": "TradeJourney-FlexQuery/1.0"}

    def send_request(self):
        """Send Flex Query request and return reference code
        
        IMPORTANT: IBKR Flex Web Service API behavior with date periods:
        
        ✗ "Last N Days" (custom N): Does NOT work correctly with API
          - Returns inconsistent results (sometimes 1 day, sometimes partial data)
          - Manual download works, but API ignores the configuration
        
        ✓ "Last 30 Calendar Days" (predefined): Works perfectly with API
          - Returns all trades for the last 30 days as expected
          - Recommended for API usage
        
        Other working options: "Last Month", "Last Quarter", "Year To Date"
        
        SOLUTION: In IBKR Client Portal, change Period from "Last N Days" to 
        "Last 30 Calendar Days" (or another predefined period option).

        Returns:
            str: Reference code for the report
        Raises:
            SystemExit: If request fails
        """
        send_path = "/SendRequest"
        send_params = {
            "t": self.token,
            "q": self.query_id,
            "v": self.flex_version
        }

        print(f" Executing Flex Query {self.query_id}...")
        response = requests.get(url=self.base_url + send_path, params=send_params, headers=self.headers)

        if response.status_code != 200:
            print(f"HTTP Error: {response.status_code}")
            print(f"Response: {response.text}")
            sys.exit(1)

        # Parse XML response
        try:
            tree = ET.ElementTree(ET.fromstring(response.text))
            root = tree.getroot()
        except ET.ParseError as e:
            print(f"XML Parse Error: {e}")
            print(f"Response: {response.text}")
            sys.exit(1)

        ref_code = None
        status = None
        error_code = None
        error_message = None

        for child in root:
            if child.tag == "Status":
                status = child.text
            elif child.tag == "ReferenceCode":
                ref_code = child.text
            elif child.tag == "ErrorCode":
                error_code = child.text
            elif child.tag == "ErrorMessage":
                error_message = child.text

        if status != "Success":
            print(f"Flex Query failed with status: {status}")
            if error_code:
                print(f"Error Code: {error_code}")
            if error_message:
                print(f"Error Message: {error_message}")
            sys.exit(1)

        if not ref_code:
            print("No reference code in response")
            print(f"Raw response: {response.text}")
            sys.exit(1)

        print(f"Query submitted successfully. Reference: {ref_code}")
        return ref_code

    def get_statement(self, ref_code, csv_path, max_wait_time=60, check_interval=5):
        """Get Flex Query results with status checking

        Args:
            ref_code (str): Reference code from send_request
            csv_path (str): Path to save CSV file
            max_wait_time (int): Maximum wait time in seconds
            check_interval (int): Check interval in seconds

        Returns:
            bool: True if successful
        """
        print("Waiting for report generation...")

        elapsed_time = 0

        # Initial wait before first check
        time.sleep(check_interval)

        while elapsed_time < max_wait_time:
            print(f"Checking status (elapsed: {elapsed_time}s)...")

            # Try to get results
            receive_slug = "/GetStatement"
            receive_params = {
                "t": self.token,
                "q": ref_code,
                "v": self.flex_version
            }

            response = requests.get(url=self.base_url + receive_slug, params=receive_params, headers=self.headers, allow_redirects=True)

            if response.status_code == 200:
                content = response.text.strip()

                # Check if we got actual CSV data
                if 'ClientAccountID' in content and ('DateTime' in content or 'TradeDate' in content):
                    print(f"Report ready after {elapsed_time}s!")

                    # Save to file
                    try:
                        with open(csv_path, 'wb') as f:
                            f.write(response.content)
                    except IOError as e:
                        print(f"Failed to save file: {e}")
                        return False

                    csv_size = len(response.content)
                    print(f"Results saved to {csv_path} ({csv_size} bytes)")

                    # Show preview
                    csv_content = response.text
                    print("\nCSV Full Content:")
                    print("=" * 50)
                    print(csv_content)  # Affiche tout le CSV
                    print("=" * 50)

                    return True

                # Still generating
                elif "Statement generation in progress" in content:
                    print("   Report still generating...")
                else:
                    print(f"   Unexpected response: {content[:100]}...")
            else:
                print(f"   HTTP {response.status_code}: {response.text[:100]}...")

            # Wait before next check
            if elapsed_time + check_interval < max_wait_time:
                time.sleep(check_interval)
            elapsed_time += check_interval

        # Timeout
        print(f"Timeout after {max_wait_time}s - report may still be generating")
        print("Try again later or check your Flex Query configuration")
        return False


# Configuration from environment variables
token = os.getenv('IBKR_FLEX_QUERY_TOKEN', '')
query_id = os.getenv('IBKR_FLEX_QUERY_ID', '')
csv_path = os.getenv('IBKR_FLEX_QUERY_OUTPUT', 'flex_results.csv')

# Validate configuration
if not token:
    print("❌ Error: IBKR_FLEX_QUERY_TOKEN environment variable not set")
    sys.exit(1)

if not query_id:
    print("❌ Error: IBKR_FLEX_QUERY_ID environment variable not set")
    sys.exit(1)

def main():
    """Main execution flow"""
    client = IBKRFlexQueryClient(token, query_id)

    # Step 1: Send request
    ref_code = client.send_request()

    # Step 2: Get results with status checking
    success = client.get_statement(ref_code, csv_path)

    if success:
        print("\nFlex Query completed successfully!")
    else:
        print("\nFlex Query failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
