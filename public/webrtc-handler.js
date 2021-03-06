var Peer = window.SimplePeer;
var socket = io.connect();

var initiateBtn = document.getElementById('initiateBtn');
var joinBtn = document.getElementById('joinBtn');
var loggedInUsers = document.getElementById('loggedInUsers');
var connectBtn = document.getElementById('connectBtn');
var whomToConnectDiv = document.getElementById('whomToConnect');
var screenShare = document.getElementById('screenShare');
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
    joinBtn.disabled = true
    joinBtn.innerHTML='Joined'
    joinBtn.classList.replace('btn-outline-primary','btn-primary')
    
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
    console.log(whomToConnect)
    connectBtn.disabled = true
    connectBtn.innerHTML='Connected'
    connectBtn.classList.replace('btn-outline-primary','btn-primary')
    initiateBtn.disabled = false
}

socket.on('initiate', () => {
  startStream();
  initiateBtn.disabled = true;
})

function startStream () {
  if (initiator) {
    // get screen stream
    navigator.mediaDevices.getDisplayMedia({
      video: {
        mediaSource: "screen",
        width: { max: '1000' },
        height: { max: '1000' },
        frameRate: { max: '20' }
      }
    }).then(gotMedia);
  } else {
    gotMedia(null);
  }
}
var localStream;
var peer;
function gotMedia (stream) {
  localStream = stream;
  console.log(initiator)
  console.log(peer)
  if (initiator) {
     peer = new Peer({
      initiator,
      stream,
      config: stunServerConfig
    });
  } else {
     peer = new Peer({
      config: stunServerConfig
    });
  }

  peer.on('signal', function (data) {
    console.log(data)
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
    screenShare.innerHTML=''
    whomToConnectDiv.innerHTML=''
  })
  peer.on('close', () => {
    if(!peer.initiator){
      let tracks = video.srcObject.getTracks();                
      tracks.forEach(track => track.stop());
      video.srcObject = null;
    }
  })

  localStream.getVideoTracks()[0].onended = function(){
    console.log("video ended");
    peer.destroy();
    initiateBtn.disabled = true;
  }
}

