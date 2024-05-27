from flask import Flask, render_template, request, redirect, url_for, session, jsonify, abort
from flask_cors import CORS
import os
import sys
import psycopg2
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from hashlib import sha256
import base64
from itertools import groupby
from operator import itemgetter
import datetime
import subprocess
from werkzeug.security import generate_password_hash, check_password_hash
import uuid
import json

app = Flask(__name__)
CORS(app)
app.secret_key = os.environ.get('Flask_secret_key')
DATABASE_URL = os.environ.get('DATABASE_URL')
DEBUG_MODE = os.environ.get('DEBUG_MODE', False)

#subprocess.run(['python', 'D:\ME\Privat\Projekte\Python\school-manager\createTables.py'])

# Function to connect to the database
def connect_to_db() -> tuple[psycopg2.extensions.connection, psycopg2.extensions.cursor]:
    conn = psycopg2.connect(DATABASE_URL, sslmode='require')
    c = conn.cursor()
    return conn, c

# Functions to get the data from the database
# Function to retrieve timetable data from the database
def get_timetable_data(user_id) -> list[tuple]:
    conn, c = connect_to_db()
    # Select all data from the table called user_id
    c.execute("SELECT * FROM timetable WHERE user_id = %s", (user_id,))
    timetable_data = c.fetchall()
    conn.close()
    return timetable_data

def get_lesson_hours(user_id, connect_times) -> list:
    conn, c = connect_to_db()
    c.execute("SELECT * FROM timetable_times WHERE user_id = %s", (user_id,))
    hours_data = c.fetchall()
    conn.close()
    # Remove user_id from the data
    hours_data = [entry[1:] for entry in hours_data]
    hours_data = sorted(hours_data, key=lambda x: x[0])
    # Only connect the times if connect_times is True
    if not connect_times:
        return hours_data
    # Merge the entry 2 and 3 of the hours_data list to a string "class_start - class_end" and add the class_num infront of it
    hours_data = [(entry[0], entry[1] + " - " + entry[2]) for entry in hours_data]
    return hours_data

def get_breaks_data(user_id, connect_times) -> list:
    conn, c = connect_to_db()
    c.execute("SELECT * FROM timetable_breaks WHERE user_id = %s", (user_id,))
    breaks_data = c.fetchall()
    conn.close()
    breaks_data = [entry[1:] for entry in breaks_data]
    breaks_data = sorted(breaks_data, key=lambda x: x[0])
    # Only connect the times if connect_times is True
    if not connect_times:
        return breaks_data
    # Merge the entry 2 and 3 of the breaks_data list to a string "break_start - break_end" and add the break_name infront of it
    breaks_data = [(entry[0], entry[1] + " - " + entry[2]) for entry in breaks_data]
    return breaks_data

def get_classes_data(user_id) -> list:
    conn, c = connect_to_db()
    c.execute("SELECT * FROM timetable_classes WHERE user_id = %s", (user_id,))
    classes_data = c.fetchall()
    conn.close()
    classes_data = [entry[1:] for entry in classes_data]
    return classes_data

def get_homework_data(user_id) -> list:
    conn, c = connect_to_db()
    today = datetime.date.today().isoformat()
    c.execute("SELECT * FROM homework WHERE due_date >= %s AND user_id = %s", (today, user_id))
    homework_data = c.fetchall()
    conn.close()
    return homework_data

def get_old_homework_data(user_id) -> list:
    conn, c = connect_to_db()
    today = datetime.date.today().isoformat()
    c.execute("SELECT * FROM homework WHERE due_date < %s AND user_id = %s", (today, user_id))
    homework_data = c.fetchall()
    conn.close()
    return homework_data

