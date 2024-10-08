$(document).ready(function() {
    breaks.forEach(sg_break => {
        break_name = sg_break[0];
        start = sg_break[1];
        end = sg_break[2];
        var break_container = document.getElementsByClassName("breaks-container")[0];
        var break_element = document.createElement("div");
        break_element.classList.add("break");
        break_element.innerHTML = `<input type="text" name="break-name" placeholder="Pausen Name" required value="${break_name}">`;
        break_element.innerHTML += `<input type="time" name="break-start" placeholder="Pausen Start" required value="${start}">`;
        break_element.innerHTML += `<input type="time" name="break-end" placeholder="Pausen Ende" required value="${end}">`;
        break_element.innerHTML += `<button class="remove-break" onclick="removeBreak(this)">Entfernen</button>`;
        break_container.appendChild(break_element);
    });

    times.forEach(time => {
        lesson_hour = time[0];
        lesson_start = time[1];
        lesson_end = time[2];
        var time_container = document.getElementsByClassName("times-container")[0];
        var time_element = document.createElement("div");
        time_element.classList.add("time");
        time_element.innerHTML = `<input type="text" name="lesson-hour" placeholder="Stunde" required value="${lesson_hour}">`;
        time_element.innerHTML += `<input type="time" name="lesson-start" placeholder="Stunden Start" required value="${lesson_start}">`;
        time_element.innerHTML += `<input type="time" name="lesson-end" placeholder="Stunden Ende" required value="${lesson_end}">`;
        time_element.innerHTML += `<button class="remove-time" onclick="removeTime(this)">Entfernen</button>`;
        time_container.appendChild(time_element);
    });

    classes.forEach(sg_class => {
        class_name = sg_class[0];
        custom_name = sg_class[1];
        class_color = sg_class[2];
        var class_container = document.getElementsByClassName("classes-container")[0];
        var class_element = document.createElement("div");
        class_element.classList.add("class");
        class_element.innerHTML = `<input type="text" name="class_name" placeholder="Name" required disabled value="${class_name}">`;
        class_element.innerHTML += `<input type="text" name="custom_name" placeholder="Name" required value="${custom_name}">`;
        class_element.innerHTML += `<input type="color" name="class_color" placeholder="Farbe" required value="${class_color}">`;
        class_element.innerHTML += `<button class="remove-class" onclick="removeClass(this)">Entfernen</button>`;
        class_container.appendChild(class_element);
    });

    // Create a details element for each day of the week
    var days = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"];
    var detailsElements = {};

    days.forEach(day => {
        var timetable_container = document.getElementsByClassName("timetable-container")[0];
        var details = document.createElement("details");
        var summary = document.createElement("summary");
        summary.textContent = day;
        details.appendChild(summary);
        details.classList.add("timetable-day");
        timetable_container.appendChild(details);
        detailsElements[day] = details;

        // Add headers
        var header = document.createElement("div");
        header.classList.add("timetable-headers");
        header.innerHTML = "<h3>Tag</h3><h3>Stunde</h3><h3>Fach</h3><h3>Raum</h3><h3>Lehrer</h3>";
        detailsElements[day].appendChild(header);
    });

    // Append classes to the corresponding day
    timetable_data.forEach(group => {
        group.forEach(data => {
            var day = data[0];
            var hour = data[1];
            var subject = data[2];
            var room = data[3];
            var teacher = data[4];
            if (subject == "" || room == "" || teacher == "") {
                return;
            }
            var timetable_class = document.createElement("div");
            timetable_class.classList.add("timetable-class");
            timetable_class.innerHTML = `<select name="class_day" required>
                                            <option value="Montag" ${day === "Montag" ? "selected" : ""}>Montag</option>
                                            <option value="Dienstag" ${day === "Dienstag" ? "selected" : ""}>Dienstag</option>
                                            <option value="Mittwoch" ${day === "Mittwoch" ? "selected" : ""}>Mittwoch</option>
                                            <option value="Donnerstag" ${day === "Donnerstag" ? "selected" : ""}>Donnerstag</option>
                                            <option value="Freitag" ${day === "Freitag" ? "selected" : ""}>Freitag</option>
                                        </select>`;
            timetable_class.innerHTML += `<input type="text" name="class_hour" placeholder="Stunde" required value="${hour}">`;
            timetable_class.innerHTML += `<input type="text" name="class_subject" placeholder="Fach" required value="${subject}">`;
            timetable_class.innerHTML += `<input type="text" name="class_room" placeholder="Raum" required value="${room}">`;
            timetable_class.innerHTML += `<input type="text" name="class_teacher" placeholder="Lehrer" required value="${teacher}">`;
            timetable_class.innerHTML += `<button class="remove-timetable-class" onclick="removeTimetableClass(this)">Entfernen</button>`;
            detailsElements[day].appendChild(timetable_class);
        });
    });
    // Append buttons to each details element
    days.forEach(day => {
        var timetable_buttons = document.createElement("div");
        timetable_buttons.classList.add("timetable-buttons");
        timetable_buttons.innerHTML = `<button class="add-timetable-class" onclick="addTimetableClass(this)">Stunde Hinzufügen</button>`;
        timetable_buttons.innerHTML += `<button class="save-timetable" onclick="saveTimetable()">Speichern</button>`;
        detailsElements[day].appendChild(timetable_buttons);
    });
});

