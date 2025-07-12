// Main JavaScript utilities for ReWear platform

// Global variables
let currentPage = 1;
let isLoading = false;

// Initialize the application
function initApp() {
    checkAuthStatus();
    setupEventListeners();
    loadInitialData();
}

// Setup global event listeners
function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
    
    // Mobile menu toggle
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const navMenu = document.querySelector('.nav-menu');
    if (mobileMenuToggle && navMenu) {
        mobileMenuToggle.addEventListener('click', function() {
            navMenu.classList.toggle('show');
        });
    }
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', function(e) {
        if (navMenu && !navMenu.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
            navMenu.classList.remove('show');
        }
    });
}

// Load initial data based on current page
function loadInitialData() {
    const path = window.location.pathname;
    
    if (path === '/') {
        // Home page - loadFeaturedItems is called in index.html
        return;
    } else if (path === '/browse') {
        loadItems();
    } else if (path === '/dashboard') {
        loadDashboard();
    } else if (path.startsWith('/item/')) {
        loadItemDetails();
    }
}

// Search functionality
function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput ? searchInput.value.trim() : '';
    
    if (query) {
        const currentUrl = new URL(window.location);
        currentUrl.searchParams.set('search', query);
        currentUrl.searchParams.delete('page'); // Reset to first page
        window.location.href = currentUrl.toString();
    }
}

// Load items with filters and pagination
async function loadItems() {
    const itemsContainer = document.getElementById('itemsContainer');
    if (!itemsContainer) return;
    
    try {
        isLoading = true;
        showLoading(itemsContainer);
        
        const urlParams = new URLSearchParams(window.location.search);
        const params = {
            page: urlParams.get('page') || 1,
            limit: 12,
            search: urlParams.get('search') || '',
            category: urlParams.get('category') || '',
            size: urlParams.get('size') || '',
            condition: urlParams.get('condition') || '',
            minPoints: urlParams.get('minPoints') || '',
            maxPoints: urlParams.get('maxPoints') || '',
            sort: urlParams.get('sort') || 'newest'
        };
        
        const queryString = Object.entries(params)
            .filter(([_, value]) => value)
            .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
            .join('&');
        
        const response = await fetch(`/api/items?${queryString}`);
        const data = await response.json();
        
        if (response.ok) {
            displayItems(data.items, itemsContainer);
            displayPagination(data.pagination);
            updateFilters(params);
        } else {
            showError('Failed to load items', itemsContainer);
        }
    } catch (error) {
        console.error('Error loading items:', error);
        showError('Network error. Please try again.', itemsContainer);
    } finally {
        isLoading = false;
    }
}

// Display items in grid
function displayItems(items, container) {
    if (!items || items.length === 0) {
        container.innerHTML = `
            <div class="text-center p-4">
                <i class="fas fa-search" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                <h3>No items found</h3>
                <p>Try adjusting your search criteria or browse all items.</p>
                <a href="/browse" class="btn btn-primary">Browse All Items</a>
            </div>
        `;
        return;
    }
    
    container.innerHTML = items.map(item => createItemCard(item)).join('');
}

// Create item card HTML
function createItemCard(item) {
    return `
        <div class="card product-card" onclick="window.location.href='/item/${item._id}'">
            <img src="${item.images[0] || '/images/placeholder.jpg'}" alt="${item.title}" class="product-image">
            <div class="product-info">
                <h3 class="product-title">${item.title}</h3>
                <p class="product-description">${item.description.substring(0, 100)}...</p>
                <div class="product-meta">
                    <span class="product-points">${item.pointsValue} pts</span>
                    <div class="product-rating">
                        <i class="fas fa-star"></i>
                        <span>${item.uploaderId?.rating || 0}</span>
                    </div>
                </div>
                <div class="product-details">
                    <small class="text-muted">
                        <i class="fas fa-user"></i> ${item.uploaderName}
                        <span class="mx-2">•</span>
                        <i class="fas fa-clock"></i> ${formatRelativeTime(item.dateAdded)}
                    </small>
                </div>
            </div>
        </div>
    `;
}

