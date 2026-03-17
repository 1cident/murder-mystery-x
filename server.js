const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*", methods: ["GET", "POST"] } });

let players = {};
let murdererId = null;

io.on('connection', (socket) => {
    console.log('Joueur connecté : ' + socket.id);

    // Création du joueur avec un rôle par défaut
    players[socket.id] = {
        x: Math.random() * 600 + 100,
        y: Math.random() * 400 + 100,
        id: socket.id,
        role: 'Innocent',
        color: '#d4af37', // Doré pour les innocents
        alive: true
    };

    // Si c'est le seul joueur, il devient le Murderer (pour le test)
    // Dans une vraie partie, on lancerait un compte à rebours
    if (Object.keys(players).length === 1) {
        players[socket.id].role = 'Murderer';
        murdererId = socket.id;
    }

    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', players[socket.id]);

    socket.on('playerMovement', (mov) => {
        if (players[socket.id] && players[socket.id].alive) {
            players[socket.id].x = mov.x;
            players[socket.id].y = mov.y;
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    // Logique d'attaque
    socket.on('attack', () => {
        if (players[socket.id] && players[socket.id].role === 'Murderer' && players[socket.id].alive) {
            socket.broadcast.emit('playerAttacking', socket.id);
            
            // Vérifier si un innocent est touché
            Object.values(players).forEach(p => {
                if (p.id !== socket.id && p.alive) {
                    const dist = Math.hypot(p.x - players[socket.id].x, p.y - players[socket.id].y);
                    if (dist < 40) { // Distance du coup de couteau
                        p.alive = false;
                        io.emit('playerKilled', p.id);
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
http.listen(PORT, () => { console.log(`Serveur sur port ${PORT}`); });
