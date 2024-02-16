// Author: Kaanhehe
// used to toggle the darkmode with the nice slider in the top right
var mode = "bright";
function toggleMode() {
    var body = document.getElementsByTagName('body')[0];
    var modeToggle = document.getElementById("darkmode-toggle");
    var brightbg = document.getElementsByClassName("brightbg")[0];
    var darkbg = document.getElementsByClassName("darkbg")[0];
    if (mode === "bright") {
        mode = "dark";
        darkbg.style.display = "block";
        brightbg.style.display = "none";
    } else {
        mode = "bright";
        darkbg.style.display = "none";
        brightbg.style.display = "block";
    }
}

// Used to add the Mittagspause in the timetable at 7th period
function sortTable(tableId) {
    var table, rows, switching, i, x, y, shouldSwitch;
    table = document.getElementById(tableId);
    switching = true;
    while (switching) {
        switching = false;
        rows = table.getElementsByTagName("tr");
        for (i = 1; i < (rows.length - 1); i++) {
            shouldSwitch = false;
            x = rows[i].getElementsByTagName("td")[0];
            y = rows[i + 1].getElementsByTagName("td")[0];
            if (parseInt(x.innerHTML) > parseInt(y.innerHTML)) {
                shouldSwitch = true;
                break;
            }
        }
        if (shouldSwitch) {
            rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
            switching = true;
        }
    }
    var content = document.getElementsByClassName("content")[0];
    var height = document.getElementById("timetable").offsetHeight;
    height = height + 40;
    content.style.height = height + "px";
}

// Change the active class in the navbar to the clicked one
function changeActiveClass(event) {
    var navbar = document.getElementsByClassName("navbar")[0];
    var current = navbar.getElementsByClassName("active");
    var content = document.getElementsByClassName("content")[0];
    current[0].classList.remove("active");
    event.target.className += " active";
    if (event.target.id === "timetable-link") {
        content.style.height = "500px";
        setTimeout(function() {
            content.style.height = "auto";
            setTimeout(function() {
                var height = document.getElementById("timetable").offsetHeight;
                height = height + 40;
                content.style.height = height + "px";
            }, 10);
        }, 300);
        setTimeout(function() {
            document.getElementById("timetable").style.display = "block";
            setTimeout(function() {
                document.getElementById("timetable").classList.add("visible");
            }, 10);
        }, 200);
    } else {
        document.getElementById("timetable").style.display = "none";
            document.getElementById("timetable").classList.remove("visible");
    }
    if (event.target.id === "homework-link") {
        content.style.height = "200px";
        setTimeout(function() {
            content.style.height = "auto";
            setTimeout(function() {
                var height = document.getElementById("homework").offsetHeight;
                height = height + 40;
                content.style.height = height + "px";
            }, 10);
        }, 300);
        setTimeout(function() {
            document.getElementById("homework").style.display = "block";
            setTimeout(function() {
                document.getElementById("homework").classList.add("visible");
                color_classes();
            }, 10);
        }, 100);
    } else {
        document.getElementById("homework").style.display = "none";
        document.getElementById("homework").classList.remove("visible");
    }
}

// Opens the form to add a new homework
function displayhwform() {
    var form = document.getElementsByClassName("newhwwin")[0];
    if (form.style.display === "none" || form.style.display === "") {
        form.style.display = "block";
        form.style.opacity = "1";
        sortClassesByColor();
    } else {
        form.style.opacity = "0";
        setTimeout(function() {
            form.style.display = "none";
        }, 500);
    }
}

// Closes the form to add a new homework with the close button in the top right
function closehwform() {
    var form = document.getElementsByClassName("newhwwin")[0];
    form.style.opacity = "0";
    setTimeout(function() {
        form.style.display = "none";
    }, 500);
}

// Color the classes in the homework form -> select class !!! NOT USED FOR SORTING ANYMORE !!!
function get_class_color (class_name) {
    var colors = {
            'Mathematik': '#6495ED',
            'Deutsch': '#D04848',
            'Englisch': '#EEC759',
            'Biologie': '#99BC85',
            'Geschichte': '#F57D1F',
            'Geographie': '#808080',
            'Physik': '#7BD3EA',
            'Chemie': '#FF00FF',
            'Informatik': '#A52A2A',
            'Sport': '#AAD7D9',
            'Musik': '#00FFFF',
            'Kunst': '#C23373',
            'Ethik': '#A9A9A9',
            'Religion': '#FBF9F1',
            'PoWi': '#FF90BC',
            'Spanisch': '#9BCF53',
        };
    return colors[class_name];
}

// Order of the classes in the homework form
function get_class_order (class_name) {
    var order = {
            'Mathematik': 12,
            'Deutsch': 5,
            'Englisch': 7,
            'Biologie': 8,
            'Geschichte': 6,
            'Geographie': 3,
            'Physik': 11,
            'Chemie': 13,
            'Informatik': 4,
            'Sport': 10,
            'Musik': 9,
            'Kunst': 14,
            'Ethik': 2,
            'Religion': 1,
            'PoWi': 15,
            'Spanisch': 8.5,
        };
    return order[class_name];
}