// Display pagination
function displayPagination(pagination) {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer || !pagination) return;
    
    const { current, pages, hasNext, hasPrev } = pagination;
    
    let paginationHTML = '<div class="d-flex justify-center gap-2">';
    
    // Previous button
    if (hasPrev) {
        paginationHTML += `<a href="?page=${current - 1}" class="btn btn-outline btn-sm">Previous</a>`;
    }
    
    // Page numbers
    const startPage = Math.max(1, current - 2);
    const endPage = Math.min(pages, current + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === current;
        paginationHTML += `
            <a href="?page=${i}" class="btn ${isActive ? 'btn-primary' : 'btn-outline'} btn-sm">
                ${i}
            </a>
        `;
    }
    
    // Next button
    if (hasNext) {
        paginationHTML += `<a href="?page=${current + 1}" class="btn btn-outline btn-sm">Next</a>`;
    }
    
    paginationHTML += '</div>';
    paginationContainer.innerHTML = paginationHTML;
}

// Update filter UI
function updateFilters(params) {
    // Update search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = params.search || '';
    }
    
    // Update category filter
    const categorySelect = document.getElementById('categoryFilter');
    if (categorySelect) {
        categorySelect.value = params.category || '';
    }
    
    // Update size filter
    const sizeSelect = document.getElementById('sizeFilter');
    if (sizeSelect) {
        sizeSelect.value = params.size || '';
    }
    
    // Update condition filter
    const conditionSelect = document.getElementById('conditionFilter');
    if (conditionSelect) {
        conditionSelect.value = params.condition || '';
    }
    
    // Update sort filter
    const sortSelect = document.getElementById('sortFilter');
    if (sortSelect) {
        sortSelect.value = params.sort || 'newest';
    }
}

// Apply filters
function applyFilters() {
    const currentUrl = new URL(window.location);
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const sizeFilter = document.getElementById('sizeFilter');
    const conditionFilter = document.getElementById('conditionFilter');
    const sortFilter = document.getElementById('sortFilter');
    
    if (searchInput && searchInput.value.trim()) {
        currentUrl.searchParams.set('search', searchInput.value.trim());
    } else {
        currentUrl.searchParams.delete('search');
    }
    
    if (categoryFilter && categoryFilter.value) {
        currentUrl.searchParams.set('category', categoryFilter.value);
    } else {
        currentUrl.searchParams.delete('category');
    }
    
    if (sizeFilter && sizeFilter.value) {
        currentUrl.searchParams.set('size', sizeFilter.value);
    } else {
        currentUrl.searchParams.delete('size');
    }
    
    if (conditionFilter && conditionFilter.value) {
        currentUrl.searchParams.set('condition', conditionFilter.value);
    } else {
        currentUrl.searchParams.delete('condition');
    }
    
    if (sortFilter && sortFilter.value) {
        currentUrl.searchParams.set('sort', sortFilter.value);
    } else {
        currentUrl.searchParams.delete('sort');
    }
    
    // Reset to first page
    currentUrl.searchParams.delete('page');
    
    window.location.href = currentUrl.toString();
}

// Clear filters
function clearFilters() {
    window.location.href = '/browse';
}

// Show loading spinner
function showLoading(container) {
    container.innerHTML = `
        <div class="spinner"></div>
        <p class="text-center">Loading...</p>
    `;
}

// Show error message
function showError(message, container) {
    container.innerHTML = `
        <div class="text-center p-4">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--error-color); margin-bottom: 1rem;"></i>
            <h3>Error</h3>
            <p>${message}</p>
            <button onclick="location.reload()" class="btn btn-primary">Try Again</button>
        </div>
    `;
}

