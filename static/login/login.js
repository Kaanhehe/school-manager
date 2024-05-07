function SubmitLogin(e) {
    e.preventDefault();
    $.ajax({
        type: "POST",
        url: "/login",
        data: $("#login-form").serialize(),
        success: function(response) {
            if (response["success"]) {
                window.location.href = "/";
            } if (response["warning"]) {
                window.location.href = "/?setscrapedata"
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
    $("#login-form").submit(SubmitLogin);
});