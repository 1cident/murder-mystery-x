const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*", // Autorise tous les sites à se connecter
    methods: ["GET", "POST"]
  }
});
const path = require('path');

app.use(express.static(__dirname));

let players = {};

io.on('connection', (socket) => {
    console.log('Un joueur connecté : ' + socket.id);

    players[socket.id] = {
        x: 400,
        y: 300,
        id: socket.id,
        color: '#' + Math.floor(Math.random()*16777215).toString(16)
    };

    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', players[socket.id]);

    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

// Très important pour Render
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Serveur prêt sur le port ${PORT}`);
});
