var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require("path");
var randomstring = require("randomstring");



var users = [{ name: "hans", account: "08073", connect_id: null, admin: false },
    { name: "ben", account: "08072", connect_id: null, admin: false },
    { name: "admin", account: "00001", connect_id: null, admin: true },
    { name: "will", account: "08069", connect_id: null, admin: false }
];

var messages = [];

var accounts = ['hans'];

var rooms = [];
rooms['room1'] = ['08073', '08072'];
rooms['room2'] = ['08073', '08069'];


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

    socket.emit('connectOK', { users: users });

    socket.on('login', function(_d) {
        var _currentUser = null;
        var _userInRoom = [];
        //change user list
        for (var i = 0; i < users.length; i++) {
            if (users[i].account == _d.account) {
                users[i].connect_id = socket.id;
                _currentUser = users[i];
                socket.emit('return current user', _currentUser);
                io.emit('update users list', { users: users });
                break;
            }
        }
        //add to room, if user has room
        //admin has all room
        for (var key in rooms) {

            if (_currentUser.admin) {
                socket.join(key);
                _userInRoom.push(key);
            } else {
                if (rooms[key].indexOf(_currentUser.account) > -1) {
                    socket.join(key);
                    _userInRoom.push(key);
                    returnRoomUsers(key);
                    //socket.broadcast.to(key).emit('message', 'join ' + _currentUser.account);
                }
            }


        }

        socket.on('disconnect', function() {
            var _cu;
            for (var i = 0; i < users.length; i++) {
                if (users[i].connect_id == socket.id) {
                    users[i].connect_id = null;
                    _cu = users[i];
                    io.emit('update users list', { users: users });
                    break;
                }
            }

            for (var key in rooms) {
                if (rooms[key].indexOf(_cu.account) > -1) {                 
                    returnRoomUsers(key);
                    //socket.broadcast.to(key).emit('message', 'join ' + _currentUser.account);
                }
            }


        });

        socket.emit('get rooms', { rooms: _userInRoom });


        socket.on('send message', function(_d) {
            var _m = {
                owner: _d.owner,
                room: _d.room,
                text: _d.text,
                users: [],
                create_date: new Date().getTime(),
                id: randomstring.generate()
            }

            for (var i = 0; i < rooms[_d.room].length; i++) {
                _m.users.push({
                    user: rooms[_d.room][i],
                    read_time: null
                })
            }

            messages.push(_m);

            io.in(_d.room).emit('get message', _m);


            // socket.to(_d.room).emit('get message', _d.text);

        })

        socket.on('read message', function(_d) {

            for (var i = 0; i < messages.length; i++) {
                if (messages[i].id == _d.id) {
                    for (j = 0; j < messages[i].users.length; j++) {
                        if (messages[i].users[j].user == _currentUser.account) {
                            messages[i].users[j].read_time = new Date().getTime();
                            break;
                        }
                    }

                    break;
                }
            }

        })

        socket.on('get room users', function(_d) {
            returnRoomUsers(_d.room);
        })



        socket.on('get history msg', function(_d) {

            var output_msg = [];
            for (var i = 0; i < messages.length; i++) {
                if (messages[i].room == _d.room) {
                    output_msg.push(messages[i]);
                }
            }


            socket.emit('return history msg', { messages: output_msg, room: _d.room });

        })


        function returnRoomUsers(_d) {
            var _out = [];
            for (var i = 0; i < rooms[_d].length; i++) {
                for (var j = 0; j < users.length; j++) {

                    if (rooms[_d][i] == users[j].account) {
                        _out.push(users[j]);
                        break;
                    }
                }
            }

            io.in(_d).emit('return room users', { room: _d, users: _out });

        }




        //retur rooms back to users





    });





});


http.listen(3000, function() {
    console.log('listening on *:3000');
});
