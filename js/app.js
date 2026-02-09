/* ========================
   Memory Card Flip Game - Main Logic
   ======================== */

class MemoryCardGame {
    constructor() {
        // Game State
        this.gameState = 'idle'; // idle, playing, paused, stageClear, gameOver
        this.currentStage = 1;
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('memoryCardBestScore') || '0');
        this.combo = 0;
        this.maxCombo = 0;
        this.time = 0;
        this.attempts = 0;
        this.timer = null;

        // Game Config
        this.selectedTheme = 'emoji';
        this.selectedDifficulty = 'easy';
        this.gridConfigs = {
            easy: { rows: 3, cols: 4, class: 'grid-4x3' },
            normal: { rows: 4, cols: 4, class: 'grid-4x4' },
            hard: { rows: 4, cols: 5, class: 'grid-5x4' }
        };

        // Theme Data
        this.themes = {
            emoji: ['😊', '😎', '🤩', '😍', '🥰', '😘', '😗', '😚', '😙', '🥲', '😐', '🤐'],
            animal: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮'],
            fruit: ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥝', '🍅'],
            flag: ['🇰🇷', '🇺🇸', '🇯🇵', '🇨🇳', '🇮🇳', '🇧🇷', '🇩🇪', '🇫🇷', '🇬🇧', '🇮🇹', '🇪🇸', '🇷🇺']
        };

        // Cards State
        this.cards = [];
        this.flipped = [];
        this.matched = [];
        this.canFlip = false;

        // Leaderboard system
        this.leaderboard = new LeaderboardManager('memory-card', 10);

