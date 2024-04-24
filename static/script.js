// Author: Kaanhehe
// used to toggle the darkmode with the nice slider in the top right
var mode = getModeFromCookies() || "bright";
var windowheight = 0;
var windowwidth = 0;
var editinghw = null;

$(document).ready(function(){
    $(".hwform").submit(function(event){
        event.preventDefault();
        // Just get the date if it is not set; Not used right now -> make settings with this as option
        //if (!$(this).find("#due_date").val()) {
        //    autogetDate();
        //}
        if (editinghw) {
            $.ajax({
                type: "POST",
                url: "/edithw",
                data: $(this).serialize() + "&id=" + editinghw.cells[0].innerText,
                success: function(data) {
                    refreshHomeworks();
                    closehwform();
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    // Handle the error
                    console.error(textStatus, errorThrown);
                }
            });
            return;
        }
        $.ajax({
            type: "POST",
            url: "/newhw",
            data: $(this).serialize(),
            success: function(data) {
                refreshHomeworks();
            },
            error: function(jqXHR, textStatus, errorThrown) {
                // Handle the error
                console.error(textStatus, errorThrown);
            }
        });
    });
    setMode(mode);
    sortTable('timetable'); 
    sortTable('mini-timetable');
});

function setMode(mode) {
    var modeToggle = document.getElementById("darkmode-toggle");
    var brightbg = document.getElementsByClassName("brightbg")[0];
    var darkbg = document.getElementsByClassName("darkbg")[0];
    var navbar = document.getElementsByClassName("navbar")[0];
    
    if (mode === "bright") {
        brightbg.classList.add("visible");
        navbar.style.backgroundColor = "rgba(255, 255, 255, 0.6)";
        modeToggle.checked = false;
    } else {
        darkbg.classList.add("visible");
        navbar.style.backgroundColor = "rgba(24, 24, 24, 0.7)";
        modeToggle.checked = true;
    }
}

function toggleMode() {
    var brightbg = document.getElementsByClassName("brightbg")[0];
    var darkbg = document.getElementsByClassName("darkbg")[0];
    var navbar = document.getElementsByClassName("navbar")[0];
    if (mode === "bright") {
        mode = "dark";
        darkbg.classList.add("visible");
        brightbg.classList.remove("visible");
        navbar.style.backgroundColor = "rgba(24, 24, 24, 0.8)";
    } else {
        mode = "bright";
        brightbg.classList.add("visible");
        darkbg.classList.remove("visible");
        navbar.style.backgroundColor = "rgba(255, 255, 255, 0.6)";
    }
    saveModeToCookies(mode);
}

function saveModeToCookies(mode) {
    document.cookie = "mode=" + mode + "; expires=Fri, 31 Dec 9999 23:59:59 GMT";
}

function getModeFromCookies() {
    var name = "mode=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var cookies = decodedCookie.split(';');
    for (var i = 0; i < cookies.length; i++) {
        var cookie = cookies[i];
        while (cookie.charAt(0) === ' ') {
            cookie = cookie.substring(1);
        }
        if (cookie.indexOf(name) === 0) {
            return cookie.substring(name.length, cookie.length);
        }
    }
    return null;
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
}

// Change the active class in the navbar to the clicked one
function changeActiveClass(event) {
    var navbar = document.getElementsByClassName("navbar")[0];
    var current = navbar.getElementsByClassName("active");
    var content = document.getElementsByClassName("content")[0];
    current[0].classList.remove("active");
    event.target.className += " active";
    // If the timetable link is clicked, show the timetable
    if (event.target.id === "timetable-link") {
        document.getElementById("timetable").style.display = "block";
        setTimeout(function() {
            document.getElementById("timetable").classList.add("visible");
        }, 10);
    // else hide the timetable
    } else {
        document.getElementById("timetable").style.display = "none";
            document.getElementById("timetable").classList.remove("visible");
    }
    // If the homework link is clicked, show the homework overview
    if (event.target.id === "homework-link") {
        document.getElementById("homework").style.display = "block";
        setTimeout(function() {
            document.getElementById("homework").classList.add("visible");
            // Color the classes in the homework overview
            color_classes();
        }, 10);
    // else hide the homework overview
    } else {
        document.getElementById("homework").style.display = "none";
        document.getElementById("homework").classList.remove("visible");
    }
}

