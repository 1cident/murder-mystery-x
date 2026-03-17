const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*", methods: ["GET", "POST"] } });
const path = require('path');

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });
app.use(express.static(__dirname));

let players = {};
let gameStarted = false;

function resetRoles() {
    const ids = Object.keys(players);
    if (ids.length < 2) return; 

    ids.forEach(id => { players[id].role = 'Innocent'; players[id].alive = true; });

    // Mélange aléatoire des IDs
    const shuffled = ids.sort(() => 0.5 - Math.random());
    
    // 1er = Murderer
    players[shuffled[0]].role = 'Murderer';
    
    // 2ème = Shérif (si au moins 3 joueurs, sinon le 2ème reste innocent ou devient shérif à 2 pour tester)
    if (shuffled.length >= 2) {
        players[shuffled[1]].role = 'Sheriff';
    }
    
    io.emit('gameStarted', players);
    gameStarted = true;
}

io.on('connection', (socket) => {
    players[socket.id] = { x: 50, y: 50, id: socket.id, role: 'Attente...', alive: true };
    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', players[socket.id]);

    if (Object.keys(players).length >= 2 && !gameStarted) {
        setTimeout(resetRoles, 5000);
    }

    socket.on('playerMovement', (mov) => {
        if (players[socket.id] && players[socket.id].alive) {
            players[socket.id].x = mov.x;
            players[socket.id].y = mov.y;
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    socket.on('attack', () => {
        const p = players[socket.id];
        if (!p || !p.alive) return;

        if (p.role === 'Murderer') {
            Object.values(players).forEach(v => {
                if (v.id !== socket.id && v.alive && Math.hypot(v.x - p.x, v.y - p.y) < 50) {
                    v.alive = false;
                    io.emit('playerKilled', v.id);
                }
            });
        }
    });

    // Tir du Shérif
    socket.on('shoot', (targetPos) => {
        const p = players[socket.id];
        if (p && p.role === 'Sheriff' && p.alive) {
            io.emit('bulletFired', {from: {x: p.x, y: p.y}, to: targetPos});
            // Logique de collision simplifiée pour le tir
            Object.values(players).forEach(v => {
                if (v.id !== socket.id && v.alive) {
                    const dist = Math.hypot(v.x - targetPos.x, v.y - targetPos.y);
                    if (dist < 30) {
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
http.listen(PORT, () => { console.log('Serveur prêt !'); });
