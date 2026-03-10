const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(__dirname));

const users = {}; // Comptes
let players = {}; // Position des joueurs connectés

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
    // --- GESTION DES COMPTES ---
    socket.on('register', (data) => {
        if(users[data.username]) {
            socket.emit('message', 'Erreur : Pseudo déjà pris !');
        } else {
            users[data.username] = data.password;
            socket.emit('message', 'Compte créé avec succès !');
        }
    });

    socket.on('login', (data) => {
        if(users[data.username] && users[data.username] === data.password) {
            socket.emit('message', 'Connexion réussie !');
            players[socket.id] = { username: data.username, x: 0, y: 0 };
        } else {
            socket.emit('message', 'Erreur : Identifiants incorrects.');
        }
    });

    // --- GESTION MULTIJOUEUR ---
    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log('Serveur actif sur le port ' + PORT);
});
