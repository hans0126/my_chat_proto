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

       var chatObj = {
           room_id: null,
           type: null,
           room_name: null,
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
                           room_id: _room.room_id
                       })
                   }

                   this.unReadCount = 0;

               }
           },
           class: null,
           closePanel: function() {
               var _idx = _.findIndex(_self.displayRooms, {
                   room: this.room
               });

               _self.displayRooms.splice(_idx, 1);
           }

       }


       _self.login = function(_account) {
           // console.log(_account);
           socket.emit('login', {
               account: _account
           })
       }

       _self.openRoom = function(_room_id) {
           console.log(_self.rooms);
           var _room = _.find(_self.rooms, {
               room_id: _room_id
           });

           _room.unReadCount = 0;

           if (!_room.initLoad) {
               socket.emit('getHistoryMsg', {
                   room_id: _room_id
               });
           }

           if (!_.find(_self.displayRooms, {
                   room_id: _room_id
               })) {

               _self.displayRooms.push(_room);
           }

       }

       socket.on('getHistoryMsg', function(_d) {

           var _room = _.find(_self.rooms, {
               room_id: _d.room_id
           })



           _room.msg = _d.messages;
           _room.initLoad = true;

       });

       socket.on('login', function(_d) {

           _self.currentAccount = globle.account = _d;
       })

       socket.on('getRooms', function(_d) {
           _.forEach(_d.rooms, function(_v) {

               var _chatObj = angular.copy(chatObj);

               _chatObj.room_id = _v.room_id;
               _chatObj.type = _v.type;
               _chatObj.room_name = _v.room_name;

               _self.rooms.push(_chatObj);

               socket.emit('getUnReadMessageCount', {
                   account: globle.account.account,
                   room_id: _v.room_id
               });

           })
       })

       socket.on('getUnReadMessage', function(_d) {
           _room = _.find(_self.rooms, {
               room_id: _d.room_id
           });

           _.forEach(_d.msg, function(_v) {
               _room.msg.push(_v);
           })

       })


       socket.on('getUnReadMessageCount', function(_d) {
           _room = _.find(_self.rooms, {
               room_id: _d.room_id
           });

           _room.unReadCount = _d.count;
       })


       socket.on('connected', function(_d) {
           _self.users = _d.users;
       })

       socket.on('getMessage', function(_d) {

           _re = _.find(_self.displayRooms, {
               room_id: _d.room_id
           });

           if (_re && !_re.minimize) {
               _re.msg.push(_d);
           } else {
               socket.emit('getUnReadMessageCount', {
                   account: globle.account.account,
                   room_id: _d.room_id
               });
           }
       })

       socket.on('readMessage', function(_d) {
           _room = _.find(_self.rooms, {
               room_id: _d.room_id
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
               var contentBody = element.find('.contentBody');
               scope.userInput = null;
               scope.sendEvents = {};
               scope.sendEvents.sendMsg = function() {

                   if (scope.userInput) {

                       socket.emit('sendMessage', {
                           room_id: scope.chat.room_id,
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
                               room: scope.chat.room_id,
                               owner: globle.account.account
                           }
                       });


                   }
                   /*
                   contentBody.bind('scroll', function() {
                       console.log('in scroll');
                       console.log(contentBody[0].scrollTop);
                       console.log(contentBody[0].scrollHeight);
                       
                   });
                    */



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
                       room_id: scope.msg.room_id
                   });

                   var sHeight = element.parent()[0].scrollHeight;
                   element.parent().parent()[0].scrollTop = sHeight;

               }
           }

       }
   ]);

   app.directive('chatInput', ['socket', 'globle', function(socket, globle) {
       /*
          var range = document.createRange();
          var sel = window.getSelection();

          console.log(sel);
       */
       return {
           require: 'ngModel',
           restrict: "A",
           scope: {
               sendEvents: "=chatInput"
           },
           link: function(scope, element, attrs, ctrl) {

               element.bind("keydown", function(event) {
                   //  console.log(element.html())


                   scope.$apply(function() {
                       ctrl.$setViewValue(element.html());
                   });

                   //back default value; was null
                   ctrl.$render = function() {
                       element.html(ctrl.$viewValue);
                   };

                   if (event.which === 13) {
                       event.preventDefault();
                       event.stopPropagation();


                       if (event.shiftKey) {

                       } else {
                           scope.sendEvents.sendMsg();
                       }

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
