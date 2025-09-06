document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('login-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorMessage = document.getElementById('error-message');

            const formData = new FormData();
            formData.append('username', username);
            formData.append('password', password);

            try {
                const response = await fetch('/api/auth/token', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const data = await response.json();
                    localStorage.setItem('accessToken', data.access_token);
                    
                    // Fetch user details to check if admin
                    const userResponse = await fetch('/api/auth/users/me', {
                        headers: { 'Authorization': `Bearer ${data.access_token}` }
                    });
                    if (userResponse.ok) {
                        const userData = await userResponse.json();
                        if (userData.is_admin) {
                            window.location.href = '/admin/dashboard';
                        } else {
                            window.location.href = '/student/reservations';
                        }
                    } else {
                         window.location.href = '/student/reservations'; // Default redirect
                    }
                } else {
                    const errorData = await response.json();
                    errorMessage.textContent = errorData.detail || '로그인에 실패했습니다.';
                    errorMessage.style.display = 'block';
                }
            } catch (error) {
                errorMessage.textContent = '오류가 발생했습니다. 다시 시도해주세요.';
                errorMessage.style.display = 'block';
            }
        });
    }
});

function logout() {
    localStorage.removeItem('accessToken');
    window.location.href = '/login';
}
