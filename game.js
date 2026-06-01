const SUPABASE_URL = "https://eexaxhkscnshyulqgkqy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleGF4aGtzY25zaHl1bHFna3F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODc0MzQsImV4cCI6MjA5NTM2MzQzNH0.SwXhxAIpDNTbkcgPZqbvkfdnt_vbEqySVQNl6VQIzUU";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', async () => {
    // Security Pass: Check if user session exists inside active room
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

    // Simple Interactive Dice Functionality for Testing
    const diceBtn = document.getElementById('roll-dice-btn');
    const diceVisual = document.getElementById('visual-dice');
    const logContainer = document.querySelector('.game-log');
    const diceFaces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

    diceBtn.addEventListener('click', () => {
        diceBtn.disabled = true;
        let rollCount = 0;
        
        // Simulation Animation Roll Effect
        const rollInterval = setInterval(() => {
            const tempRoll = Math.floor(Math.random() * 6);
            diceVisual.textContent = diceFaces[tempRoll];
            rollCount++;

            if (rollCount > 8) {
                clearInterval(rollInterval);
                const finalRoll = Math.floor(Math.random() * 6) + 1;
                diceVisual.textContent = diceFaces[finalRoll - 1];
                
                // Print statement update to match feed
                const p = document.createElement('p');
                p.className = 'log-entry';
                p.textContent = `You rolled a ${finalRoll}!`;
                logContainer.appendChild(p);
                logContainer.scrollTop = logContainer.scrollHeight; // Auto Scroll Log

                diceBtn.disabled = false;
            }
        }, 80);
    });
});