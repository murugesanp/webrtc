var Peer = window.SimplePeer;
var socket = io.connect();

var initiateBtn = document.getElementById('initiateBtn');
var stopBtn = document.getElementById('stopBtn');
var joinBtn = document.getElementById('joinBtn');
var loggedInUsers = document.getElementById('loggedInUsers');
var connectBtn = document.getElementById('connectBtn');
var initiator = false;
var video;

const stunServerConfig = {}

// const stunServerConfig = {
//   iceServers: [{
//     url: 'turn:13.250.13.83:3478?transport=udp',
//     username: "YzYNCouZM1mhqhmseWk6",
//     credential: "YzYNCouZM1mhqhmseWk6"
//   }]
// };

joinBtn.onclick = (e) => {
    var name = document.getElementById("userId").value
    socket.emit('join',{"type":"login","name":name})
    joinBtn.style.display = 'none';
}

socket.on('notify',(data) => {
    loggedInUsers.style.display = 'block';
    while (loggedInUsers.firstChild) {
        loggedInUsers.removeChild(loggedInUsers.firstChild)
      }
    data.forEach(element => {
        var el = document.createElement("p");
       el.appendChild(document.createTextNode(element.name))
       loggedInUsers.appendChild(el);
    });
});



initiateBtn.onclick = (e) => {
  initiator = true;
  socket.emit('initiate');
}
var whomToConnect;
connectBtn.onclick = (e) => {
    whomToConnect = document.getElementById("whomToChat").value  
}

socket.on('initiate', () => {
  startStream();
  initiateBtn.style.display = 'none';
  stopBtn.style.display = 'block';
})

function startStream () {
  if (initiator) {
    // get screen stream
    navigator.mediaDevices.getDisplayMedia({
      video: {
        mediaSource: "screen",
        width: { max: '400' },
        height: { max: '400' },
        frameRate: { max: '10' }
      }
    }).then(gotMedia);
  } else {
    gotMedia(null);
  }
}
var localStream;
function gotMedia (stream) {
  localStream = stream;
  if (initiator) {
    var peer = new Peer({
      initiator,
      stream,
      config: stunServerConfig
    });
  } else {
    var peer = new Peer({
      config: stunServerConfig
    });
  }

  peer.on('signal', function (data) {
    //console.log(data)
    socket.emit('offer', JSON.stringify({payload:data,username:whomToConnect}));
  });

  socket.on('offer', (data) => { 
    console.log(data)
    let message = JSON.parse(data.payload)
    whomToConnect=data.username
    peer.signal(message.payload);
  })
  
  peer.on('stream', function (stream) {
    // got remote video stream, now let's show it in a video tag
    video = document.querySelector('video');
    video.srcObject = stream;
    video.play();
    video.srcObject.getVideoTracks().onended=()=>{
      console.log('event fired')
      video.srcObject=null;
    }
  })
}