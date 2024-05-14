import os
import psycopg2

DATABASE_URL = os.environ.get('DATABASE_URL')

def create_tables():
    conn = psycopg2.connect(DATABASE_URL, sslmode='require')
    c = conn.cursor()

    c.execute("""
CREATE TABLE "users" (
	"user_id"	TEXT,
	"username"	TEXT,
	"email"	TEXT,
	"password"	TEXT,
	"entered_scrape_data"	INTEGER,
	PRIMARY KEY("user_id")
)
""")
    
    c.execute("""
CREATE TABLE "scrape_data" (
	"user_id"	TEXT,
	"login_url"	TEXT,
	"schoolid"	INTEGER,
	"username"	TEXT,
	"password"	TEXT,
	PRIMARY KEY("user_id")
)
""")
    
    c.execute("""
    CREATE TABLE "homework" (
        "user_id"	TEXT,
        "id"	SERIAL,
        "class"	TEXT,
        "homework_task"	TEXT,
        "work_amount"	INTEGER,
        "due_date"	TEXT,
        "done"	INTEGER DEFAULT 0,
        PRIMARY KEY("id")
    )
    """)
    
    c.execute("""
CREATE TABLE "repplan" (
	"user_id"	TEXT,
	"id"	SERIAL,
	"date"	TEXT,
	"hour"	INTEGER,
	"class"	TEXT,
	"substitute"	TEXT,
	"teacher"	TEXT,
	"subject"	TEXT,
	"room"	TEXT,
	"info"	TEXT,
	PRIMARY KEY("id")
)
""")
    
    c.execute("CREATE TABLE timetable (user_id TEXT, class_day TEXT, class_num INTEGER, class_time TEXT, class_name TEXT, class_loc TEXT, class_tea TEXT, date TEXT)")
    
    c.execute("CREATE TABLE IF NOT EXISTS timetable_breaks (user_id TEXT, break_name TEXT, break_start TEXT, break_end TEXT)")
    
    conn.commit()
    conn.close()

if __name__ == '__main__':
    create_tables()