def get_repplan_data(user_id) -> list:
    def convert_date(date_str):
        # Convert date from DD.MM.YYYY to YYYY-MM-DD
        return datetime.datetime.strptime(date_str, '%d.%m.%Y').strftime('%Y-%m-%d')

    conn, c = connect_to_db()
    c.execute("CREATE OR REPLACE FUNCTION convert_date(date_str text) RETURNS date AS $$ \
                BEGIN \
                    RETURN TO_DATE(date_str, 'DD.MM.YYYY'); \
                END; \
                $$ LANGUAGE plpgsql;")
    today = datetime.date.today().isoformat()
    c.execute("SELECT * FROM repplan WHERE convert_date(date) >= %s AND user_id = %s", (today, user_id))
    repplan_data = c.fetchall()
    conn.close()
    # Remove user_id from the data
    repplan_data = [entry[1:] for entry in repplan_data]
    # Sort by homework ID in descending order to get the newest data first
    repplan_data.sort(key=lambda x: x[0], reverse=True)
    return repplan_data

def get_old_repplan_data(user_id) -> list:
    def convert_date(date_str):
        # Convert date from DD.MM.YYYY to YYYY-MM-DD
        return datetime.datetime.strptime(date_str, '%d.%m.%Y').strftime('%Y-%m-%d')

    conn, c = connect_to_db()
    c.execute("CREATE OR REPLACE FUNCTION convert_date(date_str text) RETURNS date AS $$ \
                BEGIN \
                    RETURN TO_DATE(date_str, 'DD.MM.YYYY'); \
                END; \
                $$ LANGUAGE plpgsql;")
    today = datetime.date.today().isoformat()
    c.execute("SELECT * FROM repplan WHERE convert_date(date) < %s AND user_id = %s", (today, user_id))
    repplan_data = c.fetchall()
    conn.close()
    # Remove user_id from the data
    repplan_data = [entry[1:] for entry in repplan_data]
    # Sort by homework ID in descending order to get the newest data first
    repplan_data.sort(key=lambda x: x[0], reverse=True)
    return repplan_data

# Functions to save the data in the database
def save_timetable_data(user_id, timetable_data) -> None:
    conn, c = connect_to_db()
    c.execute("DELETE FROM timetable WHERE user_id = %s", (user_id,))
    for sg_timetable in timetable_data:
        if not sg_timetable['day'] or not sg_timetable['hour'] or not sg_timetable['subject'] or not sg_timetable['room'] or not sg_timetable['teacher']:
            return "error+Fehler+Bitte fülle alle Felder aus."
        class_day = sg_timetable['day']
        class_num = sg_timetable['hour']
        class_name = sg_timetable['subject']
        class_room = sg_timetable['room']
        class_teacher = sg_timetable['teacher']
        c.execute("INSERT INTO timetable (user_id, class_day, class_num, class_name, class_loc, class_tea) VALUES (%s, %s, %s, %s, %s, %s)", (user_id, class_day, class_num, class_name, class_room, class_teacher))
    conn.commit()
    conn.close()

def save_lesson_hours(user_id, hours_data) -> None:
    conn, c = connect_to_db()
    c.execute("DELETE FROM timetable_times WHERE user_id = %s", (user_id,))
    for sg_time in hours_data:
        if not sg_time['hour'] or not sg_time['start'] or not sg_time['end']:
            return "error+Fehler+Bitte fülle alle Felder aus."
        lesson_hour = sg_time['hour']
        lesson_start = sg_time['start']
        lesson_end = sg_time['end']
        c.execute("INSERT INTO timetable_times (user_id, lesson_hour, lesson_start, lesson_end) VALUES (%s, %s, %s, %s)", (user_id, lesson_hour, lesson_start, lesson_end))
    conn.commit()
    conn.close()

def save_breaks_data(user_id, breaks_data) -> None:
    conn, c = connect_to_db()
    c.execute("DELETE FROM timetable_breaks WHERE user_id = %s", (user_id,))
    for sg_break in breaks_data:
        if not sg_break['name'] or not sg_break['start'] or not sg_break['end']:
            return "error+Fehler+Bitte fülle alle Felder aus."
        break_name = sg_break['name']
        break_start = sg_break['start']
        break_end = sg_break['end']
        c.execute("INSERT INTO timetable_breaks (user_id, break_name, break_start, break_end) VALUES (%s, %s, %s, %s)", (user_id, break_name, break_start, break_end))
    conn.commit()
    conn.close()

