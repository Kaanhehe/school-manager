from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
import sqlite3
from datetime import date
import time

# Login credentials
USERNAME = 'kaan.torun'
PASSWORD = '7ZaqfmnETOaNfudsWA?FytOTnYV6?#?1x0V2F&9V'

LOGIN_URL = 'https://login.schulportal.hessen.de/?i=5202'
REPPLAN_URL = 'https://start.schulportal.hessen.de/vertretungsplan.php'

# Function to perform login using Selenium
def login_selenium(username, password):
    driver = webdriver.Chrome()  # You'll need to download and install chromedriver or geckodriver
    driver.get(LOGIN_URL)
    time.sleep(1)  # Wait for page to load

    username_field = driver.find_element(By.ID, 'username2')  # Using By.ID to specify the selector type
    password_field = driver.find_element(By.ID, 'inputPassword')  # Using By.ID to specify the selector type
    login_button = driver.find_element(By.ID, 'tlogin')  # Using By.ID to specify

    username_field.send_keys(username)
    password_field.send_keys(password)
    login_button.click()

    time.sleep(1)  # Wait for login to complete
    return driver

# Function to scrape Representation Plan data using Selenium
def scrape_repplan(driver, url):
    if driver is None:
        print("Driver not available. Login failed.")
        return []

    repplan_data = []
    driver.get(url)
    time.sleep(1)  # Wait for page to load

    # Write code to scrape Representation Plan data using Selenium
    primary_panel = driver.find_element(By.CSS_SELECTOR, 'div.panel.panel-primary')
    table_rows = primary_panel.find_elements(By.CSS_SELECTOR, 'table.table.table-striped.table-hover.table-condensed tbody tr')
    for row in table_rows:
        cells = row.find_elements(By.TAG_NAME, 'td')
        
        if len(cells) == 0:
            continue
        if cells[0].get_attribute("colspan") == "8":
            continue
        repplan_data.append({
            'hour': cells[1].text,  # Skip the first cell as it contains absolute nothing for some reason # Example: 1 - 2, 5 - 6
            'class': cells[2].text, # Example: 09A
            'substitute': cells[3].text, # Example: HES, ### (Bei Ausfall)
            'teacher': cells[4].text, # Example: HES
            'subject': cells[5].text, # Example: D, POWI, ETHI01
            'room': cells[6].text, # Example: 5-102, 3-205, Mensa
            'info': cells[7].text # Example: fällt aus, falls anwesende Schüler: in Mensa gehen
        })

    return repplan_data

def save_repplan_to_db(repplan_data):
    # Connect to the SQLite database
    conn = sqlite3.connect('repplan.db')
    cursor = conn.cursor()

    # Create the table if it doesn't exist
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS repplan (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hour TEXT,
            class TEXT,
            substitute TEXT,
            teacher TEXT,
            subject TEXT,
            room TEXT,
            info TEXT
        )
    ''')

    # Insert the data into the table
    for entry in repplan_data:
        cursor.execute('''
            INSERT INTO repplan (hour, class, substitute, teacher, subject, room, info)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (entry['hour'], entry['class'], entry['substitute'], entry['teacher'], entry['subject'], entry['room'], entry['info']))

    # Commit the changes and close the connection
    conn.commit()
    conn.close()

# Main function
def main():
    # Perform login using Selenium
    driver = login_selenium(USERNAME, PASSWORD)
    if driver is None:
        print("Login failed. Exiting...")
        return
    
    # Scrape Representation Plan data using Selenium
    repplan_data = scrape_repplan(driver, REPPLAN_URL)

    # Print the scraped data
    for entry in repplan_data:
        print(entry)

    # Store Representation Plan data in SQLite database
    save_repplan_to_db(repplan_data)

    print("Representation Plan data has been scraped and stored successfully.")

    # Remember to close the browser window when done
    driver.quit()

if __name__ == '__main__':
    main()