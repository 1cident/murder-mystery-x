const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*", methods: ["GET", "POST"] } });
const path = require('path');

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });
app.use(express.static(__dirname));

let players = {};

io.on('connection', (socket) => {
    socket.on('joinGame', (nickname) => {
        players[socket.id] = {
            id: socket.id,
            name: nickname || "Joueur",
            x: 2, z: 2, y: 1.6, ry: 0,
            role: Object.keys(players).length === 0 ? 'Murderer' : 'Innocent',
            alive: true
        };
        socket.emit('currentPlayers', players);
        socket.broadcast.emit('newPlayer', players[socket.id]);
    });

    socket.on('playerMovement', (mov) => {
        if (players[socket.id] && players[socket.id].alive) {
            Object.assign(players[socket.id], mov);
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    socket.on('attack', () => {
        const p = players[socket.id];
        if (p && p.role === 'Murderer' && p.alive) {
            Object.values(players).forEach(v => {
                if (v.id !== socket.id && v.alive) {
                    if (Math.hypot(v.x - p.x, v.z - p.z) < 2.5) {
                        v.alive = false;
                        io.emit('playerKilled', v.id);
                    }
                }
            });
        }
    });

    socket.on('disconnect', () => {
        if (players[socket.id]) {
            delete players[socket.id];
            io.emit('playerDisconnected', socket.id);
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => { console.log('Serveur 3D prêt'); });
