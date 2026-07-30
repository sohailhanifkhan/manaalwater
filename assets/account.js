// Manaal Water — account.html logic (Firebase Auth + Firestore profile)

document.addEventListener('DOMContentLoaded', () => {

  const loggedOutView = document.getElementById('loggedOutView');
  const loggedInView = document.getElementById('loggedInView');
  const authError = document.getElementById('authError');
  const pageHeading = document.getElementById('pageHeading');
  const pageSub = document.getElementById('pageSub');

  function showError(message) {
    if (!authError) return;
    authError.textContent = message;
    authError.style.display = 'flex';
  }
  function clearError() {
    if (!authError) return;
    authError.style.display = 'none';
  }

  // Friendlier text for common Firebase error codes
  function friendlyError(err) {
    const code = err && err.code ? err.code : '';
    if (code.includes('email-already-in-use')) return 'That email already has an account — try logging in instead.';
    if (code.includes('invalid-email')) return 'Please enter a valid email address.';
    if (code.includes('weak-password')) return 'Password should be at least 6 characters.';
    if (code.includes('user-not-found') || code.includes('wrong-password') || code.includes('invalid-credential')) return 'Incorrect email or password.';
    return 'Something went wrong — please try again.';
  }

  // ---- Sign up ----
  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearError();
      const name = document.getElementById('suName').value.trim();
      const phone = document.getElementById('suPhone').value.trim();
      const email = document.getElementById('suEmail').value.trim();
      const address = document.getElementById('suAddress').value.trim();
      const pass = document.getElementById('suPass').value;
      const payMethod = document.getElementById('suPay').value;

      try {
        const cred = await auth.createUserWithEmailAndPassword(email, pass);
        await db.collection('customers').doc(cred.user.uid).set({
          name, phone, address, payMethod, email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } catch (err) {
        showError(friendlyError(err));
      }
    });
  }

  // ---- Log in ----
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearError();
      const email = document.getElementById('loginEmail').value.trim();
      const pass = document.getElementById('loginPass').value;
      try {
        await auth.signInWithEmailAndPassword(email, pass);
      } catch (err) {
        showError(friendlyError(err));
      }
    });
  }

  // ---- Log out ----
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => auth.signOut());
  }

  // ---- Reflect login state in the UI ----
  auth.onAuthStateChanged(async (user) => {
    if (!loggedOutView || !loggedInView) return; // not on a page with these elements
    if (user) {
      loggedOutView.style.display = 'none';
      loggedInView.style.display = 'block';
      if (pageHeading) pageHeading.textContent = 'Welcome back';
      if (pageSub) pageSub.textContent = 'Your details are saved — reorder in a couple of taps.';
      try {
        const doc = await db.collection('customers').doc(user.uid).get();
        if (doc.exists) {
          const d = doc.data();
          document.getElementById('welcomeName').textContent = `Welcome back, ${d.name || ''}!`;
          document.getElementById('profName').textContent = d.name || '—';
          document.getElementById('profPhone').textContent = d.phone || '—';
          document.getElementById('profAddress').textContent = d.address || '—';
          document.getElementById('profPay').textContent = d.payMethod || '—';
        }
      } catch (e) {
        console.warn('Could not load profile', e);
      }
    } else {
      loggedOutView.style.display = 'block';
      loggedInView.style.display = 'none';
      if (pageHeading) pageHeading.textContent = 'Log in or create your account';
      if (pageSub) pageSub.textContent = 'Save your address once, then reorder your usual bottles in a couple of taps.';
    }
  });

});
