// Author: Kaanhehe

var editinghw = null;
var oldhw = false;
var submited = false;

$(document).ready(function(){
    $(".hwform").submit(function(event){
        event.preventDefault();
        // Just get the date if it is not set; Not used right now -> make settings with this as option
        //if (!$(this).find("#due_date").val()) {
        //    autogetDate();
        //}
        submited = true;
        if (editinghw) {
            $.ajax({
                type: "POST",
                url: "/edithw",
                data: $(this).serialize() + "&id=" + editinghw.cells[0].innerText,
                success: function(data) {
                    RequestHomeworkRefresh();
                    closehwform();
                    sendNotification("success", "Hausaufgabe bearbeitet", "Die Hausaufgabe wurde erfolgreich bearbeitet.");
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    // Handle the error
                    sendNotification("error", "Fehler", "Die Hausaufgabe konnte nicht bearbeitet werden.");
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
                RequestHomeworkRefresh();
                sendNotification("success", "Hausaufgabe hinzugefügt", "Die Hausaufgabe wurde erfolgreich hinzugefügt.");
            },
            error: function(jqXHR, textStatus, errorThrown) {
                // Handle the error
                sendNotification("error", "Fehler", "Die Hausaufgabe konnte nicht hinzugefügt werden.");
                console.error(textStatus, errorThrown);
            }
        });
    });
    applyrepplan(repplan_data, 'timetable');
    applyrepplan(repplan_data, 'mini-timetable');
    applyhomework(homework_data, 'timetable');
    applyhomework(homework_data, 'mini-timetable');
});

function ScrapeTimeTable() {
    $.ajax({
        type: "GET",
        url: "/scrapett",
        success: function(data) {
            sendNotification("success", "Erfolg", "Der Stundenplan wurde erfolgreich aktualisiert.");
            RefreshTimetable();
        },
        error: function(jqXHR, textStatus, errorThrown) {
            // Handle the error
            sendNotification("error", "Fehler", "Der Stundenplan konnte nicht aktualisiert werden. Versuche die Seite neu zu laden.");
            console.error(textStatus, errorThrown);
        }
    });
}

function ScrapeRepPlan() {
    $.ajax({
        type: "GET",
        url: "/scraperep",
        success: function(data) {
            sendNotification("success", "Erfolg", "Der Vertretungsplan wurde erfolgreich aktualisiert.");
            RefreshTimetable();
        },
        error: function(jqXHR, textStatus, errorThrown) {
            // Handle the error
            sendNotification("error", "Fehler", "Der Vertretungsplan konnte nicht aktualisiert werden. Versuche die Seite neu zu laden.");
            console.error(textStatus, errorThrown);
        }
    });
}

// Used to apply the homework to the timetable
// Adds a little icon to the cell if there is a homework with the amount of homeworks that are due
// Also adds a icon the the column header with the amount of homeworks that are due in the whole day
function applyhomework(homework_data, tableId) {
    var table = document.getElementById(tableId);
    for (var i = 0; i < homework_data.length; i++) {
        id = homework_data[i][0];
        date = homework_data[i][4];
        date = new Date(getdateinISO(date));
        day = date.getDay();
        subject = homework_data[i][1];
        subject = classLabels(subject);
        amount = homework_data[i][3];
        task = homework_data[i][2];
        done = homework_data[i][5];
        cell = day + 1;
        // check if the homework is done
        if (done === 1) {
            continue;
        }
        // loop through every row and check if the subject matches
        for (var row = 0; row < table.rows.length; row++) {
            // check if the cell exists
            if (!table.rows[row] || !table.rows[row].cells[cell]) {
                continue;
            }
            // check if the subject matches
            if (table.rows[row].cells[cell].innerText.split(' ')[0] === subject) {
                // Add the icon to the cell
                table.rows[row].cells[cell].innerHTML = `${table.rows[row].cells[cell].innerHTML} <i class="homework-icon fas fa-book" title="Offnene Hausaufgabe: ${task} (ID:${id})" style="font-size: smaller;"></i>`;
                // Add the icon to the column header
                if (!table.rows[0].cells[cell].innerHTML.includes("homework-icon")) {
                    table.rows[0].cells[cell].innerHTML = `${table.rows[0].cells[cell].innerHTML} <i class="homework-icon fas fa-book" title="Offene Hausaufgaben für diesen Tag" style="font-size: smaller;"></i>`;
                }
                break;
            }
        }
    }
}

// Used to apply the replacement plan to the timetable
function applyrepplan(repplanData, tableId) {
    var table = document.getElementById(tableId);
    for (var i = 0; i < repplanData.length; i++) {
        is_sub = false;
        is_room = false;
        is_cancelled = false;
        sv_std = false;
        is_info = false;
        id = repplanData[i][0];
        date = repplanData[i][1];
        date = new Date(getdateinISO(date));
        day = date.getDay();
        hour = repplanData[i][2];
        classes = repplanData[i][3];
        substitute = repplanData[i][4];
        teacher = repplanData[i][5];
        subject = repplanData[i][6];
        room = repplanData[i][7];
        info = repplanData[i][8];
        cell = day + 1;
        row = hour;
        // check if the cell exists
        if (!table.rows[row] || !table.rows[row].cells[cell]) {
            continue;
        }
        // check if the subject and teacher match
        if (table.rows[row].cells[cell].innerText.split(' ')[0] === subject && table.rows[row].cells[cell].innerText.split(' ')[2] === teacher) {
            // check if substitute is not empty and not the same as the teacher
            if (substitute != "" && substitute != teacher) {
                cellsplit = table.rows[row].cells[cell].innerHTML.split(' ');
                // Make the og teacher strike through
                cellsplit[2] = "<strike>" + cellsplit[2] + "</strike>";
                // Add the substitute
                cellsplit[3] = substitute;
                table.rows[row].cells[cell].innerHTML = cellsplit.join(' ');
                // Set the is_sub flag to true
                is_sub = true;
            }
            // check if room is not empty and not the same as the default room
            if (room != "" && room != table.rows[row].cells[cell].innerText.split(' ')[1]) {
                cellsplit = table.rows[row].cells[cell].innerHTML.split(' ');
                // Make the default room strike through
                cellsplit[1] = "<strike>" + cellsplit[1] + "</strike>";
                // Add the room
                cellsplit.splice(2, 0, room);
                table.rows[row].cells[cell].innerHTML = cellsplit.join(' ');
                // Set the is_room flag to true
                is_room = true;
            }
            // Add the info icon if the lesson is cancelled
            if (info === "fällt aus") {
                // Strike through the whole cell
                table.rows[row].cells[cell].innerHTML = `<strike>${table.rows[row].cells[cell].innerHTML}</strike>`;
                // Set the is_cancelled flag to true
                is_cancelled = true;
            // Add the info icon if there is a info
            } else if (info === "SV-Std") {
                // Make the cells background yellow
                table.rows[row].cells[cell].style.backgroundColor = "rgba(255, 255, 0, 0.2)";
                // Set the sv_std flag to true
                sv_std = true;
            } else if (info != "") {
                // Set the is_info flag to true
                is_info = true;
            }
            // Add the icons to the cell
            if (is_room) {
                table.rows[row].cells[cell].innerHTML = `${table.rows[row].cells[cell].innerHTML} <i class="room-icon fas fa-door-open" title="Neuer Raum: ${room}" style="font-size: smaller;"></i>`;
            }
            if (is_sub) {
                table.rows[row].cells[cell].innerHTML = `${table.rows[row].cells[cell].innerHTML} <i class="teacher-icon fas fa-chalkboard-teacher" title="Vertreter: ${substitute}" style="font-size: smaller;"></i>`;
            }
            if (is_cancelled) {
                table.rows[row].cells[cell].innerHTML = `${table.rows[row].cells[cell].innerHTML} <i class="cancelled-icon fas fa-times-circle" title="Diese Stunde fällt aus" style="font-size: smaller;"></i>`;
            }
            if (sv_std) {
                table.rows[row].cells[cell].innerHTML = `${table.rows[row].cells[cell].innerHTML} <i class="sv-std-icon fas fa-user-friends" title="SV-Std" style="font-size: smaller;"></i>`;
            }
            if (is_info) {
                table.rows[row].cells[cell].innerHTML = `${table.rows[row].cells[cell].innerHTML} <i class="info-icon fas fa-info-circle" title="${info}" style="font-size: smaller;"></i>`;
            }
            // Add the info icon with a warning if the lesson is cancelled and there is a substitute
            if (is_sub && is_cancelled) {
                table.rows[row].cells[cell].innerHTML = `${table.rows[row].cells[cell].innerHTML} <i class="info-icon fas fa-info-circle" title="Entfall und Vertretung???" style="font-size: smaller;"></i>`;
            }
        }
    }
}

// Change the active class in the navbar to the clicked one
function changeActiveClass(event) {
    var navbar = document.getElementsByClassName("navbar")[0];
    var current = navbar.getElementsByClassName("active");
    var content = document.getElementsByClassName("content")[0];
    var timetable = document.getElementsByClassName("timetable")[0];
    var homework = document.getElementsByClassName("homework")[0];
    current[0].classList.remove("active");
    event.target.className += " active";
    // If the timetable link is clicked, show the timetable
    if (event.target.id === "timetable-link") {
        timetable.style.display = "block";
        setTimeout(function() {
            timetable.classList.add("visible");
            RefreshTimetable();
        }, 10);
    // else hide the timetable
    } else {
        timetable.style.display = "none";
        timetable.classList.remove("visible");
    }
    // If the homework link is clicked, show the homework overview
    if (event.target.id === "homework-link") {
        homework.style.display = "block";
        setTimeout(function() {
            homework.classList.add("visible");
            // Color the classes in the homework overview
            RequestHomeworkRefresh();
            color_classes();
            change_done_homeworks();
        }, 10);
    // else hide the homework overview
    } else {
        homework.style.display = "none";
        homework.classList.remove("visible");
    }
}

function change_done_homeworks() {
    var buttons = document.querySelectorAll(".hwaction#hwdone");
    for (var i = 0; i < buttons.length; i++) {
        var dataid = buttons[i].getAttribute("data-id");
        var row = buttons[i].closest("tr");
        var button = row.querySelector(".hwaction#hwdone");
        if (dataid === "0") {
            button.addEventListener("click", doneHomework);
            button.classList.remove("undone");
            button.innerHTML = `<i class="fa-solid fa-check"></i>`;
        } else if (dataid === "1") {
            button.addEventListener("click", undoneHomework);
            button.classList.add("undone");
            button.innerHTML = `<i class="fa-solid fa-xmark"></i>`;
            // Strike through the text and make it grey
            var cells = row.cells;
            for (var j = 0; j < cells.length; j++) {
                if (j !== 5) { // Skip the button column
                    // Adding line-through and grey color to the text
                    cells[j].style.textDecoration = "line-through";
                    cells[j].style.color = "rgba(255, 255, 255, 0.5)";
                    // Remove the line-through and grey color when hovering over the row
                    cells[j].onmouseover = function() {
                        for (var j = 0; j < cells.length; j++) {
                            if (j !== 5) {
                                cells[j].style.textDecoration = "none";
                                cells[j].style.color = "rgba(255, 255, 255, 1)";
                            }
                        }
                    }
                    // Add the line-through and grey color back when leaving the row
                    cells[j].onmouseout = function() {
                        for (var j = 0; j < cells.length; j++) {
                            if (j !== 5) {
                                cells[j].style.textDecoration = "line-through";
                                cells[j].style.color = "rgba(255, 255, 255, 0.5)";
                            }
                        }
                    }
                }
            }
        }
    }
}

// Its done very complicated and should be done better
// Maybe with a better data structure
// And not being applied in the html code at first
// Apply the timetable to the table
function applyTimetable(data, tableId) {
    var tableHead = document.querySelector("#" + tableId + " thead");
    var tableBody = document.querySelector("#" + tableId + " tbody");
    // Clear the table
    tableHead.innerHTML = '';
    tableBody.innerHTML = '';

    // Add the column headers
    var headerRow = document.createElement('tr');
    headerRow.innerHTML = `
        <th>Stunde</th>
        <th>Zeit</th>
        <th>Montag</th>
        <th>Dienstag</th>
        <th>Mittwoch</th>
        <th>Donnerstag</th>
        <th>Freitag</th>
    `;

    tableHead.appendChild(headerRow);

    // Takes only the number and the time of the first class of the row
    // Applys that to the first two cells of the row
    data.forEach(function(group, index) {
        var class_day = group[0][0];
        var class_num = group[0][1];
        var class_time = group[0][2];
        var class_name = group[0][3];
        var class_loc = group[0][4];
        var class_tea = group[0][5];
    
        var row = document.createElement('tr');
        row.innerHTML = `
            <td>${class_num}</td>
            <td>${class_time}</td>
        `;
        
        // Then loops over all the classes of the row and adds them to the row
        group.forEach(function(class_data) {
            var class_day = class_data[0];
            var class_num = class_data[1];
            var class_time = class_data[2];
            var class_name = class_data[3];
            var class_loc = class_data[4];
            var class_tea = class_data[5];
    
            var day_columns = {'Montag': 2, 'Dienstag': 3, 'Mittwoch': 4, 'Donnerstag': 5, 'Freitag': 6};
    
            if (class_day in day_columns) {
                var cell = document.createElement('td');
                cell.textContent = class_name + ' ' + class_loc + ' ' + class_tea;
                row.appendChild(cell);
            }
        });
    
        tableBody.appendChild(row);
        
        // Add a break row after the 6th class
        if (class_num == 6) {
            var breakRow = document.createElement('tr');
            breakRow.innerHTML = `
                <td>7</td>
                <td>13:00 - 13:45</td>
                <td colspan="6" style="text-align: center; font-size: 1.25em; font-weight: bold;" class="special-font">Mittagspause</td>
            `;
            tableBody.appendChild(breakRow);
        }
    });
}

async function RefreshTimetable() {
    await $.ajax({
        type: "GET",
        url: "/gettt",
        success: function(data) {
            applyTimetable(data, 'timetable');
            applyTimetable(data, 'mini-timetable');
        },
        error: function(jqXHR, textStatus, errorThrown) {
            // Handle the error
            console.error(textStatus, errorThrown);
            sendNotification("error", "Fehler", "Der Stundenplan konnte nicht aktualisiert werden. Versuche die Seite neu zu laden.");
        }
    });
    $.ajax({
        type: "GET",
        url: "/getrp",
        success: function(data) {
            applyrepplan(data, 'timetable');
            applyrepplan(data, 'mini-timetable');
        },
        error: function(jqXHR, textStatus, errorThrown) {
            // Handle the error
            console.error(textStatus, errorThrown);
            sendNotification("error", "Fehler", "Der Vertretungsplan konnte nicht aktualisiert werden. Versuche die Seite neu zu laden.");
        }
    });
    $.ajax({
        type: "GET",
        url: "/gethw",
        success: function(data) {
            applyhomework(data, 'timetable');
            applyhomework(data, 'mini-timetable');
        },
        error: function(jqXHR, textStatus, errorThrown) {
            // Handle the error
            console.error(textStatus, errorThrown);
            sendNotification("error", "Fehler", "Die Hausaufgaben konnten nicht aktualisiert werden. Versuche die Seite neu zu laden.");
        }
    });
}

function RequestHomeworkRefresh() {
    if (oldhw) {
        refreshOldHomeworks();
    } else {
        refreshHomeworks();
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
                rowData.forEach(function(cellData, index) {
                    if (index !== 5) { // Skip the done column
                        var cell = document.createElement("td");
                        cell.textContent = cellData;
                        row.appendChild(cell);
                    } else {
                        done = cellData;
                    }
                });
                // Add action buttons to the last cell
                var actionCell = document.createElement("td");
                actionCell.className = "hwactions";
                actionCell.innerHTML = `
                    <button class="hwaction" id="hwdone" data-id=${done}><i class="fa-solid fa-check"></i></button> <!-- onclick gets added in change_done_homeworks() -->
                    <button class="hwaction" id="hwedit" onclick="editHomework(event)"><i class="fa-regular fa-pen-to-square"></i></button>
                    <button class="hwaction" id="hwdelete" onclick="deleteHomework(event)"><i class="fa-solid fa-trash-can"></i></button>
                `;
                row.appendChild(actionCell);
                return row.outerHTML;
            });
            tableBody.innerHTML = rows.join("");
            color_classes();
            change_done_homeworks();
        },
        error: function(jqXHR, textStatus, errorThrown) {
            // Handle the error
            console.error(textStatus, errorThrown);
        }
    });
}

