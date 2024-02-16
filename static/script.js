var mode = "bright";
function toggleMode() {
    var body = document.getElementsByTagName('body')[0];
    var modeToggle = document.getElementById("darkmode-toggle");
    var brightbg = document.getElementsByClassName("brightbg")[0];
    var darkbg = document.getElementsByClassName("darkbg")[0];
    if (mode === "bright") {
        mode = "dark";
        darkbg.style.display = "block";
        brightbg.style.display = "none";
    } else {
        mode = "bright";
        darkbg.style.display = "none";
        brightbg.style.display = "block";
    }
}

function sortTable() {
    var table, rows, switching, i, x, y, shouldSwitch;
    table = document.getElementById("timetable");
    switching = true;
    while (switching) {
        switching = false;
        rows = table.getElementsByTagName("tr");
        for (i = 1; i < (rows.length - 1); i++) {
            shouldSwitch = false;
            x = rows[i].getElementsByTagName("td")[0];
            y = rows[i + 1].getElementsByTagName("td")[0];
            if (parseInt(x.innerHTML) > parseInt(y.innerHTML)) {
                shouldSwitch = true;
                break;
            }
        }
        if (shouldSwitch) {
            rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
            switching = true;
        }
    }
}
function changeActiveClass(event) {
    var navbar = document.getElementsByClassName("navbar")[0];
    var current = navbar.getElementsByClassName("active");
    current[0].classList.remove("active");
    event.target.className += " active";
    if (event.target.id === "timetable-link") {
        document.getElementById("timetable").style.display = "block";
    } else {
        document.getElementById("timetable").style.display = "none";
    }
    if (event.target.id === "homework-link") {
        document.getElementById("homework").style.display = "block";
        color_classes();
    } else {
        document.getElementById("homework").style.display = "none";
    }
}

function displayhwform() {
    var form = document.getElementsByClassName("newhwform")[0];
    if (form.style.display === "none" || form.style.display === "") {
        form.style.display = "block";
        sortClassesByColor();
    } else {
        form.style.display = "none";
    }
}

function closehwform() {
    var form = document.getElementsByClassName("newhwform")[0];
    form.style.display = "none";
}

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
        };
    return colors[class_name];
}

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
        };
    return order[class_name];
}

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

function color_classes(){
    var elements = document.getElementsByClassName('class-option');
    for (var i = 0; i < elements.length; i++) {
        var classElement = elements[i];
        var className = classElement.textContent || classElement.innerText;
        classElement.style.backgroundColor = get_class_color(className);
    }
};