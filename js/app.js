/* ========================
   Memory Card Flip Game - Main Logic
   ======================== */

// Theme toggle functionality
const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggle.textContent = savedTheme === 'light' ? '🌙' : '☀️';
    themeToggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        themeToggle.textContent = next === 'light' ? '🌙' : '☀️';
    });
}

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

        // Lives
        this.lives = 3;
        this.maxLives = 3;

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

        // Restore previous session if one exists
        this.loadGameState();
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
        this.livesDisplay = document.getElementById('lives-display');

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
        this.clearGameState();
        if (typeof gtag === 'function') {
            gtag('event', 'game_start');
            gtag('event', 'engagement', { event_category: 'memory_card', event_label: 'first_interaction' });
        }
        this.gameState = 'playing';
        this.currentStage = 1;
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.time = 0;
        this.attempts = 0;
        this.lives = this.maxLives;
        this.canFlip = true;
        this._newBestShown = false;

        this.showScreen('game-screen');
        this.generateCards();
        this.startTimer();
    }

    generateCards() {
        // Improved difficulty curve: very gentle progression
        let config = this.gridConfigs[this.selectedDifficulty];

        // Progressive difficulty: extend easy phase to 8 stages
        if (this.currentStage <= 8) {
            // Stages 1-8: Keep easy (3x4) for solid foundation
            config = this.gridConfigs['easy'];
        } else if (this.currentStage <= 15) {
            // Stages 9-15: Gradually increase to normal (4x4)
            config = this.gridConfigs['normal'];
        } else {
            // Stages 16+: Hard mode (5x4)
            config = this.gridConfigs['hard'];
        }

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
        if (typeof Haptic !== 'undefined') Haptic.light();

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
                if (typeof Haptic !== 'undefined') Haptic.success();
                this.createParticles();

                // Increase combo
                this.combo++;
                this.maxCombo = Math.max(this.maxCombo, this.combo);

                // Award points
                const basePoints = 100;
                const comboBonus = this.combo * 10;
                const points = basePoints + comboBonus;
                this.score += points;

                // Floating text at matched card position
                const card1 = document.querySelector(`.memory-card[data-index="${index1}"]`);
                if (card1) {
                    const rect = card1.getBoundingClientRect();
                    const text = this.combo >= 2 ? `+${points} ${this.combo}x` : `+${points}`;
                    this.showFloatingText(text, rect.left + rect.width / 2, rect.top, this.combo >= 2 ? '#e74c3c' : '#f39c12');
                }

                // NEW BEST flash
                if (this.score > this.bestScore && !this._newBestShown) {
                    this._newBestShown = true;
                    this.bestScore = this.score;
                    localStorage.setItem('memoryCardBestScore', this.bestScore);
                    this.showNewBestFlash();
                }

                // Check if stage is complete
                if (this.matched.length === this.cards.length) {
                    this.stageClear();
                    return;
                }

                this.canFlip = true;
                this.updateDisplay();
                this.saveGameState();
            } else {
                this.playSound('error');
                if (typeof Haptic !== 'undefined') Haptic.medium();
                this.shakeScreen(2, 4);

                // Lose a life
                this.lives--;

                // Show floating "-1" feedback near the lives display
                this.showLifeLostFeedback();

                // Shake the lives display
                if (this.livesDisplay) {
                    this.livesDisplay.classList.add('shake');
                    setTimeout(() => this.livesDisplay.classList.remove('shake'), 400);
                }

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
                this.updateDisplay();

                // Check for game over (0 lives)
                if (this.lives <= 0) {
                    this.canFlip = false;
                    setTimeout(() => this.quitGame(), 600);
                } else {
                    this.canFlip = true;
                    this.saveGameState();
                }
            }
        }, this.flipped.length === 2 ? 800 : 0);
    }

    stageClear() {
        this.gameState = 'stageClear';
        this.canFlip = false;
        clearInterval(this.timer);
        this.clearGameState();
        this.playSound('clear');
        spawnConfetti();

        const totalPairs = this.cards.length / 2;
        const isPerfect = this.attempts === totalPairs; // no mistakes
        const timeBonus = Math.max(0, 300 - this.time) * 10;
        const comboBonus = this.maxCombo * 50;
        const perfectBonus = isPerfect ? 500 * this.currentStage : 0;
        const accuracy = Math.round((totalPairs / this.attempts) * 100);

        const stageClearScore = this.score + timeBonus + comboBonus + perfectBonus;

        if (isPerfect) {
            setTimeout(() => spawnConfetti(), 600); // extra confetti for perfect
        }

        setTimeout(() => {
            this.showStageeClearScreen(stageClearScore, timeBonus, comboBonus, perfectBonus, accuracy);
        }, 500);
    }

    showStageeClearScreen(stageClearScore, timeBonus, comboBonus, perfectBonus, accuracy) {
        document.getElementById('clear-stage').textContent = this.currentStage;
        document.getElementById('time-bonus').textContent = '+' + timeBonus;
        document.getElementById('combo-bonus').textContent = '+' + comboBonus;
        document.getElementById('clear-score').textContent = stageClearScore;

        // Perfect bonus display
        const perfectEl = document.getElementById('perfect-bonus');
        if (perfectEl) {
            perfectEl.textContent = perfectBonus > 0 ? '+' + perfectBonus : '-';
            perfectEl.style.color = perfectBonus > 0 ? '#fbbf24' : '';
        }
        // Accuracy display
        const accuracyEl = document.getElementById('clear-accuracy');
        if (accuracyEl) {
            accuracyEl.textContent = accuracy + '%';
            accuracyEl.style.color = accuracy === 100 ? '#fbbf24' : '';
        }

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
        this.saveGameState();
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
        this.clearGameState();
        if(typeof gtag!=='undefined') gtag('event','game_over',{score:this.score});
        if (typeof Haptic !== 'undefined') Haptic.heavy();
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

        // Report score to daily streak
        if (typeof DailyStreak !== 'undefined') DailyStreak.report(this.score);

        // Report achievements
        if (typeof GameAchievements !== 'undefined') {
            const totalGames = this.leaderboard.getAllScores().length;
            GameAchievements.report({
                bestScore: this.bestScore,
                totalGames: totalGames,
                bestStreak: 0
            });
        }

        // Show game over screen (with interstitial ad)
        const showGameOver = () => {
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

            // Rewarded ad — watch ad for 2x score
            if (typeof GameAds !== 'undefined') {
                GameAds.injectRewardButton({
                    container: '#game-over-screen',
                    label: 'Watch Ad for 2x Score',
                    onReward: () => {
                        this.score *= 2;
                        document.getElementById('final-score').textContent = this.score;
                        if (this.score > this.bestScore) {
                            this.bestScore = this.score;
                            localStorage.setItem('memoryCardBestScore', this.bestScore);
                            document.getElementById('best-score-display').textContent = this.bestScore;
                        }
                    }
                });
            }
        };

        if (typeof GameAds !== 'undefined') {
            GameAds.showInterstitial({ onComplete: () => { showGameOver(); } });
        } else {
            showGameOver();
        }
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
        this.updateLivesDisplay();
    }

    updateLivesDisplay() {
        if (!this.livesDisplay) return;
        const full = '\u2764\uFE0F'.repeat(this.lives);
        const empty = '\uD83E\uDE76'.repeat(this.maxLives - this.lives);
        this.livesDisplay.textContent = full + empty;
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
        if (typeof GameAds !== 'undefined') GameAds.removeRewardButton('#game-over-screen');
        this.startGame();
    }

    shareScore() {
        const title = (window.i18n && i18n.t) ? i18n.t('app.title') || 'Memory Card Flip' : 'Memory Card Flip';
        const shareMsg = (window.i18n && i18n.t) ? i18n.t('share.text') : null;
        const copiedMsg = (window.i18n && i18n.t) ? i18n.t('share.copied') || 'Copied to clipboard!' : 'Copied to clipboard!';

        const text = shareMsg
            ? shareMsg.replace('{score}', this.score).replace('{stages}', this.currentStage - 1)
            : `Memory Card Flip: ${this.score} points! Cleared ${this.currentStage - 1} stages!\n\nhttps://dopabrain.com/memory-card/`;

        if (navigator.share) {
            navigator.share({ title, text }).catch(err => console.log('Error sharing:', err));
        } else {
            navigator.clipboard.writeText(text).then(() => {
                alert(copiedMsg);
            });
        }
    }

    showFloatingText(text, x, y, color = '#f39c12') {
        const popup = document.createElement('div');
        popup.textContent = text;
        popup.style.cssText = 'position:fixed;left:' + x + 'px;top:' + y + 'px;transform:translateX(-50%);font-size:22px;font-weight:800;color:' + color + ';pointer-events:none;z-index:9999;opacity:1;text-shadow:0 0 8px ' + color + '40;transition:all 0.7s ease-out;';
        document.body.appendChild(popup);
        requestAnimationFrame(() => {
            popup.style.top = (y - 50) + 'px';
            popup.style.opacity = '0';
        });
        setTimeout(() => popup.remove(), 800);
    }

    showLifeLostFeedback() {
        if (!this.livesDisplay) return;
        const rect = this.livesDisplay.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const popup = document.createElement('div');
        popup.className = 'lives-lost-feedback';
        popup.textContent = '-1 \u2764\uFE0F';
        popup.style.left = x + 'px';
        popup.style.top = y + 'px';
        popup.style.transform = 'translateX(-50%)';
        document.body.appendChild(popup);
        requestAnimationFrame(() => {
            popup.style.top = (y - 50) + 'px';
            popup.style.opacity = '0';
        });
        setTimeout(() => popup.remove(), 800);
    }

    shakeScreen(intensity = 2, frames = 4) {
        const duration = frames * (1000 / 60);
        const px = intensity;
        this.cardGrid.style.animation = `mc-shake ${Math.max(duration, 200)}ms ease`;
        setTimeout(() => { this.cardGrid.style.animation = ''; }, Math.max(duration, 200) + 50);
    }

    showNewBestFlash() {
        const flash = document.createElement('div');
        flash.textContent = 'NEW BEST!';
        flash.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(0.5);font-size:36px;font-weight:900;color:#FFD700;z-index:9999;pointer-events:none;text-shadow:0 0 20px rgba(255,215,0,0.6),0 2px 4px rgba(0,0,0,0.5);opacity:0;transition:all 0.4s cubic-bezier(0.175,0.885,0.32,1.275);';
        document.body.appendChild(flash);
        requestAnimationFrame(() => {
            flash.style.opacity = '1';
            flash.style.transform = 'translate(-50%,-50%) scale(1)';
        });
        setTimeout(() => {
            flash.style.opacity = '0';
            flash.style.transform = 'translate(-50%,-50%) scale(1.2)';
        }, 1200);
        setTimeout(() => flash.remove(), 1700);
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

    // --- Save / Load / Clear game state for session persistence ---

    saveGameState() {
        if (this.gameState !== 'playing') return;
        const state = {
            cards: this.cards,
            matched: this.matched,
            score: this.score,
            combo: this.combo,
            maxCombo: this.maxCombo,
            time: this.time,
            attempts: this.attempts,
            lives: this.lives,
            currentStage: this.currentStage,
            selectedTheme: this.selectedTheme,
            selectedDifficulty: this.selectedDifficulty
        };
        try {
            localStorage.setItem('memoryCard_gameState', JSON.stringify(state));
        } catch (e) { /* storage full — ignore */ }
    }

    loadGameState() {
        let raw;
        try { raw = localStorage.getItem('memoryCard_gameState'); } catch (e) { return false; }
        if (!raw) return false;

        let state;
        try { state = JSON.parse(raw); } catch (e) { this.clearGameState(); return false; }

        // Restore game variables
        this.cards = state.cards;
        this.matched = state.matched || [];
        this.score = state.score || 0;
        this.combo = state.combo || 0;
        this.maxCombo = state.maxCombo || 0;
        this.time = state.time || 0;
        this.attempts = state.attempts || 0;
        this.lives = state.lives !== undefined ? state.lives : this.maxLives;
        this.currentStage = state.currentStage || 1;
        this.selectedTheme = state.selectedTheme || 'emoji';
        this.selectedDifficulty = state.selectedDifficulty || 'easy';

        this.flipped = [];
        this.canFlip = true;
        this.gameState = 'playing';

        // Determine grid config from restored state
        let config;
        if (this.currentStage <= 8) {
            config = this.gridConfigs['easy'];
        } else if (this.currentStage <= 15) {
            config = this.gridConfigs['normal'];
        } else {
            config = this.gridConfigs['hard'];
        }

        // Render board and reveal matched cards
        this.showScreen('game-screen');
        this.renderCards(config);

        document.querySelectorAll('.memory-card').forEach(el => {
            const idx = parseInt(el.dataset.index);
            if (this.matched.includes(idx)) {
                el.classList.add('flipped', 'matched');
            }
        });

        this.startTimer();
        return true;
    }

    clearGameState() {
        try { localStorage.removeItem('memoryCard_gameState'); } catch (e) { /* ignore */ }
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

// Confetti celebration function
function spawnConfetti() {
    const colors = ['#ff6b6b','#feca57','#48dbfb','#ff9ff3','#54a0ff','#5f27cd'];
    for (let i = 0; i < 50; i++) {
        const c = document.createElement('div');
        c.style.cssText = `position:fixed;top:-10px;left:${Math.random()*100}%;width:${6+Math.random()*6}px;height:${6+Math.random()*6}px;background:${colors[Math.floor(Math.random()*colors.length)]};border-radius:${Math.random()>0.5?'50%':'0'};z-index:99999;pointer-events:none;animation:confettiFall ${1.5+Math.random()*2}s linear forwards`;
        document.body.appendChild(c);
        setTimeout(() => c.remove(), 4000);
    }
    if (!document.getElementById('confetti-style')) {
        const s = document.createElement('style');
        s.id = 'confetti-style';
        s.textContent = '@keyframes confettiFall{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}';
        document.head.appendChild(s);
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
    @keyframes mc-shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-2px); }
        50% { transform: translateX(2px); }
        75% { transform: translateX(-1px); }
    }
`;
document.head.appendChild(style);

// GA4 engagement tracking (scroll + timer)
(function() {
    let scrollFired = false;
    window.addEventListener('scroll', function() {
        if (!scrollFired && window.scrollY > 100) {
            scrollFired = true;
            if (typeof gtag === 'function') gtag('event', 'scroll_engagement', { engagement_type: 'scroll' });
        }
    }, { passive: true });
    setTimeout(function() {
        if (typeof gtag === 'function') gtag('event', 'timer_engagement', { engagement_time_msec: 5000 });
    }, 5000);
})();

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const game = new MemoryCardGame();
    if (typeof DailyStreak !== 'undefined') DailyStreak.init({ gameId: 'memory-card', bestScoreKey: 'memoryCardBestScore', minTarget: 1 });
    if (typeof GameAds !== 'undefined') GameAds.init();
    if (typeof GameAchievements !== 'undefined') GameAchievements.init({
        gameId: 'memory-card',
        defs: [
            { id: 'score_500', stat: 'bestScore', target: 500, icon: '⭐', name: 'Memory Star' },
            { id: 'score_2000', stat: 'bestScore', target: 2000, icon: '🏆', name: 'Memory Master' },
            { id: 'score_5000', stat: 'bestScore', target: 5000, icon: '👑', name: 'Memory Legend' },
            { id: 'games_10', stat: 'totalGames', target: 10, icon: '🎮', name: 'Regular Player' },
            { id: 'games_50', stat: 'totalGames', target: 50, icon: '🔥', name: 'Dedicated' },
            { id: 'streak_5', stat: 'bestStreak', target: 5, icon: '💥', name: 'Match Streak' }
        ]
    });
});
