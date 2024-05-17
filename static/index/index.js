// Author: Kaanhehe

var editinghw = null;
var oldhw = false;
var oldrep = false;
var submited = false;
var break_rows = [];

$(document).ready(function(){
    RefreshTimetable(true);
    RequestHomeworkRefresh();
    RefreshRepPlan(true);
    setupclasses(classes_data);
    var urlParams = new URLSearchParams(window.location.search);
    var urlTab = window.location.hash === "#homework" ? "homework" : "timetable";
    if (urlParams.has("setscrapedata")) {
        var formbg = document.querySelector('.scrape_form_bg');
        var form = document.querySelector('.scrapeform');
        formbg.style.display = "flex";
        setTimeout(function() {
            formbg.style.opacity = "1";
        }, 10);
        $(form).submit(function(event){
            event.preventDefault();
            $.ajax({
                type: "POST",
                url: "/sendscrapedata",
                data: $(this).serialize(),
                success: function(data) {
                    type = data.split('+')[0];
                    header = data.split('+')[1];
                    message = data.split('+')[2];
                    sendNotification(type, header, message);
                    if (type === "success") {
                        formbg.style.opacity = "0";
                        setTimeout(function() {
                            formbg.style.display = "none";
                        }, 500);
                        history.replaceState(null, null, window.location.pathname + '#timetable');
                        location.reload();
                    }
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    // Handle the error
                    sendNotification("error", "Fehler", "Deine Daten konnten nicht gesendet werden. Versuche es später erneut.");
                    console.error(textStatus, errorThrown);
                }
            });
        });
    }
    if (urlTab === "homework") {
        var timetable = document.getElementsByClassName("timetable")[0];
        var homework = document.getElementsByClassName("homework")[0];
        var timetablelink = document.getElementById("timetable-link");
        var homeworklink = document.getElementById("homework-link");
        homeworklink.classList.add("active");
        timetablelink.classList.remove("active");
        timetable.classList.remove("visible");
        homework.classList.add("visible");
    }
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
                    type = data.split('+')[0];
                    header = data.split('+')[1];
                    message = data.split('+')[2];
                    sendNotification(type, header, message);
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
                type = data.split('+')[0];
                header = data.split('+')[1];
                message = data.split('+')[2];
                sendNotification(type, header, message);
            },
            error: function(jqXHR, textStatus, errorThrown) {
                // Handle the error
                sendNotification("error", "Fehler", "Die Hausaufgabe konnte nicht hinzugefügt werden.");
                console.error(textStatus, errorThrown);
            }
        });
    });
});

function ScrapeTimeTable() {
    var div = document.querySelector('.password_input');
    var formbg = document.querySelector('.passwort_input_bg');
    var form = document.querySelector('.passwortinputform');
    div.classList.add("visible");
    formbg.style.display = "flex";
    setTimeout(function() {
        formbg.style.opacity = "1";
    }, 10);
    $(form).off('submit').on('submit', function(event){
        event.preventDefault();
        $.ajax({
            type: "POST",
            url: "/scrapett",
            data: $(this).serialize(),
            success: function(data) {
                var type = data.split('+')[0];
                var header = data.split('+')[1];
                var message = data.split('+')[2];
                sendNotification(type, header, message);
                RefreshTimetable();
            },
            error: function(jqXHR, textStatus, errorThrown) {
                // Handle the error
                sendNotification("error", "Fehler", "Der Stundenplan konnte nicht aktualisiert werden. Versuche die Seite neu zu laden.");
                console.error(textStatus, errorThrown);
            }
        });
        formbg.style.opacity = "0";
        setTimeout(function() {
            formbg.style.display = "none";
            div.classList.remove("visible");
        }, 500);
    });
}

async function ScrapeRepPlan() {
    var div = document.querySelector('.password_input');
    var formbg = document.querySelector('.passwort_input_bg');
    var form = document.querySelector('.passwortinputform');
    formbg.style.display = "flex";
    div.classList.add("visible");
    setTimeout(function() {
        formbg.style.opacity = "1";
    }, 10);
    $(form).off('submit').on('submit', function(event){
        event.preventDefault();
        $.ajax({
            type: "POST",
            url: "/scraperep",
            data: $(this).serialize(),
            success: function(data) {
                var type = data.split('+')[0];
                var header = data.split('+')[1];
                var message = data.split('+')[2];
                sendNotification(type, header, message);
                RefreshTimetable();
            },
            error: function(jqXHR, textStatus, errorThrown) {
                // Handle the error
                sendNotification("error", "Fehler", "Der Vertretungsplan konnte nicht aktualisiert werden. Versuche die Seite neu zu laden.");
                console.error(textStatus, errorThrown);
            }
        });
        formbg.style.opacity = "0";
        setTimeout(function() {
            formbg.style.display = "none";
            div.classList.remove("visible");
        }, 500);
    });
}

