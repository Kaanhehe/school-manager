var editinghw = null;
var oldhw = false;
var oldrep = false;
var submited = false;
var break_rows = [];

$(document).ready(function(){
    // Setup all the data
    RefreshTimetable(true);
    RequestHomeworkRefresh();
    RefreshRepPlan(true);
    setupclasses(classes_data);
    // Check if the user wants to set the scrape data
    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("setscrapedata")) {
        var formbg = document.querySelector('.scrape_form_bg');
        var form = document.querySelector('.scrapeform');
        formbg.style.display = "flex";
        setTimeout(function() {
            formbg.style.opacity = "1";
        }, 10);
        $(form).submit(function(event){
            event.preventDefault();
            startLoading();
            $.ajax({
                type: "POST",
                url: "/sendscrapedata",
                data: $(this).serialize(),
                success: function(data) {
                    type = data.split('+')[0];
                    header = data.split('+')[1];
                    message = data.split('+')[2];
                    sendNotification(type, header, message);
                    stopLoading();
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
                    stopLoading();
                    console.error(textStatus, errorThrown);
                }
            });
        });
    }

    // Makes you stay in the same tab on site refresh
    var urlTab = window.location.hash;
    if (urlTab === "#homework") {
        var timetable = document.getElementsByClassName("timetable")[0];
        var homework = document.getElementsByClassName("homework")[0];
        var timetablelink = document.getElementById("timetable-link");
        var homeworklink = document.getElementById("homework-link");
        homeworklink.classList.add("active");
        timetablelink.classList.remove("active");
        timetable.classList.remove("visible");
        homework.classList.add("visible");
    } else if (urlTab === "#repplan") {
        var timetable = document.getElementsByClassName("timetable")[0];
        var repplan = document.getElementsByClassName("repplan")[0];
        var timetablelink = document.getElementById("timetable-link");
        var repplanlink = document.getElementById("repplan-link");
        repplanlink.classList.add("active");
        timetablelink.classList.remove("active");
        timetable.classList.remove("visible");
        repplan.classList.add("visible");
    }

    // Submit the homework form
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

 // Password input stuff
 function ClosePasswordForm() {
    var formbg = document.querySelector('.password_input_bg');
    formbg.style.opacity = "0";
    setTimeout(function() {
        formbg.style.display = "none";
    }, 500);
}

// Scrape form stuff
function CloseScrapeForm() {
    var formbg = document.querySelector('.scrape_form_bg');
    formbg.style.opacity = "0";
    setTimeout(function() {
        formbg.style.display = "none";
    }, 500);
}

// Scrape Buttons stuff
function ScrapeTimetable() {
    var div = document.querySelector('.password_input');
    var formbg = document.querySelector('.password_input_bg');
    var form = document.querySelector('.passwordinputform');
    div.classList.add("visible");
    formbg.style.display = "flex";
    setTimeout(function() {
        formbg.style.opacity = "1";
    }, 10);
    $(form).off('submit').on('submit', function(event){
        event.preventDefault();
        startLoading();
        $.ajax({
            type: "POST",
            url: "/scrapett",
            data: $(this).serialize(),
            success: function(data) {
                var type = data.split('+')[0];
                var header = data.split('+')[1];
                var message = data.split('+')[2];
                sendNotification(type, header, message);
                stopLoading();
                RefreshTimetable();
            },
            error: function(jqXHR, textStatus, errorThrown) {
                // Handle the error
                sendNotification("error", "Fehler", "Der Stundenplan konnte nicht aktualisiert werden. Versuche die Seite neu zu laden.");
                stopLoading();
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

async function ScrapeRepplan() {
    var div = document.querySelector('.password_input');
    var formbg = document.querySelector('.password_input_bg');
    var form = document.querySelector('.passwordinputform');
    formbg.style.display = "flex";
    div.classList.add("visible");
    setTimeout(function() {
        formbg.style.opacity = "1";
    }, 10);
    $(form).off('submit').on('submit', function(event){
        event.preventDefault();
        startLoading();
        $.ajax({
            type: "POST",
            url: "/scraperep",
            data: $(this).serialize(),
            success: function(data) {
                var type = data.split('+')[0];
                var header = data.split('+')[1];
                var message = data.split('+')[2];
                sendNotification(type, header, message);
                stopLoading();
                RefreshTimetable();
            },
            error: function(jqXHR, textStatus, errorThrown) {
                // Handle the error
                sendNotification("error", "Fehler", "Der Vertretungsplan konnte nicht aktualisiert werden. Versuche die Seite neu zu laden.");
                stopLoading();
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

// Timetable stuff
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
    // Refresh the timetable first, cuz its also used to reset the repplan and homework from the timetable
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
        
        // Check if a break comes before the class and add it to the table
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
        // Creates a new row and adds the class number and time to the first two cells
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
                cell.classList.add('timetablecell');
                cell.classList.add('class-' + class_num + '-' + class_day);
                cell.addEventListener('mouseover', function() { 
                    // check if the cell is empty
                    if (cell.innerText === "") {
                        return;
                    }
                    // check classes_data for the class label and add it to the tooltip
                    classes_data.forEach(function(class_data) {
                        if (class_data[0] === class_name && class_data[1] !== "") {
                            class_name = class_data[1];
                        }
                    });
                    tippy('.class-' + class_num + '-' + class_day, { content: 'Fach: ' + class_name + '<br>Raum: ' + class_loc + '<br>Lehrer: ' + class_tea, allowHTML: true });
                });
                row.appendChild(cell);
            }
        });
    
        tableBody.appendChild(row);
    });
    highlightCurrentLesson(tableId);
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
    let modifiedData = JSON.parse(JSON.stringify(repplanData));
    let table = document.getElementById(tableId);
    let changes = [];

    function formatDate(date) {
        const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
        return date.toLocaleDateString('en-GB', options).replace(/\//g, '.');
    }

    modifiedData.forEach((data, i) => {
        let [id, date, hour, classes, substitute, teacher, subject, room, info] = data;
        date = new Date(getdateinISO(date));
        let date2 = formatDate(date);
        let day = date.getDay();
        let cell = day + 1;
        let row = hour;

        break_rows.forEach(break_row => {
            if (break_row <= row) {
                row++;
            }
        });

        if (!table.rows[row] || !table.rows[row].cells[cell]) {
            return;
        }

        let cellText = table.rows[row].cells[cell].innerText;
        let [cellSubject, cellRoom, cellTeacher] = cellText.split(' ');

        if ((cellSubject === subject && cellTeacher === teacher) || (info === "SV-Std" || info === "SV-Std.")) {
            if (substitute && substitute !== teacher) {
                data.push("sub");
            }

            if (room && room !== cellRoom) {
                data.push("room");
            }

            if (info === "fällt aus") {
                let sv_std = changes.some(({ data }, j) => {
                    return i !== j && data[1] === date2 && data[2] === hour && data.includes("sv_std");
                });

                if (!sv_std) {
                    data.push("cancelled");
                }
            } else if (info === "SV-Std" || info === "SV-Std.") {
                changes.forEach(({ data }, j) => {
                    if (i !== j && data[1] === date2 && data[2] === hour) {
                        ["sub", "cancelled", "sv_std"].forEach(attr => {
                            let index = data.indexOf(attr);
                            if (index !== -1) {
                                data.splice(index, 1);
                            }
                        });
                    }
                });
                data.push("sv_std");
            
            } else if (info) {
                data.push("info");
            }
        }

        changes.push({ row, cell, data });
    });

    changes.forEach(({ row, cell, data }) => {
        let [id, date, hour, classes, substitute, teacher, subject, room, info, ...attributes] = data;
        let cellElement = table.rows[row].cells[cell];

        attributes.forEach(attr => {
            switch (attr) {
                case "sub":
                    applySubstitute(cellElement, id, substitute);
                    break;
                case "room":
                    applyRoomChange(cellElement, id, room);
                    break;
                case "cancelled":
                    applyCancellation(cellElement, id);
                    break;
                case "sv_std":
                    applySVStd(cellElement, id);
                    break;
                case "info":
                    applyInfo(cellElement, id, info);
                    break;
            }

            if (attr === "sub" && attributes.includes("cancelled")) {
                applySubAndCancelled(cellElement, id);
            }
        });
    });
}

function applySubstitute(cell, id, substitute) {
    let cellsplit = cell.innerHTML.split(' ');
    cellsplit[2] = `<strike>${cellsplit[2]}</strike>`;
    cellsplit[3] = substitute;
    cell.innerHTML = `${cellsplit.join(' ')} <i class="teacher-icon${id} fas fa-chalkboard-teacher" style="font-size: smaller;"></i>`;
    tippy(`.teacher-icon${id}`, { content: "Vertreter: " + substitute });
}

function applyRoomChange(cell, id, room) {
    let cellsplit = cell.innerHTML.split(' ');
    cellsplit[1] = `<strike>${cellsplit[1]}</strike>`;
    cellsplit.splice(2, 0, room);
    cell.innerHTML = `${cellsplit.join(' ')} <i class="room-icon${id} fas fa-door-open" style="font-size: smaller;"></i>`;
    tippy(`.room-icon${id}`, { content: "Neuer Raum: " + room });
}

function applyCancellation(cell, id) {
    cell.innerHTML = `<strike>${cell.innerHTML}</strike> <i class="cancelled-icon${id} fas fa-times-circle" style="font-size: smaller;"></i>`;
    tippy(`.cancelled-icon${id}`, { content: "Diese Stunde fällt aus" });
}

function applySVStd(cell, id) {
    cell.style.backgroundColor = "rgba(255, 255, 0, 0.2)";
    cell.innerHTML += ` <i class="sv-std-icon${id} fas fa-user-friends" style="font-size: smaller;"></i>`;
    tippy(`.sv-std-icon${id}`, { content: "SV-Stunde" });
}

function applyInfo(cell, id, info) {
    cell.innerHTML += ` <i class="info-icon${id} fas fa-info-circle" style="font-size: smaller;"></i>`;
    tippy(`.info-icon${id}`, { content: info });
}

function applySubAndCancelled(cell, id) {
    cell.innerHTML += ` <i class="info-icon${id} fas fa-info-circle" style="font-size: smaller;"></i>`;
    tippy(`.info-icon${id}`, { content: "Entfall und Vertretung???" });
}

// Homework stuff
async function RequestHomeworkRefresh() {
    if (oldhw) {
        await done == refreshOldHomeworks();
        setupclasses(classes_data);
    } else {
        await done == refreshHomeworks();
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
            replaceSubject();
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
            replaceSubject();
        },
        error: function(jqXHR, textStatus, errorThrown) {
            // Handle the error
            console.error(textStatus, errorThrown);
        }
    });
}

function highlightCurrentLesson(tableId) {
    // Get the times of the current day
    var currentDate = new Date();
    var currentDay = currentDate.getDay();
    var currentHour = currentDate.getHours();
    var currentMinute = currentDate.getMinutes();
    var currentHourString = currentHour.toString();
    var currentMinuteString = currentMinute.toString();

    // get the table
    var table = document.getElementById(tableId);
    
    // Add a leading zero if the hour or minute is less than 10
    if (currentHour < 10) {
        currentHourString = "0" + currentHourString;
    }
    if (currentMinute < 10) {
        currentMinuteString = "0" + currentMinuteString;
    }
    // Get the current time in the format HH:MM
    var currentTime = currentHourString + ":" + currentMinuteString;

    // Variables to store the current row and cell
    var currentRow = 0;
    var currentCell = 0;

    // Remove all the highlights
    RemoveHighlight(tableId);

    // Check all columns if the current day is the column and highlight the column
    for (var i = 2; i < table.rows[0].cells.length; i++) {
        if (currentDay === i - 1) {
            // Highlight all the cells of the column
            for (var j = 1; j < table.rows.length; j++) {
                // Check if the cell exists
                if (!table.rows[j] || !table.rows[j].cells[i]) {
                    continue;
                }
                // check if the cell is a break cell
                if (table.rows[j].cells[i].classList.contains("timetablebreak")) {
                    continue;
                }
                // check if the cell is empty
                if (table.rows[j].cells[i].innerText === "") {
                    continue;
                }
                table.rows[j].cells[i].classList.add("highlight");
                currentCell = i;
            }
        }
    }

    // If the current day is not in the timetable, return -> like on weekends
    if (currentCell === 0) {
        return;
    }

    // Gets the current row based on the current time
    // Check all rows if the current time is between the start and end time of the class
    for (var i = 1; i < table.rows.length; i++) {
        var timecell = table.rows[i].cells[1].innerText;
        var time_start = timecell.split(" - ")[0];
        var time_end = timecell.split(" - ")[1];
        // Check if the current time is between the start and end time of the class
        if (currentTime >= time_start && currentTime <= time_end) {
            // Highlight all the cells of the row
            for (var j = 0; j < table.rows[i].cells.length; j++) {
                // check if the currentCell in the row is empty
                if (table.rows[i].cells[currentCell].innerText === "") {
                    RemoveHighlight(tableId);
                    continue;
                }
                currentRow = i;
            }
        }
    }

    // If the current time is not in the timetable, return -> like after school; Also checks if the cell exists
    if (currentRow === 0) {
        RemoveHighlight(tableId);
        return;
    }

    // Check if the cell is a break cell and highlight it -> checks the third cell of the row cuz we use colspan for breaks
    if (table.rows[currentRow].cells[2].classList.contains("timetablebreak")) {
        table.rows[currentRow].cells[2].classList.add("currentLesson");
        return;
    }

    // Check if the cell is empty
    if (table.rows[currentRow].cells[currentCell].innerText === "") {
        return;
    }

    // Set class CurrentLesson to the current lesson that is at currentRow and currentCell
    table.rows[currentRow].cells[currentCell].classList.add("currentLesson");  
}

function RemoveHighlight(tableId) {
    var table = document.getElementById(tableId);
    for (var i = 0; i < table.rows.length; i++) {
        for (var j = 0; j < table.rows[i].cells.length; j++) {
            // Check if the cell exists
            if (!table.rows[i] || !table.rows[i].cells[j]) {
                continue;
            }
            table.rows[i].cells[j].classList.remove("highlight");
            table.rows[i].cells[j].classList.remove("currentLesson");
        }
    }
}
    

function change_done_homeworks() {
    var buttons = document.querySelectorAll(".hwaction#hwdone");
    buttons.forEach(button => {
        var dataid = button.getAttribute("data-id");
        var row = button.closest("tr");
        if (dataid === "0") {
            button.addEventListener("click", doneHomework);
            button.classList.remove("undone");
            button.innerHTML = `<i class="fa-solid fa-check"></i>`;
        } else if (dataid === "1") {
            button.addEventListener("click", undoneHomework);
            button.classList.add("undone");
            button.innerHTML = `<i class="fa-solid fa-xmark"></i>`;
            // Strike through the text and make it grey
            var cells = Array.from(row.cells).filter((_, index) => index !== 5);
            cells.forEach(cell => {
                cell.style.textDecoration = "line-through";
                cell.style.color = "rgba(255, 255, 255, 0.5)";
                // Remove the line-through and grey color when hovering over the row
                cell.onmouseover = function() {
                    cells.forEach(cell => {
                        cell.style.textDecoration = "none";
                        cell.style.color = "rgba(255, 255, 255, 1)";
                    });
                }
                // Add the line-through and grey color back when leaving the row
                cell.onmouseout = function() {
                    cells.forEach(cell => {
                        cell.style.textDecoration = "line-through";
                        cell.style.color = "rgba(255, 255, 255, 0.5)";
                    });
                }
            });
        }
    });
}
// Replaces the subject with the class label
// checks in the classes_data array for the subject and returns the class label if it is given
function replaceSubject() {
    var table = document.getElementById("homework-table");
    for (var i = 1; i < table.rows.length; i++) {
        var subject = table.rows[i].cells[1].innerText;
        classes_data.forEach(function(class_data) {
            if (class_data[0] === subject && class_data[1] !== "") {
                table.rows[i].cells[1].innerText = class_data[1];
            }
        });
    }
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
        if (class_data[2] != "#333333") {
            option.style.color = "#333";
        }
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

// Homework actions stuff
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

// Homework form stuff
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

function autogetDate() {
    let form = document.querySelector('.hwform');
    let due_date = form.querySelector('#due_date');
    var subject = form.querySelector('#class').value;
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

    var cell = checkColumnsMatch(timetable, subject, day);
    // If no cell on that day has the subject, mark all cells of the day
    if (!cell) {
        ColorAllColumns(day);
        return;
    }
    // Mark the cell with the subject
    cell.classList.add("marked");
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

// Clears the marked cells in the mini timetable
function cleanMarkedCells() {
    var timetable = document.getElementById("mini-timetable");
    var cells = timetable.getElementsByClassName("marked");
    while (cells.length > 0) {
        cells[0].classList.remove("marked");
    }
}

// RepPlan stuff
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