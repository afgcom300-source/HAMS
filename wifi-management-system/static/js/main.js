document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.getElementById('loginForm');
    const userTypeSelect = document.getElementById('userType');
    const usernameLabel = document.getElementById('usernameLabel');
    const usernameInput = document.getElementById('username');

    userTypeSelect.addEventListener('change', () => {
        if (userTypeSelect.value === 'seller') {
            usernameLabel.innerText = 'شماره تماس';
            usernameInput.placeholder = 'شماره تماس خود را وارد کنید';
            usernameInput.type = 'tel';
        } else {
            usernameLabel.innerText = 'نام کاربری';
            usernameInput.placeholder = 'نام کاربری خود را وارد کنید';
            usernameInput.type = 'text';
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        FormHandler.clearFormErrors(loginForm);

        const formData = FormHandler.serializeForm(loginForm);
        const userType = formData.userType;
        const usernameLabelText = (userType === 'seller') ? 'شماره تماس' : 'نام کاربری';


        const errors = FormHandler.validateForm(loginForm, {
            username: { required: true, label: usernameLabelText },
            password: { required: true, label: 'رمز عبور' },
            userType: { required: true, label: 'نقش کاربری' }
        });

        if (errors.length > 0) {
            FormHandler.showFormErrors(loginForm, errors);
            return;
        }

        try {

            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });


            const text = await response.text();
            let result;
            try {
                result = JSON.parse(text); 
            } catch (err) {
                console.error('Invalid JSON from server:', text);
                SystemUtils.showNotification('پاسخ سرور نامعتبر است', 'error');
                return;
            }

            if (result.success) {
                // ذخیره اطلاعات کاربر در sessionStorage
                sessionStorage.setItem('username', formData.username);
                sessionStorage.setItem('role', formData.userType);
                sessionStorage.setItem('name', formData.username); 

                SystemUtils.showNotification('ورود موفق', 'success');
                setTimeout(() => {
                    window.location.href = result.redirect;
                }, 1000);

            } else {
                SystemUtils.showNotification(result.message || 'نام کاربری یا رمز عبور اشتباه است', 'error');
            }

        } catch (error) {
            console.error('Login API error:', error);
            SystemUtils.showNotification('خطا در ارتباط با سرور', 'error');
        }
    });
});