        this.init();
    }

    init() {
        this.cacheDOM();
        this.attachEventListeners();
        this.hideAppLoader();
        this.updateBestScore();
    }

    cacheDOM() {
        // Screens
        this.startScreen = document.getElementById('start-screen');
        this.gameScreen = document.getElementById('game-screen');
        this.pauseScreen = document.getElementById('pause-screen');
        this.stageClearScreen = document.getElementById('stage-clear-screen');
        this.gameOverScreen = document.getElementById('game-over-screen');

        // UI Elements
        this.cardGrid = document.getElementById('card-grid');
        this.stageDisplay = document.getElementById('stage-display');
        this.scoreDisplay = document.getElementById('score-display');
        this.comboDisplay = document.getElementById('combo-display');
        this.timerDisplay = document.getElementById('timer-display');
        this.attemptsDisplay = document.getElementById('attempts-display');

        // Language
        this.langToggle = document.getElementById('lang-toggle');
        this.langMenu = document.getElementById('lang-menu');

        // Buttons
        this.startBtn = document.getElementById('start-btn');
        this.pauseBtn = document.getElementById('pause-btn');
        this.resumeBtn = document.getElementById('resume-btn');
        this.quitBtn = document.getElementById('quit-btn');
        this.nextStageBtn = document.getElementById('next-stage-btn');
        this.playAgainBtn = document.getElementById('play-again-btn');
        this.shareBtn = document.getElementById('share-btn');

        // Theme & Difficulty
        this.themeButtons = document.querySelectorAll('.theme-btn');
        this.difficultyButtons = document.querySelectorAll('.difficulty-btn');

        // Particle Container
        this.particleContainer = document.getElementById('particle-container');
        this.appLoader = document.getElementById('app-loader');
    }

    attachEventListeners() {
        // Start Game
        this.startBtn.addEventListener('click', () => this.startGame());

        // Theme Selection
        this.themeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.themeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedTheme = btn.dataset.theme;
            });
        });

        // Difficulty Selection
        this.difficultyButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.difficultyButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedDifficulty = btn.dataset.difficulty;
            });
        });

        // Game Controls
        this.pauseBtn.addEventListener('click', () => this.togglePause());
        this.resumeBtn.addEventListener('click', () => this.resumeGame());
        this.quitBtn.addEventListener('click', () => this.quitGame());
        this.nextStageBtn.addEventListener('click', () => this.nextStage());
        this.playAgainBtn.addEventListener('click', () => this.restart());
        this.shareBtn.addEventListener('click', () => this.shareScore());

        // Language
        this.langToggle.addEventListener('click', () => this.toggleLanguageMenu());
        document.querySelectorAll('.lang-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const lang = btn.dataset.lang;
                i18n.setLanguage(lang);
                this.langMenu.classList.add('hidden');
                this.updateLanguageButtons();
            });
        });

        // Close language menu on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.language-selector')) {
                this.langMenu.classList.add('hidden');
            }
        });
    }

    toggleLanguageMenu() {
        this.langMenu.classList.toggle('hidden');
    }

    updateLanguageButtons() {
        document.querySelectorAll('.lang-option').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === i18n.currentLang);
        });
        i18n.updateUI();
    }

    hideAppLoader() {
        setTimeout(() => {
            this.appLoader.classList.add('hidden');
        }, 500);
    }

    startGame() {
        this.gameState = 'playing';
        this.currentStage = 1;
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.time = 0;
        this.attempts = 0;
        this.canFlip = true;

        this.showScreen('game-screen');
        this.generateCards();
        this.startTimer();
    }

    generateCards() {
        const config = this.gridConfigs[this.selectedDifficulty];
        const totalCards = config.rows * config.cols;
        const pairCount = totalCards / 2;

        // Get theme items
        const themeItems = this.themes[this.selectedTheme].slice(0, pairCount);

        // Create pairs
        this.cards = [...themeItems, ...themeItems];

        // Shuffle
        this.cards = this.shuffle(this.cards);

        this.flipped = [];
        this.matched = [];

        this.renderCards(config);
    }

    shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    renderCards(config) {
        this.cardGrid.innerHTML = '';
        this.cardGrid.className = `card-grid ${config.class}`;

        this.cards.forEach((content, index) => {
            const card = document.createElement('div');
            card.className = 'memory-card';
            card.dataset.index = index;
            card.innerHTML = `
                <div class="card-inner">
                    <div class="card-face card-back">
                        <span class="card-back-icon">🎴</span>
                    </div>
                    <div class="card-face card-front">
                        <span class="card-content">${content}</span>
                    </div>
                </div>
            `;

            card.addEventListener('click', () => this.flipCard(card, index));
            this.cardGrid.appendChild(card);
        });

        this.updateDisplay();
    }

    flipCard(cardEl, index) {
        if (!this.canFlip || this.gameState !== 'playing') return;
        if (this.flipped.includes(index)) return;
        if (this.matched.includes(index)) return;

        // Play flip sound
        this.playSound('flip');

        this.flipped.push(index);
        cardEl.classList.add('flipped');

        if (this.flipped.length === 2) {
            this.checkMatch();
        }
    }

    checkMatch() {
        this.canFlip = false;
        this.attempts++;
        this.updateDisplay();

        const [index1, index2] = this.flipped;
        const isMatch = this.cards[index1] === this.cards[index2];

        setTimeout(() => {
            if (isMatch) {
                this.matched.push(index1, index2);
                this.playSound('match');
                this.createParticles();

                // Increase combo
                this.combo++;
                this.maxCombo = Math.max(this.maxCombo, this.combo);

                // Award points
                const basePoints = 100;
                const comboBonus = this.combo * 10;
                const points = basePoints + comboBonus;
                this.score += points;

                // Check if stage is complete
                if (this.matched.length === this.cards.length) {
                    this.stageClear();
                    return;
                }

                this.canFlip = true;
                this.updateDisplay();
            } else {
                this.playSound('error');
                this.createShakeAnimation();

                // Reset combo
                this.combo = 0;

                // Flip back
                document.querySelectorAll('.memory-card').forEach(el => {
                    const idx = parseInt(el.dataset.index);
                    if (this.flipped.includes(idx)) {
                        el.classList.remove('flipped');
                    }
                });

                this.flipped = [];
                this.canFlip = true;
                this.updateDisplay();
            }
        }, this.flipped.length === 2 ? 800 : 0);
    }

    stageClear() {
        this.gameState = 'stageClear';
        this.canFlip = false;
        clearInterval(this.timer);
        this.playSound('clear');

        const timeBonus = Math.max(0, 300 - this.time) * 10;
        const comboBonus = this.maxCombo * 50;

        const stageClearScore = this.score + timeBonus + comboBonus;

        setTimeout(() => {
            this.showStageeClearScreen(stageClearScore, timeBonus, comboBonus);
        }, 500);
    }

    showStageeClearScreen(stageClearScore, timeBonus, comboBonus) {
        document.getElementById('clear-stage').textContent = this.currentStage;
        document.getElementById('time-bonus').textContent = '+' + timeBonus;
        document.getElementById('combo-bonus').textContent = '+' + comboBonus;
        document.getElementById('clear-score').textContent = stageClearScore;

        this.showScreen('stage-clear-screen');
    }

    nextStage() {
        this.currentStage++;
        this.maxCombo = 0;

        // Start new stage
        this.gameState = 'playing';
        this.time = 0;
        this.attempts = 0;
        this.canFlip = true;

        this.showScreen('game-screen');
        this.generateCards();
        this.startTimer();
    }

    togglePause() {
        if (this.gameState === 'playing') {
            this.pauseGame();
        } else if (this.gameState === 'paused') {
            this.resumeGame();
        }
    }

    pauseGame() {
        this.gameState = 'paused';
        clearInterval(this.timer);

        // Hide card contents
        document.querySelectorAll('.card-front').forEach(el => {
            el.style.opacity = '0';
        });

        document.getElementById('pause-stage').textContent = this.currentStage;
        document.getElementById('pause-score').textContent = this.score;
        document.getElementById('pause-combo').textContent = this.combo;

        this.showScreen('pause-screen');
        this.playSound('pause');
    }

    resumeGame() {
        this.gameState = 'playing';

        // Show card contents again
        document.querySelectorAll('.card-front').forEach(el => {
            el.style.opacity = '1';
        });

        this.showScreen('game-screen');
        this.startTimer();
        this.playSound('resume');
    }

    quitGame() {
        this.gameState = 'gameOver';
        clearInterval(this.timer);

        // Calculate final stats
        const stagesCleared = this.currentStage - 1;
        this.updateBestScore();

        // Add score to leaderboard
        const leaderboardResult = this.leaderboard.addScore(this.score, {
            stage: stagesCleared,
            combo: this.maxCombo,
            time: this.time,
            difficulty: this.selectedDifficulty
        });

        // Show game over screen
        document.getElementById('final-stages').textContent = stagesCleared;
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('best-score-display').textContent = this.bestScore;

        // Check for new record
        const isNewRecord = leaderboardResult.isNewRecord;
        if (isNewRecord) {
            document.getElementById('record-check').style.display = 'block';
            this.bestScore = this.score;
            localStorage.setItem('memoryCardBestScore', this.bestScore);
            this.playSound('record');
        } else {
            document.getElementById('record-check').style.display = 'none';
        }

        // Display leaderboard
        this.displayLeaderboard(leaderboardResult);

        this.showScreen('game-over-screen');
    }

    startTimer() {
        this.timer = setInterval(() => {
            this.time++;
            this.updateDisplay();
        }, 1000);
    }

    updateDisplay() {
        this.stageDisplay.textContent = this.currentStage;
        this.scoreDisplay.textContent = this.score;
        this.comboDisplay.textContent = this.combo;
        this.timerDisplay.textContent = this.formatTime(this.time);
        this.attemptsDisplay.textContent = this.attempts;
    }

    updateBestScore() {
        this.bestScore = parseInt(localStorage.getItem('memoryCardBestScore') || '0');
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    showScreen(screenId) {
        document.querySelectorAll('.game-screen').forEach(el => {
            el.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    restart() {
        this.startGame();
    }

    shareScore() {
        const text = `메모리 카드 플립에서 ${this.score}점을 얻었습니다! 🎴\n${this.currentStage - 1}개의 스테이지를 클리어했어요!\n\n지금 바로 도전해보세요: https://dopabrain.com/memory-card/`;

        if (navigator.share) {
            navigator.share({
                title: '메모리 카드 플립',
                text: text
            }).catch(err => console.log('Error sharing:', err));
        } else {
            // Fallback: Copy to clipboard
            navigator.clipboard.writeText(text).then(() => {
                alert('공유 내용이 클립보드에 복사되었습니다!');
            });
        }
    }

    createParticles() {
        const particleCount = 8;
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.textContent = '⭐';

            const xPos = Math.random() * 100;
            const yPos = Math.random() * 100;
            const offsetX = (Math.random() - 0.5) * 80;

            particle.style.left = xPos + '%';
            particle.style.top = yPos + '%';
            particle.style.opacity = '1';
            particle.style.fontSize = '20px';
            particle.style.pointerEvents = 'none';

            this.particleContainer.appendChild(particle);

            // Animate after adding to DOM
            setTimeout(() => {
                particle.style.transition = 'all 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                particle.style.transform = `translateY(-60px) translateX(${offsetX}px)`;
                particle.style.opacity = '0';
            }, 10);

            setTimeout(() => particle.remove(), 1300);
        }
    }

    createShakeAnimation() {
        this.cardGrid.style.animation = 'shake 0.5s ease';
        setTimeout(() => {
            this.cardGrid.style.animation = '';
        }, 500);
    }

    playSound(soundType) {
        if (!window.sfx) return;

        // Initialize sound engine on first call
        if (!window.sfx.initialized) {
            window.sfx.init();
        }

        // Use sound engine for effects
        if (soundType === 'flip') {
            window.sfx.flip();
        } else if (soundType === 'match') {
            window.sfx.match();
        } else if (soundType === 'error') {
            window.sfx.error();
        } else if (soundType === 'clear') {
            window.sfx.stageClear();
        } else if (soundType === 'record') {
            window.sfx.record();
        } else if (soundType === 'pause') {
            window.sfx.pause();
        } else if (soundType === 'resume') {
            window.sfx.resume();
        }
    }

    displayLeaderboard(leaderboardResult) {
        // Create or get leaderboard container
        const gameOverScreen = document.getElementById('game-over-screen');
        let leaderboardContainer = gameOverScreen.querySelector('.leaderboard-section');
        if (!leaderboardContainer) {
            leaderboardContainer = document.createElement('div');
            leaderboardContainer.className = 'leaderboard-section';
            gameOverScreen.appendChild(leaderboardContainer);
        }

        // Get top scores
        const topScores = this.leaderboard.getTopScores(5);
        const currentScore = parseInt(document.getElementById('final-score').textContent);

        // Build leaderboard HTML
        let html = '<div class="leaderboard-title">🏆 Top 5 Scores</div>';
        html += '<div class="leaderboard-list">';

        topScores.forEach((entry, index) => {
            const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
            const isCurrentScore = entry.score === currentScore && leaderboardResult.isNewRecord;
            const classes = isCurrentScore ? 'leaderboard-item highlight' : 'leaderboard-item';

            html += `
                <div class="${classes}">
                    <span class="medal">${medals[index] || (index + 1) + '.'}</span>
                    <span class="score-value">${entry.score}</span>
                    <span class="score-date">${entry.date}</span>
                </div>
            `;
        });

        html += '</div>';
        html += '<button id="reset-leaderboard-btn" class="reset-btn">Reset Records</button>';

        leaderboardContainer.innerHTML = html;

        // Add reset button event listener
        const resetBtn = leaderboardContainer.querySelector('#reset-leaderboard-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to reset all records?')) {
                    this.leaderboard.resetScores();
                    this.bestScore = 0;
                    localStorage.setItem('memoryCardBestScore', '0');
                    this.displayLeaderboard({ isNewRecord: false, rank: -1, notifications: [] });
                    alert('Records reset!');
                }
            });
        }

        // Show notifications
        leaderboardResult.notifications.forEach(notif => {
            this.showNotification(notif);
        });
    }

    showNotification(notification) {
        const notifEl = document.createElement('div');
        notifEl.className = `notification notification-${notification.type}`;
        notifEl.textContent = notification.message;
        notifEl.style.position = 'fixed';
        notifEl.style.top = '20px';
        notifEl.style.right = '20px';
        notifEl.style.padding = '12px 20px';
        notifEl.style.backgroundColor = notification.type === 'new-record' ? '#FFD700' : '#4CAF50';
        notifEl.style.color = '#000';
        notifEl.style.borderRadius = '8px';
        notifEl.style.fontSize = '14px';
        notifEl.style.fontWeight = 'bold';
        notifEl.style.zIndex = '9999';
        notifEl.style.animation = 'slideIn 0.3s ease-out';

        document.body.appendChild(notifEl);

        setTimeout(() => {
            notifEl.style.animation = 'slideOut 0.3s ease-out forwards';
            setTimeout(() => notifEl.remove(), 300);
        }, 3000);
    }
}

// CSS animation for shake
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const game = new MemoryCardGame();
});
