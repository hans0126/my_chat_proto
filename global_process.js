var randomstring = require("randomstring");
var modelMsg = require('./models/msg');
var _ = require('lodash');

module.exports = {
    users: [],
    online_users: [], //{account,socket}
    rooms: [],
    emotions: [],
    createMsgAndBrodcast: function(_io, _owner, _room_id, _msg) {

        var _m = {
            owner: _owner,
            room_id: _room_id,
            msg: _msg,
            users: [],
            create_date: this.currentDate(),
            id: randomstring.generate()
        }

        var _currentRoom = _.find(this.rooms, { room_id: _room_id });

        _.forEach(_currentRoom.users, function(_v) {
            _m.users.push({
                user: _v,
                read_time: null
            })
        })

        var _msgMongo = new modelMsg(_m);

        _msgMongo.save().then(function(_p) {
            _io.in(_room_id).emit('getMessage', _p);
        })
    },
    addUser: function(_io, _account, _name) {

        var _tryGet = _.find(this.users, { account: _account });

        if (!_tryGet) {
            var _self = this;
            _.forEach(this.users, function(val, idx) {
                _self.rooms.push({
                    room_id: _self.createUserRoomId(_account, val.account),
                    room_name: null,
                    users: [_account, val.account],
                    type: 0
                })
            })

            this.users.push({
                name: _name,
                account: _account,
                connect_id: null
            })

            _io.emit('updateUsersList', { users: this.users });
        }

        
    },
    currentDate: function() {
        var date = new Date();
        var year = date.getFullYear();
        var month = ("0" + (date.getMonth() + 1)).slice(-2);
        var day = ("0" + date.getDate()).slice(-2);
        var hours = ("0" + date.getHours()).slice(-2);
        var minutes = ("0" + date.getMinutes()).slice(-2);
        var seconds = ("0" + date.getSeconds()).slice(-2);
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    },
    createUserRoomId: function(_id, _id2) {
        var _t = [_id, _id2];
        _t.sort(function(a, b) {
            return a > b
        })
        return _t[0] + "_" + _t[1];
    }


}
