const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

let players = {};
let customer = null;

function update() {
  io.emit("players", players);
}

function newCustomer() {
  const recipes = [
    ["eggplant"],
    ["honey"],
    ["fish"],
    ["eggplant", "honey"],
    ["eggplant", "fish"],
    ["honey", "fish"]
  ];

  customer = {
    recipe: recipes[Math.floor(Math.random() * recipes.length)],
    time: 20
  };

  io.emit("customer", customer);
}

function checkPizza(id) {
  const p = players[id];
  if (!p || !customer) return;

  const ok =
    p.toppings.length === customer.recipe.length &&
    p.toppings.every(v => customer.recipe.includes(v));

  if (ok) {
    p.money += 100;
  } else {
    p.money -= 10;
  }

  p.toppings = [];
  newCustomer();
  update();
}

io.on("connection", socket => {

  console.log("접속 ID:", socket.id);

  // 플레이어 생성
  players[socket.id] = {
    money: 100,
    role: null,
    toppings: [],
    eggplant: 0,
    honey: 0,
    fish: 0
  };

  // 내 ID 보내기
  socket.emit("myId", socket.id);

  update();

  // 역할 설정
  socket.on("setRole", role => {
    players[socket.id].role = role;
    update();
  });

  // 농사
  socket.on("farm", () => {
    if (players[socket.id].role !== "farmer") return;
    players[socket.id].eggplant++;
    update();
  });

  socket.on("bee", () => {
    if (players[socket.id].role !== "farmer") return;
    players[socket.id].honey++;
    update();
  });

  socket.on("fish", () => {
    if (players[socket.id].role !== "farmer") return;
    players[socket.id].fish++;
    update();
  });

  // 요리
  socket.on("addTopping", item => {
    if (players[socket.id].role !== "chef") return;
    players[socket.id].toppings.push(item);
    update();
  });

  socket.on("serve", () => {
    checkPizza(socket.id);
  });

  // 음성 연결 (릴레이)
  socket.on("voice-offer", data => socket.to(data.to).emit("voice-offer", data));
  socket.on("voice-answer", data => socket.to(data.to).emit("voice-answer", data));
  socket.on("voice-ice", data => socket.to(data.to).emit("voice-ice", data));

  socket.on("disconnect", () => {
    delete players[socket.id];
    update();
    console.log("퇴장:", socket.id);
  });

  if (!customer) newCustomer();
});

http.listen(3000, "0.0.0.0", () => {
  console.log("🍕 서버 실행 완료");
});