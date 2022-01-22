var clientVersion = "2.1.1";

const net = require('net');
const io = require('socket.io-client');
const streamify = require('@geut/socket.io-streamify');
const open = require('open');
const request = require("async-request");
const express = require('express');
const app = express();
const http = require('http');
const httpServer = http.createServer(app);
const {Server} = require("socket.io");
const ioWeb = new Server(httpServer);
const fs = require("fs");
var serverSocket;
var running = 0;
var usingPort = 0;
var currentIp = "";

ioWeb.on('connection', (websocket) => {
	if (running) {
		websocket.emit("stats", JSON.stringify(returnStats()));
	}
	websocket.on("server", function(id, token, ip, port, region) {
		shutDownServices();
		startServer(id, token, ip, port, region, websocket);
	});
	websocket.on("stop", function() {
		shutDownServices();
		ioWeb.emit("stopped");
	});
});

var longTermData = {
	"server": {
		"streams": {}
	}
}

function shutDownServices() {
	running = 0;
	try {
		serverSocket.close();
	} catch {}
	serverSocket = null;
	var i = 0;
	while (i < Object.keys(longTermData.server.streams).length) {
		var thisStream = Object.keys(longTermData.server.streams)[i];
		try {
			//console.log(longTermData.server.streams[thisStream]);
			longTermData.server.streams[thisStream].destroy();
			//console.log("DESTROY SUCCEEDED");
		} catch (e) {
			//console.log(e);
		}
		i++;
	}
	//console.log("data:", longTermData);
	longTermData.server.streams = {};
	//console.log("service cleanup finished");
}

function returnStats() {
	var out = {
		"server": usingPort,
		"clients": Object.keys(longTermData.server.streams).length
	};
	return out;
}

async function startServer(username, token, ip, port, region, websocket) {
	if (ip.trim() == "" || port.trim() == "" || region == "0") {
		websocket.emit("status", "Please specify the address, port & region");
		return;
	}
	if (isNaN(port) || port.indexOf(".") != -1 || parseInt(port) < 1 || parseInt(port) > 65535) {
		websocket.emit("status", "Port must be a number between 1 and 65535");
		return;
	}
	websocket.emit("status", "Connecting");
	var nodeData = await request("https://eyezah.com/portproxy/api/get-node?token=" + token + "&region=" + region);
	try {
		nodeData = JSON.parse(nodeData.body);
	} catch {
		websocket.emit("status", "The mothership broke, try again later");
		return;
	}
	if (nodeData.error) {
		if (nodeData.error == "invalid token") {
			websocket.emit("status", "Your login has expired! Refresh the page to try again");
			process.exit();
			return;
		}
		if (nodeData.error == "invalid region") {
			websocket.emit("status", "That's an invalid region");
			return;
		}
		websocket.emit("status", "The mothership broke, try again later");
		return;
	}
	currentIp = nodeData.hostname;
	var socket = io.connect(nodeData.webserver + ":" + nodeData["info port"], {reconnect: true});
	serverSocket = socket;
	socket.on('connect', function (socket) {
		websocket.emit("status", "Connected to mothership");
		//console.log("connected");
	});
	
	socket.on("port", function(foundPort) {
		//console.log("RECIEVED PORT " + foundPort);
		usingPort = foundPort;
	});

	socket.on("new socket", function(id) {
		createStream(id);
		//console.log(id);
	});
	socket.on("auth status", function(status) {
		//console.log("auth status:", status);
		//console.log(status);
		if (status == "passed") {
			running = 1;
			ioWeb.emit("status", "Started server!");
			setTimeout(function() {
				if (running) ioWeb.emit("stats", JSON.stringify(returnStats()));
			}, 1000);
		} else if (status == "already") {
			websocket.emit("status", "You already have an active server");
		} else if (status == "server error") {
			websocket.emit("status", "The mothership broke, try again later");
		} else if (status == "full") {
			websocket.emit("status", "There are no available servers right now. Try a different region");
		} else if (status == "outdated") {
			websocket.emit("status", "Your client is outdated!");
		} else {
			//console.log(status);
			websocket.emit("status", "Your login has expired! Refresh the page to try again");
			process.exit();
		}
	});
	
	socket.emit("authentication", username, token, clientVersion);
	
	socket.on("disconnect", function() {
		shutDownServices();
		ioWeb.emit("stopped");
	});
	
	function createStream(id) {
		const stream = streamify(nodeData.webserver + ":" + nodeData["data port"]);
		var authStatus = "failed";
		longTermData.server.streams[id] = stream;
		stream.on("connect", function() {
			var json = {
				"networkProxyType": "socket creation",
				"networkProxyUsername": username,
				"networkProxyId": id
			};
			stream.write(JSON.stringify(json));
			//console.log("created new stream");
			var to = net.createConnection({
				host: ip,
				port: port
			});
			stream.pipe(to);
			to.pipe(stream);
			
			if (running) ioWeb.emit("stats", JSON.stringify(returnStats()));
			
			stream.on("close", function() {
				//console.log("SERVER STREAM WAS CLOSED");
				setTimeout(function() {
					try {
						to.destroy();
						//console.log("destroyed");
					} catch (e) {
						//console.log(e);
					}
					try {
						longTermData.server.streams[id].destroy();
						//console.log("destroying stream here");
						delete longTermData.server.streams[id];
						//console.log(longTermData.server.streams);
					} catch (e) {
						//console.log(e);
					}
					if (running) ioWeb.emit("stats", JSON.stringify(returnStats()));
				}, 0);
			});
		});
		stream.on("data", chunk => {
			//console.log("got data");
		});
	}
}

app.get('/*', (req, res) => {
	var url = req.url;
	if (url.includes("?")) {
		url = url.substring(0, url.indexOf('?'));
	}
	if (url.includes("#")) {
		url = url.substring(0, url.indexOf('#'));
	}
	if (url.startsWith("/api/")) {
		//console.log("api request");
	} else if (url == "/") {
		res.sendFile(__dirname + '/static/index.html');
	} else {
		if (fs.existsSync(__dirname + "/static" + url)) {
			res.sendFile(__dirname + '/static' + url);
		} else {
			//console.log("file doesnt exist");
			res.send("");
		}
	}
});

function getRandomInt(max) {
	return Math.floor(Math.random() * max);
}

var webserverTries = 0;
var webserverPort = 0;
var tryingPort = 3000;

httpServer.on("error", function() {
	//console.log("CAUGHT HTTP SERVER ERROR");
	var port = 1000 + getRandomInt(64536);
	webserverTries++;
	if (webserverTries > 10) {
		console.log("Couldn't start the internal webserver");
		tryingPort = 0;
		process.exit();
	} else {
		tryingPort = port;
		startWebserver(port);
	}
});

function startWebserver(port) {
	httpServer.listen(port, () => {
		setTimeout(function() {
			if (port == tryingPort) {
				webserverPort = port;
				console.log('listening on http://localhost:' + port);
				open('http://localhost:' + port);
			}
		}, 1000);
	});
}

startWebserver(3000);

process.on('uncaughtException', function(err) {
	console.log('Caught exception: ' + err);
});