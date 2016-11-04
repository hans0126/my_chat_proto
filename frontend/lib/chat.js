'draggable' in document.createElement('span');

var socket,
    socketIOFile,
    currentAccount;

function init() {
    socket = io.connect('ws://192.168.10.49:3000');
    socketIOFile = new SocketIOFileClient(socket);
    socket.on('connected', function(_d) {
        //include login process
        renderUserList(_d.users);
    })

    socket.on('login', function(_d) {
        currentAccount = _d;
        socket.on('attention', function(_d) {
            notify(_d);
        })
    })

    socket.on('getRooms', function(_d) {
        for (var i = 0; i < _d.rooms.length; i++) {
            renderRoomsList(_d.rooms[i]);
        }
    })

    socket.on('getHistoryMsg', function(_d) {
        for (var i = 0; i < _d.messages.length; i++) {
            renderMsg(_d.messages[i]);
        }

        getUnReadMsgCount(_d.room, currentAccount.account);

    });

    socket.on('getUnReadMessage', function(_d) {

        for (var i = 0; i < _d.msg.length; i++) {
            renderMsg(_d.msg[i]);
        }

        getUnReadMsgCount(_d.room, currentAccount.account);
    });


    socket.on('getUnReadMessageCount', function(_d) {
        $('#' + _d.room + " .unread").text("(" + _d.count + ")");
    })

    socket.on('updateUsersList', function(_d) {
        renderUserList(_d.users);
    })

    socket.on('getReaded', function(_d) {
        if (!_d) return;
        $('#' + _d.id).children('.readed').text(_d.read_count);
    })

    socket.on('getRoomUsers', function(_d) {
        var _u = $('#' + _d.room + ' > .chat_content > .chatBox > .users_list');
        _u.html(renderRoomUser(_d.users));

    })

    socket.on('getMessage', function(_d) {
        renderMsg(_d);
        if (_d.owner != currentAccount.account) {
            notify(currentAccount.account + ":" + _d.msg);
        }
        getUnReadMsgCount(_d.room, currentAccount.account);
    })

    socketIOFile.on('stream', streaming);
    socketIOFile.on('complete', complete);
    socketIOFile.on('error', error);

}


function getUnReadMsgCount(_room, _account) {
    socket.emit('getUnReadMessageCount', {
        room: _room,
        account: _account
    })
}

function renderUserList(_d) {
    _t = '';

    if (currentAccount) {
        $('#users').html('');
        return;
    }

    for (var i = 0; i < _d.length; i++) {
        var _a = '';
        var _class = 'used';
        if (!_d[i].connect_id) {
            _a = "account='" + _d[i].account + "'";
            _class = '';
        }

        _t += "<li " + _a + " class='" + _class + "'>" + _d[i].name + "</li>";
    }

    $('#users').html(_t).find('li').each(function() {
        $(this).click(function() {
            var _account = $(this).attr('account');
            if (_account) {
                $('#currentAccount').html($(this).text());
                // currentAccount = _account;
                socket.emit('login', {
                    account: _account
                })
            }
        })
    })

}

function renderChatBox(_d) {
    // console.log(_d);
    var _t = "<div class='panel' id='r_" + _d + "'>";
    _t += "<a href='#' class='minimizeBtn'>" + _d + "</a>";
    _t += "<div class='panelContent'>";
    _t += "<div class='contentHeader'>";
    _t += "<div class='contentTitle'>" + _d + "</div>";
    _t += "</div>";
    _t += "<div class='contentBody'></div>";
    _t += "<div class='contentInputArea'>";
    _t += "<input type='text' class='contentInput'>";
    _t += "</div></div></div>";


    // _t = '<div class="chatBox"><div class="content"></div><ul class="users_list"></ul><div><input type="text"/><button>send</button></div></div>';

    var _this = $(_t).appendTo($('#chatWrap'));
    var _content = $('.contentBody', _this);
    var _input = $('input[type=text]', _this);

    socket.emit('getHistoryMsg', {
        room: _d
    });

    socket.emit('getRoomUsers', {
        room: _d
    });


    $('button', _this).click(function() {
        if (_input.val() != '') {
            socket.emit('sendMessage', {
                room: _d,
                text: _input.val(),
                owner: currentAccount.account
            })
        }

        _input.val('');

    })


    $('.contentTitle', _this).on('click', function(e) {
        e.preventDefault();
        $(this).parents('.panelContent').hide();
    })

    $('.minimizeBtn', _this).on('click', function(e) {
        e.preventDefault();
        $(this).siblings('.panelContent').show();
    })

    _input.keypress(function(e) {
        if (e.which == 13) {

            if ($(this).val() != '') {
                socket.emit('sendMessage', {
                    room: _d,
                    text: $(this).val(),
                    owner: currentAccount.account
                })
            }

            $(this).val('');


        }
    })



    _input.on("dragover", function(event) {
        event.preventDefault();
        event.stopPropagation();
        $(this).addClass('hover');
    });

    _input.on("dragleave", function(event) {
        event.preventDefault();
        event.stopPropagation();
        $(this).removeClass('hover');
    });

    _input.on("drop", function(event) {
        event.preventDefault();
        event.stopPropagation();

        var _file = event.originalEvent.dataTransfer.files[0];

        socketIOFile.upload(_file, {
            types: [
                'image/png',
                'image/jpeg',
                'image/pjpeg'
            ],
            to: 'file',
            data: {
                room: _d,
                owner: currentAccount.account
            }
        });

        _input.removeClass('hover');


    });
}

