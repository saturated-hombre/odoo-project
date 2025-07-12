// Authentication utilities for ReWear platform

// Check if user is authenticated
function isAuthenticated() {
    const token = localStorage.getItem('token');
    return token !== null;
}

// Get current user data
function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

// Get authentication token
function getToken() {
    return localStorage.getItem('token');
}

// Logout user
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

// Check authentication status and update UI
function checkAuthStatus() {
    const userMenu = document.getElementById('userMenu');
    if (!userMenu) return;
    
    const user = getCurrentUser();
    
    if (user) {
        // User is logged in
        userMenu.innerHTML = `
            <div class="d-flex align-center">
                <img src="${user.profilePicture || '/images/default-avatar.png'}" alt="${user.name}" class="user-avatar">
                <div class="dropdown">
                    <button class="btn btn-outline dropdown-toggle" type="button" id="userDropdown" data-toggle="dropdown">
                        ${user.name}
                    </button>
                    <div class="dropdown-menu">
                        <a class="dropdown-item" href="/dashboard">Dashboard</a>
                        <a class="dropdown-item" href="/profile">Profile</a>
                        <a class="dropdown-item" href="/add-item">Add Item</a>
                        ${user.isAdmin ? '<a class="dropdown-item" href="/admin">Admin Panel</a>' : ''}
                        <div class="dropdown-divider"></div>
                        <a class="dropdown-item" href="#" onclick="logout()">Logout</a>
                    </div>
                </div>
            </div>
        `;
        
        // Initialize dropdown functionality
        initializeDropdown();
    } else {
        // User is not logged in
        userMenu.innerHTML = `
            <a href="/login" class="btn btn-outline">Login</a>
            <a href="/register" class="btn btn-primary">Sign Up</a>
        `;
    }
}

// Initialize dropdown menu
function initializeDropdown() {
    const dropdownToggle = document.getElementById('userDropdown');
    const dropdownMenu = document.querySelector('.dropdown-menu');
    
    if (dropdownToggle && dropdownMenu) {
        dropdownToggle.addEventListener('click', function(e) {
            e.preventDefault();
            dropdownMenu.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!dropdownToggle.contains(e.target) && !dropdownMenu.contains(e.target)) {
                dropdownMenu.classList.remove('show');
            }
        });
    }
}

// Make authenticated API requests
async function apiRequest(url, options = {}) {
    const token = getToken();
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    try {
        const response = await fetch(url, finalOptions);
        
        // Handle 401 Unauthorized
        if (response.status === 401) {
            logout();
            return null;
        }
        
        return response;
    } catch (error) {
        console.error('API request error:', error);
        throw error;
    }
}

// Update user profile
async function updateProfile(profileData) {
    try {
        const response = await apiRequest('/api/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
        
        if (response && response.ok) {
            const updatedUser = await response.json();
            localStorage.setItem('user', JSON.stringify(updatedUser));
            return updatedUser;
        }
        
        return null;
    } catch (error) {
        console.error('Update profile error:', error);
        return null;
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validate password strength
function validatePassword(password) {
    const minLength = 6;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    
    const errors = [];
    
    if (password.length < minLength) {
        errors.push(`Password must be at least ${minLength} characters long`);
    }
    if (!hasUpperCase) {
        errors.push('Password must contain at least one uppercase letter');
    }
    if (!hasLowerCase) {
        errors.push('Password must contain at least one lowercase letter');
    }
    if (!hasNumbers) {
        errors.push('Password must contain at least one number');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Format relative time
function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
        return 'Just now';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 2592000) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
        return formatDate(dateString);
    }
}

// Add CSS for dropdown
const dropdownCSS = `
<style>
.dropdown {
    position: relative;
    display: inline-block;
}

.dropdown-toggle {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem 1rem;
    border-radius: var(--border-radius);
    transition: var(--transition);
}

.dropdown-toggle:hover {
    background: var(--background-color);
}

.dropdown-menu {
    display: none;
    position: absolute;
    right: 0;
    top: 100%;
    background: white;
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow);
    min-width: 200px;
    z-index: 1000;
    margin-top: 0.5rem;
}

.dropdown-menu.show {
    display: block;
}

.dropdown-item {
    display: block;
    padding: 0.75rem 1rem;
    color: var(--text-color);
    text-decoration: none;
    transition: var(--transition);
}

.dropdown-item:hover {
    background: var(--background-color);
    color: var(--primary-color);
}

.dropdown-divider {
    height: 1px;
    background: var(--border-color);
    margin: 0.5rem 0;
}
</style>
`;

// Inject dropdown CSS
document.head.insertAdjacentHTML('beforeend', dropdownCSS); 