def save_classes_data(user_id, classes_data) -> None:
    conn, c = connect_to_db()
    c.execute("DELETE FROM timetable_classes WHERE user_id = %s", (user_id,))
    for sg_class in classes_data:
        # Check if the class name and color are given
        # Dont check for custom_name because it is optional
        if not sg_class['name'] or not sg_class['color']:
            return "error+Fehler+Bitte fülle alle Felder aus."
        class_name = sg_class['name']
        custom_name = sg_class['custom_name']
        class_color = sg_class['color']
        c.execute("INSERT INTO timetable_classes (user_id, class_name, custom_name, class_color) VALUES (%s, %s, %s, %s)", (user_id, class_name, custom_name, class_color))
    conn.commit()
    conn.close()

# Function to sort the timetable data
def sort_timetable_data(timetable_data) -> list:
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
        # check if there is every weekday in the group
        if len(group) < 5:
            # get the missing weekdays
            missing_days = set(weekday_mapping.keys()) - set([entry[0] for entry in group])
            # add the missing weekdays to the group
            for day in missing_days:
                group.append((day, key, "", "", "", "", ""))
            # Sort the group by weekday
            group.sort(key=lambda x: weekday_mapping[x[0]])
        grouped_data.append(group)

    return grouped_data

# Function to change the homework data
def change_homework_data(homework_data) -> list:
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

# Function to get the user_id from the database
def get_user_id() -> str:
    if 'username' not in session:
        return abort(403)
    conn, c = connect_to_db()
    c.execute("SELECT * FROM users WHERE username = %s", (session['username'],))
    try: 
        user_id = c.fetchone()[0]
    except:
        return None
    conn.close()
    return user_id

# Function to check if the user has entered the scrape data already
def check_entered_scrape_data(user_id) -> bool:
    conn, c = connect_to_db()
    c.execute("SELECT entered_scrape_data FROM users WHERE user_id = %s", (user_id,))
    entered_scrape_data = c.fetchone()[0]
    conn.close()
    return entered_scrape_data

# Function to check if the password is correct
def check_password(user_id, user_password) -> bool:
    conn, c = connect_to_db()
    c.execute("SELECT * FROM users WHERE user_id = %s", (user_id,))
    user = c.fetchone()
    conn.close()
    if not user:
        return False
    if check_password_hash(user[3], user_password):
        return True
    return False

