import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { questions } from './questions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server);

// Состояние игры
const gameState = {
    players: new Map(),
    currentQuestion: 0,
    isGameStarted: false,
    answers: new Map(),
    scores: new Map(),
    timer: null,
    adminId: null
};

// Раздача статических файлов из папки public
app.use(express.static(join(__dirname, 'public')));

// Главный маршрут
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Обработка 404
app.use((req, res) => {
    res.status(404).sendFile(join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
    console.log('Игрок подключился');

    socket.on('join', (data) => {
        const { name, isAdmin } = data;
        
        if (isAdmin && gameState.adminId && gameState.adminId !== socket.id) {
            socket.emit('error', 'Админ уже существует');
            return;
        }

        if (isAdmin) {
            gameState.adminId = socket.id;
        }

        gameState.players.set(socket.id, {
            name,
            score: 0,
            isAdmin
        });
        gameState.scores.set(socket.id, 0);
        
        io.emit('playerList', Array.from(gameState.players.values()));
        
        if (gameState.isGameStarted) {
            socket.emit('question', {
                ...questions[gameState.currentQuestion],
                questionNumber: gameState.currentQuestion + 1,
                totalQuestions: questions.length
            });
        }
    });

    socket.on('startGame', () => {
        if (socket.id === gameState.adminId && gameState.players.size >= 1) {
            gameState.isGameStarted = true;
            gameState.currentQuestion = 0;
            gameState.answers.clear();
            gameState.scores.clear();
            
            for (let [playerId] of gameState.players) {
                gameState.scores.set(playerId, 0);
            }
            
            sendQuestion();
        }
    });

    socket.on('answer', (answer) => {
        if (!gameState.answers.has(socket.id)) {
            const currentTime = Date.now();
            const question = questions[gameState.currentQuestion];
            const answerTime = (currentTime - question.startTime) / 1000;
            
            gameState.answers.set(socket.id, {
                answer,
                answerTime
            });
            
            if (answer === question.correctAnswer) {
                const player = gameState.players.get(socket.id);
                const timeBonus = Math.max(0, 1 - (answerTime / question.time));
                const points = Math.round(question.points * timeBonus);
                
                const newScore = (gameState.scores.get(socket.id) || 0) + points;
                gameState.scores.set(socket.id, newScore);
                player.score = newScore;
                
                socket.emit('points', {
                    points,
                    total: player.score
                });
            }

            if (gameState.answers.size === gameState.players.size) {
                clearTimeout(gameState.timer);
                sendResults();
            }
        }
    });

    socket.on('disconnect', () => {
        if (socket.id === gameState.adminId) {
            gameState.adminId = null;
        }

        gameState.players.delete(socket.id);
        gameState.scores.delete(socket.id);
        gameState.answers.delete(socket.id);
        
        io.emit('playerList', Array.from(gameState.players.values()));
        
        if (gameState.players.size === 0) {
            gameState.isGameStarted = false;
            gameState.currentQuestion = 0;
            clearTimeout(gameState.timer);
        }
    });
});

function sendQuestion() {
    const question = questions[gameState.currentQuestion];
    gameState.answers.clear();
    question.startTime = Date.now();
    
    io.emit('question', {
        ...question,
        questionNumber: gameState.currentQuestion + 1,
        totalQuestions: questions.length
    });

    gameState.timer = setTimeout(() => {
        sendResults();
    }, question.time * 1000);
}

function sendResults() {
    const question = questions[gameState.currentQuestion];
    const results = {
        correctAnswer: question.correctAnswer,
        correctAnswerText: question.options[question.correctAnswer],
        answers: Array.from(gameState.answers.entries()).map(([playerId, data]) => ({
            playerId,
            isCorrect: data.answer === question.correctAnswer,
            answerTime: data.answerTime
        })),
        scores: Array.from(gameState.players.values())
            .map(player => ({
                name: player.name,
                score: player.score,
                isAdmin: player.isAdmin
            }))
            .sort((a, b) => b.score - a.score)
    };

    io.emit('results', results);

    setTimeout(() => {
        if (gameState.currentQuestion < questions.length - 1) {
            gameState.currentQuestion++;
            sendQuestion();
        } else {
            io.emit('gameOver', results);
            gameState.isGameStarted = false;
        }
    }, 5000);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
}); 