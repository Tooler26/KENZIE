const SUPABASE_URL = "https://eexaxhkscnshyulqgkqy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleGF4aGtzY25zaHl1bHFna3F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODc0MzQsImV4cCI6MjA5NTM2MzQzNH0.SwXhxAIpDNTbkcgPZqbvkfdnt_vbEqySVQNl6VQIzUU";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- 1. COORDINATE MAPS & TRANSLATION TABLES ---
// 52 Common Track Array Cells (Row, Column)
const COMMON_TRACK_COORDS = [
    {r:7, c:2},  {r:7, c:3},  {r:7, c:4},  {r:7, c:5},  {r:7, c:6},  // Left wing top
    {r:6, c:7},  {r:5, c:7},  {r:4, c:7},  {r:3, c:7},  {r:2, c:7},  {r:1, c:7}, // Top wing left
    {r:1, c:8},  // Top middle bridge
    {r:1, c:9},  {r:2, c:9},  {r:3, c:9},  {r:4, c:9},  {r:5, c:9},  {r:6, c:9}, // Top wing right
    {r:7, c:10}, {r:7, c:11}, {r:7, c:12}, {r:7, c:13}, {r:7, c:14}, {r:7, c:15}, // Right wing top
    {r:8, c:15}, // Right middle bridge
    {r:9, c:14}, {r:9, c:13}, {r:9, c:12}, {r:9, c:11}, {r:9, c:10}, {r:9, c:9},  // Right wing bottom
    {r:10, c:9}, {r:11, c:9}, {r:12, c:9}, {r:13, c:9}, {r:14, c:9}, {r:15, c:9}, // Bottom wing right
    {r:15, c:8}, // Bottom middle bridge
    {r:15, c:7}, {r:14, c:7}, {r:13, c:7}, {r:12, c:7}, {r:11, c:7}, {r:10, c:7}, // Bottom wing left
    {r:9, c:6},  {r:9, c:5},  {r:9, c:4},  {r:9, c:3},  {r:9, c:2},  {r:9, c:1},  // Left wing bottom
    {r:8, c:1}   // Left middle bridge
];

// 4 Distinct Home Run Stretch Paths (6 cells each) + 1 Home Triangle Destination
const HOME_RUN_COORDS = {
    red:    [{r:8, c:2}, {r:8, c:3}, {r:8, c:4}, {r:8, c:5}, {r:8, c:6}, {r:8, c:7}, {r:8, c:8}],
    green:  [{r:2, c:8}, {r:3, c:8}, {r:4, c:8}, {r:5, c:8}, {r:6, c:8}, {r:7, c:8}, {r:8, c:8}],
    yellow: [{r:8, c:14},{r:8, c:13},{r:8, c:12},{r:8, c:11},{r:8, c:10},{r:8, c:11},{r:8, c:8}],
    blue:   [{r:14, c:8},{r:13, c:8},{r:12, c:8},{r:11, c:8},{r:10, c:8},{r:9, c:8}, {r:8, c:8}]
};

// Starting Yard Spawn coordinates
const YARD_HOLE_COORDS = {
    red:    [{r:3, c:3}, {r:3, c:5}, {r:5, c:3}, {r:5, c:5}],
    green:  [{r:3, c:11}, {r:3, c:13}, {r:5, c:11}, {r:5, c:13}],
    yellow: [{r:11, c:11}, {r:11, c:13}, {r:13, c:11}, {r:13, c:13}],
    blue:   [{r:11, c:3}, {r:11, c:5}, {r:13, c:3}, {r:13, c:5}]
};

// Safe Zone indices on the common 52-cell track array (Star and starting spots)
const SAFE_TRACK_INDICES = [0, 8, 13, 21, 26, 34, 39, 47];

// Player spawn index mapping offsets
const PLAYER_START_OFFSETS = { green: 0, yellow: 13, blue: 26, red: 39 };

