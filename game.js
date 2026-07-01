const socket = io();

let myId;
let targetId;
let pc;
let stream;

socket.on("connect", () => {
  myId = socket.id;
});

socket.on("players", data => {
  document.getElementById("info").innerHTML =
    JSON.stringify(data[myId], null, 2);
});

// 🎭 역할
function setRole(r){
  socket.emit("setRole", r);
}

// 🌾 농부
function farm(){ socket.emit("farm"); }
function bee(){ socket.emit("bee"); }
function fish(){ socket.emit("fish"); }

// 👨‍🍳 요리사
function add(item){
  socket.emit("addTopping", item);
}

function serve(){
  socket.emit("serve");
}

const config = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

async function startVoice(){

  targetId = prompt("상대 ID 입력");

  stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  pc = new RTCPeerConnection(config);

  stream.getTracks().forEach(t => pc.addTrack(t, stream));

  pc.onicecandidate = e => {
    if(e.candidate){
      socket.emit("voice-ice", {
        to: targetId,
        candidate: e.candidate
      });
    }
  };

  pc.ontrack = e => {
    const audio = new Audio();
    audio.srcObject = e.streams[0];
    audio.play();
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  socket.emit("voice-offer", {
    to: targetId,
    offer
  });
}

socket.on("voice-offer", async data => {

  targetId = data.from;

  stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  pc = new RTCPeerConnection(config);

  stream.getTracks().forEach(t => pc.addTrack(t, stream));

  pc.onicecandidate = e => {
    if(e.candidate){
      socket.emit("voice-ice", {
        to: targetId,
        candidate: e.candidate
      });
    }
  };

  pc.ontrack = e => {
    const audio = new Audio();
    audio.srcObject = e.streams[0];
    audio.play();
  };

  await pc.setRemoteDescription(data.offer);

  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  socket.emit("voice-answer", {
    to: targetId,
    answer
  });
});

socket.on("voice-answer", async data => {
  await pc.setRemoteDescription(data.answer);
});

socket.on("voice-ice", async data => {
  if(data.candidate){
    await pc.addIceCandidate(data.candidate);
  }
});