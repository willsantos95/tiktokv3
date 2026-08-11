// Dashboard Content Management

const Dashboard = {
  // Video upload state
  uploadState: {
    draft: {
      file: null,
      caption: '',
      privacyLevel: 'SELF_ONLY',
      disableDuet: false,
      disableComment: false,
      disableStitch: false,
    },
    publish: {
      file: null,
      caption: '',
      hashtags: '',
      privacyLevel: 'SELF_ONLY',
      disableDuet: false,
      disableComment: false,
      disableStitch: false,
    },
  },

  // Flag to track if dashboard is initialized
  initialized: false,

  // Initialize dashboard
  init() {
    console.log('🎨 Initializing Dashboard...');

    // If already initialized, don't re-initialize
    if (this.initialized) {
      console.log('⚠️ Dashboard already initialized, skipping');
      return;
    }

    // Check if on dashboard page
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    if (currentPage !== 'dashboard.html') {
      console.log('ℹ️ Not on dashboard page, skipping initialization');
      return;
    }

    console.log('✅ Setting up dashboard event listeners');
    this.setupEventListeners();
    this.loadPublicationHistory();
    this.initialized = true;
    console.log('✅ Dashboard initialized');
  },

  // Reinitialize dashboard after authentication
  reinitializeIfNeeded() {
    if (TikTokAuth.isAuthenticated() && !this.initialized) {
      console.log('🔄 Reinitializing Dashboard after authentication');
      this.init();
    }
  },

  // Setup form event listeners
  setupEventListeners() {
    console.log('🔌 Setting up event listeners...');

    // Draft upload form
    const draftForm = document.getElementById('upload-draft-form');
    if (draftForm) {
      console.log('   ✅ Found draft form, attaching submit handler');
      draftForm.addEventListener('submit', (e) => this.handleDraftSubmit(e));

      document.getElementById('video-file-draft').addEventListener('change', (e) => {
        this.uploadState.draft.file = e.target.files[0];
        this.validateForm('draft');
      });

      document.getElementById('caption-draft').addEventListener('input', (e) => {
        this.uploadState.draft.caption = e.target.value;
      });

      const privacyDraft = document.getElementById('privacy-draft');
      if (privacyDraft) {
        privacyDraft.addEventListener('change', (e) => {
          this.uploadState.draft.privacyLevel = e.target.value;
        });
      }

      const disableDuetDraft = document.getElementById('disable-duet-draft');
      if (disableDuetDraft) {
        disableDuetDraft.addEventListener('change', (e) => {
          this.uploadState.draft.disableDuet = e.target.checked;
        });
      }

      const disableCommentDraft = document.getElementById('disable-comment-draft');
      if (disableCommentDraft) {
        disableCommentDraft.addEventListener('change', (e) => {
          this.uploadState.draft.disableComment = e.target.checked;
        });
      }

      const disableStitchDraft = document.getElementById('disable-stitch-draft');
      if (disableStitchDraft) {
        disableStitchDraft.addEventListener('change', (e) => {
          this.uploadState.draft.disableStitch = e.target.checked;
        });
      }
    }

    // Publish form
    const publishForm = document.getElementById('publish-form');
    if (publishForm) {
      console.log('   ✅ Found publish form, attaching submit handler');
      publishForm.addEventListener('submit', (e) => this.handlePublishSubmit(e));

      document.getElementById('video-file-publish').addEventListener('change', (e) => {
        this.uploadState.publish.file = e.target.files[0];
        this.previewVideo(e.target.files[0]);
        this.validateForm('publish');
      });

      document.getElementById('caption-publish').addEventListener('input', (e) => {
        this.uploadState.publish.caption = e.target.value;
      });

      const hashtagsPublish = document.getElementById('hashtags-publish');
      if (hashtagsPublish) {
        hashtagsPublish.addEventListener('input', (e) => {
          this.uploadState.publish.hashtags = e.target.value;
        });
      } else {
        console.warn('⚠️ hashtags-publish element not found');
      }

      const privacyPublish = document.getElementById('privacy-publish');
      if (privacyPublish) {
        privacyPublish.addEventListener('change', (e) => {
          this.uploadState.publish.privacyLevel = e.target.value;
        });
      }

      const disableDuetPublish = document.getElementById('disable-duet-publish');
      if (disableDuetPublish) {
        disableDuetPublish.addEventListener('change', (e) => {
          this.uploadState.publish.disableDuet = e.target.checked;
        });
      }

      const disableCommentPublish = document.getElementById('disable-comment-publish');
      if (disableCommentPublish) {
        disableCommentPublish.addEventListener('change', (e) => {
          this.uploadState.publish.disableComment = e.target.checked;
        });
      }

      const disableStitchPublish = document.getElementById('disable-stitch-publish');
      if (disableStitchPublish) {
        disableStitchPublish.addEventListener('change', (e) => {
          this.uploadState.publish.disableStitch = e.target.checked;
        });
      }
    }

    // Modal controls
    const previewModal = document.getElementById('preview-modal');
    const statusModal = document.getElementById('status-modal');

    if (previewModal) {
      document.querySelector('.modal-close')?.addEventListener('click', () => {
        this.closeModal('preview-modal');
      });

      document.getElementById('cancel-publish')?.addEventListener('click', () => {
        this.closeModal('preview-modal');
      });

      document.getElementById('confirm-publish')?.addEventListener('click', () => {
        this.executePublish();
      });

      previewModal.addEventListener('click', (e) => {
        if (e.target === previewModal) {
          this.closeModal('preview-modal');
        }
      });
    }

    if (statusModal) {
      document.getElementById('close-status')?.addEventListener('click', () => {
        this.closeModal('status-modal');
        this.loadPublicationHistory();
      });

      statusModal.addEventListener('click', (e) => {
        if (e.target === statusModal) {
          // Don't close status modal while processing
          if (!statusModal.classList.contains('processing')) {
            this.closeModal('status-modal');
          }
        }
      });
    }
  },

  // Validate form inputs
  validateForm(type) {
    const form = type === 'draft' ? document.getElementById('upload-draft-form') : document.getElementById('publish-form');
    const file = this.uploadState[type].file;
    const btn = form?.querySelector('button[type="submit"]');

    if (file) {
      btn.disabled = false;
    } else {
      btn.disabled = true;
    }
  },

  // Handle draft upload submission
  async handleDraftSubmit(e) {
    e.preventDefault();
    console.log('📝 Draft form submitted');
    console.log('   Event:', e);
    console.log('   preventDefault called');

    const { file, caption, privacyLevel, disableDuet, disableComment, disableStitch } = this.uploadState.draft;

    console.log('   File:', file ? file.name : 'NO FILE');
    console.log('   Caption:', caption);

    if (!file) {
      console.warn('⚠️ No file selected');
      this.showStatus('draft', 'error', 'Please select a video file');
      return;
    }

    // Validate file
    if (!this.validateVideoFile(file)) {
      console.warn('⚠️ Invalid file format');
      this.showStatus('draft', 'error', 'Invalid file format. Please use MP4, MOV, or WebM.');
      return;
    }

    // Show loading status
    this.showStatus('draft', 'loading', 'Uploading to TikTok as draft...');

    try {
      await this.simulateDraftUpload(file, caption, privacyLevel, disableDuet, disableComment, disableStitch);

      this.showStatus('draft', 'success', '✓ Video uploaded as draft! Check your TikTok app to review and publish.');

      document.getElementById('upload-draft-form').reset();
      this.uploadState.draft = {
        file: null,
        caption: '',
        privacyLevel: 'SELF_ONLY',
        disableDuet: false,
        disableComment: false,
        disableStitch: false,
      };

      this.recordPublication('draft', file.name, caption);

      setTimeout(() => {
        this.clearStatus('draft');
      }, 4000);
    } catch (error) {
      console.error('❌ Draft upload error:', error);
      this.showStatus('draft', 'error', 'Upload failed: ' + error.message);
    }
  },

  // Handle publish submission
  async handlePublishSubmit(e) {
    e.preventDefault();

    const { file, caption, hashtags } = this.uploadState.publish;
    if (!file) return;

    // Validate file
    if (!this.validateVideoFile(file)) {
      this.showStatus('publish', 'error', 'Invalid file format. Please use MP4, MOV, or WebM.');
      return;
    }

    // Show preview modal
    this.showPreviewModal(file, caption, hashtags);
  },

  // Validate video file
  validateVideoFile(file) {
    const validTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'];
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB

    if (!validTypes.includes(file.type)) {
      return false;
    }

    if (file.size > maxSize) {
      return false;
    }

    return true;
  },

  // Preview video file
  previewVideo(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const videoEl = document.getElementById('preview-video');
      if (videoEl) {
        videoEl.src = e.target.result;
      }
    };
    reader.readAsDataURL(file);
  },

  // Show preview modal
  showPreviewModal(file, caption, hashtags) {
    // Update preview content
    document.getElementById('preview-caption').textContent = caption || '(No caption)';
    document.getElementById('preview-hashtags').textContent = hashtags || '(No hashtags)';

    // Preview video
    const reader = new FileReader();
    reader.onload = (e) => {
      const videoEl = document.getElementById('preview-video');
      videoEl.src = e.target.result;
    };
    reader.readAsDataURL(file);

    // Show modal
    this.showModal('preview-modal');
  },

  // Execute publish (after confirmation)
  async executePublish() {
    this.closeModal('preview-modal');

    const { file, caption, hashtags, privacyLevel, disableDuet, disableComment, disableStitch } = this.uploadState.publish;

    // Show status modal
    this.showModal('status-modal');
    document.getElementById('status-modal').classList.add('processing');
    document.getElementById('close-status').style.display = 'none';

    try {
      // Publish to TikTok
      await this.simulatePublish(file, caption, hashtags, privacyLevel, disableDuet, disableComment, disableStitch);

      document.getElementById('status-icon').textContent = '✅';
      document.getElementById('status-title').textContent = 'Video Published Successfully!';
      document.getElementById('status-message').textContent = 'Your video is now live on your TikTok profile.';

      document.getElementById('publish-form').reset();
      this.uploadState.publish = {
        file: null,
        caption: '',
        hashtags: '',
        privacyLevel: 'SELF_ONLY',
        disableDuet: false,
        disableComment: false,
        disableStitch: false,
      };

      // Add to history
      this.recordPublication('published', file.name, caption);

      // Show close button
      document.getElementById('status-modal').classList.remove('processing');
      document.getElementById('close-status').style.display = 'block';
    } catch (error) {
      // Show error
      document.getElementById('status-icon').textContent = '❌';
      document.getElementById('status-title').textContent = 'Publication Failed';
      document.getElementById('status-message').textContent = error.message;

      document.getElementById('status-modal').classList.remove('processing');
      document.getElementById('close-status').style.display = 'block';
    }
  },

  // Upload draft to TikTok
  async simulateDraftUpload(file, caption, privacyLevel, disableDuet, disableComment, disableStitch) {
    console.log('📤 Starting draft upload...');
    console.log('   File:', file.name, file.size, 'bytes');
    console.log('   File type:', file.type);
    console.log('   Caption:', caption);
    console.log('   Privacy:', privacyLevel);

    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', caption || 'Video');
    formData.append('privacyLevel', privacyLevel || 'SELF_ONLY');
    formData.append('disableDuet', disableDuet ? 'true' : 'false');
    formData.append('disableComment', disableComment ? 'true' : 'false');
    formData.append('disableStitch', disableStitch ? 'true' : 'false');

    try {
      console.log('🌐 Sending request to /api/v1/video/upload-draft');
      const response = await fetch('/api/v1/video/upload-draft', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', response.headers);

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let error;
        if (contentType?.includes('application/json')) {
          error = await response.json();
        } else {
          error = { error: { message: await response.text() } };
        }
        console.error('❌ Upload error response:', error);
        throw new Error(error.error?.message || error.error?.details || `Upload failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Upload successful:', result);
      return result;
    } catch (error) {
      console.error('❌ Upload failed:', error);
      throw error;
    }
  },

  // Publish video to TikTok
  async simulatePublish(file, caption, hashtags, privacyLevel, disableDuet, disableComment, disableStitch) {
    console.log('🚀 Starting publish...');
    console.log('   File:', file.name, file.size, 'bytes');
    console.log('   Caption:', caption);
    console.log('   Hashtags:', hashtags);

    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', caption || 'Video');
    formData.append('hashtags', hashtags || '');
    formData.append('privacyLevel', privacyLevel || 'SELF_ONLY');
    formData.append('disableDuet', disableDuet ? 'true' : 'false');
    formData.append('disableComment', disableComment ? 'true' : 'false');
    formData.append('disableStitch', disableStitch ? 'true' : 'false');

    try {
      console.log('🌐 Sending request to /api/v1/video/publish');
      const response = await fetch('/api/v1/video/publish', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let error;
        if (contentType?.includes('application/json')) {
          error = await response.json();
        } else {
          error = { error: { message: await response.text() } };
        }
        console.error('❌ Publish error response:', error);
        throw new Error(error.error?.message || error.error?.details || `Publishing failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Publish successful:', result);
      return result;
    } catch (error) {
      console.error('❌ Publish failed:', error);
      throw error;
    }
  },

  // Show status message
  showStatus(type, status, message) {
    const statusEl = document.getElementById(`${type}-status`);
    if (!statusEl) return;

    statusEl.textContent = message;
    statusEl.className = `status-message ${status}`;
  },

  // Clear status message
  clearStatus(type) {
    const statusEl = document.getElementById(`${type}-status`);
    if (statusEl) {
      statusEl.className = 'status-message';
      statusEl.textContent = '';
    }
  },

  // Show modal
  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
    }
  },

  // Close modal
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
    }
  },

  // Record publication in history
  recordPublication(type, filename, caption) {
    const publications = JSON.parse(localStorage.getItem('tiktok_publications') || '[]');

    publications.unshift({
      id: Date.now(),
      type: type, // 'draft' or 'published'
      filename: filename,
      caption: caption,
      timestamp: new Date().toISOString(),
    });

    // Keep only last 50 publications
    publications.splice(50);

    localStorage.setItem('tiktok_publications', JSON.stringify(publications));
  },

  // Load and display publication history
  loadPublicationHistory() {
    const publications = JSON.parse(localStorage.getItem('tiktok_publications') || '[]');
    const activityList = document.getElementById('activity-list');

    if (!activityList) return;

    if (publications.length === 0) {
      activityList.innerHTML = `
        <div class="activity-empty">
          <p>No publications yet. Upload your first video to get started!</p>
        </div>
      `;
      return;
    }

    activityList.innerHTML = publications.map((pub) => {
      const date = new Date(pub.timestamp);
      const timeStr = date.toLocaleString();
      const typeLabel = pub.type === 'draft' ? 'Draft' : 'Published';
      const typeClass = pub.type === 'draft' ? 'draft' : 'published';

      return `
        <div class="activity-item">
          <div class="activity-info">
            <h3>${pub.filename}</h3>
            <p>${pub.caption || '(No caption)'}</p>
            <p style="color: #9ca3af; font-size: 0.8rem;">${timeStr}</p>
          </div>
          <div class="activity-status ${typeClass}">${typeLabel}</div>
        </div>
      `;
    }).join('');
  },
};

// Global error handler
window.addEventListener('error', (e) => {
  console.error('🔴 Global JavaScript Error:', e.error);
  console.error('   Message:', e.message);
  console.error('   File:', e.filename);
  console.error('   Line:', e.lineno);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('🔴 Unhandled Promise Rejection:', e.reason);
});

// Initialize dashboard when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    try {
      Dashboard.init();
    } catch (error) {
      console.error('🔴 Error during Dashboard.init():', error);
    }
  });
} else {
  try {
    Dashboard.init();
  } catch (error) {
    console.error('🔴 Error during Dashboard.init():', error);
  }
}
