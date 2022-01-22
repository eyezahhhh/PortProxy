function getCookie(cname) {
	let name = cname + "=";
	let decodedCookie = decodeURIComponent(document.cookie);
	let ca = decodedCookie.split(';');
	for(let i = 0; i <ca.length; i++) {
		let c = ca[i];
		while (c.charAt(0) == ' ') {
			c = c.substring(1);
		}
		if (c.indexOf(name) == 0) {
			return c.substring(name.length, c.length);
		}
	}
	return "";
}

function setCookie(cname, cvalue, exdays) {
	const d = new Date();
	d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
	let expires = "expires=" + d.toUTCString();
	document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getQueryVariable(variable) {
	var query = window.location.search.substring(1);
	var vars = query.split("&");
	for (var i = 0; i < vars.length; i++) {
		var pair = vars[i].split("=");
		if (pair[0] == variable) return pair[1];
	}
	return false;
}

var token = getQueryVariable("token");

if (!token) {
	var cookie = getCookie("portproxy-token");
	if (cookie == "") {
		window.location.href = "https://eyezah.com/authenticate/?client-id=41438&identifier=" + btoa(location);
	} else {
		$.get( "https://eyezah.com/authenticate/api/get-user", {token: cookie})
		.done(function(data) {
			if (!data.id) {
				window.location.href = "https://eyezah.com/authenticate/?client-id=41438&identifier=" + btoa(location);
			} else {
				userData = data;
				start();
			}
		}).fail(function(e) {
			console.log("server failure", e);
		});
	}
} else {
	setCookie("portproxy-token", token, 30);
	window.location.href = window.location.protocol + "//" + window.location.hostname + ":" + window.location.port;
}

var userData;

function getGeneralStats() {
	$.get( "https://eyezah.com/portproxy/api/stats")
	.done(function(data) {
		console.log(data);
		document.getElementById("general-stats-stat").innerHTML = data["available ports"] + "/" + (data["available ports"] + data["running servers"]);
		setTimeout(function() {
			getGeneralStats();
		}, 4000);
	}).fail(function(e) {
		console.log("server failure", e);
		setTimeout(function() {
			getGeneralStats();
		}, 4000);
	});
}

var socket;

function openServerForm() {
	showingStats = 0;
	document.getElementById("create-server").style.opacity = 0;
	document.getElementById("server-info-container").style.opacity = 0;
	//document.getElementById("create-form-message").innerHTML = "";
	setTimeout(function() {
		document.getElementById("create-server").style.display = "none";
		document.getElementById("server-info-container").style.display = "none";
		document.getElementById("create-form").style.display = "block";
		setTimeout(function() {
			document.getElementById("create-form").style.opacity = 1;
		}, 10);
	}, 200);
}

var showingStats = 0;

function showServerStats() {
	showingStats = 1;
	document.getElementById("create-server").style.opacity = 0;
	document.getElementById("create-form").style.opacity = 0;
	document.getElementById("create-form-message").innerHTML = "";
	setTimeout(function() {
		document.getElementById("create-server").style.display = "none";
		document.getElementById("create-form").style.display = "none";
		document.getElementById("server-info-container").style.display = "block";
		setTimeout(function() {
			document.getElementById("server-info-container").style.opacity = 1;
		}, 10);
	}, 200);
}

function processFormServer(e) {
	if (e.preventDefault) e.preventDefault();
	
	var serverId = userData.id;
	var password = getCookie("portproxy-token");
	var ip = document.getElementById("create-address").value;
	var port = document.getElementById("create-port").value;
	var region = document.getElementById("create-region").options[document.getElementById("create-region").selectedIndex].value;
	console.log(region);
	
	
	console.log(serverId, password, ip, port, region);
	
	socket.emit("server", serverId, password, ip, port, region);
	
	
	return false;
}

var form = document.getElementById('create-form');
if (form.attachEvent) {
    form.attachEvent("submit", processFormServer);
} else {
    form.addEventListener("submit", processFormServer);
}

function stopServer() {
	socket.emit("stop");
}










function start() {
	getGeneralStats();
	socket = io();
	
	socket.on("status", function(msg) {
		console.log(msg);
		document.getElementById("create-form-message").innerHTML = msg;
	});
	
	socket.on("stats", function(msg) {
		console.log(JSON.parse(msg));
		msg = JSON.parse(msg);
		document.getElementById("server-clientcount").innerHTML = "Clients: " + msg.clients;
		document.getElementById("server-ip").innerHTML = msg.server;
		document.getElementById("server-ip").href = msg.server;
		if (!showingStats) showServerStats();
	});
	
	socket.on("stopped", function() {
		openServerForm();
	})
}




var x, i, j, l, ll, selElmnt, a, b, c;
/* Look for any elements with the class "custom-select": */
x = document.getElementsByClassName("custom-select");
l = x.length;
for (i = 0; i < l; i++) {
  selElmnt = x[i].getElementsByTagName("select")[0];
  ll = selElmnt.length;
  /* For each element, create a new DIV that will act as the selected item: */
  a = document.createElement("DIV");
  a.setAttribute("class", "select-selected");
  a.innerHTML = selElmnt.options[selElmnt.selectedIndex].innerHTML;
  x[i].appendChild(a);
  /* For each element, create a new DIV that will contain the option list: */
  b = document.createElement("DIV");
  b.setAttribute("class", "select-items select-hide");
  for (j = 1; j < ll; j++) {
    /* For each option in the original select element,
    create a new DIV that will act as an option item: */
    c = document.createElement("DIV");
    c.innerHTML = selElmnt.options[j].innerHTML;
    c.addEventListener("click", function(e) {
        /* When an item is clicked, update the original select box,
        and the selected item: */
        var y, i, k, s, h, sl, yl;
        s = this.parentNode.parentNode.getElementsByTagName("select")[0];
        sl = s.length;
        h = this.parentNode.previousSibling;
        for (i = 0; i < sl; i++) {
          if (s.options[i].innerHTML == this.innerHTML) {
            s.selectedIndex = i;
            h.innerHTML = this.innerHTML;
            y = this.parentNode.getElementsByClassName("same-as-selected");
            yl = y.length;
            for (k = 0; k < yl; k++) {
              y[k].removeAttribute("class");
            }
            this.setAttribute("class", "same-as-selected");
            break;
          }
        }
        h.click();
    });
    b.appendChild(c);
  }
  x[i].appendChild(b);
  a.addEventListener("click", function(e) {
    /* When the select box is clicked, close any other select boxes,
    and open/close the current select box: */
    e.stopPropagation();
    closeAllSelect(this);
    this.nextSibling.classList.toggle("select-hide");
    this.classList.toggle("select-arrow-active");
  });
}

function closeAllSelect(elmnt) {
  /* A function that will close all select boxes in the document,
  except the current select box: */
  var x, y, i, xl, yl, arrNo = [];
  x = document.getElementsByClassName("select-items");
  y = document.getElementsByClassName("select-selected");
  xl = x.length;
  yl = y.length;
  for (i = 0; i < yl; i++) {
    if (elmnt == y[i]) {
      arrNo.push(i)
    } else {
      y[i].classList.remove("select-arrow-active");
    }
  }
  for (i = 0; i < xl; i++) {
    if (arrNo.indexOf(i)) {
      x[i].classList.add("select-hide");
    }
  }
}

/* If the user clicks anywhere outside the select box,
then close all select boxes: */
document.addEventListener("click", closeAllSelect); 