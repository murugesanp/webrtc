var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http,{
    allowEIO3: true // false by default
  });
//io = io(http)
var users = []

app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('user connected');

  io.emit("notify",users);

  socket.on('offer', (data) => {
    socket.broadcast.emit('offer', data);
  });

  socket.on('initiate', () => {
    io.emit('initiate');
  });

  socket.on("join",(data) => {
    console.log({...data,"id":socket.id});
    users.push({...data,"id":socket.id});
    io.emit("notify",users);
  })
})

http.listen(3000, () => console.log('Example app listening on port 3000!'))