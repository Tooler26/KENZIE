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

    // --- PAWN TOKEN BUILDER ENGINE ---
    const board = document.getElementById('ludo-board');

    function spawnToken(color, imageFile, row, col) {
        // Create the layout cell container
        const tokenWrapper = document.createElement('div');
        tokenWrapper.className = `token-wrapper token-${color}`;
        tokenWrapper.style.gridRowStart = row;
        tokenWrapper.style.gridColumnStart = col;

        // Create the movement shadow layer
        const tokenShadow = document.createElement('div');
        tokenShadow.className = 'token-ambient-shadow';

        // Create the actual pawn image asset element
        const tokenImg = document.createElement('img');
        tokenImg.src = imageFile;
        tokenImg.className = 'token-pawn-graphic';
        tokenImg.alt = `${color} token`;

        // If your images ever fail to load in workspace environments, fall back gracefully
        tokenImg.onerror = () => {
            tokenImg.style.display = 'none';
            tokenWrapper.classList.add('fallback-circle');
            tokenWrapper.innerText = color.charAt(0).toUpperCase();
        };

        tokenWrapper.appendChild(tokenShadow);
        tokenWrapper.appendChild(tokenImg);
        board.appendChild(tokenWrapper);
    }

    // Place one token on the starting track positions
    spawnToken('red', 'red.jpg', 7, 2);       
    spawnToken('green', 'green.jpg', 2, 9);   
    spawnToken('yellow', 'yellow.jpg', 9, 14); 
    spawnToken('blue', 'blue.jpg', 14, 7);    

    // Place tokens into the main base yards matching your board image positions
    spawnToken('red', 'red.jpg', 3, 3);
    spawnToken('green', 'green.jpg', 3, 12);
    spawnToken('yellow', 'yellow.jpg', 12, 12);
    spawnToken('blue', 'blue.jpg', 12, 3);


    // --- ORIGINAL DICE TEXT ROLLING LOGIC ---
    const diceBtn = document.getElementById('roll-dice-btn');
    const visualDice = document.getElementById('visual-dice');
    const logContainer = document.querySelector('.game-log');

    const diceFaces = { 1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅' };

    diceBtn.addEventListener('click', () => {
        diceBtn.disabled = true;
        let counter = 0;
        
        // Simulates a shuffle blur roll effect
        const rollInterval = setInterval(() => {
            const randomTmp = Math.floor(Math.random() * 6) + 1;
            visualDice.textContent = diceFaces[randomTmp];
            counter++;
            
            if (counter > 8) {
                clearInterval(rollInterval);
                const finalRoll = Math.floor(Math.random() * 6) + 1;
                visualDice.textContent = diceFaces[finalRoll];
                
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