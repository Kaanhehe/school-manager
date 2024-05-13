function changeUsername() {
    var window = document.getElementById("change-username-bg");
    window.classList.add("visible");
    var form = document.getElementById("change-username-form");
    form.addEventListener("submit", function(e) {
        e.preventDefault();
        var username = document.getElementsByTagName("new_username").value;
        $.ajax({
            type: "POST",
            url: "/settings/changeusername",
            data: $(this).serialize(),
            success: function(data) {
                type = data.split('+')[0];
                header = data.split('+')[1];
                message = data.split('+')[2];
                console.log(type, header, message);
                sendNotification(type, header, message);
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
        $.ajax({
            type: "POST",
            url: "/settings/changeemail",
            data: $(this).serialize(),
            success: function(data) {
                type = data.split('+')[0];
                header = data.split('+')[1];
                message = data.split('+')[2];
                console.log(type, header, message);
                sendNotification(type, header, message);
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
        $.ajax({
            type: "POST",
            url: "/settings/changepassword",
            data: $(this).serialize(),
            success: function(data) {
                type = data.split('+')[0];
                header = data.split('+')[1];
                message = data.split('+')[2];
                console.log(type, header, message);
                sendNotification(type, header, message);
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
        $.ajax({
            type: "POST",
            url: "/settings/deleteuserdata",
            data: $(this).serialize(),
            success: function(data) {
                type = data.split('+')[0];
                header = data.split('+')[1];
                message = data.split('+')[2];
                console.log(type, header, message);
                sendNotification(type, header, message);
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
        $.ajax({
            type: "POST",
            url: "/settings/deleteaccount",
            data: $(this).serialize(),
            success: function(data) {
                type = data.split('+')[0];
                header = data.split('+')[1];
                message = data.split('+')[2];
                console.log(type, header, message);
                sendNotification(type, header, message);
                if (type == "success") {
                    window.location.href = "/logout";
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