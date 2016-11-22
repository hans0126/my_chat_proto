   var app = angular.module('app', []);
   var socketUrl = 'ws://192.168.10.49:3000';
   app.controller('chat', ['$scope',
       'socket',
       '_',
       '$rootScope',
       function($scope, socket, _, $rootScope) {
           var _self = this;
           $rootScope.users = [];
           $rootScope.account = {};
           $rootScope.displayRooms = []; //active rooms
           $rootScope.historyRooms = [];
           $scope.hiddenRooms = []
           $rootScope.rooms = []; // root rooms
           $scope.rosterRooms = []; // unit rooms
           $scope.projectRooms = [];

           $scope.companyRooms = [];
           $scope.emotions = [];
           $scope.emotionIcons = ["😃", "😀", "😁", "😂", "🤣", "😃", "😄", "😅", "😆", "😉", "😊", "😋", "😎", "😍", "😘", "😗", "😙", "😚", "🙂", "🤗", "🤔", "😐", "😑", "😶", "🙄", "😏", "😣", "😥", "😮", "🤐", "😯", "😪", "😫", "😴", "😌", "🤓", "😛", "😜", "😝", "🤤", "😒", "😓", "😔", "😕", "🙃", "🤑", "😲", "🙁", "😖", "😞", "😟", "😤", "😢", "😭", "😦", "😧", "😨", "😩", "😬", "😰", "😱", "😳", "😵", "😡", "😠", "😇", "🤠", "🤡", "🤥", "😷", "🤒", "🤕", "🤢", "🤧", "😈", "👿"];


           /*
        
      rooms -
            |-> rosterRooms
                    |-> rosterRoomsD ----|
                                         |     
            |-> projectRooms             |---> displayRooms (super)
                    |-> projectRoomsD ---|          |^
                                                    |v
                                               hiddenRooms

       */

           $scope.openRoom = function(_room_id) {

               var _room = _.find($rootScope.rooms, {
                   room_id: _room_id
               });

               _room.unReadCount = 0;

               if (!_room.initLoad) {
                   socket.emit('getHistoryMsg', {
                       room_id: _room_id
                   });
               }

               if (!_.find($rootScope.displayRooms, {
                       room_id: _room_id
                   })) {

                   if ($rootScope.displayRooms.length > 2) {
                       $scope.hiddenRooms.push($rootScope.displayRooms[0]);
                       $rootScope.displayRooms.splice(0, 1);
                   }

                   $rootScope.displayRooms.push(_room);
               }
           }


           socket.on('connected', function(_d) {
               angular.extend($rootScope.users, _d.users);

               socket.on('disconnect', function() {
                   console.log("die");

                   $rootScope.displayRooms = [];
                   $rootScope.rooms = [];
                   $scope.projectRooms = [];
                   $scope.account = {};
               })
           })

           socket.on('login', function(_d) {
               $scope.account = $rootScope.account = _d;
           })

           socket.on('updateUsersList', function(_d) {
               angular.extend($rootScope.users, _d.users);
           })

           socket.on('emotions', function(_d) {
               angular.extend($scope.emotions, _d);
           })



           socket.on('getHistoryMsg', function(_d) {

               var _room = _.find($rootScope.rooms, {
                   room_id: _d.room_id
               })

               _room.msg = _d.messages;
               _room.initLoad = true;

           });

           socket.on('getUnReadMessage', function(_d) {
               _room = _.find($rootScope.rooms, {
                   room_id: _d.room_id
               });

               _.forEach(_d.msg, function(_v) {
                   _room.msg.push(_v);
                   _room.unReadCount--;
               })

           });

           socket.on('getUnReadMessageCount', function(_d) {

               _room = _.find($rootScope.rooms, {
                   room_id: _d.room_id
               });

               _room.unReadCount = _d.count;
           })

           socket.on('getMessage', function(_d) {
               //has displayed
               _re = _.find($rootScope.displayRooms, {
                   room_id: _d.room_id
               });

               if (_re && !_re.minimize) {
                   _re.msg.push(_d);
               } else {

                   if (_d.owner != $rootScope.users.account) {
                       _re2 = _.find($rootScope.rooms, { room_id: _d.room_id });
                       _re2.unReadCount++;
                   }

                   /*
                    socket.emit('getUnReadMessageCount', {
                        account: $scope.account.account,
                        room_id: _d.room_id
                    });
                   */
               }


           })

           socket.on('roomsHistory', function(_d) {
               _.forEach(_d, function(_val, _idx) {
                   _re = _.find($rootScope.rooms, { room_id: _val._id });

                   if (_re) {
                       _re.ownerLastPost = new Date(_val.create_date);
                       $rootScope.historyRooms.push(_re);
                   }
               })
           })


           socket.on('getPreMsg', function(_d) {

               _room = _.find($rootScope.rooms, {
                   room_id: _d.room_id
               });

               _.forEach(_d.messages, function(o) {
                   o.past = true;
                   _room.msg.unshift(o);
               })
           })

           socket.on('readMessage', function(_d) {
               _room = _.find($rootScope.rooms, {
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


           socket.on('testaaa', function(_d) {
               console.log(_d);
           })
       }
   ]);

   app.directive('controllPanel', ['socket', function(socket) {

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
                   users: [],
                   ownerLastPost: null,
                   css: { 'z-index': 100 },
                   minimizeAction: function() {
                       this.minimize = !this.minimize;
                       if (this.minimize) {
                           this.class = 'onMinimize';
                       } else {
                           this.class = null;
                           //    var _room = this.room;
                           if (this.unReadCount > 0) {
                               socket.emit('getUnReadMessage', {
                                   account: scope.account.account,
                                   room_id: this.room_id
                               })
                           }

                           // this.unReadCount = 0;
                       }
                   },
                   class: null,
                   closePanel: function() {
                       var _idx = _.findIndex(scope.displayRooms, {
                           room_id: this.room_id
                       });
                       /*
                        if (this.minimize) {
                            this.minimizeAction();
                        }
                       */

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



               socket.on('getRooms', function(_d) {

                   _.forEach(_d.rooms, function(_v) {
                       var _chatObj = angular.copy(chatObj);

                       var _idx = _v.users.indexOf(scope.account.account);
                       //       _v.users.splice(_idx, 1);


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

                       _v.users.splice(_idx, 1);
                       _chatObj.users = _v.users;

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


   app.directive('chatPanel', ['socket',
       '$rootScope',
       function(socket, $rootScope) {

           return {
               restrict: "A",
               replace: true,
               scope: {
                   chat: "=chatPanel",
                   emotions: "=chatEmotions",
                   emotionIcons: "=chatEmotionicons"
               },
               templateUrl: "template/chat_panel.html",
               link: function(scope, element, attrs) {

                   // var contentBody = element.find('.contentBody');
                   scope.userInput = null;
                   scope.sendEvents = {};
                   scope.emotionShow = false;
                   scope.emotionIconShow = false;
                   scope.tip = {
                       visible: false,
                       top: 40,
                       create_date: null,
                       read_count: null,
                       owner: null
                   }

                   scope.usersShow = false;

                   scope.usersDetail = [];
                   _.forEach(scope.chat.users, function(_val, _idx) {
                       _re = _.find($rootScope.users, { account: _val });
                       if (_re) {
                           scope.usersDetail[_val] = _re;
                       }
                   })

                   //when readyToLoadPreMsg is true then get data
                   //prevent Multiple trigger
                   var readyToLoadPreMsg = true;

                   scope.usersShowEvent = function() {
                       scope.usersShow = !scope.usersShow;
                   }

                   scope.contentBody = element.find('.contentBody');

                   var writeBox = element.find('.writeBox'),
                       rangeOffset = 0;

                   writeBox.bind('click', function(e) {
                       rangeOffset = getCaretPosition();
                       scope.emotionShow = false;
                       scope.emotionIconShow = false;
                       scope.$apply();
                   })

                   writeBox.bind('keydown', function(e) {
                       rangeOffset = getCaretPosition() + 1;
                       scope.userInput = writeBox.html();
                       if (e.which === 13) {
                           e.preventDefault();
                           e.stopPropagation();

                           if (scope.userInput) {
                               socket.emit('sendMessage', {
                                   room_id: scope.chat.room_id,
                                   text: stripTag(scope.userInput),
                                   owner: scope.chat.account
                               })
                               writeBox.html("");
                               scope.userInput = null;

                               sortHistoryRooms(scope.chat.room_id);


                           }

                           if (e.shiftKey) {

                           } else {
                               //scope.sendEvents.sendMsg();
                           }

                       }
                   })

                   writeBox.bind("dragover", function(event) {
                       event.preventDefault();
                       event.stopPropagation();
                       writeBox.addClass('hover');
                   })

                   writeBox.bind("dragleave", function(event) {
                       event.preventDefault();
                       event.stopPropagation();
                       writeBox.removeClass('hover');
                   })

                   writeBox.on("drop", function(event) {
                       event.preventDefault();
                       event.stopPropagation();

                       var _file = event.originalEvent.dataTransfer.files[0];
                       writeBox.removeClass('hover');
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
                   })

                   element.bind('mouseenter', function(event) {
                       event.preventDefault();
                       event.stopPropagation();

                       if ($rootScope.displayRooms.length > 1) {
                           _.forEach($rootScope.displayRooms, function(o) {
                               if (o.room_id == scope.chat.room_id) {
                                   o.css['z-index'] = 100;
                               } else {
                                   o.css['z-index'] = 90;
                               }

                           })

                           scope.$apply();
                       }

                   })


                   function sortHistoryRooms(_room_id) {
                    

                       var _re = _.find($rootScope.rooms, { room_id: _room_id });

                       _re.ownerLastPost = new Date();

                       var _room = _.find($rootScope.historyRooms, { room_id: _room_id });

                      

                       if (!_room) {
                           $rootScope.historyRooms.push(_re);
                       }

                       $rootScope.historyRooms.sort(function(a, b) {
                           return a.ownerLastPost < b.ownerLastPost
                       })
                   }

                   function stripTag(_t) {
                       // console.log(_t);
                       if (!_t) {
                           return
                       }
                       var regex = /(<([^>]+)>)/ig;
                       var _re = _t.replace(regex, "");
                       return _re;
                   }

                   function getCaretPosition() {
                       return window.getSelection().getRangeAt(0).endOffset;
                   }


                   //   console.log(scope.emotionIcons);

                   scope.triggerEmotionPanel = function() {
                       if (scope.emotionIconShow) {
                           scope.emotionIconShow = !scope.emotionIconShow;
                       }

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

                   scope.triggerEmotionIconPanel = function() {
                       if (scope.emotionShow) {
                           scope.emotionShow = !scope.emotionShow;
                       }

                       scope.emotionIconShow = !scope.emotionIconShow;
                   }

                   scope.insertEmotionIcon = function(_v) {
                       var _t = writeBox.html();

                       writeBox.html(_t.substr(0, rangeOffset) + _v + _t.substr(rangeOffset, _t.length));

                       if (_t.length == rangeOffset) { //is last charact
                           rangeOffset = getCaretPosition() + 1;
                       }
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

                   scope.contentBody.bind('scroll', function() {


                       if (scope.contentBody[0].scrollTop == 0 && readyToLoadPreMsg) {
                           if (scope.chat.msg.length > 0) {

                               socket.emit('getPreMsg', {
                                   id: scope.chat.msg[0].id,
                                   room_id: scope.chat.msg[0].room_id
                               })


                               readyToLoadPreMsg = false;
                           }
                       }

                   });


                   socket.on('getPreMsg', function(_d) {

                       if (_d.room_id != scope.chat.room_id) {
                           return
                       }

                       if (_d.messages.length > 0) {
                           setTimeout(function() {
                               readyToLoadPreMsg = true;
                           }, 3000)
                       }


                   })
               }
           }
       }
   ]);

   app.directive('tip', function() {

       function tripDate(_d) {

           var _d = _d;
           var _re = _d.match(/(^\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);

           return {
               date: _re[1] + "年" + _re[2] + "月" + _re[3] + "日",
               time: _re[4] + "時" + _re[5] + "分"
           }

       }


       return {
           restrict: "A",
           scope: {
               tip: "=tip"
           },
           template: "<div>{{nd.date}} {{nd.time}}</div><div>已讀:{{tip.read_count}}</div>",
           link: function(scope, element, attrs) {

               var _right,
                   _left;



               scope.nd = tripDate(scope.tip.create_date);

               if (scope.tip.owner) {
                   _left = "100%";
                   _right = null;
               } else {
                   _right = "100%";
                   _left = null;
               }
               element.css({
                   top: scope.tip.top,
                   width: 100,
                   right: _right,
                   left: _left
               })
           }
       }

   })

   app.directive('singleMsg', ['$compile',
       'socket',
       '$rootScope',
       '$sce',
       '$timeout',
       function($compile, socket, $rootScope, $sce, $timeout) {

           function tripImg(_msg) {
               if (!_msg) {
                   return
               }

               var _re = _msg.match(/^\[(.*)\]$/),
                   _o = {
                       type: null,
                       msg: null
                   };

               if (_re) {
                   _re = _re[1];
                   _re = _re.split(":");

                   switch (_re[0]) {
                       case "img":
                           _o.type = "img";
                           _o.msg = "<img src='file/" + _re[1] + "' imageonload />";
                           break;

                       case "emotion":
                           _o.type = "img";
                           _o.msg = "<img src='images/" + _re[1] + "' imageonload />";
                           break;
                   }
               } else {
                   _o.type = "text";
                   _o.msg = _msg;

               }
               return _o;
           }

           return {
               restrict: "A",
               scope: {
                   msg: "=singleMsg",
                   tip: "=tipStatus",
                   contentBody: "=contentBody",
                   usersDetail: "=usersDetail"
               },
               link: function(scope, element, attrs) {

                   scope.tipVisible = true;
                   scope.ulContent = element.parent();
                   //scope.message = $sce.trustAsHtml(tripImg(scope.msg.msg));

                   var message = tripImg(scope.msg.msg),
                       contentType = '';

                   if (message.type != "text") {
                       contentType = 'non-text';
                   }


                   scope.message = $sce.trustAsHtml(message.msg);

                   var _t = "";
                   if ($rootScope.account.account == scope.msg.owner) {
                       element.addClass('owner');
                       _t += "<div class='msg_content " + contentType + "' ng-bind-html='message'></div>";
                   } else {
                       element.addClass('other');
                       scope.userName = scope.usersDetail[scope.msg.owner].name;
                       scope.userImg = scope.usersDetail[scope.msg.owner].img;
                       _t += "<div class='img'><img ng-src='{{userImg}}'/></div><div class='other_style'><div class='msg_owner'>{{userName}}</div><div class='msg_content " + contentType + "' ng-bind-html='message'></div></div>";
                   }

                   //console.log(scope.message)

                   var el = angular.element(_t);
                   element.append(el);
                   $compile(el)(scope);

                   var mContent = element.find('.msg_content');

                   mContent.bind('mouseover', function() {

                       scope.tip.visible = true;
                       scope.tip.top = element[0].offsetTop - scope.contentBody[0].scrollTop;
                       if (scope.tip.top < 0) {
                           scope.tip.visible = false;
                       }

                       scope.tip.create_date = scope.msg.create_date;
                       scope.tip.read_count = scope.msg.read_count;
                       if ($rootScope.account.account == scope.msg.owner) {
                           scope.tip.owner = true;
                       } else {
                           scope.tip.owner = false;
                       }

                       scope.$apply();
                   })

                   mContent.bind('mouseleave', function() {
                       scope.tip.visible = false;
                       scope.$apply();
                   })

                   socket.emit('readMessage', {
                       id: scope.msg.id,
                       account: $rootScope.account.account,
                       room_id: scope.msg.room_id
                   });

                   //if past msg scroll bar don't move to bottom 
                   if (!scope.msg.past) {
                       $timeout(function() {
                           var sHeight = element.parent()[0].scrollHeight;
                           scope.contentBody[0].scrollTop = sHeight;
                       })
                   }
               }
           }

       }
   ]);

   app.directive('imageonload', function() {
       return {
           restrict: 'A',
           scope: true,
           link: function(scope, element, attrs) {
               element.bind('load', function() {
                   console.log('image is loaded');
                   var sHeight = scope.ulContent[0].scrollHeight;
                   scope.contentBody[0].scrollTop = sHeight + 100;
               });
               element.bind('error', function() {
                   console.log('image could not be loaded');
               });
           }
       };
   })


   app.directive('rosterList', function() {
       return {
           restrict: "A",
           scope: {
               rosterList: "=rosterList",
               openRoom: "=openEvent"
           },
           templateUrl: "template/roster_list.html",
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

   app.directive('roomUsersList', ['$rootScope', function($rootScope) {
       return {
           restrict: "A",
           scope: {
               users: "=roomUsersList"
           },
           template: "<ul><li ng-repeat='val in userList'>{{val.name}}</li></ul>",
           link: function(scope, element, attrs) {
               scope.userList = [];
               _.forEach(scope.users, function(o) {
                   var _re = _.find($rootScope.users, { account: o });
                   if (_re) {
                       scope.userList.push(_re);
                   }
               })
           }
       }

   }])

   app.directive('minimizeGroup', function() {

       return {
           restrict: 'A',
           scope: true,
           templateUrl: 'template/minimize_group.html',
           link: function(scope, element, attrs) {
               scope.closeCurrent = function(_v) {
                   var _i = -1;
                   _.forEach(scope.hiddenRooms, function(val, idx) {

                       if (_v.room_id == val.room_id) {
                           _i = idx
                           return
                       }

                   })
                   scope.hiddenRooms.splice(_i, 1);
               }

               scope.openCurrentRoom = function(_v) {
                   scope.closeCurrent(_v);
                   scope.openRoom(_v.room_id);
               }

               scope.minimizeVisible = false;

               scope.visibleBtn = function() {
                   scope.minimizeVisible = !scope.minimizeVisible;
               }
           }
       }

   })

   app.directive('debug', function() {
       return {
           require: 'ngModel',
           restrict: "A",
           scope: {}
       }
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
   //lodash
   app.factory('_', ['$window',
       function($window) {
           // place lodash include before angular
           return $window._;
       }
   ])