function CloseScrapeForm() {
    var formbg = document.querySelector('.scrape_form_bg');
    formbg.style.opacity = "0";
    setTimeout(function() {
        formbg.style.display = "none";
    }, 500);
}

function ClosePasswortForm() {
    var formbg = document.querySelector('.passwort_input_bg');
    formbg.style.opacity = "0";
    setTimeout(function() {
        formbg.style.display = "none";
    }, 500);
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
                table.rows[row].cells[cell].innerHTML = `${table.rows[row].cells[cell].innerHTML} <i class="homework-icon${id} fas fa-book" style="font-size: smaller;"></i>`;
                tippy(`.homework-icon${id}`, { content: `Offnene Hausaufgabe: ${task} (ID:${id})` });
                // Add the icon to the column header
                if (!table.rows[0].cells[cell].innerHTML.includes("homework-icon")) {
                    table.rows[0].cells[cell].innerHTML = `${table.rows[0].cells[cell].innerHTML} <i class="homework-icon2 fas fa-book" style="font-size: smaller;"></i>`;
                    tippy('.homework-icon2', { content: "Offene Hausaufgaben für diesen Tag" });
                }
                break;
            }
        }
    }
}

// Used to apply the replacement plan to the timetable
// looks complicated but is not that complicated, but still complicated
function applyrepplan(repplanData, tableId) { 
    modifiedData = [];
    // Deep copy the data -> need to do this because the data is a reference and gets modified
    // I hate javascript
    modifiedData = JSON.parse(JSON.stringify(repplanData))
    var table = document.getElementById(tableId);
    for (var i = 0; i < modifiedData.length; i++) {
        id = modifiedData[i][0];
        date = modifiedData[i][1];
        date = new Date(getdateinISO(date));
        day = date.getDay();
        hour = modifiedData[i][2];
        classes = modifiedData[i][3];
        substitute = modifiedData[i][4];
        teacher = modifiedData[i][5];
        subject = modifiedData[i][6];
        room = modifiedData[i][7];
        info = modifiedData[i][8];
        cell = day + 1;
        row = hour;
        // Add 1 to the row if there is a break row before the current row and redo if there are multiple breaks
        break_rows.forEach(function(break_row) {
            if (break_row <= row) {
                row++;
            }
        });
        // check if the cell exists
        if (!table.rows[row] || !table.rows[row].cells[cell]) {
            continue;
        }
        // check if the subject and teacher match
        if ((table.rows[row].cells[cell].innerText.split(' ')[0] === subject && table.rows[row].cells[cell].innerText.split(' ')[2] === teacher) || (info === "SV-Std" || info === "SV-Std.")) {
            // check if substitute is not empty and not the same as the teacher
            if (substitute != "" && substitute != teacher) {
                modifiedData[i].push("sub");
            }
            // check if room is not empty and not the same as the default room
            if (room != "" && room != table.rows[row].cells[cell].innerText.split(' ')[1]) {
                modifiedData[i].push("room");
            }
            // Add the cancelled attribute if the lesson is cancelled
            if (info === "fällt aus") {
                 // Doing this because often the original class is listed as cancelled and a new class is listed as sv_std
                // check if there is already a entry with the same row and cell that is a sv_std lesson
                // if there is one, dont add the cancelled attribute
                var sv_std = false;
                for (var j = 0; j < modifiedData.length; j++) {
                    if (i != j && modifiedData[j][1] === modifiedData[i][1] && modifiedData[j][2] === modifiedData[i][2] && modifiedData[j].includes("sv_std")) {
                        sv_std = true;
                        break;
                    }
                }
                if (!sv_std) {
                    modifiedData[i].push("cancelled");
                }
            // Add the sv_std attribute if its a sv_std lesson
            } else if (info === "SV-Std" || info === "SV-Std.") {
                // Doing this because often the original class is listed as cancelled and a new class is listed as sv_std
                // check if the modifiedData has any entry with the same row and cell
                // if it has one, remove the sub, room and cancelled attribute
                for (var j = 0; j < modifiedData.length; j++) {
                    // check if the row and cell are the same and if the entry is not the same as the current entry
                    if (i != j && modifiedData[j][1] === modifiedData[i][1] && modifiedData[j][2] === modifiedData[i][2]) {
                        if (modifiedData[j].includes("sub")) {
                            modifiedData[j].splice(modifiedData[j].indexOf("sub"), 1);
                        }
                        if (modifiedData[j].includes("room")) {
                            modifiedData[j].splice(modifiedData[j].indexOf("room"), 1);
                        }
                        if (modifiedData[j].includes("cancelled")) {
                            modifiedData[j].splice(modifiedData[j].indexOf("cancelled"), 1);
                        }
                    }
                }
                modifiedData[i].push("sv_std");
            } else if (info != "") {
                modifiedData[i].push("info");
            }      
        }
    }

    for (var i = 0; i < modifiedData.length; i++) {
        is_sub = modifiedData[i].includes("sub");
        is_room = modifiedData[i].includes("room");
        is_cancelled = modifiedData[i].includes("cancelled");
        sv_std = modifiedData[i].includes("sv_std");
        is_info = modifiedData[i].includes("info");
        id = modifiedData[i][0];
        date = modifiedData[i][1];
        date = new Date(getdateinISO(date));
        day = date.getDay();
        hour = modifiedData[i][2];
        classes = modifiedData[i][3];
        substitute = modifiedData[i][4];
        teacher = modifiedData[i][5];
        subject = modifiedData[i][6];
        room = modifiedData[i][7];
        info = modifiedData[i][8];
        cell = day + 1;
        row = hour;
        // Add 1 to the row if there is a break row before the current row and redo if there are multiple breaks
        break_rows.forEach(function(break_row) {
            if (break_row <= row) {
                row++;
            }
        });
        // check if the cell exists
        if (!table.rows[row] || !table.rows[row].cells[cell]) {
            continue;
        }

        if (is_sub) {
            cellsplit = table.rows[row].cells[cell].innerHTML.split(' ');
            // Make the og teacher strike through
            cellsplit[2] = "<strike>" + cellsplit[2] + "</strike>";
            // Add the substitute
            cellsplit[3] = substitute;
            table.rows[row].cells[cell].innerHTML = cellsplit.join(' ');
            table.rows[row].cells[cell].innerHTML += ` <i class="teacher-icon${id} fas fa-chalkboard-teacher" style="font-size: smaller;"></i>`;
            tippy(`.teacher-icon${id}`, { content: "Vertreter: " + substitute });
        }

        if (is_room) {
            cellsplit = table.rows[row].cells[cell].innerHTML.split(' ');
            // Make the default room strike through
            cellsplit[1] = "<strike>" + cellsplit[1] + "</strike>";
            // Add the room
            cellsplit.splice(2, 0, room);
            table.rows[row].cells[cell].innerHTML = cellsplit.join(' ');
            table.rows[row].cells[cell].innerHTML += ` <i class="room-icon${id} fas fa-door-open" style="font-size: smaller;"></i>`;
            tippy(`.room-icon${id}`, { content: "Neuer Raum: " + room });
        }

        if (is_cancelled) {
            // Strike through the whole cell
            table.rows[row].cells[cell].innerHTML = `<strike>${table.rows[row].cells[cell].innerHTML}</strike>`;
            table.rows[row].cells[cell].innerHTML += ` <i class="cancelled-icon${id} fas fa-times-circle" style="font-size: smaller;"></i>`;
            tippy(`.cancelled-icon${id}`, { content: "Diese Stunde fällt aus" });
        }

        if (sv_std) {
            // Make the cells background yellow
            table.rows[row].cells[cell].style.backgroundColor = "rgba(255, 255, 0, 0.2)";
            table.rows[row].cells[cell].innerHTML += ` <i class="sv-std-icon${id} fas fa-user-friends" style="font-size: smaller;"></i>`;
            tippy(`.sv-std-icon${id}`, { content: "SV-Stunde" });
        }

        if (is_info) {
            table.rows[row].cells[cell].innerHTML += ` <i class="info-icon${id} fas fa-info-circle" style="font-size: smaller;"></i>`;
            tippy(`.info-icon${id}`, { content: info });
        }

        if (is_sub && is_cancelled) {
            table.rows[row].cells[cell].innerHTML += ` <i class="info-icon${id} fas fa-info-circle" style="font-size: smaller;"></i>`;
            tippy(`.info-icon${id}`, { content: "Entfall und Vertretung???" });
        }
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
        var class_time = '';
        hours_data.forEach(function(hour) {
            if (hour[0] == class_num) {
                class_time = hour[1];
            }
        });
        var class_name = group[0][2];
        var class_loc = group[0][3];
        var class_tea = group[0][4];
        
        breaks_data.forEach(function(sg_break) {
            if (sg_break[1].split(' - ')[1] == class_time.split(' - ')[0]) {
                var breakRow = document.createElement('tr');
                breakRow.innerHTML = `
                    <td></td>
                    <td>${sg_break[1]}</td>
                    <td colspan="7" class="timetablebreak">${sg_break[0]}</td>
                `;
                tableBody.appendChild(breakRow);
                // Get the row number of the break row
                tablerow = tableBody.rows.length;
                // Add the row number to the break_rows array so it can be avoided when adding the repplan
                if (!break_rows.includes(tablerow)) {
                    break_rows.push(tablerow);
                }
            }
        });
        var row = document.createElement('tr');
        row.innerHTML = `
            <td>${class_num}</td>
            <td>${class_time}</td>
        `;
        
        // Then loops over all the classes of the row and adds them to the row
        group.forEach(function(class_data) {
            var class_day = class_data[0];
            var class_num = class_data[1];
            var class_name = class_data[2];
            var class_loc = class_data[3];
            var class_tea = class_data[4];
    
            var day_columns = {'Montag': 2, 'Dienstag': 3, 'Mittwoch': 4, 'Donnerstag': 5, 'Freitag': 6};
    
            if (class_day in day_columns) {
                var cell = document.createElement('td');
                cell.textContent = class_name + ' ' + class_loc + ' ' + class_tea;
                row.appendChild(cell);
            }
        });
    
        tableBody.appendChild(row);
    });
}

