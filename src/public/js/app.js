const socket = io();

const welcome = document.querySelector("#welcome");
const enterForm = welcome.querySelector("#enter");
const nicknameForm = welcome.querySelector("#nickname");

const room = document.querySelector("#room");
const msgForm = room.querySelector("#msg");

room.hidden = true;

let roomName;

function addMessage(msg) {
  const ul = room.querySelector("ul");
  const li = document.createElement("li");
  li.innerText = msg;
  ul.appendChild(li);
}

function changeTitle(newCount) {
  const h3 = room.querySelector("h3");
  h3.innerText = `Room: ${roomName} (${newCount})`;
}

function handleMessageSubmit(event) {
  event.preventDefault();
  const input = room.querySelector("#msg input");
  const value = input.value;
  socket.emit("new_message", value, roomName, () => {
    addMessage(`You: ${value}`);
  });
  input.value = "";
}

function handleNicknameSubmit(event) {
  event.preventDefault();
  const input = nicknameForm.querySelector("input");
  socket.emit("nickname", input.value);
  alert("Nickname Saved");
}

function showRoom(newCount) {
  console.log(newCount);
  welcome.hidden = true;
  room.hidden = false;
  changeTitle(newCount);
  msgForm.addEventListener("submit", handleMessageSubmit);
}

function handleRoomSubmit(event) {
  event.preventDefault();
  const input = enterForm.querySelector("input");
  socket.emit("enter_room", input.value, showRoom);
  roomName = input.value;
  input.value = "";
}

enterForm.addEventListener("submit", handleRoomSubmit);
nicknameForm.addEventListener("submit", handleNicknameSubmit);

socket.on("welcome", (nickname, newCount) => {
  console.log(newCount);
  changeTitle(newCount);
  addMessage(`${nickname} Joined!`);
});

socket.on("bye", (nickname, newCount) => {
  changeTitle(newCount);
  addMessage(`${nickname} Left!`);
});

socket.on("new_message", (msg) => {
  addMessage(msg);
});

socket.on("room_change", (rooms) => {
  const roomList = welcome.querySelector("ul");
  roomList.innerHTML = "";
  rooms.forEach((room) => {
    const li = document.createElement("li");
    li.innerText = room;
    roomList.append(li);
  });
});