function refreshOldHomeworks() {
    $.ajax({
        type: "GET",
        url: "/getoldhw",
        success: function(data) {
            var tableBody = document.querySelector("#homework-table tbody");
            var rows = eval(data).map(function(rowData) {
                var row = document.createElement("tr");
                rowData.forEach(function(cellData, index) {
                    if (index !== 5) { // Skip the done column
                        var cell = document.createElement("td");
                        cell.textContent = cellData;
                        row.appendChild(cell);
                    } else {
                        done = cellData;
                    }
                });
                // Add action buttons to the last cell
                var actionCell = document.createElement("td");
                actionCell.className = "hwactions";
                actionCell.innerHTML = `
                <button class="hwaction" id="hwdone" data-id=${done}><i class="fa-solid fa-check"></i></button> <!-- onclick gets added in change_done_homeworks() -->
                <button class="hwaction" id="hwedit" onclick="editHomework(event)"><i class="fa-regular fa-pen-to-square"></i></button>
                <button class="hwaction" id="hwdelete" onclick="deleteHomework(event)"><i class="fa-solid fa-trash-can"></i></button>
            `;
                row.appendChild(actionCell);
                return row.outerHTML;
            });
            tableBody.innerHTML = rows.join("");
            color_classes();
            change_done_homeworks();
        },
        error: function(jqXHR, textStatus, errorThrown) {
            // Handle the error
            console.error(textStatus, errorThrown);
        }
    });
}

