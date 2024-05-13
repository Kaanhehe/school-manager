from flask import Flask, render_template, request, redirect, url_for, session, jsonify, abort
import os
import sys
import psycopg2
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
import base64
from itertools import groupby
from operator import itemgetter
import datetime
import subprocess
from werkzeug.security import generate_password_hash, check_password_hash
import uuid
import json

app = Flask(__name__)
app.secret_key = os.environ.get('Flask_secret_key')
DATABASE_URL = os.environ.get('DATABASE_URL')

#subprocess.run(['python', 'D:\ME\Privat\Projekte\Python\school-manager\createTables.py'])

# Function to retrieve timetable data from the database
def get_timetable_data(user_id):
    conn = psycopg2.connect(DATABASE_URL, sslmode='require')
    c = conn.cursor()
    # Select all data from the table called user_id
    c.execute("SELECT * FROM timetable WHERE user_id = %s", (user_id,))
    timetable_data = c.fetchall()
    conn.close()
    return timetable_data

def get_homework_data(user_id):
    conn = psycopg2.connect(DATABASE_URL, sslmode='require')
    c = conn.cursor()
    today = datetime.date.today().isoformat()
    c.execute("SELECT * FROM homework WHERE due_date >= %s AND user_id = %s", (today, user_id))
    homework_data = c.fetchall()
    conn.close()
    return homework_data

def get_repplan_data(user_id):
    def convert_date(date_str):
        # Convert date from DD.MM.YYYY to YYYY-MM-DD
        return datetime.datetime.strptime(date_str, '%d.%m.%Y').strftime('%Y-%m-%d')

    conn = psycopg2.connect(DATABASE_URL, sslmode='require')
    c = conn.cursor()
    c.execute("CREATE OR REPLACE FUNCTION convert_date(date_str text) RETURNS date AS $$ \
                BEGIN \
                    RETURN TO_DATE(date_str, 'DD.MM.YYYY'); \
                END; \
                $$ LANGUAGE plpgsql;")
    today = datetime.date.today().isoformat()
    c.execute("SELECT * FROM repplan WHERE convert_date(date) >= %s AND user_id = %s", (today, user_id))
    repplan_data = c.fetchall()
    conn.close()
    return repplan_data

def sort_timetable_data(timetable_data):
    # Define the weekday mapping
    weekday_mapping = {
        'Montag': 1,
        'Dienstag': 2,
        'Mittwoch': 3,
        'Donnerstag': 4,
        'Freitag': 5
    }
    # Reverse mapping for converting numbers back to weekdays
    reverse_mapping = {v: k for k, v in weekday_mapping.items()}

    # Convert weekdays to numbers and remove user_id
    timetable_data = [(weekday_mapping[entry[1]], *entry[2:]) for entry in timetable_data]

    # Sort by class_num and then by class_day
    timetable_data.sort(key=itemgetter(1, 0))

    # Group the data by class_num
    grouped_data = []
    for key, group in groupby(timetable_data, key=itemgetter(1)):
        # Convert the weekdays back to their original names
        group = [(reverse_mapping[g[0]], *g[1:]) for g in group]
        grouped_data.append(group)

    return grouped_data

def change_homework_data(homework_data):
    modified_homework_data = []
    for homework in homework_data:
        homework_list = list(homework)[1:]  # Remove the first column
        if homework_list[3] == 1:
            homework_list[3] = "Einfach😀"
        elif homework_list[3] == 2:
            homework_list[3] = "Normal🙂"
        elif homework_list[3] == 3:
            homework_list[3] = "Schwer🥵"
        else:
            homework_list[3] = "Unmöglich🤯"
        if homework_list[4] == "":
            homework_list[4] = "Noch nicht festgelegt"
        # Convert date from YYYY-MM-DD to DD.MM.YYYY
        # Split the date by "-" and reverse the list, then join the list with "."
        homework_list[4] = homework_list[4].split("-")
        homework_list[4] = ".".join(homework_list[4][::-1])
        modified_homework_data.append(tuple(homework_list))
        modified_homework_data = sorted(modified_homework_data, key=lambda x: x[4])
    return modified_homework_data

def get_user_id():
    if 'username' not in session:
        return abort(403)
    conn = psycopg2.connect(DATABASE_URL, sslmode='require')
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE username = %s", (session['username'],))
    try: 
        user_id = c.fetchone()[0]
    except:
        return None
    conn.close()
    return user_id

def check_password(user_id, user_password):
    conn = psycopg2.connect(DATABASE_URL, sslmode='require')
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE user_id = %s", (user_id,))
    user = c.fetchone()
    conn.close()
    if not user:
        return False
    if check_password_hash(user[3], user_password):
        return True
    return False

