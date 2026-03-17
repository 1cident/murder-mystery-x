const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

let players = {};

io.on('connection', (socket) => {
    console.log('Joueur connecté : ' + socket.id);

    // Création du joueur
    players[socket.id] = {
        x: Math.random() * 500 + 50,
        y: Math.random() * 400 + 50,
        id: socket.id,
        role: Object.keys(players).length === 0 ? 'Murderer' : 'Innocent',
        alive: true
    };

    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', players[socket.id]);

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
        io.emit('playerDisconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => { console.log('Serveur prêt !'); });
