// TikTok Authentication Handler

// Configuration - Backend will handle OAuth flow
const API_BASE_URL = window.location.origin;
const TIKTOK_SCOPES = ['user.info.basic', 'video.upload', 'video.publish'];

// Session Management
const TikTokAuth = {
  // Initialize authentication
  init() {
    this.checkForOAuthErrors();
    this.checkAuthStatus();
    this.setupEventListeners();
  },

  // Check for OAuth errors in URL
  checkForOAuthErrors() {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');

    if (error) {
      console.error('OAuth error:', error);
      const errorMsg = this.getErrorMessage(error);
      alert('Login failed: ' + errorMsg);

      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  },

  // Get user-friendly error message
  getErrorMessage(error) {
    const messages = {
      'invalid_state': 'Security validation failed. Please try again.',
      'missing_parameters': 'Missing authorization parameters. Please try again.',
      'session_save_failed': 'Session error. Please try again.',
      'access_denied': 'Authorization was denied. Please try again.',
      'temporarily_unavailable': 'TikTok service is temporarily unavailable.',
    };
    return messages[error] || error;
  },

  // Setup event listeners
  setupEventListeners() {
    const loginBtn = document.getElementById('tiktok-login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const disconnectBtn = document.getElementById('disconnect-btn');

    if (loginBtn) {
      loginBtn.addEventListener('click', () => this.initiateLogin());
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.logout());
    }

    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.disconnect();
      });
    }
  },

  // Check if user is authenticated
  isAuthenticated() {
    return !!localStorage.getItem('tiktok_access_token');
  },

  // Get stored access token
  getAccessToken() {
    return localStorage.getItem('tiktok_access_token');
  },

  // Get stored user info
  getUserInfo() {
    const userInfo = localStorage.getItem('tiktok_user_info');
    return userInfo ? JSON.parse(userInfo) : null;
  },

  // Check authentication status and redirect if needed
  async checkAuthStatus() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const isOnDashboard = currentPage === 'dashboard.html';
    const isOnLogin = currentPage === 'login.html';

    console.log('🔍 Checking auth status on page:', currentPage);
    console.log('📍 Full URL:', window.location.href);

    try {
      // Check with backend
      console.log('🌐 Fetching /api/v1/auth/user with credentials...');
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/user`, {
        credentials: 'include',
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      console.log('📡 Auth check response status:', response.status);
      console.log('📡 Response headers:', {
        'content-type': response.headers.get('content-type'),
        'set-cookie': response.headers.get('set-cookie'),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ User authenticated:', data.data?.user);
        // User is authenticated
        this.updateUIForAuthenticated(data.data?.user);

        // If on login page, redirect to dashboard
        if (isOnLogin) {
          console.log('📍 Redirecting to dashboard...');
          setTimeout(() => {
            window.location.href = './dashboard.html';
          }, 500);
        }
      } else {
        // User is not authenticated
        console.log('❌ User not authenticated - status:', response.status);
        const errorData = await response.json().catch(() => ({}));
        console.log('   Error details:', errorData);
        this.updateUIForUnauthenticated();

        // If on dashboard, redirect to login
        if (isOnDashboard) {
          console.log('⚠️ On dashboard but not authenticated - redirecting to login');
          setTimeout(() => {
            window.location.href = './login.html';
          }, 1000);
        }
      }
    } catch (error) {
      console.error('❌ Auth check error:', error);
      console.error('   Stack:', error.stack);
      this.updateUIForUnauthenticated();

      if (isOnDashboard) {
        setTimeout(() => {
          window.location.href = './login.html';
        }, 1000);
      }
    }
  },

  // Update UI for authenticated user
  updateUIForAuthenticated(userInfo) {
    if (!userInfo) return;

    console.log('👤 Updating UI with user info:', userInfo);

    // Update username displays with @ prefix
    const usernameEl = document.getElementById('tiktok-username');
    if (usernameEl) {
      const displayName = userInfo.displayName || userInfo.display_name || 'user';
      const formattedName = displayName.startsWith('@') ? displayName : '@' + displayName;
      console.log(`   Setting tiktok-username to: ${formattedName}`);
      usernameEl.textContent = formattedName;
    }

    // Update user ID if available
    const userIdEl = document.getElementById('user-id');
    if (userIdEl && (userInfo.openId || userInfo.open_id)) {
      userIdEl.textContent = `ID: ${userInfo.openId || userInfo.open_id}`;
    }

    // Update user name in header
    const userNameEl = document.getElementById('user-name');
    if (userNameEl) {
      const displayName = userInfo.displayName || userInfo.display_name || 'User';
      console.log(`   Setting user-name to: ${displayName}`);
      userNameEl.textContent = displayName;
    }

    // Update user avatar if available
    const avatarUrl = userInfo.avatarUrl || userInfo.avatar_url;
    const displayName = userInfo.displayName || userInfo.display_name || 'User';

    if (avatarUrl) {
      console.log(`   Setting avatar to: ${avatarUrl}`);

      // Update dashboard avatar
      const avatarImg = document.getElementById('user-avatar-img');
      const avatarFallback = document.getElementById('user-avatar-fallback');

      if (avatarImg && avatarFallback) {
        avatarImg.src = avatarUrl;
        avatarImg.alt = `${displayName}'s avatar`;

        // Show image and hide fallback when image loads
        avatarImg.onload = () => {
          console.log('   ✅ Dashboard avatar image loaded');
          avatarImg.style.display = 'block';
          avatarFallback.style.display = 'none';
        };

        // If image fails to load, keep showing fallback
        avatarImg.onerror = () => {
          console.log('   ⚠️ Dashboard avatar image failed to load, showing fallback');
          avatarImg.style.display = 'none';
          avatarFallback.style.display = 'block';
        };
      }

      // Update header avatar
      const headerAvatarImg = document.getElementById('header-avatar-img');
      const headerAvatarFallback = document.getElementById('header-avatar-fallback');

      if (headerAvatarImg && headerAvatarFallback) {
        headerAvatarImg.src = avatarUrl;
        headerAvatarImg.alt = `${displayName}'s avatar`;

        // Show image and hide fallback when image loads
        headerAvatarImg.onload = () => {
          console.log('   ✅ Header avatar image loaded');
          headerAvatarImg.style.display = 'block';
          headerAvatarFallback.style.display = 'none';
        };

        // If image fails to load, keep showing fallback
        headerAvatarImg.onerror = () => {
          console.log('   ⚠️ Header avatar image failed to load, showing fallback');
          headerAvatarImg.style.display = 'none';
          headerAvatarFallback.style.display = 'block';
        };
      }
    }

    // Show logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.style.display = 'block';
    }

    console.log('✅ UI updated with user info');

    // Reinitialize Dashboard if needed (for dashboard.html page)
    if (typeof Dashboard !== 'undefined' && Dashboard.reinitializeIfNeeded) {
      Dashboard.reinitializeIfNeeded();
    }
  },

  // Update UI for unauthenticated user
  updateUIForUnauthenticated() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.style.display = 'none';
    }
  },

  // Initiate TikTok login
  async initiateLogin() {
    try {
      const loginBtn = document.getElementById('tiktok-login-btn');
      if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = 'Connecting to TikTok...';
      }

      // Get authorization URL from backend
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/url`);
      const data = await response.json();

      if (data.data?.authUrl) {
        // Redirect to TikTok OAuth
        window.location.href = data.data.authUrl;
      } else {
        throw new Error('Failed to get authorization URL');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Failed to initiate login. Please try again.');
      const loginBtn = document.getElementById('tiktok-login-btn');
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login with TikTok';
      }
    }
  },

  // Handle OAuth callback from TikTok
  handleOAuthCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code && !localStorage.getItem('tiktok_access_token')) {
      // Exchange code for access token (production)
      this.exchangeCodeForToken(code);
    }
  },

  // Exchange authorization code for access token (production)
  async exchangeCodeForToken(code) {
    try {
      // This would call your backend endpoint that exchanges the code for a token
      // Your backend should call TikTok's token endpoint with CLIENT_SECRET
      const response = await fetch('/api/v1/auth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (data.access_token) {
        // Store token and user info
        localStorage.setItem('tiktok_access_token', data.access_token);
        localStorage.setItem('tiktok_user_info', JSON.stringify(data.user));
        localStorage.setItem('tiktok_token_expires_at', data.expires_at);

        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (error) {
      console.error('Error exchanging code for token:', error);
    }
  },

  // Logout user
  async logout() {
    if (confirm('Are you sure you want to logout?')) {
      try {
        await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
          method: 'POST',
          credentials: 'include',
        });
      } catch (error) {
        console.error('Logout error:', error);
      }

      // Clear local storage
      localStorage.removeItem('tiktok_access_token');
      localStorage.removeItem('tiktok_user_info');
      localStorage.removeItem('tiktok_token_expires_at');
      localStorage.removeItem('tiktok_publications');

      window.location.href = './login.html';
    }
  },

  // Disconnect TikTok account
  disconnect() {
    this.logout();
  },

  // Refresh access token if expired
  async refreshToken() {
    const expiresAt = localStorage.getItem('tiktok_token_expires_at');
    if (!expiresAt) return;

    const expiryTime = new Date(expiresAt).getTime();
    if (Date.now() > expiryTime - 5 * 60 * 1000) {
      try {
        // Call your backend to refresh the token
        const response = await fetch('/api/v1/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        const data = await response.json();
        if (data.access_token) {
          localStorage.setItem('tiktok_access_token', data.access_token);
          localStorage.setItem('tiktok_token_expires_at', data.expires_at);
        }
      } catch (error) {
        console.error('Error refreshing token:', error);
        this.logout();
      }
    }
  },
};

// Initialize auth when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => TikTokAuth.init());
} else {
  TikTokAuth.init();
}
