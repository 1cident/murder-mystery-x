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

    // Tout le monde devient Innocent par défaut
    ids.forEach(id => { players[id].role = 'Innocent'; players[id].alive = true; });

    // On choisit un Murderer au hasard
    const murdererId = ids[Math.floor(Math.random() * ids.length)];
    players[murdererId].role = 'Murderer';
    
    io.emit('gameStarted', players);
    gameStarted = true;
}

io.on('connection', (socket) => {
    players[socket.id] = {
        x: 100, y: 100, id: socket.id,
        role: 'Attente...', alive: true
    };

    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', players[socket.id]);

    // Si on passe à 2 joueurs, on lance les rôles après 5 sec
    if (Object.keys(players).length === 2 && !gameStarted) {
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
        const attacker = players[socket.id];
        if (attacker && attacker.role === 'Murderer' && attacker.alive) {
            Object.values(players).forEach(victim => {
                if (victim.id !== socket.id && victim.alive) {
                    const dist = Math.hypot(victim.x - attacker.x, victim.y - attacker.y);
                    if (dist < 50) {
                        victim.alive = false;
                        io.emit('playerKilled', victim.id);
                    }
                }
            });
        }
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        if (Object.keys(players).length < 2) gameStarted = false;
        io.emit('playerDisconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => { console.log('Serveur prêt !'); });