function changeUsername() {
    var window = document.getElementById("change-username-bg");
    window.classList.add("visible");
    var form = document.getElementById("change-username-form");
    form.addEventListener("submit", function(e) {
        e.preventDefault();
        var username = document.getElementsByTagName("new_username").value;
        if (username.length < 3) {
            sendNotification("error", "Fehler", "Dein Benutzername muss mindestens 3 Zeichen lang sein!");
            return;
        }
        if (username.length > 32) {
            sendNotification("error", "Fehler", "Dein Benutzername darf maximal 32 Zeichen lang sein!");
            return;
        }
        startLoading();
        $.ajax({
            type: "POST",
            url: "/settings/changeusername",
            data: $(this).serialize(),
            success: function(data) {
                type = data.split('+')[0];
                header = data.split('+')[1];
                message = data.split('+')[2];
                sendNotification(type, header, message);
                stopLoading();
                if (type == "success") {
                    location.reload();
                }
            },
            error: function(error) {
                sendNotification("error", "Fehler", "Ein Fehler ist aufgetreten! Bitte versuche es später erneut.");
            }
        });
    });
}

function closeUsernameChange() {
    var window = document.getElementById("change-username-bg");
    window.classList.remove("visible");
}

function changeEmail() {
    var window = document.getElementById("change-email-bg");
    window.classList.add("visible");
    var form = document.getElementById("change-email-form");
    form.addEventListener("submit", function(e) {
        e.preventDefault();
        startLoading();
        $.ajax({
            type: "POST",
            url: "/settings/changeemail",
            data: $(this).serialize(),
            success: function(data) {
                type = data.split('+')[0];
                header = data.split('+')[1];
                message = data.split('+')[2];
                sendNotification(type, header, message);
                stopLoading();
                if (type == "success") {
                    location.reload();
                }
            },
            error: function(error) {
                sendNotification("error", "Fehler", "Ein Fehler ist aufgetreten! Bitte versuche es später erneut.");
            }
        });
    });
}

function closeEmailChange() {
    var window = document.getElementById("change-email-bg");
    window.classList.remove("visible");
}

