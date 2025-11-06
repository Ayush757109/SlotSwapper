// frontend/js/auth.js
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    // If user is already logged in, redirect to calendar
    if (api.isAuthenticated() && (loginForm || signupForm)) {
        window.location.href = 'calendar.html';
        return;
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
                const result = await api.login(email, password);
                api.setToken(result.token);
                localStorage.setItem('user', JSON.stringify(result.user));
                showMessage('Login successful!', 'success');
                
                setTimeout(() => {
                    window.location.href = 'calendar.html';
                }, 1000);
                
            } catch (error) {
                showMessage(error.message, 'error');
            }
        });
    }

    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
                const result = await api.signup(name, email, password);
                api.setToken(result.token);
                localStorage.setItem('user', JSON.stringify(result.user));
                showMessage('Account created successfully!', 'success');
                
                setTimeout(() => {
                    window.location.href = 'calendar.html';
                }, 1000);
                
            } catch (error) {
                showMessage(error.message, 'error');
            }
        });
    }
});