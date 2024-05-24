import sys
import requests
import os
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from hashlib import sha256
import base64
from datetime import date
import psycopg2
from bs4 import BeautifulSoup

REPPLAN_URL = 'https://start.schulportal.hessen.de/vertretungsplan.php'
DATABASE_URL = os.environ.get('DATABASE_URL')

def get_data_from_db(user_id):
    # Connect to the SQLite database
    conn = psycopg2.connect(DATABASE_URL, sslmode='require')
    cursor = conn.cursor()

    # Get the data from the database
    cursor.execute("SELECT * FROM scrape_data WHERE user_id = %s", (user_id,))
    scrape_data = cursor.fetchone()

    login_url = scrape_data[1]
    schoolid = scrape_data[2]
    username = scrape_data[3]
    password_hash = scrape_data[4]

    # Close the connection
    conn.close()

    return login_url, schoolid, username, password_hash

# Function to decrypt the password using the users website login password
def decrypt_password(user_id, user_password, encrypted_password):

    # Decrypt the password
# Derive the key from the user's password
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt= str(user_id).encode(),
        iterations=100000,
        backend=default_backend()
    )
    key = kdf.derive(user_password.encode())

    # Decode the base64-encoded encrypted data
    encrypted_data = base64.b64decode(encrypted_password)

    # Decrypt the data
    iv = sha256(str(user_id).encode()).digest()[:16]
    cipher = Cipher(algorithms.AES(key), modes.CFB(iv), backend=default_backend())
    decryptor = cipher.decryptor()
    decrypted_data = decryptor.update(encrypted_data) + decryptor.finalize()

    # Unpad the decrypted data
    unpadder = padding.PKCS7(algorithms.AES.block_size).unpadder()
    unpadded_data = unpadder.update(decrypted_data) + unpadder.finalize()

    return unpadded_data.decode()

# Function to perform login using requests
def login_requests(login_url, schoolid, username, password):
    session = requests.Session()
    response = session.get(login_url)
    if response.status_code != 200:
        return sys.exit("error+Fehler+Fehler beim Laden der Schulportal-Loginseite.")

    form_data = {
        'user': str(schoolid) + '.' + username,
        'password': password
    }
    response = session.post(login_url, data=form_data)
    if response.status_code != 200:
        return sys.exit("error+Fehler+Schulportal-Login fehlgeschlagen.")

    return session

def scrape_repplan(session, url):
    if session is None:
        return sys.exit("error+Fehler+Schulportal-Login fehlgeschlagen.")

    response = session.get(url)
    if response.status_code != 200:
        return sys.exit("error+Fehler+Fehler beim Laden der Schulportal-Stundenplanseite")
    repplan_data = []
    # Write code to scrape repplan data using requests
    soup = BeautifulSoup(response.content, 'html.parser')

    if "Fehler" in soup.title.text:
        return sys.exit("error+Fehler+Schulportal-Login abgelehnt. Bitte überprüfen Sie Ihre Anmeldeinformationen.")

    alert1 = {}
    alert2 = {}
    # Find the repplan table
    panel_primary = soup.find('div', {'class': 'panel panel-primary'})
    if panel_primary is not None:
        panel_primary['class'] = ['panel', 'panel-info']
    panels = soup.find_all('div', {'class': 'panel panel-info'})
    for panel in panels[1:]:
        # Check for alerts
        alert1[panel] = panel.find('div', {'class': 'alert alert-danger'})
        alert2[panel] = panel.find('div', {'class': 'alert alert-warning'})
        
        # Remove the button text from the alert
        if alert1[panel] is not None:
            alert1[panel].find('a').extract()
        
        date = panel.find('div', {'class': 'panel-heading'}).find('span', {'class': 'hidden-xs'}).text.split(' ')[2]
        table = panel.find('table', {'class': 'table table-hover table-condensed table-striped'})
        table_rows = table.find_all('tr')
        for row in table_rows[1:]:
            cells = row.find_all('td')
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
    # only if both panels gave back an alert
    # only if there is no repplan data available it will error on repplan getting updated right now
    if all(alert2.values()): # alert 2 is typically telling that there is no repplan data available
        if any(alert1.values()): # alert 1 is typically telling that the repplan is getting updated right now
            return sys.exit("error+Fehler+" + alert1.text.strip())
        return sys.exit("error+Fehler+" + alert2.text.strip())
    
    return repplan_data

def save_repplan_to_db(repplan_data, user_id):
    # Connect to the SQLite database
    conn = psycopg2.connect(DATABASE_URL, sslmode='require')
    cursor = conn.cursor()

    # Get the unique dates from the repplan data
    dates = list(set(entry['date'] for entry in repplan_data))
    
    # Delete entries with those dates
    for date in dates:
        cursor.execute("DELETE FROM repplan WHERE date = %s AND user_id = %s", (date, user_id))
    
    # Insert the data into the table
    for entry in repplan_data:
        cursor.execute('''
        INSERT INTO repplan (user_id, date, hour, class, substitute, teacher, subject, room, info)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
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
    user_id = args[2]
    user_password = args[3]
    if not user_id or not user_password:
        return sys.exit("Please provide a user ID and password")
    

    if len(args) > 4:
        login_url = args[4]
        schoolid = args[5]
        username = args[6]
        password_hash = args[7]
    else:
        # Get the login URL, school ID, username, and password hash from the database
        login_url, schoolid, username, password_hash = get_data_from_db(user_id)
    
    # Decrypt the password
    password = decrypt_password(user_id, user_password, password_hash)
    
    # Perform login using requests
    session = login_requests(login_url, schoolid, username, password)

    # Scrape Representation Plan data
    repplan_data = scrape_repplan(session, REPPLAN_URL)

    # Many classes are merged when they are next to each other in the repplan data
    # Split these double classes into separate entries
    repplan_data = split_double_classes(repplan_data)

    print("Split double classes:")
    for entry in repplan_data:
        print(entry)

    # Store repplan data in database
    save_repplan_to_db(repplan_data, user_id)

    sys.exit("success+Erfolg+Vertretungsplan erfolgreich von Schulportal entnommen.")

if __name__ == '__main__':
    main(sys.argv)