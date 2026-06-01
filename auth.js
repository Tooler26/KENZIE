// 1. Configuration (Using ONLY your public anon key)
const SUPABASE_URL = "https://eexaxhkscnshyulqgkqy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleGF4aGtzY25zaHl1bHFna3F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODc0MzQsImV4cCI6MjA5NTM2MzQzNH0.SwXhxAIpDNTbkcgPZqbvkfdnt_vbEqySVQNl6VQIzUU";

// 2. Initialize the Supabase Client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 3. DOM Elements
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const submitBtn = document.getElementById('submit-btn');
const authTitle = document.getElementById('auth-title');
const toggleModeLink = document.getElementById('toggle-mode');
const toggleHint = document.getElementById('toggle-hint');
const errorMessage = document.getElementById('error-message');

// Current mode tracker: 'login' or 'signup'
let isLoginMode = true;

// 4. Toggle between Login and Sign Up UI
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

// 5. Handle Form Submission
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMessage.textContent = ""; // Clear old errors
    
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
            // We will redirect to the game board here later!
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