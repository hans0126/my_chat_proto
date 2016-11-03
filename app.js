var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var chat = require("./chat")(io);
var path = require("path");
var mongoose = require('mongoose');

mongoose.connect("mongodb://localhost:27017/chat");




var frontendPath = path.resolve(__dirname + '/frontend/');

app.use(express.static(frontendPath));

app.get('/', function(req, res) {
    res.sendfile(path.join('frontend', 'index.html'));
});

app.use(express.static(__dirname + '/node_modules/socket.io/node_modules/socket.io-client'));
app.use(express.static(__dirname + '/node_modules/socket.io-file-client'));



http.listen(3000, function() {
    console.log('listening on *:3000');
});
