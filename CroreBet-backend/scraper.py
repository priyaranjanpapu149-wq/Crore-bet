import requests
from bs4 import BeautifulSoup
import csv
import time
import random
from datetime import datetime, timedelta

BASE_URL = "https://dpbossnet.me"

MARKETS = {
    "SRIDEVI": "sridevi", "TIME BAZAR": "time-bazar", "MADHUR DAY": "madhur-day",
    "MILAN DAY": "milan-day", "RAJDHANI DAY": "rajdhani-day", "SUPREME DAY": "supreme-day",
    "KALYAN": "kalyan", "SRIDEVI NIGHT": "sridevi-night", "MADHUR NIGHT": "madhur-night",
    "NIGHT TIME BAZAR": "night-time-bazar", "SUPREME NIGHT": "supreme-night",
    "MILAN NIGHT": "milan-night", "RAJDHANI NIGHT": "rajdhani-night", "KALYAN NIGHT": "kalyan-night",
    "MAIN BAZAR": "main-bazar"
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
}

def fetch(url):
    print(f"  -> Fetching: {url}")
    try:
        time.sleep(random.uniform(4, 7))
        r = requests.get(url, headers=HEADERS, timeout=15)
        r.raise_for_status()
        if "Checking your browser" in r.text or "Cloudflare" in r.text:
            print("  ⚠️ Blocked by Cloudflare! Wait a few minutes and try again.")
            return None
        return r.text
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return None

def parse_date_range(date_range_str):
    """Extracts the start date from '17/10/2022 to 22/10/2022'"""
    try:
        start_date_str = date_range_str.split('to')[0].strip()
        return datetime.strptime(start_date_str, '%d/%m/%Y')
    except:
        return None

def scrape_market(name, slug):
    print(f"\n📊 Scraping: {name}")
    results = []
    
    # We only need the Panel chart, it contains everything!
    url = f"{BASE_URL}/panel-chart-record/{slug}.php"
    html = fetch(url)
    if not html: return []

    soup = BeautifulSoup(html, 'html.parser')
    table = soup.find('table')
    if not table: return []

    rows = table.find_all('tr')
    
    for row in rows:
        cols = [ele.text.strip() for ele in row.find_all(['td', 'th'])]
        
        # Skip header or malformed rows
        if len(cols) < 19 or cols[0] == 'Date': 
            continue
            
        start_date = parse_date_range(cols[0])
        if not start_date: continue

        # Loop through Monday (0) to Saturday (5)
        for i in range(6):
            col_idx = 1 + (i * 3)
            
            # Clean up spaces from the HTML (e.g., '7 8 0' becomes '780')
            open_panna = cols[col_idx].replace(' ', '').strip()
            jodi = cols[col_idx + 1].replace(' ', '').strip()
            close_panna = cols[col_idx + 2].replace(' ', '').strip()
            
            # Skip closed markets (***)
            if '***' in open_panna or '***' in jodi:
                continue
                
            # Validate lengths (Panna should be 3, Jodi should be 2)
            if len(open_panna) == 3 and len(jodi) == 2 and len(close_panna) == 3:
                current_date = (start_date + timedelta(days=i)).strftime('%Y-%m-%d')
                
                results.append({
                    "Market": name, 
                    "Date": current_date, 
                    "Jodi": jodi, 
                    "OpenPanna": open_panna, 
                    "OpenDigit": jodi[0], 
                    "ClosePanna": close_panna, 
                    "CloseDigit": jodi[1]
                })
                
    return results

if __name__ == "__main__":
    all_data = []
    for name, slug in MARKETS.items():
        all_data.extend(scrape_market(name, slug))
    
    if not all_data:
        print("\n❌ No data scraped at all. Please check the website.")
        exit()

    # 🚀 Calculate 6 months back from the LATEST date in the data (since your VPS clock is in 2026)
    latest_date_str = max([d["Date"] for d in all_data])
    latest_date = datetime.strptime(latest_date_str, '%Y-%m-%d')
    cutoff_date = (latest_date - timedelta(days=180)).strftime('%Y-%m-%d')
    
    print(f"\n📅 Latest record found on site: {latest_date_str}")
    print(f"📅 Keeping data from: {cutoff_date} onwards")

    filtered_data = [d for d in all_data if d["Date"] >= cutoff_date]
    filtered_data.sort(key=lambda x: (x['Market'], x['Date']), reverse=True)

    filename = "charts_clean.csv"
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=["Market", "Date", "Jodi", "OpenPanna", "OpenDigit", "ClosePanna", "CloseDigit"])
        writer.writeheader()
        writer.writerows(filtered_data)
        
    print(f"\n✅ Saved {len(filtered_data)} perfectly clean records to {filename}")