// Convert RGB to HSL for sorting the classes in the homework form !!! NOT USED ANYMORE !!!
function rgbToHsl(rgb) {
    var r = parseInt(rgb.slice(1, 3), 16) / 255;
    var g = parseInt(rgb.slice(3, 5), 16) / 255;
    var b = parseInt(rgb.slice(5, 7), 16) / 255;

    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if(max == min){
        h = s = 0;
    } else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max){
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return [h, s, l];
}

// Sort the classes in the homework form by color so it looks nice :)
function sortClassesByColor() {
    var selectElement = document.getElementById('class');
    var classes = Array.from(selectElement.options);

    classes.sort(function(a, b) {
        if (a.text === 'Wähle ein Fach' || b.text === 'Wähle ein Fach') {
            return 999;
        }
        //var hslA = rgbToHsl(get_class_color(a.text)); Didnt work so well so using manual order for now
        //var hslB = rgbToHsl(get_class_color(b.text));
        //return hslA[0] - hslB[0];
        return get_class_order(a.text) - get_class_order(b.text);
    });

    classes.forEach(function(option) {
        selectElement.appendChild(option);
    });
}

// Color the classes in the homework overview
function color_classes(){
    var elements = document.getElementsByClassName('class-option');
    for (var i = 0; i < elements.length; i++) {
        var classElement = elements[i];
        var className = classElement.textContent || classElement.innerText;
        classElement.style.backgroundColor = get_class_color(className);
    }
};

// Show the timetable in the homework form for better orientation
var showingtimetable = false;
function showtimetableinform() {
    var form = document.getElementsByClassName("newhwwin-content")[0];
    var timetable = document.getElementsByClassName("mini-timetable")[0];
    if (showingtimetable) {
        timetable.classList.remove("visible");
        setTimeout(function() {
            form.style.width = "24%";
            form.style.height = "60%";
        }, 250);
        showingtimetable = false;
    } else {
        form.style.width = "81.3%";
        form.style.height = "61%";
        setTimeout(function() {
            timetable.classList.add("visible");
        }, 100);
        showingtimetable = true;
    }
}

function classLabels(subject) {
    labels = {
        'Englisch' : 'E1',
        'Deutsch' : 'D',
        'Mathe' : 'M',
        'Biologie' : 'BIO',
        'Geographie' : 'GEO',
        'Geschichte' : 'G',
        'Physik' : 'PH',
        'Chemie' : 'CH',
        'Informatik' : 'WU-INFO01',
        'Sport' : 'SPO',
        'Musik' : 'MU',
        'Kunst' : 'KU',
        'Ethik' : 'ETHI01',
        'Religion' : 'REL',
        'PoWi' : 'POWI',
        'Spanisch' : 'SP2-02',
    }
    return labels[subject];
}

function cleanMarkedCells() {
    var timetable = document.getElementsByClassName("mini-timetable")[0];
    var cells = timetable.getElementsByClassName("marked");
    while (cells.length > 0) {
        cells[0].classList.remove("marked");
    }
}

function checkColumnsMatch(timetable, subject, day) {
    var rows = timetable.rows;
    for (var i = 0; i < rows.length; i++) {
       var cell = rows[i].cells[day + 1];
       if (!cell) {
          continue;
       }
       if (cell.innerText.split(' ')[0] === subject) {
          return cell;
       }
    }
    return false;
 }

 function ColorAllColumns(day) {
    var timetable = document.getElementsByClassName("mini-timetable")[0];
    var rows = timetable.rows;
    for (var i = 0; i < rows.length; i++) {
       var cell = rows[i].cells[day + 1];
    if (!cell || cell.colSpan > 2) { // Skip the first cell and the cells with colspan > 2 (Mittagspause)
          continue;
       }
       cell.classList.add("marked");
    }
 }

function markintimetable() {
    // Clean up the timetable from previous marks
    cleanMarkedCells();
    var timetable = document.getElementsByClassName("mini-timetable")[0];
    var date = document.getElementById("due_date").value;
    if (date === "") {
        return;
    }
    var day = new Date(date).getDay();
    // If the day is Saturday or Sunday, do not mark anything
    if (day === 6 || day === 0) {
        return;
    }
    var subject = document.getElementById("class").value;
    // If no subject is selected, mark all cells of the day
    if (subject === "") {
        ColorAllColumns(day);
        return;
    }
    // Convert subject from "Fach" to the label used in the timetable
    var subject = classLabels(subject);
    var cell = checkColumnsMatch(timetable, subject, day);
    // If no cell on that day has the subject, mark all cells of the day
    if (!cell) {
        ColorAllColumns(day);
        return;
    }
    // Mark the cell with the subject
    cell.classList.add("marked");
}