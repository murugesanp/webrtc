const { response } = require('express');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http,{
    allowEIO3: true // false by default
  });
//io = io(http)

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function getDataToken(url, token) {
  var response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Bearer ' + token,
      'x-subscription': 'fecf82af-a854-4091-b428-f5d3b7518335',
      'x-tenant': 'smartdisplayservice'
    },
    redirect: "follow"
  });
  // console.log(response);
  try {
    return await response.json();
  }
  catch {
    return '';
  }
}

var token;
async function postData(url, data) {
  var response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    redirect: "follow",
    body: data
  });
  return response.json();
}

async function getToken() {
  var url = 'https://auth.naea1.uds.lenovo.com/auth/realms/tsahai/protocol/openid-connect/token'; 
  var params = 'client_id=smartdisplayservice&client_secret=546a93f8-cc39-4726-8217-76f9d16e5e45&grant_type=client_credentials';

  token = (await postData(url, params)).access_token

  return token
}

app.use(express.static('public'));
var users = []
var tvs = []
io.on('connection', (socket) => {
  console.log('user connected');
  
  // io.emit("notify",users);

  socket.on('offer', (data) => {
    let message = JSON.parse(data);

    //console.log(users.find(s=>s.name===message.username))
    if (message.otp) {
      let tv_id = tvs.find(s=>s.otp===message.otp)?.id
      console.log(tv_id)
      console.log(socket.id)
      console.log(tvs)
      io.to(tv_id).emit('offer', {payload:data,id:socket.id});
      //socket.broadcast.emit('offer', message.payload);
    }
    else {
      io.to(message.id).emit('offer', {payload:data,id:socket.id});
    }
    
  });

  socket.on('initiate', () => {
    io.emit('initiate');
  });

  socket.on("join",(data) => {
    console.log({...data,"id":socket.id});

    if (data.tv_id) {
      var idx = tvs.findIndex(tv => tv.tv_id === data.tv_id)
      tvs[idx].id = socket.id
      tvs[idx].otp = data.otp
    }
    else {
      var url = 'https://api.naea1.uds.lenovo.com/core/ui/v1/permissions';
      getDataToken(url, data.token).then(permissons => {
        // console.log(permissons['AUTHORIZED']);
        if (permissons['AUTHORIZED'] !== true) {
          console.log('not authorized');
          socket.emit('del_token');
        }
        else {
          console.log('authorized');
          users.push({...data,"id":socket.id});
        }
      })
    }
    
    // io.emit("notify",users);
  })
})

getToken().then(_ => {
  var url = 'https://api.naea1.uds.lenovo.com/device-profile-service/v2/devices';
  var params = 'group_id=e2f9c19e-8a7d-4f83-ac2f-eb13a8b79469'
  console.log('token = ' + token)
  getDataToken(url + '?' + params, token).then(devices => {
    console.log(devices)
    devices.content.forEach(attr => {
      console.log('tv = ' + attr.deviceName + ", " + attr.deviceId)
      tvs.push({'tv_id': attr.deviceId})
    });
  })
})

http.listen(4200, () => console.log('Example app listening on port 3000!'))