async function RefreshTimetable(first = false) {
    if (first) {
        applyTimetable(timetable_data, 'timetable');
        applyTimetable(timetable_data, 'mini-timetable');
        applyrepplan(repplan_data, 'timetable');
        applyrepplan(repplan_data, 'mini-timetable');
        applyhomework(homework_data, 'timetable');
        applyhomework(homework_data, 'mini-timetable');
        return;
    }
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
            applyrepplan_to_table(data, 'repplan-table');
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
        setupclasses(classes_data);
    } else {
        refreshHomeworks();
        setupclasses(classes_data);
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
            change_done_homeworks();
        },
        error: function(jqXHR, textStatus, errorThrown) {
            // Handle the error
            console.error(textStatus, errorThrown);
        }
    });
}

function setupclasses(classes_data) {
    if (!classes_data) {
        Refreshclasses();
        return
    }
    var select = document.getElementById("class");
    while (select.options.length > 1) {
        select.remove(1);
    }
    classes_data.forEach(function(class_data) {
        var option = document.createElement("option");
        option.value = class_data[0];
        if (class_data[1] != "") {
            option.text = class_data[1]
        } else {
            option.text = class_data[0];
        }
        option.classList.add("class-option");
        option.style.backgroundColor = class_data[2];
        select.appendChild(option);
    });
}

