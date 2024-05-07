import sys
import requests
from datetime import date
import sqlite3
from bs4 import BeautifulSoup

# Login credentials
USERNAME = 'kaan.torun'
PASSWORD = '7ZaqfmnETOaNfudsWA?FytOTnYV6?#?1x0V2F&9V'
SCHOOLID = '5202'

LOGIN_URL = 'https://login.schulportal.hessen.de/?url=aHR0cHM6Ly9jb25uZWN0LnNjaHVscG9ydGFsLmhlc3Nlbi5kZS8=&skin=sp&i=5202'
TIMETABLE_URL = 'https://start.schulportal.hessen.de/stundenplan.php?a=detail_klasse&e=1&k=09A'

# Function to perform login using requests
def login_requests(username, password):
    session = requests.Session()
    response = session.get(LOGIN_URL)
    if response.status_code != 200:
        print("Failed to load login page")
        return None

    form_data = {
        'user': SCHOOLID + '.' + username,
        'password': password
    }
    response = session.post(LOGIN_URL, data=form_data)
    if response.status_code != 200:
        print("Failed to login")
        return None

    return session

def scrape_timetable(session, url):
    if session is None:
        print("Session not available. Login failed.")
        return []

    response = session.get(url)
    if response.status_code != 200:
        print("Failed to load timetable page")
        return []
    timetable_data = []
    # Write code to scrape timetable data using requests
    soup = BeautifulSoup(response.content, 'html.parser')

    # Find the timetable table
    owndiv = soup.find('div', {'id': 'own'})  # Use the parsed HTML to find the desired element
    table = owndiv.find('table')
    table_header = table.find('thead')
    table_body = table.find('tbody')
    
    header = table_header.find_all('th')
    labels = []
    for head in header:
        labels.append(head.text)

    # Find all the rows in the table
    rows = table_body.find_all('tr')

    # Initialize an empty list to store the timetable data
    timetable_data = []

    # Loop over the rows
    for row in rows[1:]:
        # Find all the columns in the row
        columns = row.find_all('td')

        # Skip the row if it doesn't have any columns (e.g., the header row)
        if not columns:
            continue

        try:
            # Extract the class details from the columns
            class_num_n_time, useless, useless = columns[0].text.split("\n")
            class_num_n_time = class_num_n_time.strip()
            class_num, class_time = class_num_n_time.split(" ", 1)
            class_time = class_time.strip()
            #print(class_num, class_time)
            for num, column in enumerate(columns[1:]):
                text = column.text.replace(" ", "").replace("\n", " ").replace("  ", " ").replace("  ", " ") # IDK why I have to do this but it works
                try:
                    class_day = labels[num +1]
                    class_name = text.split(" ")[0].strip()
                    class_loc = text.split(" ")[1].strip()
                    class_tea = text.split(" ")[2].strip()
                    
                    # Check if there is already a class with the same day num and time in the timetable_data
                    existing_classes = [class_data for class_data in timetable_data if class_data[0] == class_day and class_data[1] == class_num]
                    # If there is an existing class, keep adding one to class_day until the class does not already exist anymore
                    counterexisting = 0
                    while existing_classes:
                        counterexisting = counterexisting + 1
                        class_day = labels[num + counterexisting]
                        existing_classes = [class_data for class_data in timetable_data if class_data[0] == class_day and class_data[1] == class_num]
                    
                    if column.get('rowspan') == "2": # Check if the class has rowspan="2"
                        next_row = rows[rows.index(row) + 1]
                        next_class_day = class_day
                        next_class_num_n_time, useless, useless = next_row.find('td').text.split("\n")
                        next_class_num_n_time = next_class_num_n_time.strip()
                        next_class_num, next_class_time = next_class_num_n_time.split(" ", 1)
                        next_class_time = next_class_time.strip()
                        next_class_name = class_name
                        next_class_loc = class_loc
                        next_class_tea = class_tea
                        
                        timetable_data.append((class_day, class_num, class_time, class_name, class_loc, class_tea))
                        timetable_data.append((next_class_day, next_class_num, next_class_time, next_class_name, next_class_loc, next_class_tea))
                    else:
                        timetable_data.append((class_day, class_num, class_time, class_name, class_loc, class_tea))
                except:
                        continue
        except ValueError:
            continue # Skip the row if the first column doesn't contain the class number and time
        
    return timetable_data

def store_timetable_data(timetable_data, user_id):
    conn = sqlite3.connect('timetable.db')
    c = conn.cursor()
    c.execute('''DROP TABLE IF EXISTS timetable''')
    c.execute('''CREATE TABLE IF NOT EXISTS timetable 
                 (user_id TEXT, class_day TEXT, class_num INTEGER, class_time TEXT, class_name TEXT, class_loc TEXT, class_tea TEXT, date TEXT)''')

    today = date.today().isoformat()  # Convert the date to a string in ISO 8601 format
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
    session = login_requests(USERNAME, PASSWORD)
    if session is None:
        return

    timetable_data = scrape_timetable(session, TIMETABLE_URL)

    # Store timetable data in database
    store_timetable_data(timetable_data, user_id)

    print("Timetable data stored successfully.")

if __name__ == '__main__':
    main(sys.argv)
