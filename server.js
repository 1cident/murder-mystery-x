// Dans le bloc io.on('connection', ...)
    socket.on('shoot', (targetPos) => {
        const p = players[socket.id];
        if (p && p.role === 'Sheriff' && p.alive) {
            // On envoie l'ordre de dessiner la balle à TOUT LE MONDE
            io.emit('bulletFired', {
                from: { x: p.x, y: p.y },
                to: targetPos
            });

            // Vérification si un joueur est touché (le Murderer par exemple)
            Object.values(players).forEach(v => {
                if (v.id !== socket.id && v.alive) {
                    const dist = Math.hypot(v.x - targetPos.x, v.y - targetPos.y);
                    if (dist < 35) { // Rayon de la balle
                        v.alive = false;
                        io.emit('playerKilled', v.id);
                    }
                }
            });
        }
    });
