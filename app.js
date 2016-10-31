var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require("path");



var accounts = ['hans'];

var rooms = ['aroom','broom'];

var frontendPath = path.resolve(__dirname + '/frontend/');


app.use(express.static(frontendPath));

app.get('/', function(req, res) {
    res.sendfile(path.join('frontend', 'index.html'));
});


/*
1.rooms list must create



2.user login 
users['connect id'] = {name:name}

3.rooms[rooms id] = {users:[connect id]={name:name}}




*/

io.on('connection', function(socket) {
    console.log('a user connected');
    var _currentUser = null;
    socket.emit('connectOK', { id: socket.id });


    socket.on('login', function(_d) {
    	_currentUser = _d.account;
        if (accounts.indexOf(_currentUser) > -1) {
            socket.emit('login ok', {rooms:rooms});
        } else {
            socket.emit('login error', 'login error');
        }

    });

    socket.on('join room',function(_d){
    	
    	socket.join(_d);
    	socket.broadcast.to(_d).emit('message','join '+_d);
    	//console.log(socket.adapter.rooms[_d]);
    	//console.log(io.of('/').clients());

    	var c = io.sockets.adapter.rooms[_d]; //get online user (連線資訊)
    	console.log(c);
    })



});


http.listen(3000, function() {
    console.log('listening on *:3000');
});
