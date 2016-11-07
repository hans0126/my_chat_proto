var routes = function(app,io) {

    app.get('/', function(req, res) {
        res.sendfile(path.join('frontend', 'index.html'));
    });

    app.get('/send', function(req, res) {
        console.log(io);
        io.in('room1').emit('send_test', 'cool game');
        res.send('hello world');


    })

}

module.exports = routes;
