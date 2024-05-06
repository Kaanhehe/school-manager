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
REPPLAN_URL = 'https://start.schulportal.hessen.de/vertretungsplan.php'

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

def scrape_repplan(session, url):
    if session is None:
        print("Session not available. Login failed.")
        return []

    response = session.get(url)
    if response.status_code != 200:
        print("Failed to load repplan page")
        return []
    repplan_data = []
    # Write code to scrape repplan data using requests
    soup = BeautifulSoup(response.content, 'html.parser')

    # Find the repplan table
    panel_primary = soup.find('div', {'class': 'panel panel-primary'})
    if panel_primary is not None:
        panel_primary['class'] = ['panel', 'panel-info']
    panels = soup.find_all('div', {'class': 'panel panel-info'})
    for panel in panels[1:]:
        print(panel)
        date = panel.find('div', {'class': 'panel-heading'}).find('span', {'class': 'hidden-xs'}).text.split(' ')[2]
        table = panel.find('table', {'class': 'table table-hover table-condensed table-striped'})
        table_rows = table.find_all('tr')
        for row in table_rows[1:]:
            cells = row.find_all('td')
            print(len(cells))
            if len(cells) == 1:
                continue
            repplan_data.append({
                'date': date,
                'hour': cells[1].text.strip(),
                'class': cells[2].text.strip(),
                'substitute': cells[3].text.strip(),
                'teacher': cells[4].text.strip(),
                'subject': cells[5].text.strip(),
                'room': cells[6].text.strip(),
                'info': cells[7].text.strip()
            })
    return repplan_data

def save_repplan_to_db(repplan_data, user_id):
    # Connect to the SQLite database
    conn = sqlite3.connect('repplan.db')
    cursor = conn.cursor()

    # Create the table if it doesn't exist
    #cursor.execute("DROP TABLE IF EXISTS repplan") # Uncomment this line to drop the table before creating a new one (for testing purposes)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS repplan (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            hour INTEGER,
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
        INSERT INTO repplan (user_id, date, hour, class, substitute, teacher, subject, room, info)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (user_id, entry['date'], entry['hour'], entry['class'], entry['substitute'], entry['teacher'], entry['subject'], entry['room'], entry['info']))

    # Commit the changes and close the connection
    conn.commit()
    conn.close()

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

# Main function
def main(args):
    username = args[1]
    user_id = args[2]
    # Perform login using requests
    session = login_requests(USERNAME, PASSWORD)
    if session is None:
        print("Login failed. Exiting.")
        sys.exit(1)

    # Scrape Representation Plan data
    repplan_data = scrape_repplan(session, REPPLAN_URL)

    # Print the repplan data
    for item in repplan_data:
        print(item)

    repplan_data = split_double_classes(repplan_data)

    print("Split double classes:")
    for entry in repplan_data:
        print(entry)

    # Store repplan data in database
    save_repplan_to_db(repplan_data, user_id)

    print("Representation Plan data stored successfully.")

if __name__ == '__main__':
    main(sys.argv)