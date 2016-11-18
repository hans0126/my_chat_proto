var gp = require("./global_process");

var routes = function(app,io) {

    app.get('/', function(req, res) {
        res.sendfile(path.join('frontend', 'index.html'));
    });

    app.get('/send', function(req, res) {
        //console.log(io);
        //io.in('room1').emit('send_test', 'cool game');
        //console.log(mDatas.user);

       // mDatas.user.emit('testaaa',"sas");

      // gp.createMsgAndBrodcast(io,"08073","08072_08073","testAAAA");
      gp.addUser(io,"080","bbb");
       //console.log(mDatas.users);

        res.send('hello world');


    })

}

module.exports = routes;