# Function to encrypt the password for the school website
def encrypt_password(user_id, user_password, target_password) -> bytes:
    # Derive a key from the user's password
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt= str(user_id).encode(),
        iterations=100000,
        backend=default_backend()
    )
    key = kdf.derive(user_password.encode())

    # Pad the target password to ensure it's a multiple of 16 bytes
    padder = padding.PKCS7(algorithms.AES.block_size).padder()
    padded_data = padder.update(target_password.encode()) + padder.finalize()

    # Encrypt the padded target password
    iv = sha256(str(user_id).encode()).digest()[:16]
    cipher = Cipher(algorithms.AES(key), modes.CFB(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    encrypted_data = encryptor.update(padded_data) + encryptor.finalize()

    # Encode the encrypted data as base64 for storage
    return base64.b64encode(encrypted_data)

# Function to store the scrape data in the database
def store_scrape_data(user_id, login_url, schoolid, username, password) -> None:
    conn, c = connect_to_db()

    # Decode the password
    password = password.decode()
    # Store the scrape data in the database
    if not check_entered_scrape_data(user_id):
        c.execute("INSERT INTO scrape_data (user_id, login_url, schoolid, username, password) VALUES (%s, %s, %s, %s, %s)", (user_id, login_url, schoolid, username, password))
        # Update the entered_scrape_data column in the users table
        c.execute("UPDATE users SET entered_scrape_data = 1 WHERE user_id = %s", (user_id,))
    else:
        c.execute("UPDATE scrape_data SET login_url = %s, schoolid = %s, username = %s, password = %s WHERE user_id = %s", (login_url, schoolid, username, password, user_id))

    conn.commit()
    conn.close()

# Function to delete the user data from the database
def delete_user_data(user_id) -> None:
    conn, c = connect_to_db()
    c.execute("DELETE FROM scrape_data WHERE user_id = %s", (user_id,))
    c.execute("UPDATE users SET entered_scrape_data = 0 WHERE user_id = %s", (user_id,))
    c.execute("DELETE FROM timetable WHERE user_id = %s", (user_id,))
    c.execute("DELETE FROM repplan WHERE user_id = %s", (user_id,))
    c.execute("DELETE FROM homework WHERE user_id = %s", (user_id,))
    c.execute("DELETE FROM timetable_times WHERE user_id = %s", (user_id,))
    c.execute("DELETE FROM timetable_breaks WHERE user_id = %s", (user_id,))
    c.execute("DELETE FROM timetable_classes WHERE user_id = %s", (user_id,))
    conn.commit()
    conn.close()

# Function to delete the user account from the database
def delete_user_account(user_id) -> None:
    conn, c = connect_to_db()
    c.execute("DELETE FROM users WHERE user_id = %s", (user_id,))
    conn.commit()
    conn.close()

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        form_data = request.form
        conn, c = connect_to_db()
        # check if username or email is already in use
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
        conn, c = connect_to_db()

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

@app.route('/welcome', methods=['GET'])
def welcome():
    return render_template('welcome.html')

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
        return redirect(url_for('welcome'))
    
    user_id = get_user_id()
    # It is possible that the user_id got changed, so we have to check if the user_id that we got is valid in the database
    if not user_id or user_id is None:
        session.pop('username', None)
        return redirect(url_for('welcome'))
    
    timetable_data = get_timetable_data(user_id)
    # returns groups of which every group is 1 row of the timetable
    grouped_data = sort_timetable_data(timetable_data)
    
    hours_data = get_lesson_hours(user_id)
    
    breaks_data = get_breaks_data(user_id)
    
    classes_data = get_classes_data(user_id)

    homework_data = get_homework_data(user_id)
    homework_data = change_homework_data(homework_data)
    
    repplan_data = get_repplan_data(user_id)
    
    # Render the index.html template -> templates/index.html; with the grouped_data
    return render_template('index.html', timetable_data=grouped_data, hours_data=hours_data, breaks_data=breaks_data, classes_data=classes_data, homework_data=homework_data, repplan_data=repplan_data, username=username)

@app.route('/settings', methods=['GET'])
def settings():
    if 'username' not in session:
        return redirect(url_for('welcome'))
    
    user_id = get_user_id()
    conn = psycopg2.connect(DATABASE_URL, sslmode='require')
    c = conn.cursor()
    c.execute("SELECT email FROM users WHERE user_id = %s", (user_id,))
    email = c.fetchone()[0]
    conn.close()
    breaks = get_breaks_data(user_id, False)
    
    times = get_lesson_hours(user_id, False)
    
    classes = get_classes_data(user_id)

    timetable_data = get_timetable_data(user_id)
    grouped_data = sort_timetable_data(timetable_data)
    
    # Sort the breaks by name and the times by hour
    breaks.sort(key=lambda x: x[1])
    times.sort(key=lambda x: x[1])
    return render_template('settings.html', username=session['username'], email=email, breaks=breaks, times=times, classes=classes, timetable_data=grouped_data)

@app.route('/settings/changeusername', methods=['POST'])
def changeusername():
    if 'username' not in session:
        return abort(403)
    
    user_id = get_user_id()
    form_data = request.form
    if not form_data['username']:
        return "error+Fehler+Bitte gib einen Benutzernamen ein."
    
    conn, c = connect_to_db()
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
    
    conn, c = connect_to_db()
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
    
    conn, c = connect_to_db()
    c.execute("SELECT * FROM users WHERE user_id = %s", (user_id,))
    user = c.fetchone()
    if not check_password_hash(user[3], form_data['old_password']):
        return "error+Fehler+Dein altes Passwort ist falsch. Bitte versuche es erneut."
    
    hashed_password = generate_password_hash(form_data['new_password'], method='pbkdf2:sha256')
    c.execute("UPDATE users SET password = %s WHERE user_id = %s", (hashed_password, user_id))
    c.execute("DELETE FROM scrape_data WHERE user_id = %s", (user_id,))
    c.execute("UPDATE users SET entered_scrape_data = 0 WHERE user_id = %s", (user_id,))
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
    
    conn, c = connect_to_db()
    if 'login-data' in form_data:
        c.execute("DELETE FROM scrape_data WHERE user_id = %s", (user_id,))
        c.execute("UPDATE users SET entered_scrape_data = 0 WHERE user_id = %s", (user_id,))
    if 'timetable' in form_data:
        c.execute("DELETE FROM timetable WHERE user_id = %s", (user_id,))
    if 'classes' in form_data:
        c.execute("DELETE FROM timetable_classes WHERE user_id = %s", (user_id,))
    if 'breaks' in form_data:
        c.execute("DELETE FROM timetable_breaks WHERE user_id = %s", (user_id,))
    if 'times' in form_data:
        c.execute("DELETE FROM timetable_times WHERE user_id = %s", (user_id,))
    if 'homework' in form_data:
        c.execute("DELETE FROM homework WHERE user_id = %s", (user_id,))
    if 'repplan' in form_data:
        c.execute("DELETE FROM repplan WHERE user_id = %s", (user_id,))

    conn.commit()
    conn.close()

    return "success+Daten gelöscht+Deine ausgewählten Daten wurden erfolgreich gelöscht"

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
    
    delete_user_account(user_id)
    delete_user_data(user_id)

    session.pop('username', None)
    return "success+Account gelöscht+Dein Account wurde erfolgreich gelöscht"

@app.route('/settings/saveclasses', methods=['POST'])
def saveclasses():
    if 'username' not in session:
        return abort(403)
    
    user_id = get_user_id()
    form_data = request.form
    if not form_data['classes']:
        return "error+Fehler+Bitte gib die Klassen ein."
    
    classes = json.loads(form_data['classes'])
    save_classes_data(user_id, classes)
    return "success+Klassen gespeichert+Die Klassen wurden erfolgreich gespeichert"

@app.route('/settings/savebreaks', methods=['POST'])
def savebreaks():
    if 'username' not in session:
        return abort(403)
    
    user_id = get_user_id()
    form_data = request.form
    if not form_data['breaks']:
        return "error+Fehler+Bitte gib die Pausen ein."
    breaks = json.loads(form_data['breaks'])
    save_breaks_data(user_id, breaks)
    return "success+Pausen gespeichert+Die Pausen wurden erfolgreich gespeichert"

@app.route('/settings/savetimes', methods=['POST'])
def savetimes():
    if 'username' not in session:
        return abort(403)
    
    user_id = get_user_id()
    form_data = request.form
    if not form_data['times']:
        return "error+Fehler+Bitte gib die Zeiten ein."
    
    times = json.loads(form_data['times'])
    save_lesson_hours(user_id, times)
    return "success+Zeiten gespeichert+Die Zeiten wurden erfolgreich gespeichert"

@app.route('/settings/savetimetable', methods=['POST'])
def savetimetable():
    if 'username' not in session:
        return abort(403)
    
    user_id = get_user_id()
    form_data = request.form
    if not form_data['timetable']:
        return "error+Fehler+Bitte gib den Stundenplan ein."
    
    timetable = json.loads(form_data['timetable'])
    save_timetable_data(user_id, timetable)
    return "success+Stundenplan gespeichert+Der Stundenplan wurde erfolgreich gespeichert"

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
    
    # sometimes login_url looks like this: https://login.schulportal.hessen.de/?url=aHR0cHM6Ly9jb25uZWN0LnNjaHVscG9ydGFsLmhlc3Nlbi5kZS8=&skin=sp&i=5202
    # Remove every parameter except the i parameter
    domain = login_url.split('?')[0]
    parameters = login_url.split('?')[1]
    i_parameter = [param for param in parameters.split('&') if param.startswith('i=')][0]

    # Construct the new URL
    new_url = f"{domain}?{i_parameter}"
    login_url = new_url

    # login url: https://login.schulportal.hessen.de/?i=5202
    schoolid = login_url.split('=')[-1]

    # Encrypt the password for the school website using the user's password
    password_hash = encrypt_password(user_id, user_password, password)
    
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
    user_password = request.form['password_input']
    if not user_password:
        return abort(403)
    
    if not check_password(user_id, user_password):
        return "error+Fehler+Dein Passwort ist falsch. Bitte versuche es erneut."

    if not check_entered_scrape_data(user_id):
        return "error+Fehler+Bitte gib zuerst deine Anmeldeinformationen für den Schulportal-Login an. -> Einstellungen"

    # Run the scrapettplan.py script
    try:
        message = subprocess.run([sys.executable, 'scrapetimetable.py', session['username'], user_id, user_password], capture_output=True, text=True)
        fullmessage = message.stderr
    except subprocess.CalledProcessError:
        fullmessage = "error+Fehler+Ein Fehler ist aufgetreten beim Abrufen des Stundenplans."
    return fullmessage

@app.route('/scraperep', methods=['POST'])
def scraperep():
    user_id = get_user_id()
    user_password = request.form['password_input']
    if not user_password:
        return abort(403)
    
    if not check_password(user_id, user_password):
        return "error+Fehler+Dein Passwort ist falsch. Bitte versuche es erneut."
    
    if not check_entered_scrape_data(user_id):
        return "error+Fehler+Bitte gib zuerst deine Anmeldeinformationen für den Schulportal-Login an. -> Einstellungen"

    # Run the scraperepplan.py script
    try:
        message = subprocess.run([sys.executable, 'scraperepplan.py', session['username'], user_id, user_password], capture_output=True, text=True)
        fullmessage = message.stderr
    except subprocess.CalledProcessError:
        fullmessage = "error+Fehler+Ein Fehler ist aufgetreten beim Abrufen des Vertretungsplans."
    return fullmessage

@app.route('/gettt', methods=['GET'])
def gettt():
    if request.args.get('user_id'):
        user_id = request.args.get('user_id')
        password = request.args.get('password')
        if not check_password(user_id, password):
            return abort(403)
    else:
        user_id = get_user_id()
    timetable_data = get_timetable_data(user_id)
    grouped_data = sort_timetable_data(timetable_data)
    return jsonify(grouped_data)

@app.route('/gettimes', methods=['GET'])
def gettimes():
    if request.args.get('user_id'):
        user_id = request.args.get('user_id')
        password = request.args.get('password')
        if not check_password(user_id, password):
            return abort(403)
    else:
        user_id = get_user_id()
    times = get_lesson_hours(user_id)
    return jsonify(times)

@app.route('/getbreaks', methods=['GET'])
def getbreaks():
    if request.args.get('user_id'):
        user_id = request.args.get('user_id')
        password = request.args.get('password')
        if not check_password(user_id, password):
            return abort(403)
    else:
        user_id = get_user_id()
    breaks = get_breaks_data(user_id)
    return jsonify(breaks)

@app.route('/getrp', methods=['GET'])
def getrp():
    user_id = get_user_id()
    repplan_data = get_repplan_data(user_id)
    return jsonify(repplan_data)

@app.route('/getoldrp', methods=['GET'])
def getoldrp():
    user_id = get_user_id()
    repplan_data = get_old_repplan_data(user_id)
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
    homework_data = get_old_homework_data(user_id)
    homework_data = change_homework_data(homework_data)
    return homework_data

@app.route('/getclasses', methods=['GET'])
def getclasses():
    user_id = get_user_id()
    classes_data = get_classes_data(user_id)
    return jsonify(classes_data)

@app.route('/newhw', methods=['POST'])
def newhw():
    form_data = request.form
    if form_data:
        if not form_data['class'] or not form_data['homework_task'] or not form_data['work_amount'] or not form_data['due_date']:
            return abort(403)
        user_id = get_user_id()
        conn, c = connect_to_db()
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
        conn, c = connect_to_db()
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
        conn, c = connect_to_db()
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
        conn, c = connect_to_db()
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
        conn, c = connect_to_db()
        c.execute("DELETE FROM homework WHERE id = %s AND user_id = %s", (form_data['id'], user_id))
        conn.commit()
        conn.close()
    return "success+Hausaufgabe gelöscht+Die Hausaufgabe wurde erfolgreich gelöscht"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=DEBUG_MODE)