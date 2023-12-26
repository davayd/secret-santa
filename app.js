const { readFileSync } = require("fs");
const { createServer } = require("http");
const { Server } = require("socket.io");

const httpServer = createServer((req, res) => {
  if (req.url !== "/") {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  // reload the file every time
  const content = readFileSync("index.html");
  const length = Buffer.byteLength(content);

  res.writeHead(200, {
    "Content-Type": "text/html",
    "Content-Length": length,
  });
  res.end(content);
});

const socketIdToUser = {};

const restrinctions = {
  Лена: ["Артур"],
  Артур: ["Лена"],
  Дима: ["Рита"],
  Рита: ["Дима"],
  Даша: ["Артём"],
  Артём: ["Даша"],
  Слава: [],
};

const io = new Server(httpServer, {
  // Socket.IO options
});

io.on("connection", (socket) => {
  socketIdToUser[socket.id] = null;
  console.log(showUsers());
  io.emit("userConnected", socket.id);
  io.emit("showAllUsersInRoom", socketIdToUser);

  socket.on("disconnect", () => {
    delete socketIdToUser[socket.id];
    console.log(showUsers());
  });

  socket.on("submitName", (userName) => {
    socketIdToUser[socket.id] = userName;
    console.log(showUsers());
    io.emit("userSubmitted", socket.id, userName);
    io.emit("showAllUsersInRoom", socketIdToUser);
  });

  socket.on("distribute", () => {
    let before = Object.values(socketIdToUser);
    console.log("before shuffle", before);

    let i = 0;
    do {
      before = shuffle(before);
      console.log(`shuffle cycle ${++i}`, before);
    } while (hasRestriction(before));

    const socketIdUsers = Object.entries(socketIdToUser);
    before.forEach((userName, idx) => {
      const socketId = socketIdUsers.find((i) => i[1] === userName)[0];
      if (socketId) {
        if (idx === before.length - 1) {
          io.to(socketId).emit("santa", before[0]);
        } else {
          io.to(socketId).emit("santa", before[idx + 1]);
        }
        
      }
    });
  });

  socket.on("inputChatMessage", (value) => {
    io.emit("outputChatMessage", `${socketIdToUser[socket.id]} - ${value}`);
  });
});

httpServer.listen(process.env.PORT || 3000);

function hasRestriction(inputValues) {
  const shuffledNames = [...inputValues, inputValues[0]];

  let hasRestrictions = false;
  for (let idx = 0; idx < shuffledNames.length; idx++) {
    if (restrinctions[shuffledNames[idx]].includes(shuffledNames[idx + 1])) {
      hasRestrictions = true;
      break;
    }
  }
  console.log("hasRestrictions", hasRestrictions);
  return hasRestrictions;
}

function showUsers() {
  const stringify = JSON.stringify(socketIdToUser);
  return stringify;
}

function shuffle(array) {
  let currentIndex = array.length,
    randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex > 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}