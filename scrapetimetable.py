from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
import sys
import sqlite3
from datetime import date
import time

# Login credentials
USERNAME = 'kaan.torun'
PASSWORD = '7ZaqfmnETOaNfudsWA?FytOTnYV6?#?1x0V2F&9V'

LOGIN_URL = 'https://login.schulportal.hessen.de/?i=5202'
TIMETABLE_URL = 'https://start.schulportal.hessen.de/stundenplan.php?a=detail_klasse&e=1&k=09A'

# Function to perform login using Selenium
def login_selenium(username, password):
    driver = webdriver.Chrome()  # You'll need to download and install chromedriver or geckodriver
    driver.get(LOGIN_URL)
    time.sleep(1)  # Wait for page to load

    username_field = driver.find_element(By.ID, 'username2')  # Using By.ID to specify the selector type
    password_field = driver.find_element(By.ID, 'inputPassword')  # Using By.ID to specify the selector type
    login_button = driver.find_element(By.ID, 'tlogin')  # Using By.ID to specify the selector type


    username_field.send_keys(username)
    password_field.send_keys(password)
    login_button.click()

    time.sleep(1)  # Wait for login to complete
    return driver

# Function to scrape timetable data using Selenium
def scrape_timetable(driver, url):
    if driver is None:
        print("Driver not available. Login failed.")
        return []

    timetable_data = []
    driver.get(url)
    time.sleep(1)  # Wait for page to load

    navbar_elements = driver.find_elements(By.CSS_SELECTOR, 'ul.nav.nav-tabs li')
    own_plan_button = navbar_elements[1]

    own_plan_button.click()


    # Write code to scrape timetable data using Selenium
    table_rows = driver.find_elements(By.TAG_NAME, 'table')[1].find_elements(By.TAG_NAME, 'tr')
    counter = 0 # Idk why I cant just do "for rownum, row in tablerows:" but it doesnt work
    labels = []
    for row in table_rows:
        counter = counter + 1 # Gotta use this counter to skip second row and get the labels from first row -> look comment above
        if counter == 2:
            continue
        if counter == 1:
            label_hour = row.find_element(By.CSS_SELECTOR, 'th:nth-child(1)').text
            label_mon = row.find_element(By.CSS_SELECTOR, 'th:nth-child(2)').text
            label_tue = row.find_element(By.CSS_SELECTOR, 'th:nth-child(3)').text
            label_wed = row.find_element(By.CSS_SELECTOR, 'th:nth-child(4)').text
            label_thu = row.find_element(By.CSS_SELECTOR, 'th:nth-child(5)').text
            label_fri = row.find_element(By.CSS_SELECTOR, 'th:nth-child(6)').text
            labels.append((label_hour, label_mon, label_tue, label_wed, label_thu, label_fri))
            continue
        
        columns = row.find_elements(By.CSS_SELECTOR, 'td:nth-child(n)')

        for num, column in enumerate(columns, start=1):
            try:
                class_day = labels[0][num] # class_day gets changed in the while loop if there is already a class with the same day num and time in the timetable_data below
                class_num = row.find_element(By.CSS_SELECTOR, 'td:nth-child(1)').text.split("\n")[0]
                class_time = row.find_element(By.CSS_SELECTOR, 'td:nth-child(1)').text.split("\n")[1]
                class_name = row.find_element(By.CSS_SELECTOR, f'td:nth-child({num + 1})').text.split()[0]
                class_loc = row.find_element(By.CSS_SELECTOR, f'td:nth-child({num + 1})').text.split()[1]
                class_tea = row.find_element(By.CSS_SELECTOR, f'td:nth-child({num + 1})').text.split("\n")[1]
                # Check if there is already a class with the same day num and time in the timetable_data
                existing_classes = [class_data for class_data in timetable_data if class_data[0] == class_day and class_data[1] == class_num]
                # If there is an existing class, keep adding one to class_day until the class does not already exist anymore
                counterexisting = 0
                while existing_classes:
                    counterexisting = counterexisting + 1
                    class_day = labels[0][num + counterexisting]
                    existing_classes = [class_data for class_data in timetable_data if class_data[0] == class_day and class_data[1] == class_num]

                # Check if the class has rowspan="2"
                if row.find_element(By.CSS_SELECTOR, f'td:nth-child({num + 1})').get_attribute("rowspan") == "2":
                    next_row = table_rows[counter]
                    next_class_day = class_day
                    next_class_num = next_row.find_element(By.CSS_SELECTOR, 'td:nth-child(1)').text.split("\n")[0]
                    next_class_time = next_row.find_element(By.CSS_SELECTOR, 'td:nth-child(1)').text.split("\n")[1]
                    next_class_name = class_name
                    next_class_loc = class_loc
                    next_class_tea = class_tea

                    # Append the next hour with the same name, location, and teacher
                    timetable_data.append((class_day, class_num, class_time, class_name, class_loc, class_tea))
                    timetable_data.append((next_class_day, next_class_num, next_class_time, next_class_name, next_class_loc, next_class_tea))
                else:
                    timetable_data.append((class_day, class_num, class_time, class_name, class_loc, class_tea))
            except:
                continue
    return timetable_data
# Function to store timetable data in SQLite database
def store_timetable_data(timetable_data, user_id):
    conn = sqlite3.connect('timetable.db')
    c = conn.cursor()
    c.execute('''DROP TABLE IF EXISTS timetable''')
    c.execute('''CREATE TABLE IF NOT EXISTS timetable 
                 (user_id TEXT, class_day TEXT, class_num INTEGER, class_time TEXT, class_name TEXT, class_loc TEXT, class_tea TEXT, date TEXT)''')

    today = date.today()
    if timetable_data is not None:
        for class_day, class_num, class_time, class_name, class_loc, class_tea in timetable_data:
            c.execute("INSERT INTO timetable VALUES (?, ?, ?, ?, ?, ?, ?, ?)", (user_id, class_day, class_num, class_time, class_name, class_loc, class_tea, today))
    else:
        print("No timetable data available to store in database.")

    conn.commit()
    conn.close()

# Main function
def main(args):
    username = args[1]
    user_id = args[2]
    # Perform login using Selenium
    driver = login_selenium(USERNAME, PASSWORD)

    # Scrape timetable data
    timetable_data = scrape_timetable(driver, TIMETABLE_URL)

    # Store timetable data in database
    store_timetable_data(timetable_data, user_id)

    print("Timetable data has been scraped and stored successfully.")

    # Remember to close the browser window when done
    driver.quit()

if __name__ == "__main__":
    main(sys.argv)
