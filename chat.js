var randomstring = require("randomstring");
var SocketIOFile = require('socket.io-file');
var fs = require('fs');
var modelMsg = require('./models/msg');

var users = [{ name: "hans", account: "08073", connect_id: null },
    { name: "ben", account: "08072", connect_id: null },
    { name: "eric", account: "08071", connect_id: null }
];


var rooms = [];
rooms['room1'] = ['08073', '08072'];
rooms['room2'] = ['08073', '08071'];
rooms['room3'] = ['08073', '08071', '08072'];

//modelMsg.mymy();

function myChat(io) {

    io.on('connection', function(socket) {
        var clientIp = socket.request.connection.remoteAddress;
        console.log(clientIp);



        socket.emit('connected', { users: users });

        socket.on('login', function(_d) {
            var _currentUser = null;
            var _userInRoom = [];
            //change user list
            for (var i = 0; i < users.length; i++) {
                if (users[i].account == _d.account) {
                    users[i].connect_id = socket.id;
                    _currentUser = users[i];
                    //socket.emit('returnCurrentUser', _currentUser);
                    socket.emit('login', _currentUser);
                    io.emit('updateUsersList', { users: users });
                    break;
                }
            }
            //add to room, if user has room            
            for (var key in rooms) {
                if (rooms[key].indexOf(_currentUser.account) > -1) {
                    socket.join(key);
                    _userInRoom.push(key);
                    returnRoomUsers(key);
                    //socket.broadcast.to(key).emit('attention',  _currentUser.account + ' online');
                }
            }

            socket.broadcast.emit('attention', _currentUser.account + ' online');

            socket.emit('getRooms', { rooms: _userInRoom });

            socket.on('disconnect', function() {
                var _disconnectUser;
                for (var i = 0; i < users.length; i++) {
                    if (users[i].connect_id == socket.id) {
                        users[i].connect_id = null;
                        _disconnectUser = users[i];
                        io.emit('updateUsersList', { users: users });
                        break;
                    }
                }
                //renew users status
                for (var key in rooms) {
                    if (rooms[key].indexOf(_disconnectUser.account) > -1) {
                        returnRoomUsers(key);
                    }
                }
            });




            socket.on('sendMessage', function(_d) {
                createMsgAndBrodcast(_d.owner, _d.room, _d.text);
            })

            socket.on('readMessage', function(_d) {

                modelMsg.findOneAndUpdate({
                        room: _d.room,
                        id: _d.id,
                        users: {
                            $elemMatch: {
                                user: _d.account,
                                read_time: null
                            }
                        }
                    }, {
                        $set: {
                            'users.$.read_time': currentDate()
                        },
                        $inc: {
                            read_count: 1
                        }

                    }, { new: true },
                    function(err, _p) {
                        if (_p) {
                            io.in(_d.room).emit('readMessage', _p);
                        }
                    })

            })

            //get rooms users
            socket.on('getRoomUsers', function(_d) {
                returnRoomUsers(_d.room);
            })

            //get history msg
            socket.on('getHistoryMsg', function(_d) {
                //console.log("S");
                var output_msg = [];
                modelMsg.find({
                    room: _d.room
                }).sort({ create_date: -1 }).limit(20).exec(function(err, _re) {
                    _re.reverse();
                    for (var i = 0; i < _re.length; i++) {
                        output_msg.push(_re[i]);
                    }

                    socket.emit('getHistoryMsg', { messages: output_msg, room: _d.room });
                })
            })

            socket.on('getUnReadMessage', function(_d) {

                modelMsg.find({
                    room: _d.room,
                    users: {
                        $elemMatch: {
                            user: _d.account,
                            read_time: null
                        }
                    }
                }, function(err, _re) {
                    //console.log(_re);
                    socket.emit('getUnReadMessage', {
                        room: _d.room,
                        msg: _re
                    });
                })


            })


            socket.on('getUnReadMessageCount', function(_d) {
                modelMsg.find({
                    room: _d.room,
                    users: {
                        $elemMatch: {
                            user: _d.account,
                            read_time: null
                        }
                    }
                }, function(err, _re) {
                    socket.emit('getUnReadMessageCount', {
                        room: _d.room,
                        count: _re.length
                    });
                })
            })

            //upload file
            var fileUploader = new SocketIOFile(socket, {
                uploadDir: {
                    file: 'frontend/file'
                }
            });

            fileUploader.on('complete', fileUploadComplete);

        });
    });

    function fileUploadComplete(data) {
        var _d = data.data;
        var newFileName = data.name.split('.');
        newFileName = randomstring.generate() + "." + newFileName[newFileName.length - 1];
        fs.rename(`${data.path}/${data.name}`, `${data.path}/${newFileName}`, function(err) {
            if (err) throw err;
            createMsgAndBrodcast(_d.owner, _d.room, `[img:${newFileName}]`);
        })
    }

    function createMsgAndBrodcast(_owner, _room, _msg) {

        var _m = {
            owner: _owner,
            room: _room,
            msg: _msg,
            users: [],
            create_date: currentDate(),
            id: randomstring.generate()
        }

        for (var i = 0; i < rooms[_room].length; i++) {
            _m.users.push({
                user: rooms[_room][i],
                read_time: null
            })
        }

        var _msgMongo = new modelMsg(_m);

        _msgMongo.save().then(function(_p) {
            io.in(_room).emit('getMessage', _p);
        })

    }

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

        io.in(_d).emit('getRoomUsers', { room: _d, users: _out });
    }
}

function currentDate() {
    var date = new Date();
    var year = date.getFullYear();
    var month = ("0" + (date.getMonth() + 1)).slice(-2);
    var day = ("0" + date.getDate()).slice(-2);
    var hours = ("0" + date.getHours()).slice(-2);
    var minutes = ("0" + date.getMinutes()).slice(-2);
    var seconds = ("0" + date.getSeconds()).slice(-2);
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}



module.exports = myChat;