function renderMsg(_d) {
    var _cBox = $('#r_' + _d.room + ' .contentBody');

    if (_cBox.length == 0 || _cBox.is(":hidden")) {
        return;
    }

    //  _cBox.append(singleMsg(_d));
    var _msg = $(singleMsg(_d)).appendTo(_cBox);
    // console.log(_msg);

    _msg.find('img').each(function() {
        $(this).on('load', function() {
            _cBox.scrollTop(_cBox.prop("scrollHeight"));
        })
    })

    _cBox.scrollTop(_cBox.prop("scrollHeight"));
    socket.emit('readMessage', {
        id: _d.id,
        account: currentAccount.account,
        room: _d.room
    });

}


function renderRoomUser(_d) {
    var _t = '';
    for (var i = 0; i < _d.length; i++) {
        var _status = '';
        if (!_d[i].connect_id) {
            _status = '(offline)';
        }

        _t += "<li>" + _d[i].name + _status + "</li>";

    }

    return _t;
}

function singleMsg(_d) {


    return "<div id='" + _d.id + "'>" + _d.owner + ":" + tripImg(_d.msg) + "(" + timestamp2time(_d.create_date) + ")-已讀<span class='readed'>" + _d.read_count + "</span></div>";
}

function timestamp2time(unix_timestamp) {

    var _dt = unix_timestamp.match(/^(\d{4})-?(\d{2})-?(\d{2})T?(\d{2}):?(\d{2}):?(\d{2})?/);

    _date = _dt[1] + "-" + _dt[2] + "-" + _dt[3];
    _time = _dt[4] + ":" + _dt[5] + ":" + _dt[6];

    return _time;

}



function streaming(data) {
    console.log('SocketIOFileClient: Client streaming... ' + data.uploaded + ' / ' + data.size);
}

function complete(data) {
    console.log('File Uploaded Successfully!');
    console.log(data);
}

function error(data) {
    console.log('Error while uploading:');
    console.log(data);
}

function renderRoomsList(_d) {

    var _t = '';
    var _inputArea = '';

    _t += '<li id="' + _d + '"><div class="title">' + _d + '<span class="unread"></span></div><div class="chat_content"></div></li>';

    var _this = $(_t).appendTo($('#rooms'));

    socket.emit('getUnReadMessageCount', {
        account: currentAccount.account,
        room: _d
    });


    _this.children('.title').on('click', function() {
        var _contentBox = $('.chatBox', _this);
        if (_contentBox.length) {
            if (_contentBox.is(":hidden")) {
                _contentBox.show();
                socket.emit('getUnReadMessage', {
                    account: currentAccount.account,
                    room: _d
                });

            } else {
                _contentBox.hide();
            }
        } else {
            renderChatBox(_d, _contentBox);
        }

    })
}


function tripImg(_msg) {
    var _re = _msg.match(/^\[(.*)\]$/);
    if (_re) {
        _re = _re[1];
        _re = _re.split(":");

        if (_re[0] == "img") {
            _msg = "<img src='file/" + _re[1] + "' style='width:200px'/>";
        }
    }

    return _msg;
}

function notify(_txt) {
    // Let's check if the browser supports notifications
    if (!("Notification" in window)) {
        alert("This browser does not support desktop notification");
    }

    // Let's check whether notification permissions have already been granted
    else if (Notification.permission === "granted") {
        // If it's okay let's create a notification
        var notification = new Notification(_txt);
    }

    // Otherwise, we need to ask the user for permission
    else if (Notification.permission !== 'denied') {
        Notification.requestPermission(function(permission) {
            // If the user accepts, let's create a notification
            if (permission === "granted") {
                var notification = new Notification(_txt);
            }
        });
    }

    // At last, if the user has denied notifications, and you 
    // want to be respectful there is no need to bother them any more.
}
