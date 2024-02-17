from flask import Flask, render_template, request, redirect, url_for
import sqlite3
from itertools import groupby
from operator import itemgetter

app = Flask(__name__)

# Function to retrieve timetable data from the database
def get_timetable_data():
    conn = sqlite3.connect('timetable.db')
    c = conn.cursor()
    c.execute("SELECT * FROM timetable")
    timetable_data = c.fetchall()
    conn.close()
    return timetable_data

# Route for the homepage
@app.route('/')
def index():
    timetable_data = get_timetable_data()

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
    username = "Fremder"
    # Render the index.html template -> templates/index.html; with the grouped_data
    return render_template('index.html', timetable_data=grouped_data, classes_data=classes_data , username=username)

@app.route('/homework', methods=['POST'])
def homework():
    form_data = request.form
    print(form_data)

    return "Homework added"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)