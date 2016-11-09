var randomstring = require("randomstring");
var SocketIOFile = require('socket.io-file');
var fs = require('fs');
var _ = require('lodash');
var modelMsg = require('./models/msg');

var users = [{ name: "hans", account: "08073", connect_id: null },
    { name: "ben", account: "08072", connect_id: null },
    { name: "eric", account: "08071", connect_id: null }
];


var rooms = [];

rooms.push({
    room_id: 'room1',
    room_name: '08073_08072',
    users: ['08073', '08072'],
    type: 0
})

rooms.push({
    room_id: 'room2',
    room_name: '08071_08073',
    users: ['08073', '08071'],
    type: 0
})

rooms.push({
    room_id: 'room3',
    room_name: '08073_08071_08072',
    users: ['08073', '08071', '08072'],
    type: 1
})

//modelMsg.mymy();

function myChat(io) {

    io.on('connection', function(socket) {
        var clientIp = socket.request.connection.remoteAddress;
        console.log(clientIp);

        socket.emit('connected', { users: users });

        socket.on('login', function(_d) {
            var _currentUser = null;
            var _userInRoom = [];
            //get current user info
            var _currentUser = _.find(users, { account: _d.account });
            _currentUser.connect_id = socket.id;
            //put login message
            socket.emit('login', _currentUser);
            //change user list
            io.emit('updateUsersList', { users: users });

            _.forEach(rooms, function(_v) {
                if (_v.users.indexOf(_currentUser.account) > -1) {
                    socket.join(_v.room_id);
                    _userInRoom.push(_v);
                    returnRoomUsers(_v.room_id);
                }

            })

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
                /*
                for (var key in rooms) {
                    if (rooms[key].indexOf(_disconnectUser.account) > -1) {
                        returnRoomUsers(key);
                    }
                }
                */
            });




            socket.on('sendMessage', function(_d) {
                createMsgAndBrodcast(_d.owner, _d.room_id, _d.text);
            })

            socket.on('readMessage', function(_d) {
               
                modelMsg.findOneAndUpdate({
                        room_id: _d.room_id,
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
                            io.in(_d.room_id).emit('readMessage', _p);
                        }
                    })

            })

            //get rooms users
            socket.on('getRoomUsers', function(_d) {
                returnRoomUsers(_d.room);
            })

            //get history msg
            socket.on('getHistoryMsg', function(_d) {

                var output_msg = [];
                modelMsg.find({
                    room_id: _d.room_id
                }).sort({ create_date: -1 }).limit(20).exec(function(err, _re) {
                    _re.reverse();
                    for (var i = 0; i < _re.length; i++) {
                        output_msg.push(_re[i]);
                    }

                    socket.emit('getHistoryMsg', { messages: output_msg, room_id: _d.room_id });
                })
            })

            socket.on('getUnReadMessage', function(_d) {

                modelMsg.find({
                    room_id: _d.room_id,
                    users: {
                        $elemMatch: {
                            user: _d.account,
                            read_time: null
                        }
                    }
                }, function(err, _re) {
                    //console.log(_re);
                    socket.emit('getUnReadMessage', {
                        room_id: _d.room_id,
                        msg: _re
                    });
                })


            })


            socket.on('getUnReadMessageCount', function(_d) {
                //console.log(_d);
                modelMsg.find({
                    room_id: _d.room_id,
                    users: {
                        $elemMatch: {
                            user: _d.account,
                            read_time: null
                        }
                    }
                }, function(err, _re) {
                    socket.emit('getUnReadMessageCount', {
                        room_id: _d.room_id,
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
            createMsgAndBrodcast(_d.owner, _d.room_id, `[img:${newFileName}]`);
        })
    }

    function createMsgAndBrodcast(_owner, _room_id, _msg) {

        var _m = {
            owner: _owner,
            room_id: _room_id,
            msg: _msg,
            users: [],
            create_date: currentDate(),
            id: randomstring.generate()
        }

        var _currentRoom = _.find(rooms, { room_id: _room_id });


        _.forEach(_currentRoom.users, function(_v) {
            _m.users.push({
                user: _v,
                read_time: null
            })
        })

        /*
        for (var i = 0; i < rooms[_room].length; i++) {
            _m.users.push({
                user: rooms[_room][i],
                read_time: null
            })
        }
    */
        var _msgMongo = new modelMsg(_m);

        _msgMongo.save().then(function(_p) {
            //console.log(_p);
            io.in(_room_id).emit('getMessage',_p);
        })

    }

    function returnRoomUsers(_d) {
        return
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
