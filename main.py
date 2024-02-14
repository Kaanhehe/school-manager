from flask import Flask, render_template
import sqlite3

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
    return render_template('index.html', timetable_data=timetable_data)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
