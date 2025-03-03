const socket = io();

// Элементы DOM
const screens = {
    login: document.getElementById('login-screen'),
    waiting: document.getElementById('waiting-screen'),
    question: document.getElementById('question-screen'),
    results: document.getElementById('results-screen'),
    gameOver: document.getElementById('game-over-screen')
};

const elements = {
    playerName: document.getElementById('player-name'),
    isAdmin: document.getElementById('is-admin'),
    joinBtn: document.getElementById('join-btn'),
    startBtn: document.getElementById('start-btn'),
    playersList: document.getElementById('players-list'),
    playerCount: document.getElementById('player-count'),
    questionNumber: document.getElementById('question-number'),
    questionText: document.getElementById('question-text'),
    optionButtons: document.querySelectorAll('.option-button'),
    timerBar: document.getElementById('timer-bar'),
    answerResult: document.getElementById('answer-result'),
    scoresList: document.getElementById('scores-list'),
    finalScoresList: document.getElementById('final-scores-list'),
    playAgainBtn: document.getElementById('play-again-btn'),
    scorePopup: document.getElementById('score-popup')
};

let currentTimer = null;
let isAdmin = false;

// Показ определенного экрана
function showScreen(screenId) {
    Object.values(screens).forEach(screen => {
        screen.classList.add('uk-hidden');
    });
    screens[screenId].classList.remove('uk-hidden');
}

// Обработчики событий
elements.joinBtn.addEventListener('click', () => {
    const name = elements.playerName.value.trim();
    if (name) {
        isAdmin = elements.isAdmin.checked;
        socket.emit('join', { name, isAdmin });
        showScreen('waiting');
        
        // Показываем кнопку старта только админу
        elements.startBtn.style.display = isAdmin ? 'block' : 'none';
    }
});

elements.startBtn.addEventListener('click', () => {
    if (isAdmin) {
        socket.emit('startGame');
    }
});

elements.playAgainBtn.addEventListener('click', () => {
    showScreen('waiting');
    socket.emit('join', { 
        name: elements.playerName.value.trim(), 
        isAdmin: isAdmin 
    });
});

// Обновление списка игроков
function updatePlayersList(players) {
    elements.playerCount.textContent = players.length;
    elements.playersList.innerHTML = players
        .map(player => `
            <li>
                <span uk-icon="icon: user"></span>
                ${player.name}
                ${player.isAdmin ? '<span class="admin-badge">👑</span>' : ''}
            </li>
        `)
        .join('');
}

// Обновление вариантов ответов
function updateOptions(options) {
    elements.optionButtons.forEach((button, index) => {
        const textElement = button.querySelector('.option-text');
        textElement.textContent = options[index];
        button.disabled = false;
        button.classList.remove('selected');
        
        button.addEventListener('click', () => {
            socket.emit('answer', index);
            elements.optionButtons.forEach(btn => btn.disabled = true);
            button.classList.add('selected');
        });
    });
}

// Запуск таймера
function startTimer(time) {
    const startTime = Date.now();
    const duration = time * 1000;

    elements.timerBar.style.width = '100%';

    if (currentTimer) {
        clearInterval(currentTimer);
    }

    currentTimer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = duration - elapsed;
        const percentage = (remaining / duration) * 100;

        if (percentage <= 0) {
            clearInterval(currentTimer);
            elements.timerBar.style.width = '0%';
            elements.optionButtons.forEach(btn => btn.disabled = true);
        } else {
            elements.timerBar.style.width = `${percentage}%`;
        }
    }, 50);
}

// Показ анимации очков
function showPointsAnimation(points) {
    elements.scorePopup.textContent = `+${points}`;
    elements.scorePopup.classList.remove('uk-hidden');
    
    setTimeout(() => {
        elements.scorePopup.classList.add('uk-hidden');
    }, 1000);
}

// Обновление списка результатов
function updateScoresList(scores) {
    elements.scoresList.innerHTML = scores
        .map((player, index) => `
            <div class="score-item">
                <div class="player-name">
                    ${index + 1}. ${player.name}
                    ${player.isAdmin ? '<span class="admin-badge">👑</span>' : ''}
                </div>
                <div class="player-score">${player.score}</div>
            </div>
        `)
        .join('');
}

// Socket.io обработчики
socket.on('playerList', (players) => {
    updatePlayersList(players);
});

socket.on('question', (data) => {
    showScreen('question');
    elements.questionNumber.textContent = `Вопрос ${data.questionNumber} из ${data.totalQuestions}`;
    elements.questionText.textContent = data.question;
    updateOptions(data.options);
    startTimer(data.time);
});

socket.on('points', (data) => {
    showPointsAnimation(data.points);
});

socket.on('results', (data) => {
    clearInterval(currentTimer);
    showScreen('results');
    
    const resultText = `
        <div class="answer-feedback">
            <div class="correct-answer">Правильный ответ:</div>
            <div class="answer-text">${data.correctAnswerText}</div>
        </div>
        <div class="answer-stats">
            <div class="correct-count">
                <span uk-icon="icon: check"></span>
                ${data.answers.filter(a => a.isCorrect).length}
            </div>
            <div class="incorrect-count">
                <span uk-icon="icon: close"></span>
                ${data.answers.filter(a => !a.isCorrect).length}
            </div>
        </div>
    `;
    
    elements.answerResult.innerHTML = resultText;
    updateScoresList(data.scores);
});

socket.on('gameOver', (data) => {
    showScreen('gameOver');
    const winners = data.scores.slice(0, 3);
    const others = data.scores.slice(3);
    
    elements.finalScoresList.innerHTML = `
        ${winners.map((player, index) => `
            <div class="winner-item">
                <div class="player-name">
                    ${['🥇', '🥈', '🥉'][index]} ${player.name}
                    ${player.isAdmin ? '<span class="admin-badge">👑</span>' : ''}
                </div>
                <div class="player-score">${player.score}</div>
            </div>
        `).join('')}
        ${others.map((player, index) => `
            <div class="score-item">
                <div class="player-name">
                    ${index + 4}. ${player.name}
                    ${player.isAdmin ? '<span class="admin-badge">👑</span>' : ''}
                </div>
                <div class="player-score">${player.score}</div>
            </div>
        `).join('')}
    `;
}); 