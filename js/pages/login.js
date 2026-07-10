// login.js
import { login, signup } from '../api/auth.js';
import { getProfile } from '../api/profile.js';
import { showToast } from '../components/toast.js';
import { icon } from '../components/icons.js';
import { ApiError } from '../api/client.js';

const form = document.getElementById('login-form');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const errorEl = document.getElementById('form-error');
const submitBtn = document.getElementById('submit-btn');
const toggleLink = document.getElementById('toggle-mode-link');
const toggleText = document.getElementById('toggle-text');
const googleBtn = document.getElementById('google-login-btn');
const googleIconSlot = document.getElementById('google-icon-slot');

// Render the Google logo icon into its slot
googleIconSlot.innerHTML = icon('google', 18);

// Track form mode via a data attribute on the form itself
form.dataset.mode = 'login';

function setMode(mode) {
  form.dataset.mode = mode;
  clearError();

  if (mode === 'signup') {
    submitBtn.textContent = 'Sign up';
    toggleText.textContent = 'Already have an account?';
    toggleLink.textContent = 'Log in';
  } else {
    submitBtn.textContent = 'Log in';
    toggleText.textContent = "Don't have an account?";
    toggleLink.textContent = 'Sign up';
  }
}

toggleLink.addEventListener('click', (e) => {
  e.preventDefault();
  const nextMode = form.dataset.mode === 'login' ? 'signup' : 'login';
  setMode(nextMode);
});

function showError(message) {
  errorEl.textContent = message;
}

function clearError() {
  errorEl.textContent = '';
}

function setLoading(isLoading, mode) {
  submitBtn.disabled = isLoading;
  if (isLoading) {
    submitBtn.textContent = mode === 'signup' ? 'Signing up…' : 'Logging in…';
  } else {
    submitBtn.textContent = mode === 'signup' ? 'Sign up' : 'Log in';
  }
}

/**
 * After successful auth, decide whether to send the user to onboarding
 * (no about_paragraph yet) or straight to the dashboard.
 */
async function redirectAfterAuth() {
  try {
    const profile = await getProfile();
    if (profile && profile.about_paragraph) {
      window.location.href = '../app/app.html#/dashboard';
    } else {
      window.location.href = '../auth/onboarding.html';
    }
  } catch (err) {
    // If the profile fetch fails (e.g. brand new user with no profile record yet),
    // default to onboarding rather than blocking the user.
    window.location.href = '../auth/onboarding.html';
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const mode = form.dataset.mode;

  if (!email || !password) {
    showError('Enter both email and password.');
    return;
  }

  setLoading(true, mode);

  try {
    if (mode === 'signup') {
      await signup(email, password);
    } else {
      await login(email, password);
    }
    await redirectAfterAuth();
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
    showError(message);
    showToast(message, 'error');
    setLoading(false, mode);
  }
});

/**
 * TODO: Wire the real Google Sign-In JS SDK once a Google OAuth Client ID is available.
 * This stub simulates initiating the OAuth flow; replace with google.accounts.id.initialize()
 * / prompt() (or redirect-based OAuth flow) and pass the resulting ID token to
 * loginWithGoogle() from api/auth.js.
 */
function initiateGoogleOAuth() {
  // TODO: replace with real Google Sign-In flow (see api/auth.js -> loginWithGoogle)
  showToast('Google sign-in is not configured yet.', 'info');
}

googleBtn.addEventListener('click', () => {
  initiateGoogleOAuth();
});
