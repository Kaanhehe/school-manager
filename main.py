from flask import Flask, render_template, request, redirect, url_for, session
import os
import sqlite3
from itertools import groupby
from operator import itemgetter
import datetime
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY') or os.urandom(24)

print(os.getenv('SECRET_KEY'))

# Function to retrieve timetable data from the database
def get_timetable_data():
    conn = sqlite3.connect('timetable.db')
    c = conn.cursor()
    c.execute("SELECT * FROM timetable")
    timetable_data = c.fetchall()
    conn.close()
    return timetable_data

def get_homework_data():
    conn = sqlite3.connect('homework.db')
    c = conn.cursor()
    today = datetime.date.today()
    c.execute("SELECT * FROM homework WHERE due_date >= ?", (today,))
    homework_data = c.fetchall()
    conn.close()
    return homework_data

def get_repplan_data():
    def convert_date(date_str):
        # Convert date from DD.MM.YYYY to YYYY-MM-DD
        return datetime.datetime.strptime(date_str, '%d.%m.%Y').strftime('%Y-%m-%d')

    conn = sqlite3.connect('repplan.db')
    conn.create_function('convert_date', 1, convert_date)  # Create custom SQLite function
    c = conn.cursor()
    today = datetime.date.today()
    c.execute("SELECT * FROM repplan WHERE convert_date(date) >= ?", (today,))
    repplan_data = c.fetchall()
    conn.close()
    return repplan_data

def sort_timetable_date(timetable_data):
    # Replace weekdays with numbers
    weekday_mapping = {
        'Montag': 1,
        'Dienstag': 2,
        'Mittwoch': 3,
        'Donnerstag': 4,
        'Freitag': 5
    }
    """
    Convert the timetable_data to a list of tuples and replace the weekdays with numbers
    Sort the timetable_data by class_num and then by class_day and group the data by class_num
    Convert the weekdays back to their original names
    Complicated, but necessary to display the timetable in the correct order
    !!!Did not find a better way to do this!!!
    """
    
    # Convert the timetable_data to a list of tuples and replace the weekdays with numbers
    for i in range(len(timetable_data)):
        timetable_data[i] = list(timetable_data[i])
        timetable_data[i][0] = weekday_mapping.get(timetable_data[i][0], timetable_data[i][0])
        timetable_data[i] = tuple(timetable_data[i])

    # Sort the timetable_data by class_num and then by class_day
    timetable_data.sort(key=itemgetter(1, 0))  # Sort by class_num and then by class_day
    
    # Group the data by class_num
    grouped_data = []
    for key, group in groupby(timetable_data, key=itemgetter(1)): # Group by class_num

        # Convert the weekdays back to their original names so 1 becomes Montag, 2 becomes Dienstag, etc.
        group = list(group)
        for i in range(len(group)):
            group[i] = list(group[i])
            group[i][0] = list(weekday_mapping.keys())[list(weekday_mapping.values()).index(group[i][0])]
            group[i] = tuple(group[i])
        grouped_data.append(group)
    return grouped_data

def change_homework_data(homework_data):
    modified_homework_data = []
    for homework in homework_data:
        homework_list = list(homework)
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
        homework_list[4] = homework_list[4].split("-")
        homework_list[4] = ".".join(homework_list[4][::-1])
        modified_homework_data.append(tuple(homework_list))
        modified_homework_data = sorted(modified_homework_data, key=lambda x: x[4])
    return modified_homework_data

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        form_data = request.form
        conn = sqlite3.connect('users.db')
        c = conn.cursor()
        c.execute("SELECT * FROM users WHERE username = ?", (form_data['username'],))
        user = c.fetchone()
        if user:
            return "User already exists"
        else:
            hashed_password = generate_password_hash(form_data['password'], method='pbkdf2:sha256')
            c.execute("INSERT INTO users (username, password) VALUES (?, ?)", (form_data['username'], hashed_password))
            conn.commit()
            conn.close()
            return redirect(url_for('login'))
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        form_data = request.form
        conn = sqlite3.connect('users.db')
        c = conn.cursor()
        c.execute("SELECT * FROM users WHERE username = ?", (form_data['username'],))
        user = c.fetchone()
        conn.close()
        if user and check_password_hash(user[1], form_data['password']):
            session['username'] = form_data['username']
            return redirect(url_for('index'))
        else:
            return "Login failed"
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
    
    timetable_data = get_timetable_data()
    homework_data = get_homework_data()
    repplan_data = get_repplan_data()
    homework_data = change_homework_data(homework_data)
    

    grouped_data = sort_timetable_date(timetable_data)
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

@app.route('/gethw', methods=['GET'])
def gethw():
    homework_data = get_homework_data()
    homework_data = change_homework_data(homework_data)
    return homework_data

@app.route('/getoldhw', methods=['GET'])
def getoldhw():
    conn = sqlite3.connect('homework.db')
    c = conn.cursor()
    today = datetime.date.today()
    c.execute("SELECT * FROM homework WHERE due_date < ?", (today,))
    homework_data = c.fetchall()
    conn.close()
    homework_data = change_homework_data(homework_data)
    return homework_data

@app.route('/newhw', methods=['POST'])
def newhw():
    form_data = request.form
    print(form_data)
    if form_data:
        conn = sqlite3.connect('homework.db')
        c = conn.cursor()
        c.execute("INSERT INTO homework (class, homework_task, work_amount, due_date) VALUES (?, ?, ?, ?)", (form_data['class'], form_data['homework_task'], form_data['work_amount'], form_data['due_date']))
        conn.commit()
        conn.close()
    return "Homework added"

@app.route('/donehw', methods=['POST'])
def donehw():
    form_data = request.form
    print(form_data)
    if form_data:
        conn = sqlite3.connect('homework.db')
        c = conn.cursor()
        c.execute("UPDATE homework SET done = 1 WHERE id = ?", (form_data['id'],))
        conn.commit()
        conn.close()
    return "Homework done"

@app.route('/undonehw', methods=['POST'])
def undonehw():
    form_data = request.form
    print(form_data)
    if form_data:
        conn = sqlite3.connect('homework.db')
        c = conn.cursor()
        c.execute("UPDATE homework SET done = 0 WHERE id = ?", (form_data['id'],))
        conn.commit()
        conn.close()
    return "Homework undone"

@app.route('/edithw', methods=['POST'])
def edithw():
    form_data = request.form
    print(form_data)
    if form_data:
        conn = sqlite3.connect('homework.db')
        c = conn.cursor()
        c.execute("UPDATE homework SET class = ?, homework_task = ?, work_amount = ?, due_date = ? WHERE id = ?", (form_data['class'], form_data['homework_task'], form_data['work_amount'], form_data['due_date'], form_data['id']))
        conn.commit()
        conn.close()
    return "Homework edited"

@app.route('/deletehw', methods=['POST'])
def deletehw():
    form_data = request.form
    print(form_data)
    if form_data:
        conn = sqlite3.connect('homework.db')
        c = conn.cursor()
        c.execute("DELETE FROM homework WHERE id = ?", (form_data['id'],))
        conn.commit()
        conn.close()
    return "Homework deleted"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)