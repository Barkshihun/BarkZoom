const socket = io();

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const cameraSelect = document.getElementById("cameras");
const microphoneSelect = document.getElementById("microphones");
const myStreamDiv = document.getElementById("myStream");
const loadingStream = document.getElementById("loadingStream");
const call = document.getElementById("call");

call.hidden = true;

/** @type {MediaStream} */
let myStream;
let muted = false;
let cameraOff = false;
let previousVideoId;
let previousAudioId;
/** @type {RTCPeerConnection} */
let myPeerConnection;
let roomName;
/** @type {RTCDataChannel} */
let myDataChannel;

async function getCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((device) => device.kind === "videoinput");
    const currentCamera = myStream.getVideoTracks()[0];
    cameras.forEach((camera) => {
      const option = document.createElement("option");
      option.value = camera.deviceId;
      option.innerText = camera.label;
      if (currentCamera.label === camera.label) {
        option.selected = true;
      }
      cameraSelect.appendChild(option);
    });
  } catch (error) {
    console.log(error);
  }
}
async function getMicrophones() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const microphones = devices.filter(
      (device) => device.kind === "audioinput"
    );
    const currentMicrophone = myStream.getAudioTracks()[0];
    microphones.forEach((microphone) => {
      const option = document.createElement("option");
      option.value = microphone.deviceId;
      option.innerText = microphone.label;
      if (currentMicrophone.label === microphone.label) {
        option.selected = true;
      }
      microphoneSelect.appendChild(option);
    });
  } catch (error) {
    console.log(error);
  }
}

async function getMedeia(deviceId, type) {
  try {
    loadingStream.hidden = false;
    myStreamDiv.hidden = true;
    let constraints;
    if (myStream) {
      const tracks = myStream.getTracks();
      tracks.forEach((track) => track.stop());
    }
    if (deviceId) {
      switch (type) {
        case "camera":
          constraints = {
            audio: previousAudioId
              ? { deviceId: { exact: previousAudioId } }
              : true,
            video: { deviceId: { exact: deviceId } },
          };
          previousVideoId = deviceId;
          break;
        case "microphone":
          constraints = {
            audio: { deviceId: { exact: deviceId } },
            video: previousVideoId
              ? { deviceId: { exact: previousVideoId } }
              : true,
          };
          previousAudioId = deviceId;
      }
    } else {
      constraints = {
        audio: true,
        video: { facingMode: "user" },
      };
    }
    myStream = await navigator.mediaDevices.getUserMedia(constraints);
    myFace.srcObject = myStream;
    if (!deviceId) {
      await getCameras();
      await getMicrophones();
    }
    if (muted) {
      myStream.getAudioTracks()[0].enabled = false;
    } else {
      myStream.getAudioTracks()[0].enabled = true;
    }
    loadingStream.hidden = true;
    myStreamDiv.hidden = false;
  } catch (error) {
    console.log(error);
  }
}

function handleMuteClick() {
  if (muted) {
    muteBtn.innerText = "Mute";
    muted = false;
    myStream.getAudioTracks()[0].enabled = true;
  } else {
    muteBtn.innerText = "Unmute";
    muted = true;
    myStream.getAudioTracks()[0].enabled = false;
  }
}
function handleCameraClick() {
  if (cameraOff) {
    cameraBtn.innerText = "Turn Camera Off";
    cameraOff = false;
    myStream.getVideoTracks()[0].enabled = true;
  } else {
    cameraBtn.innerText = "Turn Camera On";
    cameraOff = true;
    myStream.getVideoTracks()[0].enabled = false;
  }
}

async function handleCameraChange() {
  await getMedeia(cameraSelect.value, "camera");
  if (myPeerConnection) {
    const videoTrack = myStream.getVideoTracks()[0];
    const videoSender = myPeerConnection
      .getSenders()
      .find((sender) => sender.track.kind === "video");
    videoSender.replaceTrack(videoTrack);
  }
}
async function handleMicrophoneChange() {
  await getMedeia(microphoneSelect.value, "microphone");
  if (myPeerConnection) {
    const audioTrack = myStream.getAudioTracks()[0];
    const microphoneSender = myPeerConnection
      .getSenders()
      .find((sender) => sender.track.kind === "audio");
    microphoneSender.replaceTrack(audioTrack);
  }
}
muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);

cameraSelect.addEventListener("input", handleCameraChange);
microphoneSelect.addEventListener("input", handleMicrophoneChange);

// welcomeForm (join a room)

const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");
const title = document.getElementById("title");

async function initCall() {
  welcome.hidden = true;
  call.hidden = false;
  await getMedeia();
  makeConnection();
}

async function handleWelcomeSubmit(event) {
  event.preventDefault();
  const input = welcomeForm.querySelector("input");
  roomName = input.value;
  title.innerText = `Noom: ${roomName}`;
  await initCall();
  socket.emit("join_room", input.value);
  input.value = "";
}
welcomeForm.addEventListener("submit", handleWelcomeSubmit);

//socket code

socket.on("welcome", async () => {
  myDataChannel = myPeerConnection.createDataChannel("chat");
  myDataChannel.addEventListener("message", console.log);
  const offer = await myPeerConnection.createOffer();
  myPeerConnection.setLocalDescription(offer);
  socket.emit("offer", offer, roomName);
});

socket.on("offer", async (offer) => {
  myPeerConnection.addEventListener("datachannel", (event) => {
    myDataChannel = event.channel;
    myDataChannel.addEventListener("message");
  });
  myPeerConnection.setRemoteDescription(offer);
  const answer = await myPeerConnection.createAnswer();
  myPeerConnection.setLocalDescription(answer);
  socket.emit("answer", answer, roomName);
});

socket.on("answer", (answer) => {
  myPeerConnection.setRemoteDescription(answer);
});

socket.on("ice", (ice) => {
  myPeerConnection.addIceCandidate(ice);
});

//RTC code

function makeConnection() {
  myPeerConnection = new RTCPeerConnection({
    iceServers: [
      {
        urls: [
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
          "stun:stun3.l.google.com:19302",
          "stun:stun4.l.google.com:19302",
        ],
      },
    ],
  });
  myPeerConnection.addEventListener("icecandidate", handleIce);
  myPeerConnection.addEventListener("track", handleAddStream);
  myStream
    .getTracks()
    .forEach((track) => myPeerConnection.addTrack(track, myStream));
}

function handleIce(data) {
  socket.emit("ice", data.candidate, roomName);
}

function handleAddStream(data) {
  const peerFace = document.getElementById("peerFace");
  peerFace.srcObject = data.streams[0];
}
