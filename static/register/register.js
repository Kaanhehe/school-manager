function validateForm() {
    var password = document.getElementById("password").value;
    var confirmPassword = document.getElementById("confirm_password").value;

    if (password != confirmPassword) {
        alert("Deine Passwörter stimmen nicht überein!");
        return false;
    }

    if (password.length < 8) {
        alert("Dein Passwort muss mindestens 8 Zeichen lang sein!");
        return false;
    }

    if (password.length > 64) {
        alert("Dein Passwort darf maximal 64 Zeichen lang sein!");
        return false;
    }

    if (!password.match(/[a-z]/)) {
        alert("Dein Passwort muss mindestens einen Kleinbuchstaben enthalten!");
        return false;
    }

    if (!password.match(/[A-Z]/)) {
        alert("Dein Passwort muss mindestens einen Großbuchstaben enthalten!");
        return false;
    }

    if (!password.match(/[0-9]/)) {
        alert("Dein Passwort muss mindestens eine Zahl enthalten!");
        return false;
    }

    return true;
}

function SubmitRegister(e) {
    e.preventDefault();
    if (!validateForm()) {
        return;
    }
    var username = document.getElementById("username").value;
    if (username.length < 3) {
        sendNotification("error", "Fehler", "Dein Benutzername muss mindestens 3 Zeichen lang sein!");
        return;
    }
    if (username.length > 32) {
        sendNotification("error", "Fehler", "Dein Benutzername darf maximal 32 Zeichen lang sein!");
        return;
    }
    $.ajax({
        type: "POST",
        url: "/register",
        data: $("#register-form").serialize(),
        success: function(response) {
            if (response["success"]) {
                return window.location.href = "/login";
            } else {
                errorelement = document.getElementsByClassName("form-error")[0];
                errorelement.innerHTML = response["error"];
                errorelement.style.display = "block";
            }
        },
        error: function(error) {
            alert("Ein Fehler ist aufgetreten! Bitte versuche es später erneut.")
        }
    });
}

$(document).ready(function() {
    $("#register-form").submit(SubmitRegister);
});