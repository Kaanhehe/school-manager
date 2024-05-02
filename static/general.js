// Author: Kaanhehe
// used to toggle the darkmode with the nice slider in the top right
var mode = getModeFromCookies() || "bright";

$(document).ready(function() {
    setMode(mode);
});

function setMode(mode) {
    var modeSwitch = document.getElementById("darkmode-toggle");
    var brightbg = document.getElementsByClassName("brightbg")[0];
    var darkbg = document.getElementsByClassName("darkbg")[0];
    var navbar = document.getElementsByClassName("navbar")[0];
    var navbar_elements = document.getElementsByClassName("navbar-elements");
    
    if (mode === "bright") {
        brightbg.classList.add("visible");
        navbar.style.backgroundColor = "rgba(255, 255, 255, 0.6)";
        modeSwitch.checked = false;
        for (var i = 0; i < navbar_elements.length; i++) {
            navbar_elements[i].classList.add("bright");
        }
    } else {
        darkbg.classList.add("visible");
        navbar.style.backgroundColor = "rgba(24, 24, 24, 0.7)";
        modeSwitch.checked = true;
        for (var i = 0; i < navbar_elements.length; i++) {
            navbar_elements[i].classList.remove("bright");
        }
    }
}

function toggleMode() {
    var brightbg = document.getElementsByClassName("brightbg")[0];
    var darkbg = document.getElementsByClassName("darkbg")[0];
    var navbar = document.getElementsByClassName("navbar")[0];
    var navbar_elements = document.getElementsByClassName("navbar-elements");
    if (mode === "bright") {
        mode = "dark";
        darkbg.classList.add("visible");
        brightbg.classList.remove("visible");
        navbar.style.backgroundColor = "rgba(24, 24, 24, 0.8)";
        for (var i = 0; i < navbar_elements.length; i++) {
            navbar_elements[i].classList.remove("bright");
        }
    } else {
        mode = "bright";
        brightbg.classList.add("visible");
        darkbg.classList.remove("visible");
        navbar.style.backgroundColor = "rgba(255, 255, 255, 0.6)";
        for (var i = 0; i < navbar_elements.length; i++) {
            navbar_elements[i].classList.add("bright");
        }
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