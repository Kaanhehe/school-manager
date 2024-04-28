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
    panels = driver.find_elements(By.CSS_SELECTOR, 'div.panel.panel-info')
    driver.execute_script("arguments[0].style.display = 'block';", panels[2]) # This is to show the hidden panels
    for panel in panels[1:]:
        date = panel.find_element(By.CSS_SELECTOR, 'div.panel-heading span.hidden-xs').text
        date = date.split(' ')[2]  # Example: 01.09.2021
        table = panel.find_element(By.CSS_SELECTOR, 'table.table.table-striped.table-hover.table-condensed')
        table_rows = table.find_elements(By.CSS_SELECTOR, 'tbody tr')
        for row in table_rows:
            cells = row.find_elements(By.TAG_NAME, 'td')
            if len(cells) == 1:
                continue
            repplan_data.append({
                'date': date,
                'hour': cells[1].text,
                'class': cells[2].text,
                'substitute': cells[3].text,
                'teacher': cells[4].text,
                'subject': cells[5].text,
                'room': cells[6].text,
                'info': cells[7].text
            })

    return repplan_data

# Function to split double classes in Representation Plan data
def split_double_classes(repplan_data):
    new_repplan_data = []
    for entry in repplan_data:
        if '-' in entry['hour']:
            classes = entry['hour'].split('-')
            for single_class in classes:
                single_class = single_class.strip()
                new_repplan_data.append({
                    'date': entry['date'],
                    'hour': single_class,
                    'class': entry['class'],
                    'substitute': entry['substitute'],
                    'teacher': entry['teacher'],
                    'subject': entry['subject'],
                    'room': entry['room'],
                    'info': entry['info']
                })
        else:
            new_repplan_data.append(entry)

    return new_repplan_data

def save_repplan_to_db(repplan_data):
    # Connect to the SQLite database
    conn = sqlite3.connect('repplan.db')
    cursor = conn.cursor()

    # Create the table if it doesn't exist
    #cursor.execute("DROP TABLE IF EXISTS repplan") # Uncomment this line to drop the table before creating a new one (for testing purposes)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS repplan (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
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
    date1found = None
    date2found = None
    for entry in repplan_data:
        # Delete entries with the same date
        if not date1found:
            cursor.execute("DELETE FROM repplan WHERE date = ?", (entry['date'],))
            date1found = entry['date']
        if not date2found and date1found and date1found != entry['date']:
            date2found = entry['date']
            cursor.execute("DELETE FROM repplan WHERE date = ?", (entry['date'],))
        cursor.execute('''
        INSERT INTO repplan (date, hour, class, substitute, teacher, subject, room, info)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (entry['date'], entry['hour'], entry['class'], entry['substitute'], entry['teacher'], entry['subject'], entry['room'], entry['info']))

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

    repplan_data = split_double_classes(repplan_data)

    print("Split double classes:")
    for entry in repplan_data:
        print(entry)

    # Store Representation Plan data in SQLite database
    save_repplan_to_db(repplan_data)

    print("Representation Plan data has been scraped and stored successfully.")

    # Remember to close the browser window when done
    driver.quit()

if __name__ == '__main__':
    main()