function validateForm() {
    var password = document.getElementById("new_password").value;
    var confirmPassword = document.getElementById("confirm_new_password").value;

    if (password != confirmPassword) {
        sendNotification("error", "Fehler", "Deine Passwörter stimmen nicht überein!");
        return false;
    }

    if (password.length < 8) {
        sendNotification("error", "Fehler", "Dein Passwort muss mindestens 8 Zeichen lang sein!");
        return false;
    }

    if (password.length > 64) {
        sendNotification("error", "Fehler", "Dein Passwort darf maximal 64 Zeichen lang sein!");
        return false;
    }

    if (!password.match(/[a-z]/)) {
        sendNotification("error", "Fehler", "Dein Passwort muss mindestens einen Kleinbuchstaben enthalten!");
        return false;
    }

    if (!password.match(/[A-Z]/)) {
        sendNotification("error", "Fehler", "Dein Passwort muss mindestens einen Großbuchstaben enthalten!");
        return false;
    }

    if (!password.match(/[0-9]/)) {
        sendNotification("error", "Fehler", "Dein Passwort muss mindestens eine Zahl enthalten!");
        return false;
    }

    return true;
}

function changePassword() {
    var window = document.getElementById("change-password-bg");
    window.classList.add("visible");
    var form = document.getElementById("change-password-form");
    form.addEventListener("submit", function(e) {
        e.preventDefault();
        if (!validateForm()) {
            return;
        }
        startLoading();
        $.ajax({
            type: "POST",
            url: "/settings/changepassword",
            data: $(this).serialize(),
            success: function(data) {
                type = data.split('+')[0];
                header = data.split('+')[1];
                message = data.split('+')[2];
                sendNotification(type, header, message);
                stopLoading();
                if (type == "success") {
                    location.reload();
                }
            },
            error: function(error) {
                sendNotification("error", "Fehler", "Ein Fehler ist aufgetreten! Bitte versuche es später erneut.");
            }
        });
    });
}

function closeChangePassword() {
    var window = document.getElementById("change-password-bg");
    window.classList.remove("visible");
}

function changeScrapeData() {
    window.location.href = "/?setscrapedata";
}

function deleteUserData() {
    var window = document.getElementById("delete-userdata-bg");
    window.classList.add("visible");
    var form = document.getElementById("delete-userdata-form");
    form.addEventListener("submit", function(e) {
        e.preventDefault();
        var deleteoptions = document.getElementsByClassName("delete-options");
        var checkboxes = deleteoptions[0].getElementsByTagName("input");
        var checkedOne = Array.prototype.slice.call(checkboxes).some(x => x.checked);
        if (!checkedOne) {
            sendNotification("error", "Fehler", "Du musst mindestens eine Option auswählen!");
            return;
        }
        startLoading();
        $.ajax({
            type: "POST",
            url: "/settings/deleteuserdata",
            data: $(this).serialize(),
            success: function(data) {
                type = data.split('+')[0];
                header = data.split('+')[1];
                message = data.split('+')[2];
                sendNotification(type, header, message);
                stopLoading();
                if (type == "success") {
                    location.reload();
                }
            },
            error: function(error) {
                sendNotification("error", "Fehler", "Ein Fehler ist aufgetreten! Bitte versuche es später erneut.");
            }
        });
    });
}

function closeDeleteUserData() {
    var window = document.getElementById("delete-userdata-bg");
    window.classList.remove("visible");
}

function deleteAccount() {
    var window = document.getElementById("delete-account-bg");
    window.classList.add("visible");
    var form = document.getElementById("delete-account-form");
    form.addEventListener("submit", function(e) {
        e.preventDefault();
        startLoading();
        $.ajax({
            type: "POST",
            url: "/settings/deleteaccount",
            data: $(this).serialize(),
            success: function(data) {
                type = data.split('+')[0];
                header = data.split('+')[1];
                message = data.split('+')[2];
                sendNotification(type, header, message);
                stopLoading();
                if (type == "success") {
                    location.reload();
                }
            },
            error: function(error) {
                sendNotification("error", "Fehler", "Ein Fehler ist aufgetreten! Bitte versuche es später erneut.");
            }
        });
    });
}

