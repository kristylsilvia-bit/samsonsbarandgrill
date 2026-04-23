// ===================== FACEBOOK SPECIALS AUTO-UPDATER =====================
// Uses the Facebook Graph API to pull the latest post from Samson's page
// and display it as today's specials.
//
// SETUP: Enter your Page Access Token in the box below the specials.
// Get a token at: https://developers.facebook.com/tools/explorer/
// =========================================================================

const PAGE_ID      = 'Samsonsbarandfamilyrestaurant';  // Facebook page username
const API_VERSION  = 'v19.0';
const STORAGE_KEY  = 'samsons_fb_token';

// Keywords that suggest a post is about today's specials
const SPECIALS_KEYWORDS = ['special', 'soup', 'today', 'tonight', 'menu', 'bison', 'pulled', 'burger', 'nachos'];

// ---- DOM refs ----
const loadingEl    = document.getElementById('specials-loading');
const contentEl    = document.getElementById('specials-content');
const errorEl      = document.getElementById('specials-error');
const tokenInput   = document.getElementById('token-input');
const tokenStatus  = document.getElementById('token-status');

// ---- Fetch & render ----
async function fetchAndShowSpecials(token) {
  showState('loading');

  const url = `https://graph.facebook.com/${API_VERSION}/${PAGE_ID}/posts`
    + `?fields=message,created_time,full_picture,permalink_url`
    + `&limit=20&access_token=${encodeURIComponent(token)}`;

  try {
    const res  = await fetch(url);
    const data = await res.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    if (!data.data || data.data.length === 0) {
      throw new Error('No posts found on the page.');
    }

    // Try to find a specials post first, otherwise use the latest post
    const posts = data.data.filter(p => p.message);
    const specialsPost = posts.find(p =>
      SPECIALS_KEYWORDS.some(kw => p.message.toLowerCase().includes(kw))
    ) || posts[0];

    if (!specialsPost) {
      throw new Error('Could not find any posts with content.');
    }

    renderPost(specialsPost);
    showState('content');
    setStatus('✅ Specials loaded from Facebook!', 'success');

  } catch (err) {
    console.error('Facebook API error:', err);
    showState('error');
    document.getElementById('error-message').textContent = err.message;
    setStatus('❌ ' + err.message, 'error');
  }
}

function renderPost(post) {
  // Image
  const imgEl = document.getElementById('post-image');
  if (post.full_picture) {
    imgEl.src  = post.full_picture;
    imgEl.alt  = "Today's Specials";
    imgEl.style.display = 'block';
  } else {
    imgEl.style.display = 'none';
  }

  // Post time
  const timeEl = document.getElementById('post-time');
  if (post.created_time) {
    const d = new Date(post.created_time);
    timeEl.textContent = d.toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  }

  // Message
  const msgEl = document.getElementById('post-message');
  msgEl.textContent = post.message || '';

  // Link
  const linkEl = document.getElementById('fb-post-link');
  if (post.permalink_url) {
    linkEl.href = post.permalink_url;
    linkEl.style.display = 'inline-flex';
  } else {
    linkEl.style.display = 'none';
  }
}

function showState(state) {
  loadingEl.style.display = state === 'loading' ? 'block' : 'none';
  contentEl.style.display = state === 'content' ? 'block' : 'none';
  errorEl.style.display   = state === 'error'   ? 'block' : 'none';
}

function setStatus(msg, type) {
  if (!tokenStatus) return;
  tokenStatus.textContent = msg;
  tokenStatus.style.color = type === 'success' ? '#90EE90' : type === 'error' ? '#FFB3B3' : '#F5DEB3';
}

// ---- Token management ----
function saveToken(token) {
  try { localStorage.setItem(STORAGE_KEY, token); } catch(e) {}
}

function getSavedToken() {
  try { return localStorage.getItem(STORAGE_KEY); } catch(e) { return null; }
}

function removeToken() {
  try { localStorage.removeItem(STORAGE_KEY); } catch(e) {}
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  showState('loading');

  // Wire up token save button
  const saveBtn = document.getElementById('save-token-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const token = tokenInput.value.trim();
      if (!token) { setStatus('Please paste your access token first.', 'error'); return; }
      saveToken(token);
      fetchAndShowSpecials(token);
    });
  }

  // Wire up clear token button
  const clearBtn = document.getElementById('clear-token-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      removeToken();
      if (tokenInput) tokenInput.value = '';
      setStatus('Token cleared.', '');
      showState('error');
      document.getElementById('error-message').textContent =
        'No access token saved. Enter your token below to load specials.';
    });
  }

  // Auto-load if token is saved
  const saved = getSavedToken();
  if (saved) {
    if (tokenInput) tokenInput.value = saved;
    fetchAndShowSpecials(saved);
  } else {
    showState('error');
    document.getElementById('error-message').textContent =
      'Enter your Facebook Page Access Token below to automatically load today\'s specials.';
  }

  // Auto-refresh every 30 minutes if a token is saved
  setInterval(() => {
    const token = getSavedToken();
    if (token) fetchAndShowSpecials(token);
  }, 30 * 60 * 1000);
});
