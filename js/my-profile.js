document.addEventListener("DOMContentLoaded", () => {
    const saveAllChangesBtn = document.getElementById("saveAllChanges");
    const deleteAccountBtn = document.getElementById("deleteAccountBtn");
    const passwordChangeForm = document.getElementById("passwordChangeForm");
    const token = localStorage.getItem("token");

    // --- Utility Functions ---
    const showMessageBox = (message, type, duration = 3000) => {
        const el = document.getElementById("messageBox");
        el.textContent = message;
        el.className = "fixed bottom-5 right-5 text-white px-6 py-3 rounded-lg shadow-lg z-50 text-base transition-all duration-300 transform opacity-100 translate-x-0";
        if (type === "success") el.classList.add("bg-green-600");
        else if (type === "error") el.classList.add("bg-red-600");
        else el.classList.add("bg-blue-600");
        setTimeout(() => {
            el.classList.add("translate-x-full", "opacity-0");
        }, duration);
    };

    const showConfirmModal = (message) => {
        return new Promise((resolve) => {
            const modal = document.getElementById("confirmModal");
            document.getElementById("confirmMessage").textContent = message;
            modal.classList.add("active");
            const yesBtn = document.getElementById("confirmYes");
            const noBtn = document.getElementById("confirmNo");
            const cleanup = (result) => {
                modal.classList.remove("active");
                yesBtn.replaceWith(yesBtn.cloneNode(true));
                noBtn.replaceWith(noBtn.cloneNode(true));
                resolve(result);
            };
            yesBtn.addEventListener("click", () => cleanup(true), { once: true });
            noBtn.addEventListener("click", () => cleanup(false), { once: true });
        });
    };

    const headers = {
        "Content-Type": "application/json",
        "x-auth-token": token,
    };

    // Prefer event-based subscription (auth.js dispatches 'user:data')
    const handleUserData = (user) => {
        fillProfileForm(user);
        checkProfileCompleteness(user);
        // Google password badge logic
        const badge = document.getElementById('googlePasswordBadge');
        const info = document.getElementById('googlePasswordInfo');
        if (badge && info && user.authProvider === 'google') {
            if (user.passwordSet === false) {
                badge.classList.remove('hidden');
                info.classList.add('hidden');
                // Hide current password field for first set
                const currentGroup = document.querySelector('#currentPassword')?.closest('.form-group');
                if (currentGroup) currentGroup.style.display = 'none';
            } else {
                info.classList.remove('hidden');
                badge.classList.add('hidden');
            }
        }
    };
    document.addEventListener('user:data', (e) => handleUserData(e.detail));
    // If user already fetched before this script loaded
    if (window.currentUser) handleUserData(window.currentUser);

    const fillProfileForm = (user) => {
        document.getElementById("email").value = user.email || '';
        document.getElementById("firstName").value = user.firstName || '';
        document.getElementById("lastName").value = user.lastName || '';
        document.getElementById("title").value = user.title || 'Mr.';
        document.getElementById("contactPhone").value = user.contactPhone || '';
        document.getElementById("country").value = user.country || 'United Kingdom';
        document.getElementById("city").value = user.city || '';
        document.getElementById("street").value = user.street || '';
        document.getElementById("postalCode").value = user.postalCode || '';
        document.getElementById("username").value = user.email || '';
        document.getElementById("language").value = user.language || 'English';
        document.getElementById("timezone").value = user.timezone || 'Autodetected';
        document.getElementById("googleAiKey").value = user.googleAiKey || '';
    };

    const checkProfileCompleteness = (user) => {
        const notice = document.getElementById("incompleteProfileNotice");
        const requiredFields = ['firstName', 'lastName', 'title', 'contactPhone', 'country', 'city', 'street', 'postalCode'];
        
        const isComplete = requiredFields.every(field => user[field] && user[field].trim() !== '');

        if (isComplete) {
            notice.classList.add('hidden');
        } else {
            notice.classList.remove('hidden');
        }
    };

    // Save all changes
    const saveChanges = async () => {
        const updatedData = {
            firstName: document.getElementById("firstName").value,
            lastName: document.getElementById("lastName").value,
            title: document.getElementById("title").value,
            contactPhone: document.getElementById("contactPhone").value,
            country: document.getElementById("country").value,
            city: document.getElementById("city").value,
            street: document.getElementById("street").value,
            postalCode: document.getElementById("postalCode").value,
            language: document.getElementById("language").value,
            timezone: document.getElementById("timezone").value,
        };

        try {
            const res = await fetch('http://localhost:5000/api/profile', {
                method: 'PUT',
                headers,
                body: JSON.stringify(updatedData),
            });

            if (res.ok) {
                const updatedUser = await res.json();
                // Use the globally available function from auth.js to update the header
                if (window.updateUserDisplay) {
                    window.updateUserDisplay(updatedUser);
                }
                // Re-populate the form with the confirmed data from the server
                fillProfileForm(updatedUser);
                // Re-check completeness after saving
                checkProfileCompleteness(updatedUser);
                showMessageBox("Profile updated successfully!", "success");
            } else {
                showMessageBox("Failed to update profile.", "error");
            }
        } catch (err) {
            console.error("Error saving profile data:", err);
            showMessageBox("An error occurred. Please try again.", "error");
        }
    };

    const saveAiKey = async (e) => {
        e.preventDefault();
        const apiKey = document.getElementById("googleAiKey").value;
        try {
            const res = await fetch('http://localhost:5000/api/profile', {
                method: 'PUT',
                headers,
                body: JSON.stringify({ googleAiKey: apiKey }),
            });
            if (res.ok) {
                showMessageBox("API Key saved successfully!", "success");
            } else {
                showMessageBox("Failed to save API Key.", "error");
            }
        } catch (err) {
            showMessageBox("An error occurred.", "error");
        }
    };

    const deleteApiKey = async () => {
        const confirmed = await showConfirmModal("Are you sure you want to delete your API key? This action cannot be undone.");
        if (confirmed) {
            try {
                const res = await fetch('http://localhost:5000/api/profile', {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify({ googleAiKey: '' }), // Set the key to an empty string
                });
                if (res.ok) {
                    document.getElementById("googleAiKey").value = '';
                    showMessageBox("API Key deleted successfully!", "success");
                } else {
                    showMessageBox("Failed to delete API Key.", "error");
                }
            } catch (err) {
                showMessageBox("An error occurred.", "error");
            }
        }
    };

    const handleDeleteAccount = async () => {
        const confirmed = await showConfirmModal("Are you sure you want to delete your account? This action cannot be undone.");
        if (confirmed) {
            try {
                const res = await fetch('http://localhost:5000/api/profile', {
                    method: 'DELETE',
                    headers,
                });
                if (res.ok) {
                    localStorage.removeItem("token");
                    window.location.href = "index.html";
                } else {
                    showMessageBox("Failed to delete account.", "error");
                }
            } catch (err) {
                showMessageBox("An error occurred. Please try again.", "error");
            }
        }
    };

    if (saveAllChangesBtn) {
        saveAllChangesBtn.addEventListener("click", saveChanges);
    }

    const aiKeyForm = document.getElementById("aiKeyForm");
    if (aiKeyForm) {
        aiKeyForm.addEventListener("submit", saveAiKey);
    }

    const deleteApiKeyBtn = document.getElementById("deleteApiKeyBtn");
    if (deleteApiKeyBtn) {
        deleteApiKeyBtn.addEventListener("click", deleteApiKey);
    }

    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener("click", handleDeleteAccount);
    }

    if (passwordChangeForm) {
        passwordChangeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const isGoogleFirstSet = window.currentUser && window.currentUser.authProvider === 'google' && window.currentUser.passwordSet === false;
            if (!newPassword) {
                showMessageBox('Enter a new password.', 'error');
                return;
            }
            if (!isGoogleFirstSet && !currentPassword) {
                showMessageBox('Please fill current & new password.', 'error');
                return;
            }
            if (newPassword !== confirmPassword) {
                showMessageBox('New password and confirmation do not match.', 'error');
                return;
            }
            try {
                const res = await fetch('http://localhost:5000/api/auth/change-password', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                    body: JSON.stringify({ currentPassword, newPassword })
                });
                let data = {};
                try { data = await res.json(); } catch(_) {}
                if (res.ok) {
                    if (isGoogleFirstSet) {
                        // Update local user flag so badge switches state
                        if (window.currentUser) window.currentUser.passwordSet = true;
                    }
                    showMessageBox(data.msg || (isGoogleFirstSet ? 'Password set.' : 'Password updated.'), 'success');
                    passwordChangeForm.reset();
                } else {
                    console.warn('Password change failed', res.status, data);
                    showMessageBox(data.msg || `Failed (${res.status}).`, 'error');
                }
            } catch (err) {
                showMessageBox('Server error changing password.', 'error');
                console.error('Password change network error', err);
            }
        });
    }

    // Initialize eye toggle buttons
    document.querySelectorAll('.pw-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (!input) return;
            const show = input.type === 'password';
            input.type = show ? 'text' : 'password';
            const icon = btn.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-eye');
                icon.classList.toggle('fa-eye-slash');
            }
            btn.setAttribute('aria-label', (show ? 'Hide' : 'Show') + (targetId === 'googleAiKey' ? ' API key' : ' password'));
        });
    });

    // --- Profile Page Tabs ---
    const tabItems = document.querySelectorAll(".tab-item");
    const tabContents = document.querySelectorAll(".tab-content");

    tabItems.forEach(tab => {
        tab.addEventListener("click", (e) => {
            e.preventDefault();
            const targetId = tab.dataset.tab;

            // Update active tab
            tabItems.forEach(item => item.classList.remove("active"));
            tab.classList.add("active");

            // Update active content
            tabContents.forEach(content => {
                if (content.id === targetId) {
                    content.classList.add("active");
                } else {
                    content.classList.remove("active");
                }
            });
        });
    });
});
