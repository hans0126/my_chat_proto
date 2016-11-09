   var app = angular.module('app', []);
   var socketUrl = 'ws://192.168.10.49:3000';
   app.controller('chat', ['$scope', 'socket', '_', 'globle', function($scope, socket, _, globle) {
       // $scope.greeting = 'Welcome!';
       var _self = this;

       _self.users = [];
       _self.currentAccount = null;
       _self.displayRooms = [];
       _self.rooms = [];

       _self.controllPanel = {
           minimize: false,
           minimizeAction: function() {
               this.minimize = !this.minimize;
               if (this.minimize) {
                   this.class = 'onMinimize';
               } else {
                   this.class = null;
               }
           },
           class: null
       }

       _self.login = function(_account) {
           // console.log(_account);
           socket.emit('login', {
               account: _account
           })
       }

       _self.openRoom = function(_room_id) {
           //console.log(_room_id);
           var _room = _.find(_self.rooms, {
               room: _room_id
           });

           _room.unReadCount = 0;

           if (!_room.initLoad) {
               socket.emit('getHistoryMsg', {
                   room: _room_id
               });
           }

           if (!_.find(_self.displayRooms, {
                   room: _room_id
               })) {

               _self.displayRooms.push(_room);
           }

       }

       socket.on('getHistoryMsg', function(_d) {
           var _room = _.find(_self.rooms, {
               room: _d.room
           })

           _room.msg = _d.messages;
           _room.initLoad = true;

       });

       socket.on('login', function(_d) {
           _self.currentAccount = globle.account = _d;
       })

       socket.on('getRooms', function(_d) {

           for (var i = 0; i < _d.rooms.length; i++) {
               _self.rooms.push({
                   room: _d.rooms[i],
                   msg: [],
                   initLoad: false,
                   unReadCount: 0,
                   minimize: false,
                   minimizeAction: function() {

                       this.minimize = !this.minimize;
                       if (this.minimize) {
                           this.class = 'onMinimize';
                       } else {
                           this.class = null;
                           var _room = this.room;
                           if (this.unReadCount > 0) {
                               socket.emit('getUnReadMessage', {
                                   account: globle.account.account,
                                   room: _room
                               })
                           }

                           this.unReadCount = 0;

                       }
                   },
                   class: null,
                   closePanel:function(){
                       var _idx = _.findIndex(_self.displayRooms,{
                        room:this.room
                       });

                       _self.displayRooms.splice(_idx,1);
                   }

               })

               socket.emit('getUnReadMessageCount', {
                   account: globle.account.account,
                   room: _d.rooms[i]
               });
           }
       })

       socket.on('getUnReadMessage', function(_d) {          
           _room = _.find(_self.rooms, {
               room: _d.room
           });

           _.forEach(_d.msg, function(_v) {
                _room.msg.push(_v);
           })

       })


       socket.on('getUnReadMessageCount', function(_d) {
           // console.log(_d);
           _room = _.find(_self.rooms, {
               room: _d.room
           });

           _room.unReadCount = _d.count;
       })


       socket.on('connected', function(_d) {

           _self.users = _d.users;
       })

       socket.on('getMessage', function(_d) {

           _re = _.find(_self.displayRooms, {
               room: _d.room
           });

           if (_re && !_re.minimize) {
               _re.msg.push(_d);
           } else {
               socket.emit('getUnReadMessageCount', {
                   account: globle.account.account,
                   room: _d.room
               });
           }
       })

       socket.on('readMessage', function(_d) {

           _room = _.find(_self.rooms, {
               room: _d.room
           });
           _msg = _.find(_room.msg, {
               id: _d.id
           });

           if (!_msg) {
               return;
           }

           _msg.read_count = _d.read_count;


       });

   }]);

   app.directive('controllPanel', ['globle', 'socket', function(globle, socket) {

       return {
           restrict: "A",
           replace: true,
           templateUrl: "template/controll_panel.html",
           scope: {
               p: "=controllPanel"
           },
           link: function(scope, element, attrs) {



           }
       }
   }])


   app.directive('chatPanel', ['globle', 'socket', function(globle, socket) {

       return {
           restrict: "A",
           replace: true,
           scope: {
               chat: "=chatPanel"
           },
           link: function(scope, element, attrs) {
               scope.userInput = null;
               scope.sendEvents = {};
               scope.sendEvents.sendMsg = function() {

                   if (scope.userInput) {
                       socket.emit('sendMessage', {
                           room: scope.chat.room,
                           text: scope.userInput,
                           owner: globle.account.account
                       })

                       scope.userInput = null;
                   }
               }

               scope.sendEvents.uploadFile = function(_file) {

                   socket.upload(_file, {
                       types: [
                           'image/png',
                           'image/jpeg',
                           'image/pjpeg'
                       ],
                       to: 'file',
                       data: {
                           room: scope.chat.room,
                           owner: globle.account.account
                       }
                   });


               }
           },

           templateUrl: "template/chat_view.html"
       }

   }]);


   app.directive('singleMsg', ['globle',
       '$compile',
       'socket',
       function(globle, $compile, socket) {

           function tripImg(_msg) {
               var _re = _msg.match(/^\[(.*)\]$/);
               if (_re) {

                   _re = _re[1];
                   _re = _re.split(":");

                   if (_re[0] == "img") {
                       _msg = "<img src='file/" + _re[1] + "'/>";
                       //   console.log(_msg);
                   }
               }

               return _msg;
           }



           return {
               restrict: "A",
               scope: {
                   msg: "=singleMsg"
               },
               link: function(scope, element, attrs) {
                   var _t = "";
                   if (globle.account.account == scope.msg.owner) {
                       element.addClass('owner');
                       _t += "<div>" + tripImg(scope.msg.msg) + "({{msg.read_count}})</div>";
                   } else {
                       _t += "<div>{{msg.owner}}:</div>";
                       _t += "<div>" + tripImg(scope.msg.msg) + "({{msg.read_count}})</div>";
                   }

                   var el = angular.element(_t);
                   element.append(el);
                   $compile(el)(scope);

                   socket.emit('readMessage', {
                       id: scope.msg.id,
                       account: globle.account.account,
                       room: scope.msg.room
                   });

                   var sHeight = element.parent()[0].scrollHeight;
                   element.parent().parent()[0].scrollTop = sHeight;

               }
           }

       }
   ]);

   app.directive('chatInput', ['socket', 'globle', function(socket, globle) {

       return {
           restrict: "A",
           scope: {
               sendEvents: "=chatInput"
           },
           link: function(scope, element, attrs) {

               element.bind("keydown", function(event) {
                   if (event.which === 13) {
                       event.preventDefault();
                       event.stopPropagation();
                       scope.sendEvents.sendMsg();

                   }
               });

               element.bind("dragover", function(event) {
                   event.preventDefault();
                   event.stopPropagation();
                   element.addClass('hover');
               })

               element.bind("dragleave", function(event) {
                   event.preventDefault();
                   event.stopPropagation();
                   element.removeClass('hover');
               })

               element.on("drop", function(event) {
                   event.preventDefault();
                   event.stopPropagation();

                   var _file = event.originalEvent.dataTransfer.files[0];
                   element.removeClass('hover');
                   scope.sendEvents.uploadFile(_file);
               })
           }

       }
   }]);




   app.service('globle', function() {

   })

   app.factory('socket', function($rootScope) {
       var socket = io.connect(socketUrl);
       var socketIOFile = new SocketIOFileClient(socket);
       return {
           on: function(eventName, callback) {
               socket.on(eventName, function() {
                   var args = arguments;
                   $rootScope.$apply(function() {
                       callback.apply(socket, args);
                   });
               });
           },
           emit: function(eventName, data, callback) {
               socket.emit(eventName, data, function() {
                   var args = arguments;
                   $rootScope.$apply(function() {
                       if (callback) {
                           callback.apply(socket, args);
                       }
                   });
               })
           },
           upload: function(file, options, callback) {
               socketIOFile.upload(file, options);
           }
       };
   });




   app.factory('_', ['$window',
       function($window) {
           // place lodash include before angular
           return $window._;
       }
   ])
