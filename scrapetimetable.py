import sys
import requests
import os
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
import base64
from datetime import date
import psycopg2
from bs4 import BeautifulSoup

TIMETABLE_URL = 'https://start.schulportal.hessen.de/stundenplan.php?a=detail_klasse&e=1&k=09A'
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
        salt=b'salt',  # Same salt used for encryption
        iterations=100000,
        backend=default_backend()
    )
    key = kdf.derive(user_password.encode())

    # Decode the base64-encoded encrypted data
    encrypted_data = base64.b64decode(encrypted_password)

    # Decrypt the data
    iv = b'InitializationVe'  # Same IV used for encryption
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

def scrape_timetable(session, url):
    if session is None:
        return sys.exit("error+Fehler+Schulportal-Login fehlgeschlagen.")

    response = session.get(url)
    if response.status_code != 200:
        return sys.exit("error+Fehler+Fehler beim Laden der Schulportal-Stundenplanseite")
    timetable_data = []
    # Write code to scrape timetable data using requests
    soup = BeautifulSoup(response.content, 'html.parser')

    if "Fehler" in soup.title.text:
        return sys.exit("error+Fehler+Schulportal-Login abgelehnt. Bitte überprüfen Sie Ihre Anmeldeinformationen.")

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
    conn = psycopg2.connect(DATABASE_URL, sslmode='require')
    c = conn.cursor()
    c.execute("DELETE FROM timetable WHERE user_id = %s", (user_id,))

    today = date.today().isoformat()  # Convert the date to a string in ISO 8601 format
    if timetable_data is not None:
        for class_day, class_num, class_time, class_name, class_loc, class_tea in timetable_data:
            c.execute("INSERT INTO timetable VALUES (%s, %s, %s, %s, %s, %s, %s)", (user_id, class_day, class_num, class_name, class_loc, class_tea, today))
            # insert class_time with the class_num into the timetable_times table
            class_time = class_time.split(" - ")
            class_start = class_time[0]
            class_end = class_time[1]
            
            # check if the class_num is already in the timetable_times table and insert it if not
            c.execute("SELECT * FROM timetable_times WHERE user_id = %s AND lesson_hour = %s", (user_id, class_num))
            if c.fetchone() is None:
                c.execute("INSERT INTO timetable_times VALUES (%s, %s, %s, %s)", (user_id, class_num, class_start, class_end))

            # get every class_name once and insert it into the timetable_classes table
            c.execute("SELECT * FROM timetable_classes WHERE user_id = %s AND class_name = %s", (user_id, class_name))
            if c.fetchone() is None:
                c.execute("INSERT INTO timetable_classes VALUES (%s, %s, %s, %s)", (user_id, class_name, "", "#333333"))
    else:
        print("No timetable data available to store in database.")

    conn.commit()
    conn.close()

# Main function
def main(args):
    user_id = args[2]
    user_password = args[3]
    if not user_id or not user_password:
        return sys.exit("Error: Please provide a user ID and password")
    
    if len(args) > 4:
        login_url = args[4]
        schoolid = args[5]
        username = args[6]
        encrypted_password = args[7]
    else:
        # Get the login URL, school ID, username, and encrypted password from the database
        login_url, schoolid, username, encrypted_password = get_data_from_db(user_id)

    # Decrypt the password
    password = decrypt_password(user_id, user_password, encrypted_password)

    # Perform login using requests
    session = login_requests(login_url, schoolid, username, password)

    # Scrape timetable data
    timetable_data = scrape_timetable(session, TIMETABLE_URL)

    # Store timetable data in database
    store_timetable_data(timetable_data, user_id)

    sys.exit("success+Erfolg+Stundenplan erfolgreich von Schulportal entnommen.")

if __name__ == '__main__':
    main(sys.argv)