function refreshHomeworks() {
    $.ajax({
        type: "GET",
        url: "/gethw",
        success: function(data) {
            var tableBody = document.querySelector("#homework-table tbody");
            var rows = eval(data).map(function(rowData) {
                var row = document.createElement("tr");
                rowData.forEach(function(cellData) {
                    var cell = document.createElement("td");
                    cell.textContent = cellData;
                    row.appendChild(cell);
                });
                // Add action buttons to the last cell
                var actionCell = document.createElement("td");
                actionCell.className = "hwactions";
                actionCell.innerHTML = `
                    <button class="hwaction" id="hwdone">✔</button>
                    <button class="hwaction" id="hwedit" onclick="editHomework(event)">✎</button>
                    <button class="hwaction" id="hwdel" onclick="deleteHomework(event)">🗑</button>
                `;
                row.appendChild(actionCell);
                return row.outerHTML;
            });
            tableBody.innerHTML = rows.join("");
            color_classes();
        },
        error: function(jqXHR, textStatus, errorThrown) {
            // Handle the error
            console.error(textStatus, errorThrown);
        }
    });
}

function editHomework(event) {
    var row = event.target.closest("tr");
    var homework = row
    displayEdithwForm(homework);
    editinghw = homework;
}

function deleteHomework(event) {
    var row = event.target.closest("tr");
    var id = row.cells[0].innerText;
    $.ajax({
        type: "POST",
        url: "/deletehw",
        data: "id=" + id,
        success: function(data) {
            refreshHomeworks();
        },
        error: function(jqXHR, textStatus, errorThrown) {
            // Handle the error
            console.error(textStatus, errorThrown);
        }
    });
}

function resetForm() {
    var window = document.getElementsByClassName("newhwwinbg")[0];
    var values = window.getElementsByTagName("input");
    var selects = window.getElementsByTagName("select");
    var formHeader = document.getElementById("hwform-header");
    var submit = window.querySelector('input[type="submit"]');
    submit.value = "Hinzufügen";
    formHeader.innerText = "Neue Hausaufgabe";
    for (var i = 0; i < values.length; i++) {
        if (values[i].type != "submit" && values[i].type != "checkbox") {
            values[i].value = "";
        }
    }
    for (var i = 0; i < selects.length; i++) {
        selects[i].selectedIndex = 0;
    }
    editinghw = null;
}

function getworkamountINT(workamount) {
    if (workamount === "Einfach😀") {
        return 1;
    } else if (workamount === "Normal🙂") {
        return 2;
    } else if (workamount === "Schwer🥵") {
        return 3;
    }
    return 0;
}

function getdateinISO(date) {
    // date is in format dd.mm.yyyy
    var parts = date.split(".");
    return parts[2] + "-" + parts[1] + "-" + parts[0];
}


function displayEdithwForm(homework) {
    var window = document.getElementsByClassName("newhwwinbg")[0];
    var win = document.getElementsByClassName("newhwwin")[0];
    var form = document.getElementsByClassName("hwform")[0];
    var values = window.getElementsByTagName("input");
    var selects = window.getElementsByTagName("select");
    var formHeader = document.getElementById("hwform-header");
    var submit = form.querySelector('input[type="submit"]');
    submit.value = "Ändern";
    formHeader.innerText = "Hausaufgabe bearbeiten";
    selects[0].value = homework.cells[1].innerText;
    values[0].value = homework.cells[2].innerText;
    selects[1].value = getworkamountINT(homework.cells[3].innerText);
    values[1].value = getdateinISO(homework.cells[4].innerText);
    setTimeout(function() {
        window.style.opacity = "1";
    }, 10);
    window.style.display = "flex";
    windowheight = win.offsetHeight;
    windowwidth = win.offsetWidth;
    win.style.maxHeight = windowheight + "px";
    win.style.maxWidth = windowwidth + "px";
    sortClassesByColor();
    markinTimetable();
}

