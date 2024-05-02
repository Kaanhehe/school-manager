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