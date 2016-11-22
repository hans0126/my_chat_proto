var mongoose = require('mongoose');

var msgSchema = mongoose.Schema({
    owner: String,
    room_id: String,
    msg: String,
    users: [],
    create_date: { type: Date, default: Date.now },
    id: String,
    read_count: {
        type: Number,
        default: 0
    }
}, { collection: "message" });


msgSchema.methods.updateMsgRead = function(_fn) {
    //console.log(this.owner);
    this.model('message').find({
        room: this.room,
        id: this.id
    }, _fn);
}

var msg = mongoose.model('message', msgSchema);
module.exports = msg;
