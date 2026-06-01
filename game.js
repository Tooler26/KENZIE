const SUPABASE_URL = "https://eexaxhkscnshyulqgkqy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleGF4aGtzY25zaHl1bHFna3F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODc0MzQsImV4cCI6MjA5NTM2MzQzNH0.SwXhxAIpDNTbkcgPZqbvkfdnt_vbEqySVQNl6VQIzUU";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', async () => {
    // Security Pass: Check user session
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (!session || error) {
        window.location.href = 'index.html';
        return;
    }

    // Navigation back to dashboard hub
    document.getElementById('back-to-dashboard-btn').addEventListener('click', () => {
        if(confirm("Are you sure you want to exit the current match?")) {
            window.location.href = 'dashboard.html';
        }
    });

    // --- GRID COORDINATE TOKEN GENERATOR ---
    const board = document.getElementById('ludo-board');

    // Helper function to render a token perfectly inside any of the 15x15 slots
    function spawnToken(color, imageFile, row, col) {
        const tokenEl = document.createElement('img');
        tokenEl.src = imageFile;
        tokenEl.className = `token token-${color}`;
        tokenEl.alt = `${color} Token`;
        
        // Target exact CSS Grid tracks (1 to 15)
        tokenEl.style.gridRowStart = row;
        tokenEl.style.gridColumnStart = col;
        
        board.appendChild(tokenEl);
    }

    // Deploy test tokens onto active track spaces to verify alignment
    spawnToken('red', 'red.jpg', 7, 2);       // Red Track Star/Starting Zone
    spawnToken('green', 'green.jpg', 2, 9);   // Green Track Star/Starting Zone
    spawnToken('yellow', 'yellow.jpg', 9, 14); // Yellow Track Star/Starting Zone
    spawnToken('blue', 'blue.jpg', 14, 7);    // Blue Track Star/Starting Zone

    // Place a token inside each base camp circle area for testing placement precision
    spawnToken('red', 'red.jpg', 3, 3);
    spawnToken('green', 'green.jpg', 3, 12);
    spawnToken('yellow', 'yellow.jpg', 12, 12);
    spawnToken('blue', 'blue.jpg', 12, 3);


    // --- REVERTED UNICODE DICE ENGINE ---
    const diceBtn = document.getElementById('roll-dice-btn');
    const diceVisual = document.getElementById('visual-dice');
    const logContainer = document.querySelector('.game-log');
    const diceFaces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

    diceBtn.addEventListener('click', () => {
        diceBtn.disabled = true;
        let rollCount = 0;
        
        // Quick visual cycle simulation
        const rollInterval = setInterval(() => {
            const tempRoll = Math.floor(Math.random() * 6);
            diceVisual.textContent = diceFaces[tempRoll];
            rollCount++;

            if (rollCount > 8) {
                clearInterval(rollInterval);
                const finalRoll = Math.floor(Math.random() * 6) + 1;
                diceVisual.textContent = diceFaces[finalRoll - 1];
                
                const p = document.createElement('p');
                p.className = 'log-entry';
                p.textContent = `You rolled a ${finalRoll}!`;
                logContainer.appendChild(p);
                logContainer.scrollTop = logContainer.scrollHeight;

                diceBtn.disabled = false;
            }
        }, 80);
    });
});