var express = require('express')
  , app = express()
  , http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server);

server.listen(3000);

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

var usernames = {};
var rooms = {};
var sessions= {};
var turn = {};
var boxFilled = {};
var symbol = {};
var content = {};
var win_combinations = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6],
                        [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

io.sockets.on('connect', function (socket) {
  socket.on('adduser', function(username) {
    socket.username = username;
    usernames[username] = username;
  });
  socket.on('tic-tac', function(canvasNum, sessionId, room_name) {
    var sessionlength = 0;
    for (var key in sessions[room_name])
      sessionlength++;
    if(sessionlength < 2) {
      updateContent(room_name, canvasNum, content, symbol, turn, boxFilled);
    }
    else if (sessionlength >= 2) {
      if(sessions[room_name].indexOf(sessionId) != -1) {
        if (sessions[room_name][turn[room_name] % 2] == sessionId)
          updateContent(room_name, canvasNum, content, symbol, turn, boxFilled);
      }
    }
    function updateContent(room_name, canvasNum, content, symbol, turn, boxFilled) {
      if (symbol[room_name][canvasNum - 1] == false) {
        if (turn[room_name] % 2 == 0){
          content[room_name][canvasNum - 1] = 'X';
          turn[room_name] = turn[room_name] + 1;
          boxFilled[room_name] = boxFilled[room_name]+1;
        }
        else {
          content[room_name][canvasNum - 1] = 'O';
          turn[room_name] = turn[room_name] + 1;
          boxFilled[room_name] = boxFilled[room_name]+1;
        }
        io.sockets.in(socket.room).emit('tic-tac', canvasNum, content[room_name]);
        symbol[room_name][canvasNum - 1] = true;
        checkWinner(content[room_name][canvasNum - 1]);
      }
      else {
        io.sockets.in(socket.room).emit('boxfilled', canvasNum);
      }

      if (boxFilled[room_name] == 9) {
        io.sockets.in(socket.room).emit('gameover');
        location.reload(true);
      }
    }

    function checkWinner(sym) {
      for (i = 0; i < 8; i++) {
        if (content[room_name][win_combinations[i][0]] == sym && content[room_name][win_combinations[i][1]] == sym && content[room_name][win_combinations[i][2]] == sym)
          io.sockets.in(socket.room).emit('alert', sym);
      }
    }
  });

  socket.on('createroom', function(roomname, socketId) {
    socket.leave(socket.room);
    socket.room = roomname;
    socket.join(roomname);
    rooms[roomname] = roomname;
    sessions[roomname] = new Array();
    symbol[roomname] = new Array();
    content[roomname] = new Array();

    for (i = 0; i < 9; i++) {
      symbol[roomname].push(false);
      content[roomname].push('');
    }

    turn[roomname] = 0;
    boxFilled[roomname] = 0;
    var sessionlength = 0;
    for (var key in sessions[roomname])
      sessionlength++;
    if (sessionlength < 2){
      sessions[roomname].push(socketId);
    }
    socket.emit('roomname').emit('updatechat', 'SERVER', 'You created this room');
    socket.emit('updaterooms', rooms, roomname);
    socket.emit('clearcontent');
  });

  socket.on('showrooms', function(socketId, room_name) {
    socket.emit('clearrooms');
    socket.emit('showrooms', rooms, socketId, room_name);
  });

  socket.on('switchroom', function(newroom, socketId) {
    socket.leave(socket.room);
    socket.join(newroom);
    var sessionlength = 0;
    for (var key in sessions[newroom])
      sessionlength++;

    if (sessionlength < 2)
      sessions[newroom].push(socketId);

    socket.emit('updatechat', 'SERVER', 'you have connected to '+ newroom);
    socket.broadcast.to(socket.room).emit('updatechat', 'SERVER', socket.username+' has left this room');
    socket.room = newroom;
    socket.broadcast.to(newroom).emit('updatechat', 'SERVER', socket.username+' has joined this room');
    socket.emit('updaterooms', rooms, newroom);
    socket.emit('clearcontent');
  });

  socket.on('disconnect', function() {
    delete usernames[socket.username];
    io.sockets.emit('updateusers', usernames);
    socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected');
    socket.leave(socket.room);
  });
});



