   var app = angular.module('app', []);
   var socketUrl = 'ws://192.168.10.49:3000';
   app.controller('chat', ['$scope', 'socket', '_', 'global', function($scope, socket, _, global) {
       var _self = this;
       $scope.greeting = 'Welcome!';
       $scope.users = [];
       $scope.account = {};
       $scope.displayRooms = []; //active rooms
       $scope.rooms = []; // root rooms
       $scope.rosterRooms = []; // unit rooms
       $scope.projectRooms = [];
       $scope.companyRooms = [];
       $scope.emotions = [];


       /*
        
      rooms -
            |- rosterRooms
                    |- rosterRoomsD ----|
            |- projectRooms             |---> displayRooms
                    |- projectRoomsD ---|

       */


       socket.on('emotions', function(_d) {
           angular.extend($scope.emotions, _d);


       })

       socket.on('connected', function(_d) {

           angular.extend($scope.users, _d.users);
       })

       socket.on('getHistoryMsg', function(_d) {

           var _room = _.find($scope.rooms, {
               room_id: _d.room_id
           })

           _room.msg = _d.messages;
           _room.initLoad = true;

       });

       socket.on('login', function(_d) {
           _self.currentAccount = global.account = _d;
           $scope.account = _d;
       })


       socket.on('getUnReadMessage', function(_d) {
           _room = _.find($scope.rooms, {
               room_id: _d.room_id
           });

           _.forEach(_d.msg, function(_v) {
               _room.msg.push(_v);
           })

       })


       socket.on('getUnReadMessageCount', function(_d) {

           _room = _.find($scope.rooms, {
               room_id: _d.room_id
           });

           _room.unReadCount = _d.count;
       })

       socket.on('getMessage', function(_d) {

           _re = _.find($scope.displayRooms, {
               room_id: _d.room_id
           });

           if (_re && !_re.minimize) {
               _re.msg.push(_d);
           } else {
               socket.emit('getUnReadMessageCount', {
                   account: $scope.account.account,
                   room_id: _d.room_id
               });
           }
       })

       socket.on('readMessage', function(_d) {
           _room = _.find($scope.rooms, {
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

   app.directive('controllPanel', ['global', 'socket', function(global, socket) {

       return {
           restrict: "A",
           replace: true,
           templateUrl: "template/controll_panel.html",
           scope: true,
           link: function(scope, element, attrs) {

               var chatObj = {
                   account: null,
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
                                   account: scope.account.account,
                                   room_id: _room.room_id
                               })
                           }

                           this.unReadCount = 0;
                       }
                   },
                   class: null,
                   closePanel: function() {
                       var _idx = _.findIndex(scope.displayRooms, {
                           room_id: this.room_id
                       });

                       scope.displayRooms.splice(_idx, 1);
                   }
               }

               scope.tab = "0";

               scope.changeTab = function(_val) {
                   scope.tab = _val;

               }

               scope.controllPanel = {
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

               scope.login = function(_account) {
                   socket.emit('login', {
                       account: _account
                   })
               }

               scope.openSingleRoom = function(_v) {
                   var _tempArray = [_v.account, scope.account.account];
                   _tempArray.sort(function(a, b) {
                       return a > b
                   });

                   var _room_id = _tempArray[0] + "_" + _tempArray[1];
                   var _room = angular.copy(chatObj);
                   _room.room_id = _room_id;
                   _room.type = 0;
                   _room.room_name = _v.name;
                   scope.displayRooms.push(_room);
               }

               scope.openRoom = function(_room_id) {

                   var _room = _.find(scope.rooms, {
                       room_id: _room_id
                   });

                   _room.unReadCount = 0;

                   if (!_room.initLoad) {
                       socket.emit('getHistoryMsg', {
                           room_id: _room_id
                       });
                   }

                   if (!_.find(scope.displayRooms, {
                           room_id: _room_id
                       })) {

                       scope.displayRooms.push(_room);
                   }
               }

               socket.on('getRooms', function(_d) {

                   _.forEach(_d.rooms, function(_v) {
                       var _chatObj = angular.copy(chatObj);

                       _chatObj.room_id = _v.room_id;
                       _chatObj.type = _v.type;

                       _chatObj.account = scope.account.account;

                       switch (_chatObj.type) {
                           case 0:
                               // var _userName = _.find(scope.users,{account:_v.})

                               var _re = _.find(_v.users, function(value) {
                                   return value !== scope.account.account;
                               })
                               var _cuurentUser;

                               if (_re) {
                                   _cuurentUser = _.find(scope.users, { account: _re });
                               }

                               _chatObj.room_name = _cuurentUser.name;
                               scope.rosterRooms.push(_chatObj);

                               break;

                           case 1:
                               _chatObj.room_name = _v.room_name;
                               scope.projectRooms.push(_chatObj);
                               break;

                           case 2:
                               _chatObj.room_name = _v.room_name;
                               scope.companyRooms.push(_chatObj);
                               break;
                       }

                       scope.rooms.push(_chatObj);

                       socket.emit('getUnReadMessageCount', {
                           account: scope.account.account,
                           room_id: _v.room_id
                       });

                   })

                   // set unit user list
                   scope.rosterRoomsD = scope.rosterRooms;
                   scope.projectRoomsD = scope.projectRooms;
               })
           }
       }
   }])


   app.directive('chatPanel', ['global', 'socket', function(global, socket) {

       return {
           restrict: "A",
           replace: true,
           scope: {
               chat: "=chatPanel",
               emotions: "=chatEmotions"
           },
           link: function(scope, element, attrs) {
               var contentBody = element.find('.contentBody');
               scope.userInput = null;
               scope.sendEvents = {};
               scope.emotionShow = false;

               scope.triggerEmotionPanel = function() {
                   scope.emotionShow = !scope.emotionShow;
               }

               scope.sendEmotion = function(_v) {

                   socket.emit('sendMessage', {
                       room_id: scope.chat.room_id,
                       text: "[emotion:" + _v.filename + "]",
                       owner: scope.chat.account
                   })

                   scope.emotionShow = false;
               }

               scope.sendEvents.sendMsg = function() {

                   if (scope.userInput) {

                       socket.emit('sendMessage', {
                           room_id: scope.chat.room_id,
                           text: scope.userInput,
                           owner: scope.chat.account
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
                               room_id: scope.chat.room_id,
                               owner: scope.chat.account
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


   app.directive('singleMsg', ['global',
       '$compile',
       'socket',
       function(global, $compile, socket) {

           function tripImg(_msg) {
               var _re = _msg.match(/^\[(.*)\]$/);
               if (_re) {

                   _re = _re[1];
                   _re = _re.split(":");

                   switch (_re[0]) {
                       case "img":
                           _msg = "<img src='file/" + _re[1] + "' imageonload />";
                           break;

                       case "emotion":
                           _msg = "<img src='images/" + _re[1] + "' imageonload />";
                           break;
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
                   if (global.account.account == scope.msg.owner) {
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
                       account: global.account.account,
                       room_id: scope.msg.room_id
                   });

                   var sHeight = element.parent()[0].scrollHeight;
                   element.parent().parent()[0].scrollTop = sHeight+100;



               }
           }

       }
   ]);

   app.directive('chatInput', ['socket', function(socket) {
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

                   ctrl.$render = function() {
                       element.html(ctrl.$viewValue);
                   };

                   //back default value; was null

                   if (event.which === 13) {
                       event.preventDefault();
                       event.stopPropagation();
                       scope.sendEvents.sendMsg();
                       ctrl.$setViewValue(element.html());
                       if (event.shiftKey) {

                       } else {
                           //scope.sendEvents.sendMsg();
                       }

                   }
               });

               element.bind("dragover", function(event) {
                   event.preventDefault();
                   event.stopPropagation();
                   element.addClass('hover');
                   console.log("A");
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

   app.directive('rosterList', function() {
       return {
           restrict: "A",
           scope: {
               rosterList: "=rosterList",
               openRoom: "=openEvent"
           },
           templateUrl: "template/roster_list_panel.html",
           link: function(scope, element, attrs) {
               scope.rosterListD = scope.rosterList;
               scope.text_filter = null;

               element.find('input[type=text]').bind('keydown', function(event) {
                   if (event.which === 13) {
                       var _reg = new RegExp('.?' + scope.text_filter + '.?', 'i');
                       scope.rosterListD = _.filter(scope.rosterList, function(o) {
                           return o.room_name.match(_reg);
                       })
                       scope.$apply();
                       scope.text_filter = null;
                   }
               })

           }
       }
   })

   app.directive('imageonload', function() {
       return {
           restrict: 'A',
           link: function(scope, element, attrs) {
               element.bind('load', function() {
                   console.log('image is loaded');
                   var sHeight = element.parent().parent().parent()[0].scrollHeight;
                   element.parent().parent().parent().parent()[0].scrollTop = sHeight+100;
               });
               element.bind('error', function() {
                   console.log('image could not be loaded');
               });
           }
       };
   })

   app.directive('debug', function() {
       return {
           require: 'ngModel',
           restrict: "A",
           scope: {}
       }


   })

   app.service('global', function() {

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
