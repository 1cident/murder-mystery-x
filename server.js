const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*", methods: ["GET", "POST"] } });
const path = require('path');

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });
app.use(express.static(__dirname));

let players = {};

io.on('connection', (socket) => {
    players[socket.id] = {
        id: socket.id,
        x: 2, z: 2, y: 1.6, ry: 0,
        role: Object.keys(players).length === 0 ? 'Murderer' : 'Innocent',
        alive: true
    };

    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', players[socket.id]);

    socket.on('playerMovement', (mov) => {
        if (players[socket.id] && players[socket.id].alive) {
            Object.assign(players[socket.id], mov);
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    socket.on('attack', () => {
        const attacker = players[socket.id];
        if (attacker && attacker.role === 'Murderer' && attacker.alive) {
            Object.values(players).forEach(v => {
                if (v.id !== socket.id && v.alive) {
                    const dist = Math.hypot(v.x - attacker.x, v.z - attacker.z);
                    if (dist < 2.5) {
                        v.alive = false;
                        io.emit('playerKilled', v.id);
                    }
                }
            });
        }
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => { console.log('Serveur Labyrinthe 3D OK'); });