function closeDeleteAccount() {
    var window = document.getElementById("delete-account-bg");
    window.classList.remove("visible");
}

function removeClass(element) {
    element.parentNode.remove();
}

function addClass() {
    var class_container = document.getElementsByClassName("classes-container")[0];
    var class_element = document.createElement("div");
    class_element.classList.add("class");
    class_element.innerHTML = `<input type="text" name="class_name" placeholder="Name" required>`;
    class_element.innerHTML += `<input type="text" name="custom_name" placeholder="Name" required>`;
    class_element.innerHTML += `<input type="color" name="class_color" placeholder="Farbe" required>`;
    class_element.innerHTML += `<button class="remove-class" onclick="removeClass(this)">Entfernen</button>`;
    class_container.appendChild(class_element);
}

function saveClasses() {
    var classes = document.getElementsByClassName("class");
    var data = [];
    for (var i = 0; i < classes.length; i++) {
        var class_name = classes[i].getElementsByTagName("input")[0].value;
        var custom_name = classes[i].getElementsByTagName("input")[1].value;
        var class_color = classes[i].getElementsByTagName("input")[2].value;
        data.push({
            "name": class_name,
            "custom_name": custom_name,
            "color": class_color
        });
    }
    startLoading();
    $.ajax({
        type: "POST",
        url: "/settings/saveclasses",
        data: {
            classes: JSON.stringify(data)
        },
        success: function(data) {
            type = data.split('+')[0];
            header = data.split('+')[1];
            message = data.split('+')[2];
            sendNotification(type, header, message);
            stopLoading();
        },
        error: function(error) {
            sendNotification("error", "Fehler", "Ein Fehler ist aufgetreten! Bitte versuche es später erneut.");
        }
    });
}

function removeBreak(element) {
    element.parentNode.remove();
}

function addBreak() {
    var break_container = document.getElementsByClassName("breaks-container")[0];
    var break_element = document.createElement("div");
    break_element.classList.add("break");
    break_element.innerHTML = `<input type="text" name="break-name" placeholder="Pausen Name" required>`;
    break_element.innerHTML += `<input type="time" name="break-start" placeholder="Pausen Start" required>`;
    break_element.innerHTML += `<input type="time" name="break-end" placeholder="Pausen Ende" required>`;
    break_element.innerHTML += `<button class="remove-break" onclick="removeBreak(this)">Entfernen</button>`;
    break_container.appendChild(break_element);
}

function saveBreaks() {
    var breaks = document.getElementsByClassName("break");
    var data = [];
    for (var i = 0; i < breaks.length; i++) {
        var break_name = breaks[i].getElementsByTagName("input")[0].value;
        var break_start = breaks[i].getElementsByTagName("input")[1].value;
        var break_end = breaks[i].getElementsByTagName("input")[2].value;
        data.push({
            "name": break_name,
            "start": break_start,
            "end": break_end
        });
    }
    startLoading();
    $.ajax({
        type: "POST",
        url: "/settings/savebreaks",
        data: {
            breaks: JSON.stringify(data)
        },
        success: function(data) {
            type = data.split('+')[0];
            header = data.split('+')[1];
            message = data.split('+')[2];
            sendNotification(type, header, message);
            stopLoading();
        },
        error: function(error) {
            sendNotification("error", "Fehler", "Ein Fehler ist aufgetreten! Bitte versuche es später erneut.");
        }
    });
}

function removeTime(element) {
    element.parentNode.remove();
}

function addTime() {
    var time_container = document.getElementsByClassName("times-container")[0];
    var time_element = document.createElement("div");
    time_element.classList.add("time");
    time_element.innerHTML = `<input type="text" name="lesson-hour" placeholder="Stunde" required>`;
    time_element.innerHTML += `<input type="time" name="lesson-start" placeholder="Stunden Start" required>`;
    time_element.innerHTML += `<input type="time" name="lesson-end" placeholder="Stunden Ende" required>`;
    time_element.innerHTML += `<button class="remove-time" onclick="removeTime(this)">Entfernen</button>`;
    time_container.appendChild(time_element);
}

