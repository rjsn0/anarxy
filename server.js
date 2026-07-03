const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

let roomStates = {};

function initRoom(room) {
    if (!roomStates[room]) {
        roomStates[room] = { elements: {}, images: {} };
    }
}

io.on('connection', (socket) => {
    socket.on('joinPage', (room) => {
        socket.join(room);
        socket.currentRoom = room;
        initRoom(room);

        const state = roomStates[room];
        Object.keys(state.elements).forEach(id => {
            const el = state.elements[id];
            socket.emit('textSpawned', { id: id, left: el.left, top: el.top, color: el.color });
            socket.emit('textUpdated', { id: id, html: el.html });
        });
        Object.keys(state.images).forEach(id => {
            socket.emit('imageAdded', state.images[id]);
        });
    });

    socket.on('spawnText', (data) => {
        const room = socket.currentRoom;
        if (!room) return;
        roomStates[room].elements[data.id] = { left: data.left, top: data.top, color: data.color, html: '' };
        socket.to(room).emit('textSpawned', data);
    });

    socket.on('updateText', (data) => {
        const room = socket.currentRoom;
        if (!room) return;
        if (roomStates[room].elements[data.id]) {
            roomStates[room].elements[data.id].html = data.html;
        } else {
            roomStates[room].elements[data.id] = { html: data.html };
        }
        socket.to(room).emit('textUpdated', data);
    });

    socket.on('moveElement', (data) => {
        const room = socket.currentRoom;
        if (!room) return;
        if (roomStates[room].elements[data.id]) {
            roomStates[room].elements[data.id].left = data.left;
            roomStates[room].elements[data.id].top = data.top;
        } else if (roomStates[room].images[data.id]) {
            roomStates[room].images[data.id].left = data.left;
            roomStates[room].images[data.id].top = data.top;
        }
        socket.to(room).emit('elementMoved', data);
    });

    socket.on('addImage', (data) => {
        const room = socket.currentRoom;
        if (!room) return;
        roomStates[room].images[data.id] = data;
        socket.to(room).emit('imageAdded', data);
    });

    socket.on('disconnect', () => { });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Servidor a rodar na porta ${PORT}`);
});