// 1. Configuration (Using ONLY your public anon key)
const SUPABASE_URL = "https://eexaxhkscnshyulqgkqy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleGF4aGtzY25zaHl1bHFna3F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODc0MzQsImV4cCI6MjA5NTM2MzQzNH0.SwXhxAIpDNTbkcgPZqbvkfdnt_vbEqySVQNl6VQIzUU";

let supabaseClient = null;

// Try to initialize Supabase safely
try {
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("Supabase initialized successfully!");
    } else {
        console.error("Supabase library didn't load from the CDN.");
    }
} catch (err) {
    console.error("Failed to initialize Supabase:", err);
}

// Wait for the HTML elements to be ready before attaching actions
document.addEventListener('DOMContentLoaded', () => {
    // 2. DOM Elements
    const authForm = document.getElementById('auth-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const submitBtn = document.getElementById('submit-btn');
    const authTitle = document.getElementById('auth-title');
    const toggleModeLink = document.getElementById('toggle-mode');
    const toggleHint = document.getElementById('toggle-hint');
    const errorMessage = document.getElementById('error-message');

    // Current mode tracker: true = login, false = signup
    let isLoginMode = true;

    // 3. Toggle between Login and Sign Up UI (This is the button fix!)
    if (toggleModeLink) {
        toggleModeLink.addEventListener('click', (e) => {
            e.preventDefault();
            isLoginMode = !isLoginMode;
            errorMessage.textContent = ""; // Clear errors

            if (isLoginMode) {
                authTitle.textContent = "Welcome to Ludo";
                submitBtn.textContent = "Login";
                toggleHint.textContent = "New player?";
                toggleModeLink.textContent = "Sign up here";
            } else {
                authTitle.textContent = "Create Account";
                submitBtn.textContent = "Sign Up";
                toggleHint.textContent = "Already have an account?";
                toggleModeLink.textContent = "Login here";
            }
        });
    } else {
        console.error("Could not find the element with ID 'toggle-mode' in your HTML.");
    }

    // 4. Handle Form Submission
    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorMessage.textContent = ""; // Clear old errors
            
            if (!supabaseClient) {
                errorMessage.textContent = "Database connection error. Please refresh the page.";
                return;
            }

            const email = emailInput.value;
            const password = passwordInput.value;

            if (isLoginMode) {
                // --- LOGIN LOGIC ---
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password,
                });

                if (error) {
                    errorMessage.textContent = error.message;
                } else {
                    alert(`Welcome back, ${data.user.email}! Loading Ludo board...`);
                }
            } else {
                // --- SIGN UP LOGIC ---
                const { data, error } = await supabaseClient.auth.signUp({
                    email: email,
                    password: password,
                });

                if (error) {
                    errorMessage.textContent = error.message;
                } else {
                    alert("Sign up successful! Check your email for a confirmation link.");
                }
            }
        });
    }
});