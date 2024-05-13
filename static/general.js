// Author: Kaanhehe
// used to toggle the darkmode with the nice slider in the top right
var mode = getModeFromCookies() || "bright";
// used to store the type of the notification, so it can be removed when clicked
var notificationtype = "";

$(document).ready(function() {
    setMode(mode);
});

// Makes the navbar work
function changeActiveClass(event) {
    var navbar = document.getElementsByClassName("navbar")[0];
    var current = navbar.getElementsByClassName("active");
    var content = document.getElementsByClassName(event.target.id.replace("-link", ""))[0];
    var currentcontent = document.getElementsByClassName(current[0].id.replace("-link", ""))[0];
    if (content === currentcontent) {
        return;
    }
    current[0].classList.remove("active");
    event.target.className += " active";

    content.style.display = "block";
    currentcontent.style.display = "none";
    setTimeout(function() {
        content.classList.add("visible");
    }, 10);
}

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

function sendNotification(type, header, message) {
    var notificationclass = document.getElementsByClassName("notification")[0];
    var notificationheader = document.getElementById("notification-header");
    var notificationtext = document.getElementById("notification-text");
    
    // remove the old notification if it is still visible
    if (notificationclass.classList.contains("visible")) {
        notificationclass.classList.remove("visible");
        notificationclass.classList.remove(notificationtype);
        notificationheader.innerHTML = "";
        notificationtext.innerHTML = "";
    }

    // set the new notification
    notificationheader.innerHTML = header;
    notificationtext.innerHTML = message;
    notificationclass.classList.add(type);
    notificationclass.classList.add("visible");
    notificationtype = type;

    // hide the notification after 3 seconds
    setTimeout(function() {
        notificationclass.classList.remove("visible");
        // wait for the animation to finish
        setTimeout(function() {
            notificationclass.classList.remove(type);
            notificationheader.innerHTML = "";
            notificationtext.innerHTML = "";
        }, 500);
    }, 3000);
}

// hide the notification when clicked
function hideNotification() {
    var notificationclass = document.getElementsByClassName("notification")[0];
    notificationclass.classList.remove("visible");
    notificationclass.classList.remove(notificationtype);
}