// Load dashboard data
async function loadDashboard() {
    if (!isAuthenticated()) {
        window.location.href = '/login?redirect=/dashboard';
        return;
    }
    
    try {
        const response = await apiRequest('/api/auth/profile');
        if (response && response.ok) {
            const user = await response.json();
            displayDashboard(user);
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Display dashboard
function displayDashboard(user) {
    const dashboardContainer = document.getElementById('dashboardContainer');
    if (!dashboardContainer) return;
    
    dashboardContainer.innerHTML = `
        <div class="grid grid-2">
            <div class="card">
                <div class="card-header">
                    <h3>Profile Overview</h3>
                </div>
                <div class="card-body">
                    <div class="d-flex align-center mb-3">
                        <img src="${user.profilePicture || '/images/default-avatar.png'}" alt="${user.name}" class="user-avatar" style="width: 60px; height: 60px;">
                        <div class="ml-3">
                            <h4>${user.name}</h4>
                            <p class="text-muted">${user.location || 'Location not set'}</p>
                        </div>
                    </div>
                    <div class="grid grid-3">
                        <div class="text-center">
                            <h3>${user.points}</h3>
                            <small>Points</small>
                        </div>
                        <div class="text-center">
                            <h3>${user.itemsListed}</h3>
                            <small>Items Listed</small>
                        </div>
                        <div class="text-center">
                            <h3>${user.swapsCompleted}</h3>
                            <small>Swaps Completed</small>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3>Quick Actions</h3>
                </div>
                <div class="card-body">
                    <div class="d-grid gap-2">
                        <a href="/add-item" class="btn btn-primary">
                            <i class="fas fa-plus"></i> Add New Item
                        </a>
                        <a href="/browse" class="btn btn-outline">
                            <i class="fas fa-search"></i> Browse Items
                        </a>
                        <a href="/profile" class="btn btn-outline">
                            <i class="fas fa-user-edit"></i> Edit Profile
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Load item details
async function loadItemDetails() {
    const itemId = window.location.pathname.split('/').pop();
    const itemContainer = document.getElementById('itemContainer');
    
    if (!itemContainer) return;
    
    try {
        showLoading(itemContainer);
        
        const response = await fetch(`/api/items/${itemId}`);
        const item = await response.json();
        
        if (response.ok) {
            displayItemDetails(item);
        } else {
            showError('Item not found', itemContainer);
        }
    } catch (error) {
        console.error('Error loading item details:', error);
        showError('Network error. Please try again.', itemContainer);
    }
}

// Display item details
function displayItemDetails(item) {
    const itemContainer = document.getElementById('itemContainer');
    if (!itemContainer) return;
    
    itemContainer.innerHTML = `
        <div class="grid grid-2">
            <div class="item-gallery">
                <img src="${item.images[0] || '/images/placeholder.jpg'}" alt="${item.title}" class="w-100" style="border-radius: var(--border-radius);">
            </div>
            
            <div class="item-info">
                <h1>${item.title}</h1>
                <p class="text-muted">Listed by ${item.uploaderName}</p>
                
                <div class="item-meta mb-3">
                    <span class="product-points">${item.pointsValue} points</span>
                    <span class="badge" style="background: var(--primary-color); color: white; padding: 0.25rem 0.5rem; border-radius: 4px; margin-left: 1rem;">
                        ${item.category}
                    </span>
                </div>
                
                <div class="item-details mb-3">
                    <p><strong>Size:</strong> ${item.size}</p>
                    <p><strong>Condition:</strong> ${item.condition}</p>
                    <p><strong>Brand:</strong> ${item.brand || 'Not specified'}</p>
                    <p><strong>Color:</strong> ${item.color || 'Not specified'}</p>
                </div>
                
                <div class="item-description mb-3">
                    <h4>Description</h4>
                    <p>${item.description}</p>
                </div>
                
                ${isAuthenticated() ? `
                    <div class="item-actions">
                        <button onclick="requestSwap('${item._id}')" class="btn btn-primary btn-lg">
                            <i class="fas fa-exchange-alt"></i> Request Swap
                        </button>
                        <button onclick="likeItem('${item._id}')" class="btn btn-outline btn-lg">
                            <i class="fas fa-heart"></i> Like
                        </button>
                    </div>
                ` : `
                    <div class="item-actions">
                        <a href="/login?redirect=${window.location.pathname}" class="btn btn-primary btn-lg">
                            Login to Request Swap
                        </a>
                    </div>
                `}
            </div>
        </div>
    `;
}

// Request swap
async function requestSwap(itemId) {
    if (!isAuthenticated()) {
        window.location.href = '/login';
        return;
    }
    
    // Show swap request modal
    showSwapRequestModal(itemId);
}

// Like item
async function likeItem(itemId) {
    if (!isAuthenticated()) {
        window.location.href = '/login';
        return;
    }
    
    try {
        const response = await apiRequest(`/api/items/${itemId}/like`, {
            method: 'POST'
        });
        
        if (response && response.ok) {
            const data = await response.json();
            showToast(`Item ${data.isLiked ? 'liked' : 'unliked'} successfully`, 'success');
            // Update like button UI if needed
        }
    } catch (error) {
        console.error('Error liking item:', error);
        showToast('Failed to like item', 'error');
    }
}

// Show swap request modal
function showSwapRequestModal(itemId) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Request Swap</h3>
                <button onclick="closeModal()" class="close-btn">&times;</button>
            </div>
            <div class="modal-body">
                <form id="swapRequestForm">
                    <div class="form-group">
                        <label>Swap Type</label>
                        <select id="swapType" class="form-control" required>
                            <option value="points">Points Swap</option>
                            <option value="direct">Direct Swap</option>
                        </select>
                    </div>
                    
                    <div class="form-group" id="pointsGroup">
                        <label>Points to Offer</label>
                        <input type="number" id="pointsOffered" class="form-control" min="1" required>
                    </div>
                    
                    <div class="form-group" id="directGroup" style="display: none;">
                        <label>Your Item to Offer</label>
                        <select id="offeredItem" class="form-control">
                            <option value="">Select an item...</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Message (Optional)</label>
                        <textarea id="swapMessage" class="form-control" rows="3" placeholder="Add a message to the item owner..."></textarea>
                    </div>
                    
                    <div class="modal-actions">
                        <button type="button" onclick="closeModal()" class="btn btn-outline">Cancel</button>
                        <button type="submit" class="btn btn-primary">Send Request</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle swap type change
    document.getElementById('swapType').addEventListener('change', function() {
        const pointsGroup = document.getElementById('pointsGroup');
        const directGroup = document.getElementById('directGroup');
        
        if (this.value === 'points') {
            pointsGroup.style.display = 'block';
            directGroup.style.display = 'none';
        } else {
            pointsGroup.style.display = 'none';
            directGroup.style.display = 'block';
            loadUserItems();
        }
    });
    
    // Handle form submission
    document.getElementById('swapRequestForm').addEventListener('submit', function(e) {
        e.preventDefault();
        submitSwapRequest(itemId);
    });
}

// Close modal
function closeModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.remove();
    }
}

// Submit swap request
async function submitSwapRequest(itemId) {
    const swapType = document.getElementById('swapType').value;
    const pointsOffered = document.getElementById('pointsOffered').value;
    const offeredItem = document.getElementById('offeredItem').value;
    const message = document.getElementById('swapMessage').value;
    
    try {
        const swapData = {
            itemId,
            swapType,
            message
        };
        
        if (swapType === 'points') {
            swapData.pointsOffered = parseInt(pointsOffered);
        } else if (swapType === 'direct') {
            swapData.offeredItemId = offeredItem;
        }
        
        const response = await apiRequest('/api/swaps', {
            method: 'POST',
            body: JSON.stringify(swapData)
        });
        
        if (response && response.ok) {
            showToast('Swap request sent successfully!', 'success');
            closeModal();
        } else {
            const data = await response.json();
            showToast(data.message || 'Failed to send swap request', 'error');
        }
    } catch (error) {
        console.error('Error submitting swap request:', error);
        showToast('Network error. Please try again.', 'error');
    }
}

// Load user's items for direct swap
async function loadUserItems() {
    try {
        const response = await apiRequest('/api/items?uploaderId=me');
        if (response && response.ok) {
            const data = await response.json();
            const select = document.getElementById('offeredItem');
            
            select.innerHTML = '<option value="">Select an item...</option>';
            data.items.forEach(item => {
                select.innerHTML += `<option value="${item._id}">${item.title}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading user items:', error);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp); 