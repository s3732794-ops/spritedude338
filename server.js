const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Раздаем статические файлы из папки public (где лежат index.html, спрайты и картинки)
app.use(express.static('public'));

let waitingPlayer = null;

io.on('connection', (socket) => {
    console.log('Игрок подключился:', socket.id);

    // Обработка поиска матча
    socket.on('find_match', () => {
        if (waitingPlayer && waitingPlayer.id !== socket.id) {
            // Создаем уникальную комнату для двоих игроков
            let roomId = 'room_' + socket.id + '_' + waitingPlayer.id;
            socket.join(roomId);
            waitingPlayer.join(roomId);

            // Назначаем роли
            io.to(waitingPlayer.id).emit('match_found', { roomId, role: 'player1' });
            io.to(socket.id).emit('match_found', { roomId, role: 'player2' });

            waitingPlayer = null;
        } else {
            waitingPlayer = socket;
            socket.emit('waiting', 'Ожидание соперника в сети...');
        }
    });

    // Пересылка игровых действий между противниками в комнате
    socket.on('player_action', (data) => {
        socket.to(data.roomId).emit('opponent_action', data);
    });

    // Обработка отключения игрока
    socket.on('disconnect', () => {
        if (waitingPlayer && waitingPlayer.id === socket.id) {
            waitingPlayer = null;
        }
        console.log('Игрок отключился:', socket.id);
    });
});

// Порт для Render или локального запуска (по умолчанию 3000)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Сервер запущен и готов к битве на порту ${PORT}`);
});