let gameState = {
    currentPlayer: 'red',
    lastRoll: 0,
    tokens: [],
    gameActive: true
};

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (!session || error) { window.location.href = 'index.html'; return; }

    document.getElementById('back-to-dashboard-btn').addEventListener('click', () => {
        if(confirm("Exit match?")) window.location.href = 'dashboard.html';
    });

    const board = document.getElementById('ludo-board');
    const diceBtn = document.getElementById('roll-dice-btn');
    const visualDice = document.getElementById('visual-dice');
    const logContainer = document.querySelector('.game-log');

    // --- 2. INITIALIZE AND SPAWN TOKENS ---
    function spawnAllPlayerTokens() {
        board.querySelectorAll('.token-wrapper').forEach(t => t.remove());
        gameState.tokens = [];
        const colors = ['red', 'green', 'yellow', 'blue'];
        
        colors.forEach(color => {
            for (let i = 0; i < 4; i++) {
                const initialCoords = YARD_HOLE_COORDS[color][i];
                const tokenObj = {
                    id: `${color}-${i}`,
                    color: color,
                    index: i,
                    status: 'yard', // yard, track, homeRun, finished
                    stepCount: 0,
                    trackIndex: -1,
                    coord: { r: initialCoords.r, c: initialCoords.c }
                };
                gameState.tokens.push(tokenObj);

                const wrapper = document.createElement('div');
                wrapper.className = `token-wrapper token-${color}`;
                wrapper.id = tokenObj.id;
                wrapper.style.gridRowStart = tokenObj.coord.r;
                wrapper.style.gridColumnStart = tokenObj.coord.c;

                const shadow = document.createElement('div');
                shadow.className = 'token-ambient-shadow';

                const img = document.createElement('img');
                img.src = `${color}.jpg`;
                img.className = 'token-pawn-graphic';
                img.alt = color;

                img.onerror = () => {
                    img.style.display = 'none';
                    wrapper.classList.add('fallback-circle');
                    wrapper.innerText = color.charAt(0).toUpperCase();
                };

                wrapper.appendChild(shadow);
                wrapper.appendChild(img);
                wrapper.addEventListener('click', () => handleTokenMovement(tokenObj));
                board.appendChild(wrapper);
            }
        });
    }

    // --- 3. CORE LOGIC ENGINE (MOVEMENT, CAPTURES, HOME RUNS) ---
    function handleTokenMovement(token) {
        if (!gameState.gameActive) return;
        if (token.color !== gameState.currentPlayer) return logMessage(`It's not ${token.color}'s turn!`);
        if (gameState.lastRoll === 0) return logMessage(`Roll the dice first!`);
        
        const el = document.getElementById(token.id);

        // A. Handle Launching From Yard Base
        if (token.status === 'yard') {
            if (gameState.lastRoll === 6) {
                token.status = 'track';
                token.stepCount = 0;
                token.trackIndex = PLAYER_START_OFFSETS[token.color];
                
                updateTokenPositionUI(el, COMMON_TRACK_COORDS[token.trackIndex]);
                logMessage(`${token.color.toUpperCase()} token launched onto track!`);
                checkCollisionsAndReferee(token);
            } else {
                logMessage(`Requires a 6 to launch from yard.`);
            }
            return;
        }

        // B. Handle Moving on Main Common Track
        if (token.status === 'track') {
            const remainingTrackSteps = 51 - token.stepCount;
            
            if (gameState.lastRoll <= remainingTrackSteps) {
                // Token stays on main track
                token.stepCount += gameState.lastRoll;
                token.trackIndex = (token.trackIndex + gameState.lastRoll) % 52;
                updateTokenPositionUI(el, COMMON_TRACK_COORDS[token.trackIndex]);
                checkCollisionsAndReferee(token);
            } else {
                // Token steps into its color Home Run stretch
                const stepsIntoHomeRun = gameState.lastRoll - remainingTrackSteps - 1;
                if (stepsIntoHomeRun <= 6) {
                    token.status = 'homeRun';
                    token.stepCount += gameState.lastRoll;
                    token.trackIndex = stepsIntoHomeRun;
                    updateTokenPositionUI(el, HOME_RUN_COORDS[token.color][token.trackIndex]);
                    checkHomeRunCompletion(token, el);
                } else {
                    logMessage(`Roll too high to enter Home Run stretch.`);
                }
            }
            return;
        }

        // C. Handle Home Run Exact-Fit Steps
        if (token.status === 'homeRun') {
            const nextHomeRunIndex = token.trackIndex + gameState.lastRoll;
            if (nextHomeRunIndex <= 6) { // 6 is exact fit index for the Home Triangle
                token.trackIndex = nextHomeRunIndex;
                token.stepCount += gameState.lastRoll;
                updateTokenPositionUI(el, HOME_RUN_COORDS[token.color][token.trackIndex]);
                checkHomeRunCompletion(token, el);
            } else {
                logMessage(`Roll too high! Exact number required to reach Home Base.`);
            }
        }
    }

    // --- 4. COLLISION AND CAPTURE LOGIC MECHANICS ---
    function checkCollisionsAndReferee(movedToken) {
        // Find if any opponent token sits on the exact same common track square
        const targetCollision = gameState.tokens.find(other => 
            other.id !== movedToken.id &&
            other.status === 'track' &&
            other.trackIndex === movedToken.trackIndex
        );

        if (targetCollision) {
            // Check if this square is an immune Safe Zone
            if (SAFE_TRACK_INDICES.includes(movedToken.trackIndex)) {
                logMessage(`Safe Zone cell! ${movedToken.color} shares square with ${targetCollision.color}.`);
                resetTurn();
                return;
            }

            // Execute Capture: Return opponent back to base yard holes
            if (targetCollision.color !== movedToken.color) {
                logMessage(`💥 CAPTURE! ${movedToken.color.toUpperCase()} eliminated ${targetCollision.color.toUpperCase()}!`);
                
                targetCollision.status = 'yard';
                targetCollision.stepCount = 0;
                targetCollision.trackIndex = -1;
                
                const opponentElement = document.getElementById(targetCollision.id);
                const originalHoleCoords = YARD_HOLE_COORDS[targetCollision.color][targetCollision.index];
                updateTokenPositionUI(opponentElement, originalHoleCoords);
                
                // Rule Reward: Capturing grants an immediate bonus roll turn
                gameState.lastRoll = 0;
                diceBtn.disabled = false;
                logMessage(`${movedToken.color.toUpperCase()} earns a bonus roll for the capture!`);
                return;
            }
        }
        resetTurn();
    }

    // --- 5. EXACT-FIT HOME RUN LOGIC & WINNER TRACKING ---
    function checkHomeRunCompletion(token, element) {
        if (token.trackIndex === 6) {
            token.status = 'finished';
            element.style.opacity = '0.35'; // Dim piece out when safely home
            logMessage(`✨ GOAL! A ${token.color.toUpperCase()} token has reached the Home Base!`);

            // Evaluate if all 4 tokens for this specific active player are finished
            const allFinished = gameState.tokens
                .filter(t => t.color === token.color)
                .every(t => t.status === 'finished');

            if (allFinished) {
                gameState.gameActive = false;
                diceBtn.disabled = true;
                alert(`🏆 MATCH OVER! The ${token.color.toUpperCase()} Player wins!`);
                logMessage(`🏆 MATCH OVER! ${token.color.toUpperCase()} WINS!`);
                return;
            }
        }
        resetTurn();
    }

    function updateTokenPositionUI(element, coords) {
        element.style.gridRowStart = coords.r;
        element.style.gridColumnStart = coords.c;
    }

    function resetTurn() {
        gameState.lastRoll = 0;
        diceBtn.disabled = false;
        
        const order = ['red', 'green', 'yellow', 'blue'];
        let nextIdx = (order.indexOf(gameState.currentPlayer) + 1) % 4;
        gameState.currentPlayer = order[nextIdx];
        
        const turnIndicator = document.getElementById('current-player-turn');
        turnIndicator.className = `turn-${gameState.currentPlayer}`;
        turnIndicator.textContent = `${gameState.currentPlayer.toUpperCase()} Player`;
    }

    function logMessage(text) {
        const p = document.createElement('p');
        p.className = 'log-entry';
        p.textContent = text;
        logContainer.appendChild(p);
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    // --- 6. DICE ROLLING TRIGGER ENGINE ---
    const diceFaces = { 1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅' };

    diceBtn.addEventListener('click', () => {
        if (!gameState.gameActive) return;
        diceBtn.disabled = true;
        let counter = 0;
        
        const rollInterval = setInterval(() => {
            const randomTmp = Math.floor(Math.random() * 6) + 1;
            visualDice.textContent = diceFaces[randomTmp];
            counter++;
            
            if (counter > 8) {
                clearInterval(rollInterval);
                const finalRoll = Math.floor(Math.random() * 6) + 1;
                visualDice.textContent = diceFaces[finalRoll];
                
                gameState.lastRoll = finalRoll;
                logMessage(`${gameState.currentPlayer.toUpperCase()} rolled a ${finalRoll}!`);
                
                // Auto-pass evaluation step logic rules
                const activePlayerTokens = gameState.tokens.filter(t => t.color === gameState.currentPlayer);
                const hasValidMove = activePlayerTokens.some(t => {
                    if (t.status === 'yard' && finalRoll === 6) return true;
                    if (t.status === 'track') return true; // Can always move forward or enter run stretch
                    if (t.status === 'homeRun' && (t.trackIndex + finalRoll <= 6)) return true;
                    return false;
                });

                if (!hasValidMove) {
                    logMessage(`No valid moves available! Passing turn...`);
                    setTimeout(resetTurn, 1400);
                }
            }
        }, 80);
    });

    spawnAllPlayerTokens();
});