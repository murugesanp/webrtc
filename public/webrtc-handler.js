var Peer = window.SimplePeer;
var socket = io.connect();

var initiateBtn = document.getElementById('initiateBtn');
var loggedInUsers = document.getElementById('loggedInUsers');
var connectBtn = document.getElementById('connectBtn');
var whomToConnectDiv = document.getElementById('whomToConnect');
var screenShare = document.getElementById('screenShare');
var initiator = false;
var video;

function setCookie(name,value,minutes) {
  var expires = "";
  if (minutes) {
      var date = new Date();
      date.setTime(date.getTime() + (minutes*60*1000));
      expires = "; expires=" + date.toUTCString();
  }
  console.log('set = ' + name + "=" + (value || "")  + expires);
  document.cookie = name + "=" + (value || "")  + expires;
}
function getCookie(name) {
  console.log(document.cookie);
  var nameEQ = name + "=";
  var ca = document.cookie.split(';');
  for(var i=0;i < ca.length;i++) {
      var c = ca[i];
      while (c.charAt(0)==' ') c = c.substring(1,c.length);
      if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
  }
  return null;
}

function doAuth() {
  var http = new XMLHttpRequest();
  var url = 'https://auth.naea1.uds.lenovo.com/auth/realms/tsahai/protocol/openid-connect/auth'; 
  var params = 'client_id=tsahai&redirect_uri=' + encodeURIComponent('http://localhost:4200/client') + '&response_type=code&scope=openid&prompt=login&kc_locale=en';
  location.assign(url + '?' + params);
}

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

function getToken(code) {
  var url = 'https://auth.naea1.uds.lenovo.com/auth/realms/tsahai/protocol/openid-connect/token'; 
  var params = 'client_id=tsahai&code=' + code + '&grant_type=authorization_code&redirect_uri=' + encodeURIComponent('http://localhost:4200/client');

  postData(url, params).then(data => {
    token = data.access_token;
    localStorage.setItem('token', token);
    socket.emit('join', { "type": "login", "token": localStorage.getItem('token') })
    location.assign(window.location.href.split('?')[0]);
  });
}

var token = "";
var otp = "";

window.onload = () => {
  const urlParams = new URL(document.URL).searchParams;
  if (urlParams.get('tv_id')) {
    otp = "123456"
    socket.emit('join', { "type": "login", "tv_id": urlParams.get('tv_id'), "otp": otp })
    loggedInUsers.appendChild(document.createTextNode(otp));
    console.log(otp)
    return;
  }

  token = localStorage.getItem('token');
  console.log(token);
  if (!token) {
    console.log(urlParams);

    var code = urlParams.get('code');
    if (code) {
      getToken(code);
    }
    else {
      doAuth();
    }
  }
}

// socket.on('notify', (data) => {
//   loggedInUsers.style.display = 'block';
//   while (loggedInUsers.firstChild) {
//     loggedInUsers.removeChild(loggedInUsers.firstChild)
//   }
//   data.forEach(element => {
//     var el = document.createElement("p");
//     el.appendChild(document.createTextNode(element.name))
//     loggedInUsers.appendChild(el);
//   });
// });

socket.on('del_token', () => {
  localStorage.setItem('token', '');
});

if (initiateBtn) {
  initiateBtn.onclick = (e) => {
    initiator = true;
    socket.emit('initiate');
  }
}
var whomToConnect;
if (connectBtn) {
  connectBtn.onclick = (e) => {
    whomToConnect = document.getElementById("whomToChat").value
    console.log(whomToConnect)
    connectBtn.disabled = true
    connectBtn.innerHTML = 'Connected'
    connectBtn.classList.replace('btn-outline-primary', 'btn-primary')

    if (initiateBtn) {
      initiateBtn.disabled = false
    }
  }
}

socket.on('initiate', () => {
  startStream();
  if (initiateBtn) {
    initiateBtn.disabled = true;
  }
})

function startStream() {
  if (initiator) {
    // get screen stream
    navigator.mediaDevices.getDisplayMedia({
      video: {
        mediaSource: "screen",
        width: { max: '1000' },
        height: { max: '1000' },
        frameRate: { max: '20' }
      }
    }).catch(function (err) { console.log("Error in getting media stream " + err) }).then(gotMedia);
  } else {
    gotMedia(null);
  }
}
var localStream;
var peer;
var socketId = "";
function gotMedia(stream) {
  localStream = stream;
  console.log(initiator)
  console.log(peer)
  if (initiator) {
    peer = new Peer({
      initiator,
      stream
      //config: stunServerConfig
    });
  } else {
    peer = new Peer({
      //config: stunServerConfig
    });
  }

  peer.on('signal', function (data) {
    console.log(data)
    if (socketId.length === 0) {
      socket.emit('offer', JSON.stringify({ payload: data, otp: whomToConnect }));
    }
    else {
      socket.emit('offer', JSON.stringify({ payload: data, id: socketId }));
    }
  });

  socket.on('offer', (data) => {
    console.log(data)
    let message = JSON.parse(data.payload)
    // whomToConnect = data.username
    socketId = data.id
    peer.signal(message.payload);
  })

  peer.on('stream', function (stream) {
    console.log("got remote video stream, now let's show it in a video tag")
    // got remote video stream, now let's show it in a video tag
    video = document.querySelector('video');
    video.srcObject = stream;
    video.play();
    if (screenShare){
      screenShare.innerHTML = ''
      whomToConnectDiv.innerHTML = ''
    }
  })
  peer.on('close', () => {
    if (!peer.initiator) {
      let tracks = video.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      video.srcObject = null;
    }
  })

  if (localStream != null && localStream != undefined) {
    localStream.getVideoTracks()[0].onended = function () {
      console.log("video ended");
      peer.destroy();
      if (initiateBtn) {
        initiateBtn.disabled = true;
      }
    }
  }
}

