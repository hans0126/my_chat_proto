var randomstring = require("randomstring");
var SocketIOFile = require('socket.io-file');
var fs = require('fs');

var users = [{ name: "hans", account: "08073", connect_id: null },
    { name: "ben", account: "08072", connect_id: null },  
    { name: "will", account: "08069", connect_id: null }
];

var messages = [];

var accounts = ['hans'];

var rooms = [];
rooms['room1'] = ['08073', '08072'];
rooms['room2'] = ['08073', '08069'];


function myChat(io) {


    io.on('connection', function(socket) {
        console.log('a user connected');

        var imageUploader = new SocketIOFile(socket, {
            uploadDir: {
                image: 'frontend/file'
            }
        });

        imageUploader.on('start', start);
        imageUploader.on('stream', stream);
        imageUploader.on('complete', complete);


        function start(data) {
            console.log('Upload started');
        }

        function stream(data) {
            console.log('Streaming... ' + data.uploaded + ' / ' + data.size);
        }

        function complete(data) {
            var _d = data.data;
            var newFileName = data.name.split('.');
            newFileName = randomstring.generate() + "." + newFileName[newFileName.length - 1];
            fs.rename(`${data.path}/${data.name}`, `${data.path}/${newFileName}`, function(err) {
                if (err) throw err;

                data.name = newFileName;

                var _m = {
                    owner: _d.owner,
                    room: _d.room,
                    text: `[img:${newFileName}]`,
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



                //io.emit('ss',data);
            })


        }



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

                if (rooms[key].indexOf(_currentUser.account) > -1) {
                    socket.join(key);
                    _userInRoom.push(key);
                    returnRoomUsers(key);
                    //socket.broadcast.to(key).emit('message', 'join ' + _currentUser.account);
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
                console.log(_m);
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
                console.log(messages);
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

}



module.exports = myChat;