function saveTimes() {
    var times = document.getElementsByClassName("time");
    var data = [];
    for (var i = 0; i < times.length; i++) {
        var lesson_hour = times[i].getElementsByTagName("input")[0].value;
        var lesson_start = times[i].getElementsByTagName("input")[1].value;
        var lesson_end = times[i].getElementsByTagName("input")[2].value;
        data.push({
            "hour": lesson_hour,
            "start": lesson_start,
            "end": lesson_end
        });
    }
    startLoading();
    $.ajax({
        type: "POST",
        url: "/settings/savetimes",
        data: {
            times: JSON.stringify(data)
        },
        success: function(data) {
            type = data.split('+')[0];
            header = data.split('+')[1];
            message = data.split('+')[2];
            sendNotification(type, header, message);
            stopLoading();
        },
        error: function(error) {
            sendNotification("error", "Fehler", "Ein Fehler ist aufgetreten! Bitte versuche es später erneut.");
        }
    });
}

function removeTimetableClass(element) {
    element.parentNode.remove();
}

function addTimetableClass(element) {
    var timetable_day = element.parentNode.parentNode;
    var timetable_class = document.createElement("div");
    var day = timetable_day.getElementsByTagName("summary")[0].textContent;
    timetable_class.classList.add("timetable-class");
    timetable_class.innerHTML = `<select name="class_day" required>
                                            <option value="Montag" ${day === "Montag" ? "selected" : ""}>Montag</option>
                                            <option value="Dienstag" ${day === "Dienstag" ? "selected" : ""}>Dienstag</option>
                                            <option value="Mittwoch" ${day === "Mittwoch" ? "selected" : ""}>Mittwoch</option>
                                            <option value="Donnerstag" ${day === "Donnerstag" ? "selected" : ""}>Donnerstag</option>
                                            <option value="Freitag" ${day === "Freitag" ? "selected" : ""}>Freitag</option>
                                        </select>`;
    timetable_class.innerHTML += `<input type="text" name="class_hour" placeholder="Stunde" required>`;
    timetable_class.innerHTML += `<input type="text" name="class_subject" placeholder="Fach" required>`;
    timetable_class.innerHTML += `<input type="text" name="class_room" placeholder="Raum" required>`;
    timetable_class.innerHTML += `<input type="text" name="class_teacher" placeholder="Lehrer" required>`;
    timetable_class.innerHTML += `<button class="remove-timetable-class" onclick="removeTimetableClass(this)">Entfernen</button>`;
    timetable_day.insertBefore(timetable_class, timetable_day.lastChild);
}

function saveTimetable() {
    var timetable_classes = document.getElementsByClassName("timetable-class");
    var data = [];
    for (var i = 0; i < timetable_classes.length; i++) {
        var day = timetable_classes[i].getElementsByTagName("select")[0].value;
        var hour = timetable_classes[i].getElementsByTagName("input")[0].value;
        var subject = timetable_classes[i].getElementsByTagName("input")[1].value;
        var room = timetable_classes[i].getElementsByTagName("input")[2].value;
        var teacher = timetable_classes[i].getElementsByTagName("input")[3].value;
        data.push({
            "day": day,
            "hour": hour,
            "subject": subject,
            "room": room,
            "teacher": teacher
        });
    }
    startLoading();
    $.ajax({
        type: "POST",
        url: "/settings/savetimetable",
        data: {
            timetable: JSON.stringify(data)
        },
        success: function(data) {
            type = data.split('+')[0];
            header = data.split('+')[1];
            message = data.split('+')[2];
            sendNotification(type, header, message);
            stopLoading();
        },
        error: function(error) {
            sendNotification("error", "Fehler", "Ein Fehler ist aufgetreten! Bitte versuche es später erneut.");
        }
    });
}