function Refreshclasses() {
    $.ajax({
        type: "GET",
        url: "/getclasses",
        success: function(data) {
            setupclasses(data);
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
            type = data.split('+')[0];
            header = data.split('+')[1];
            message = data.split('+')[2];
            sendNotification(type, header, message);
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

function RefreshRepPlan(first = false) {
    if (first) {
        applyrepplan_to_table(repplan_data, 'repplan-table');
        return;
    }
    $.ajax({
        type: "GET",
        url: "/getrp",
        success: function(data) {
            applyrepplan_to_table(data, 'repplan-table');
        },
        error: function(jqXHR, textStatus, errorThrown) {
            // Handle the error
            console.error(textStatus, errorThrown);
        }
    });
}

function RefreshOldRepPlan() {
    $.ajax({
        type: "GET",
        url: "/getoldrp",
        success: function(data) {
            applyrepplan_to_table(data, 'repplan-table');
        },
        error: function(jqXHR, textStatus, errorThrown) {
            // Handle the error
            console.error(textStatus, errorThrown);
        }
    });
}

function applyrepplan_to_table(data, tableId) {
    var table = document.getElementById(tableId);
    var tableBody = table.getElementsByTagName("tbody")[0];
    tableBody.innerHTML = '';
    for (var i = 0; i < data.length; i++) {
        var row = document.createElement("tr");
        for (var j = 0; j < data[i].length; j++) {
            var cell = document.createElement("td");
            cell.textContent = data[i][j];
            row.appendChild(cell);
        }
        tableBody.appendChild(row);
    }
}

function toggle_old_repplan() {
    if (!oldrep) {
        document.getElementById("oldrepbtn").innerHTML = "Aktuelle Vertretungsplan Einträge ansehen";
        oldrep = true;
        RefreshOldRepPlan();
    } else {
        document.getElementById("oldrepbtn").innerHTML = "Ältere Vertretungsplan Einträge ansehen";
        oldrep = false;
        RefreshRepPlan();
    }
}