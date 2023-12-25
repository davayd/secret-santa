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
    console.log("before shuffle", showUsers());

    let before = Object.entries(socketIdToUser);
    for (let i = 0; i < 3; i++) {
      console.log(`shuffle cycle: ${i + 1}`);
      before = shuffle(before);
    }

    const after = before.reduce((acc, item) => {
      acc[item[0]] = item[1];
      return acc;
    }, {});

    console.log("after shuffle", after);
    const santaRoutes = distributeSanta(after);
    const socketIdUsers = Object.entries(socketIdToUser);
    Object.entries(santaRoutes).forEach(([key, value]) => {
      const socketId = socketIdUsers.find((i) => i[1] === key)[0];
      if (socketId) {
        io.to(socketId).emit("santa", value);
      }
    });
  });

  socket.on("inputChatMessage", (value) => {
    io.emit("outputChatMessage", `${socketIdToUser[socket.id]} - ${value}`);
  });
});

httpServer.listen(process.env.PORT || 3000);

function distributeSanta(shuffledUsers) {
  let shuffledNames = Object.values(shuffledUsers);
  console.log("shuffledNames", shuffledNames);

  const directions = {};
  let currentUserIdx = 0;
  let nextUserIdx = 1;
  while (shuffledNames.length) {
    console.log("shuffledNames while", shuffledNames);
    if (
      restrinctions[shuffledNames[currentUserIdx]].includes(
        shuffledNames[nextUserIdx]
      )
    ) {
      nextUserIdx++;
    } else {
      if (shuffledNames.length === 1) {
        directions[shuffledNames[currentUserIdx]] = Object.keys(directions)[0];
      } else {
        directions[shuffledNames[currentUserIdx]] = shuffledNames[nextUserIdx];
      }
      // reset indexes
      nextUserIdx = 1;
      currentUserIdx = 0;
      // pop array
      shuffledNames = removeItemByIdx(shuffledNames, currentUserIdx);
    }
  }
  console.log("directions", directions);
  return directions;
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

function removeItemByIdx(array, index) {
  if (index > -1) {
    array.splice(index, 1);
  }
  return array;
}