function doneHomework(event) {
    var row = event.target.closest("tr");
    var id = row.cells[0].innerText;
    $.ajax({
        type: "POST",
        url: "/donehw",
        data: "id=" + id,
        success: function(data) {
            RequestHomeworkRefresh();
        },
        error: function(jqXHR, textStatus, errorThrown) {
            // Handle the error
            console.error(textStatus, errorThrown);
        }
    });
}

function undoneHomework(event) {
    var row = event.target.closest("tr");
    var id = row.cells[0].innerText;
    $.ajax({
        type: "POST",
        url: "/undonehw",
        data: "id=" + id,
        success: function(data) {
            RequestHomeworkRefresh();
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
            RequestHomeworkRefresh();
            sendNotification("success", "Hausaufgabe gelöscht", "Die Hausaufgabe wurde erfolgreich gelöscht.");
        },
        error: function(jqXHR, textStatus, errorThrown) {
            // Handle the error
            sendNotification("error", "Fehler", "Die Hausaufgabe konnte nicht gelöscht werden.");
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
    sortClassesByColor();
    submited = false;
}

function tryclosehwform() {
    var window = document.getElementsByClassName("newhwwinbg")[0];
    var values = window.getElementsByTagName("input");
    var cancelwin = window.getElementsByClassName("cancel_popup")[0];
    if (submited) {
        window.style.opacity = "0";
        setTimeout(function() {
            window.style.display = "none";
            resetForm();
        }, 500);
        return;
    }
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
        resetForm();
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
    var form = document.getElementsByClassName("hwform")[0];
    if (showingtimetable) {
        timetable.classList.remove("visible");
        setTimeout(function() {
            timetable.style.display = "none";
            form.style.width = "100%";
            win.classList.remove("expanded");
        }, 250);
        showingtimetable = false;
    } else {
        win.classList.add("expanded");
        timetable.style.display = "flex";
        form.style.width = "65%";
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
    var timetable = document.getElementById("mini-timetable");
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
    var timetable = document.getElementById("mini-timetable");
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
    var timetable = document.getElementById("mini-timetable");
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
    var currentDate = new Date();
    var currentDay = currentDate.getDay();
    // Add one to search from tomorrow on
    var tomorrowDay = currentDay +1;
    // check from tomorrow till end of week
    for (var i = tomorrowDay; i < 7; i++) {
        var cell = checkColumnsMatch(document.getElementById("mini-timetable"), subject, i);
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
        var cell = checkColumnsMatch(document.getElementById("mini-timetable"), subject, i);
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

function toggle_old_homework() {
    if (!oldhw) {
        document.getElementById("oldhwbtn").innerHTML = "Aktuelle Hausaufgaben ansehen";
        oldhw = true;
        RequestHomeworkRefresh();
    } else {
        document.getElementById("oldhwbtn").innerHTML = "Ältere Hausaufgaben ansehen";
        oldhw = false;
        RequestHomeworkRefresh();
    }
}