// Opens the form to add a new homework
function displayhwform() {
    var window = document.getElementsByClassName("newhwwinbg")[0];
    var win = document.getElementsByClassName("newhwwin")[0];
    setTimeout(function() {
        window.style.opacity = "1";
    }, 10);
    window.style.display = "flex";
    windowheight = win.offsetHeight;
    windowwidth = win.offsetWidth;
    win.style.maxHeight = windowheight + "px";
    win.style.maxWidth = windowwidth + "px";
    sortClassesByColor();
}

function tryclosehwform() {
    var window = document.getElementsByClassName("newhwwinbg")[0];
    var values = window.getElementsByTagName("input");
    var cancelwin = window.getElementsByClassName("cancel_popup")[0];
    for (var i = 0; i < values.length; i++) {
        if (values[i].value != "" && (values[i].type != "submit" && values[i].type != "checkbox" && values[i].type != "date")) {
            setTimeout(function() {
                cancelwin.style.opacity = "1";
            }, 10);
            cancelwin.style.display = "flex";
            return;
        }
    }
    window.style.opacity = "0";
    setTimeout(function() {
        window.style.display = "none";
    }, 500);
}

// Closes the form to add a new homework with the close button in the top right
function closehwform() {
    var window = document.getElementsByClassName("newhwwinbg")[0];
    window.style.opacity = "0";
    setTimeout(function() {
        window.style.display = "none";
        resetForm();
    }, 500);
}

function closecancelwin() {
    var cancelwin = document.getElementsByClassName("cancel_popup")[0];
    cancelwin.style.opacity = "0";
    setTimeout(function() {
        cancelwin.style.display = "none";
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
function showTimetableinForm() {
    var win = document.getElementsByClassName("newhwwin")[0];
    var timetable = document.getElementsByClassName("mini-timetable")[0];
    if (showingtimetable) {
        timetable.classList.remove("visible");
        setTimeout(function() {
            timetable.style.display = "none";
            win.style.maxHeight = windowheight + "px";
            win.style.maxWidth = windowwidth + "px";
        }, 250);
        showingtimetable = false;
    } else {
        win.classList.add("expanded");
        win.style.maxHeight = "70%";
        win.style.maxWidth = "100%";
        timetable.style.display = "block";
        setTimeout(function() {
            timetable.classList.add("visible");
        }, 250);
        showingtimetable = true;
    }
}

function classLabels(subject) {
    labels = {
        'Englisch' : 'E1',
        'Deutsch' : 'D',
        'Mathematik' : 'M',
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

function markinTimetable() {
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
    let form = document.querySelector('.hwform');
    var subject = form.querySelector('#class').value;
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

function autogetDate() {
    let form = document.querySelector('.hwform');
    let due_date = form.querySelector('#due_date');
    var subject = form.querySelector('#class').value;
    subject = classLabels(subject);
    console.log(subject);
    var currentDate = new Date();
    var currentDay = currentDate.getDay();
    // Add one to search from tomorrow on
    var tomorrowDay = currentDay +1;
    // check from tomorrow till end of week
    for (var i = tomorrowDay; i < 7; i++) {
        var cell = checkColumnsMatch(document.getElementsByClassName("mini-timetable")[0], subject, i);
        if (cell) {
            var day = i;
            var currentYear = currentDate.getFullYear();
            var currentMonth = currentDate.getMonth();
            var foundDate = new Date(currentYear, currentMonth, currentDate.getDate() + (day - currentDay +1));
            due_date.value = foundDate.toISOString().split('T')[0];
            markinTimetable();
            return foundDate;
        }
    }
    // if nothing is found before this tests from monday till today
    for (var i = 0; i < tomorrowDay; i++) { // Use tomorrowDay cuz it needs to be one more for today to be included
        var cell = checkColumnsMatch(document.getElementsByClassName("mini-timetable")[0], subject, i);
        if (cell) {
            var day = i;
            var currentYear = currentDate.getFullYear();
            var currentMonth = currentDate.getMonth();
            var foundDate = new Date(currentYear, currentMonth, currentDate.getDate() + (7 - currentDay + day + 1));
            due_date.value = foundDate.toISOString().split('T')[0];
            markinTimetable();
            return foundDate;
        }
    }
    due_date.value = "";
    markinTimetable();
    return null;
}