def encrypt_password(user_password, target_password):
    # Derive a key from the user's password
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b'salt',  # Change this to a unique salt per user
        iterations=100000,
        backend=default_backend()
    )
    key = kdf.derive(user_password.encode())

    # Pad the target password to ensure it's a multiple of 16 bytes
    padder = padding.PKCS7(algorithms.AES.block_size).padder()
    padded_data = padder.update(target_password.encode()) + padder.finalize()

    # Encrypt the padded target password
    iv = b'InitializationVe'  # Change this to a unique IV per encrypted password
    cipher = Cipher(algorithms.AES(key), modes.CFB(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    encrypted_data = encryptor.update(padded_data) + encryptor.finalize()

    # Encode the encrypted data as base64 for storage
    return base64.b64encode(encrypted_data)

def store_scrape_data(user_id, login_url, schoolid, username, password):
    conn = psycopg2.connect(DATABASE_URL, sslmode='require')
    c = conn.cursor()

    # Store the scrape data in the database
    try:
        c.execute("INSERT INTO scrape_data (user_id, login_url, schoolid, username, password) VALUES (%s, %s, %s, %s, %s)", (user_id, login_url, schoolid, username, password))
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        c.execute("UPDATE scrape_data SET login_url = %s, schoolid = %s, username = %s, password = %s WHERE user_id = %s", (login_url, schoolid, username, password, user_id))

    # Update the entered_scrape_data column in the users table
    c.execute("UPDATE users SET entered_scrape_data = 1 WHERE user_id = %s", (user_id,))

    conn.commit()
    conn.close()

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        form_data = request.form
        conn = psycopg2.connect(DATABASE_URL, sslmode='require')
        # check if username or email is already in use
        c = conn.cursor()
        c.execute("SELECT * FROM users WHERE username = %s", (form_data['username'],))
        user = c.fetchone()
        c.execute("SELECT * FROM users WHERE email = %s", (form_data['email'],))
        email = c.fetchone()

        # handle errors
        if user:
            return jsonify({'error': '<i class="fa-solid fa-triangle-exclamation"></i> Benutzername bereits in Verwendung'})
        if email:
            return jsonify({'error': '<i class="fa-solid fa-triangle-exclamation"></i> Email bereits in Verwendung'})
        elif not form_data['password'] or not form_data['username'] or not form_data['email']: 
            return jsonify({'error': '<i class="fa-solid fa-triangle-exclamation"></i> Bitte fülle alle Felder aus'})
        else:
            #create password hash and insert user into database
            hashed_password = generate_password_hash(form_data['password'], method='pbkdf2:sha256')
            id = str(uuid.uuid4())
            c.execute("INSERT INTO users (user_id, username, email, password, entered_scrape_data) VALUES (%s, %s, %s, %s, %s)", (id, form_data['username'], form_data['email'], hashed_password, 0))
            conn.commit()
            conn.close()
            return jsonify({'success': '<i class="fa-solid fa-check"></i> Registrierung erfolgreich'})
    # redirect to index if user is already logged in
    if 'username' in session:
        return redirect(url_for('index'))
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        form_data = request.form
        conn = psycopg2.connect(DATABASE_URL, sslmode='require')
        c = conn.cursor()

        # check if username and password are given
        if not form_data['password'] or not form_data['username']:
            return jsonify({'error': '<i class="fa-solid fa-triangle-exclamation"></i> Bitte fülle alle Felder aus'})
        # check if a email is given and then select the user by email, else select the user by username
        if '@' in form_data['username']:
            c.execute("SELECT * FROM users WHERE email = %s", (form_data['username'],))
        else:
            c.execute("SELECT * FROM users WHERE username = %s", (form_data['username'],))
        user = c.fetchone()
        conn.close()
        # check if the password is correct
        if user and check_password_hash(user[3], form_data['password']):
            # set the session username
            session['username'] = form_data['username']
            # checks if the user has given the data for the school website login
            if user[4] == 0:
                return jsonify({'warning': '<i class="fa-solid fa-exclamation"></i> Login erfolgreich. Bitte gib deine Daten für den Vertretungsplan und den Stundenplan an'})
            return jsonify({'success': '<i class="fa-solid fa-check"></i> Login erfolgreich'})
        else:
            # return error if the password is incorrect
            return jsonify({'error': '<i class="fa-solid fa-triangle-exclamation"></i> Benutzername oder Passwort falsch'})
    # redirect to index if user is already logged in
    if 'username' in session:
        return redirect(url_for('index'))
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('username', None)
    return redirect(url_for('login'))

@app.route('/')
def index():
    username = "Fremder"
    if 'username' in session:
        username = session['username']
    else:
        return redirect(url_for('login'))
    
    user_id = get_user_id()
    # It is possible that the user_id got changed, so we have to check if the user_id that we got is valid in the database
    if not user_id or user_id is None:
        session.pop('username', None)
        return redirect(url_for('login'))
    timetable_data = get_timetable_data(user_id)
    homework_data = get_homework_data(user_id)
    repplan_data = get_repplan_data(user_id)
    repplan_data = [entry[1:] for entry in repplan_data]
    homework_data = change_homework_data(homework_data)
    # returns groups of which every group is 1 row of the timetable
    grouped_data = sort_timetable_data(timetable_data)
    
    classes_data = {
        "Mathematik",
        "Deutsch",
        "Englisch",
        "Biologie",
        "Geschichte",
        "Geographie",
        "Physik",
        "Chemie",
        "Informatik",
        "Sport",
        "Musik",
        "Kunst",
        "Ethik",
        "Religion",
        "PoWi",
        "Spanisch",
    }
    # Render the index.html template -> templates/index.html; with the grouped_data
    return render_template('index.html', timetable_data=grouped_data, classes_data=classes_data, homework_data=homework_data, repplan_data=repplan_data, username=username)

@app.route('/settings', methods=['GET'])
def settings():
    if 'username' not in session:
        return redirect(url_for('login'))
    
    user_id = get_user_id()
    conn = psycopg2.connect(DATABASE_URL, sslmode='require')
    c = conn.cursor()
    c.execute("SELECT email FROM users WHERE user_id = %s", (user_id,))
    email = c.fetchone()[0]
    conn.close()
    
    return render_template('settings.html', username=session['username'], email=email)

@app.route('/settings/changeusername', methods=['POST'])
def changeusername():
    if 'username' not in session:
        return abort(403)
    
    user_id = get_user_id()
    form_data = request.form
    if not form_data['username']:
        return "error+Fehler+Bitte gib einen Benutzernamen ein."
    
    conn = psycopg2.connect(DATABASE_URL, sslmode='require')
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE username = %s", (form_data['username'],))
    user = c.fetchone()
    if user:
        return "error+Fehler+Der Benutzername ist bereits vergeben. Bitte wähle einen anderen Benutzernamen."
    
    c.execute("UPDATE users SET username = %s WHERE user_id = %s", (form_data['username'], user_id))
    conn.commit()
    conn.close()
    session['username'] = form_data['username']
    return "success+Benutzername geändert+Dein Benutzername wurde erfolgreich geändert"

@app.route('/settings/changeemail', methods=['POST'])
def changeemail():
    if 'username' not in session:
        return abort(403)
    
    user_id = get_user_id()
    form_data = request.form
    if not form_data['email']:
        return "error+Fehler+Bitte gib eine Email-Adresse ein."
    
    conn = psycopg2.connect(DATABASE_URL, sslmode='require')
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE email = %s", (form_data['email'],))
    email = c.fetchone()
    if email:
        return "error+Fehler+Die Email-Adresse ist bereits vergeben. Bitte wähle eine andere Email-Adresse."
    
    c.execute("UPDATE users SET email = %s WHERE user_id = %s", (form_data['email'], user_id))
    conn.commit()
    conn.close()
    return "success+Email-Adresse geändert+Deine Email-Adresse wurde erfolgreich geändert"

@app.route('/settings/changepassword', methods=['POST'])
def changepassword():
    if 'username' not in session:
        return abort(403)
    
    user_id = get_user_id()
    form_data = request.form
    if not form_data['old_password'] or not form_data['new_password']:
        return "error+Fehler+Bitte fülle alle Felder aus."
    
    conn = psycopg2.connect(DATABASE_URL, sslmode='require')
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE user_id = %s", (user_id,))
    user = c.fetchone()
    if not check_password_hash(user[3], form_data['old_password']):
        return "error+Fehler+Dein altes Passwort ist falsch. Bitte versuche es erneut."
    
    hashed_password = generate_password_hash(form_data['new_password'], method='pbkdf2:sha256')
    c.execute("UPDATE users SET password = %s WHERE user_id = %s", (hashed_password, user_id))
    conn.commit()
    conn.close()
    return "success+Passwort geändert+Dein Passwort wurde erfolgreich geändert"

@app.route('/settings/deleteuserdata', methods=['POST'])
def deleteuserdata():
    if 'username' not in session:
        return abort(403)
    
    user_id = get_user_id()
    form_data = request.form
    if not form_data['password']:
        return "error+Fehler+Bitte gib dein Passwort ein."

    if not check_password(user_id, form_data['password']):
        return "error+Fehler+Dein Passwort ist falsch. Bitte versuche es erneut."
    
    conn = psycopg2.connect(DATABASE_URL, sslmode='require')
    c = conn.cursor()
    c.execute("DELETE FROM scrape_data WHERE user_id = %s", (user_id,))
    c.execute("UPDATE users SET entered_scrape_data = 0 WHERE user_id = %s", (user_id,))

    c.execute("DELETE FROM timetable WHERE user_id = %s", (user_id,))
    
    c.execute("DELETE FROM repplan WHERE user_id = %s", (user_id,))

    c.execute("DELETE FROM homework WHERE user_id = %s", (user_id,))
    conn.commit()
    conn.close()

    return "success+Daten gelöscht+Deine Daten wurden erfolgreich gelöscht"

@app.route('/settings/deleteaccount', methods=['POST'])
def deleteaccount():
    if 'username' not in session:
        return abort(403)
    
    user_id = get_user_id()
    form_data = request.form
    if not form_data['password']:
        return "error+Fehler+Bitte gib dein Passwort ein."

    if not check_password(user_id, form_data['password']):
        return "error+Fehler+Dein Passwort ist falsch. Bitte versuche es erneut."
    
    conn = psycopg2.connect(DATABASE_URL, sslmode='require')
    c = conn.cursor()
    c.execute("DELETE FROM users WHERE user_id = %s", (user_id,))
    c.execute("DELETE FROM scrape_data WHERE user_id = %s", (user_id,))

    c.execute("DELETE FROM timetable WHERE user_id = %s", (user_id,))

    c.execute("DELETE FROM repplan WHERE user_id = %s", (user_id,))
    conn.commit()
    conn.close()

    session.pop('username', None)
    return "success+Account gelöscht+Dein Account wurde erfolgreich gelöscht"

@app.route('/sendscrapedata', methods=['POST'])
def sendscrapedata():
    login_url = request.form['login_url']
    username = request.form['username']
    password = request.form['password']
    user_password = request.form['user_password']
    user_id = get_user_id()
    if not login_url or not username or not password or not user_password:
        return abort(403)
    if not check_password(user_id, user_password):
        return "error+Fehler+Dein Passwort ist falsch. Bitte versuche es erneut."
    
    # login url: https://login.schulportal.hessen.de/?i=5202
    schoolid = login_url.split('=')[-1]

    # Encrypt the password for the school website using the user's password
    password_hash = encrypt_password(user_password, password)
    
    # Run the scrapettplan.py script
    message1 = subprocess.run([sys.executable, 'scrapetimetable.py', session['username'], user_id, user_password, login_url, schoolid, username, password_hash], capture_output=True, text=True)
    fullmessage1 = message1.stderr
    type1 = fullmessage1.split("+")[0]
    
    # Run the scraperepplan.py script
    message2 = subprocess.run([sys.executable, 'scraperepplan.py', session['username'], user_id, user_password, login_url, schoolid, username, password_hash], capture_output=True, text=True)
    fullmessage2 = message2.stderr
    type2 = fullmessage2.split("+")[0]

    # Check if an error occurred
    # Errors on repplan may occur if the user has no repplan data
    if type1 == "error":
        return "error+Fehler+Ein Fehler ist aufgetreten. Bitte überprüfen Sie Ihre Anmeldeinformationen."
    
    # Store the scrape data in the database if no error occurred
    store_scrape_data(user_id, login_url, schoolid, username, password_hash)
    
    # Return a success message -> "type+title+message"
    return "success+Erfolg+Alle Daten vom Schulportal erfolgreich abgerufen"

@app.route('/scrapett', methods=['POST'])
def scrapett():
    user_id = get_user_id()
    user_password = request.form['passwort_input']
    if not user_password:
        return abort(403)
    
    if not check_password(user_id, user_password):
        return "error+Fehler+Dein Passwort ist falsch. Bitte versuche es erneut."

    # Run the scrapettplan.py script
    message = subprocess.run([sys.executable, 'scrapetimetable.py', session['username'], user_id, user_password], capture_output=True, text=True)
    fullmessage = message.stderr
    return fullmessage

@app.route('/scraperep', methods=['POST'])
def scraperep():
    user_id = get_user_id()
    user_password = request.form['passwort_input']
    if not user_password:
        return abort(403)
    
    if not check_password(user_id, user_password):
        return "error+Fehler+Dein Passwort ist falsch. Bitte versuche es erneut."
    
    # Run the scraperepplan.py script
    message = subprocess.run([sys.executable, 'scraperepplan.py', session['username'], user_id, user_password], capture_output=True, text=True)
    fullmessage = message.stderr
    return  fullmessage

@app.route('/gettt', methods=['GET'])
def gettt():
    user_id = get_user_id()
    timetable_data = get_timetable_data(user_id)
    grouped_data = sort_timetable_data(timetable_data)
    return jsonify(grouped_data)

@app.route('/getrp', methods=['GET'])
def getrp():
    user_id = get_user_id()
    repplan_data = get_repplan_data(user_id)
    repplan_data = [entry[1:] for entry in repplan_data]
    return jsonify(repplan_data)

@app.route('/gethw', methods=['GET'])
def gethw():
    user_id = get_user_id()
    homework_data = get_homework_data(user_id)
    homework_data = change_homework_data(homework_data)
    return homework_data

@app.route('/getoldhw', methods=['GET'])
def getoldhw():
    user_id = get_user_id()
    conn = psycopg2.connect(DATABASE_URL, sslmode='require')
    c = conn.cursor()
    today = datetime.date.today()
    c.execute("SELECT * FROM homework WHERE due_date < %s AND user_id = %s", (today, user_id))
    homework_data = c.fetchall()
    conn.close()
    homework_data = change_homework_data(homework_data)
    return homework_data

@app.route('/newhw', methods=['POST'])
def newhw():
    form_data = request.form
    if form_data:
        if not form_data['class'] or not form_data['homework_task'] or not form_data['work_amount'] or not form_data['due_date']:
            return abort(403)
        user_id = get_user_id()
        conn = psycopg2.connect(DATABASE_URL, sslmode='require')
        c = conn.cursor()
        c.execute("INSERT INTO homework (user_id, class, homework_task, work_amount, due_date) VALUES (%s, %s, %s, %s, %s)", (user_id, form_data['class'], form_data['homework_task'], form_data['work_amount'], form_data['due_date']))
        conn.commit()
        conn.close()
    return "success+Hausaufgabe hinzugefügt+Die Hausaufgabe wurde erfolgreich hinzugefügt"

@app.route('/donehw', methods=['POST'])
def donehw():
    form_data = request.form
    if form_data:
        if not form_data['id']:
            return abort(403)
        user_id = get_user_id()
        conn = psycopg2.connect(DATABASE_URL, sslmode='require')
        c = conn.cursor()
        c.execute("UPDATE homework SET done = 1 WHERE id = %s AND user_id = %s", (form_data['id'], user_id))
        conn.commit()
        conn.close()
    return "success+Hausaufgabe erledigt+Die Hausaufgabe wurde als erledigt markiert"

@app.route('/undonehw', methods=['POST'])
def undonehw():
    form_data = request.form
    if form_data:
        if not form_data['id']:
            return abort(403)
        user_id = get_user_id()
        conn = psycopg2.connect(DATABASE_URL, sslmode='require')
        c = conn.cursor()
        c.execute("UPDATE homework SET done = 0 WHERE id = %s AND user_id = %s", (form_data['id'], user_id))
        conn.commit()
        conn.close()
    return "success+Hausaufgabe nicht erledigt+Die Hausaufgabe wurde als nicht erledigt markiert"

@app.route('/edithw', methods=['POST'])
def edithw():
    form_data = request.form
    if form_data:
        if not form_data['class'] or not form_data['homework_task'] or not form_data['work_amount'] or not form_data['due_date']:
            return abort(403)
        user_id = get_user_id()
        conn = psycopg2.connect(DATABASE_URL, sslmode='require')
        c = conn.cursor()
        c.execute("UPDATE homework SET user_id = %s, class = %s, homework_task = %s, work_amount = %s, due_date = %s WHERE id = %s", (user_id, form_data['class'], form_data['homework_task'], form_data['work_amount'], form_data['due_date'], form_data['id']))
        conn.commit()
        conn.close()
    return "success+Hausaufgabe bearbeitet+Die Hausaufgabe wurde erfolgreich bearbeitet"

@app.route('/deletehw', methods=['POST'])
def deletehw():
    form_data = request.form
    if form_data:
        if not form_data['id']:
            return abort(403)
        user_id = get_user_id()
        conn = psycopg2.connect(DATABASE_URL, sslmode='require')
        c = conn.cursor()
        c.execute("DELETE FROM homework WHERE id = %s AND user_id = %s", (form_data['id'], user_id))
        conn.commit()
        conn.close()
    return "success+Hausaufgabe gelöscht+Die Hausaufgabe wurde erfolgreich gelöscht"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)