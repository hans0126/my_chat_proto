var randomstring = require("randomstring");
var SocketIOFile = require('socket.io-file');
var fs = require('fs');
var _ = require('lodash');
var modelMsg = require('./models/msg');
var gp = require("./global_process"); //globel 

gp.users = [{
    name: "hans",
    account: "08073",
    connect_id: null,
    img: "http://www.hsihung.com.tw/intranet/pic_travel/show.asp?p_id=P000008666"
}, {
    name: "ben",
    account: "08072",
    connect_id: null,
    img: "http://www.hsihung.com.tw/intranet/pic_travel/show.asp?p_id=P000008684"
}, {
    name: "eric",
    account: "08071",
    connect_id: null,
    img: "http://www.hsihung.com.tw/intranet/pic_travel/show.asp?p_id=P000008665"
}]

gp.emotions = [{ code: "0001", filename: "9615145.png" }, { code: "0002", filename: "949891.png" }];

var users = gp.users;
var emotions = gp.emotions;
var rooms = gp.rooms;
var online_users = gp.online_users;


createUserRooms();

rooms.push({
    room_id: 'room1',
    room_name: '08073_08072',
    users: ['08073', '08072'],
    type: 1
})

rooms.push({
    room_id: 'room2',
    room_name: '08071_08073',
    users: ['08073', '08071'],
    type: 1
})


rooms.push({
    room_id: 'room3',
    room_name: '08073_08071_08072',
    users: ['08073', '08071', '08072'],
    type: 1
})

//modelMsg.mymy();
function myChat(io) {


    var pageCount = 20;

    io.on('connection', function(socket) {
        var clientIp = socket.request.connection.remoteAddress;
        var rooms_history;
        gp.user = socket;

        socket.emit('connected', { users: users });

        socket.on('login', function(_d) {

            var _currentUser = null;
            var _userInRoom = [];
            //get current user info
            var _currentUser = _.find(users, { account: _d.account });
            _currentUser.connect_id = socket.id;


            //find duplicate login, renew this
            var _idx = -1;
            _.forEach(online_users, function(data, idx) {
                if (_.isEqual(data, { account: _currentUser.account })) {
                    index = idx;
                    return;
                }
            });

            online_users.splice(_idx, 1);
            online_users.push({ account: _currentUser.account, socket: socket });

            //put login message
            socket.emit('login', _currentUser);
            //change user list
            io.emit('updateUsersList', { users: users });

            //join room (group) 
            _.forEach(rooms, function(_v) {
                if (_v.users.indexOf(_currentUser.account) > -1) {
                    socket.join(_v.room_id);
                    _userInRoom.push(_v);
                    returnRoomUsers(_v.room_id);
                }               
            })

            //join room (1 by 1)
            _.forEach(users, function(_v) {
                if (_v.account != _currentUser.account) {
                    var _room_id = gp.createUserRoomId(_currentUser.account, _v.account);
                    socket.join(_room_id);
                }               
            })

            socket.broadcast.emit('attention', _currentUser.account + ' online');

            socket.emit('getRooms', { rooms: _userInRoom });
            socket.emit('emotions', emotions);

            modelMsg.aggregate([{ $match: { owner: _currentUser.account } },
                { $group: { _id: "$room_id", create_date: { $last: "$create_date" } } },
                { $sort: { create_date: 1 } }
            ]).exec(function(err, re) {
                rooms_history = re;
                socket.emit('roomsHistory', rooms_history);
            });


            socket.on('disconnect', function() {
                _currentUser.connect_id = null;
                io.emit('updateUsersList', { users: users });

                var _idx = -1;
                _.forEach(online_users, function(data, idx) {
                    if (_.isEqual(data, { account: _currentUser.account })) {
                        index = idx;
                        return;
                    }
                });

                online_users.splice(_idx, 1);
            });


            socket.on('sendMessage', function(_d) {

                gp.createMsgAndBrodcast(io, _d.owner, _d.room_id, _d.text);
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
                            'users.$.read_time': new Date()
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
                }).sort({ _id: -1 }).limit(pageCount).exec(function(err, _re) {
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

            socket.on('getPreMsg', function(_d) {

                modelMsg.findOne({
                    room_id: _d.room_id,
                    id: _d.id
                }, { _id: 1 }, function(err, _re) {
                    modelMsg.find({ _id: { $lt: _re._id } }).sort({ _id: -1 }).limit(pageCount).exec(function(err, _re2) {
                        socket.emit('getPreMsg', { messages: _re2, room_id: _d.room_id })

                    })

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
        // console.log(_d);

        var newFileName = data.name.split('.');
        newFileName = randomstring.generate() + "." + newFileName[newFileName.length - 1];
        fs.rename(`${data.path}/${data.name}`, `${data.path}/${newFileName}`, function(err) {
            if (err) throw err;
            //console.log(newFileName);
            gp.createMsgAndBrodcast(io, _d.owner, _d.room_id, `[img:${newFileName}]`);
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


function createUserRooms() {
    var _users = _users2 = users,
        v = 0;

    for (var i = 0; i < _users.length; i++) {

        for (var j = 1; j < _users2.length; j++) {
            if (j + v < _users2.length) {
                var user1 = _users[i].account,
                    user2 = _users2[j + v].account;

                rooms.push({
                    room_id: gp.createUserRoomId(user1, user2),
                    room_name: null,
                    users: [user1, user2],
                    type: 0
                })
            }
        }
        v++;
    }
}



module.exports = myChat;
