// Dashboard: direct post to TikTok.
// Implements the "Required UX Implementation" of TikTok's Content Sharing Guidelines:
// https://developers.tiktok.com/doc/content-sharing-guidelines#required_ux_implementation_in_your_app

const PRIVACY_LABELS = {
  PUBLIC_TO_EVERYONE: 'Everyone',
  MUTUAL_FOLLOW_FRIENDS: 'Friends',
  FOLLOWER_OF_CREATOR: 'Followers',
  SELF_ONLY: 'Only me',
};

const TIKTOK_LEGAL_LINKS = {
  music: 'https://www.tiktok.com/legal/page/global/music-usage-confirmation/en',
  brandedContent: 'https://www.tiktok.com/legal/page/global/bc-policy/en',
};

const FAIL_REASONS = {
  file_format_check_failed: 'TikTok does not support the format of this video.',
  duration_check_failed: 'The duration of this video is not allowed for this TikTok account.',
  frame_rate_check_failed: 'The frame rate of this video is not supported by TikTok.',
  picture_size_check_failed: 'The resolution of this video is not supported by TikTok.',
  spam_risk_too_many_posts: 'The daily posting limit of this TikTok account was reached. Please try again later.',
  auth_removed: 'Access to your TikTok account was removed. Please connect your account again.',
  internal: 'TikTok had a temporary problem. Please try again in a few minutes.',
};

const VALID_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_POLL_FAILURES = 3;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const Dashboard = {
  creator: null,
  file: null,
  videoDuration: null,
  objectUrl: null,
  busy: false,
  initialized: false,
  el: {},

  // ---------------------------------------------------------------------------
  // Setup
  // ---------------------------------------------------------------------------

  init() {
    if (this.initialized) return;

    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    if (currentPage !== 'dashboard.html') return;

    this.cacheElements();
    this.bindEvents();
    this.renderDeclaration();
    this.updateTitleCount();
    this.loadPublicationHistory();
    this.loadCreatorInfo();
    this.initialized = true;
  },

  // Kept for compatibility with tiktok-auth.js
  reinitializeIfNeeded() {
    if (!this.initialized) this.init();
  },

  cacheElements() {
    const ids = [
      'creator-panel', 'creator-avatar-img', 'creator-avatar-fallback', 'creator-nickname',
      'creator-username', 'creator-error', 'creator-error-message', 'creator-retry',
      'publish-form', 'publish-fieldset', 'video-file', 'video-error', 'video-preview',
      'preview-video', 'title', 'title-count', 'privacy', 'allow-comment', 'allow-duet',
      'allow-stitch', 'row-comment', 'row-duet', 'row-stitch', 'interaction-hint',
      'commercial-toggle', 'commercial-options', 'brand-organic', 'brand-content',
      'row-brand-content', 'commercial-label-note', 'brand-private-note', 'commercial-error',
      'declaration', 'form-hint', 'publish-btn', 'status-modal',
      'status-icon', 'status-title', 'status-message', 'close-status', 'activity-list',
    ];

    ids.forEach((id) => {
      this.el[id] = document.getElementById(id);
    });
  },

  bindEvents() {
    const el = this.el;

    el['creator-retry'].addEventListener('click', () => this.loadCreatorInfo());
    el['video-file'].addEventListener('change', (e) => this.onVideoChange(e));
    el['title'].addEventListener('input', () => {
      this.updateTitleCount();
      this.updateFormState();
    });
    el['privacy'].addEventListener('change', () => this.onPrivacyChange());
    el['commercial-toggle'].addEventListener('change', () => this.onCommercialToggle());
    el['brand-organic'].addEventListener('change', () => this.onCommercialChange());
    el['brand-content'].addEventListener('change', () => this.onCommercialChange());
    el['publish-form'].addEventListener('submit', (e) => this.onSubmit(e));

    el['close-status'].addEventListener('click', () => {
      this.closeModal();
      this.loadPublicationHistory();
    });

    el['status-modal'].addEventListener('click', (e) => {
      // Do not close the dialog while the video is being sent or processed
      if (e.target === el['status-modal'] && !el['status-modal'].classList.contains('processing')) {
        this.closeModal();
      }
    });
  },

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  async readApiError(response) {
    let body = null;
    try {
      body = await response.json();
    } catch (_) {
      // not JSON
    }

    const error = body && body.error;
    const message =
      (error && error.details && error.details.message) ||
      (error && error.message) ||
      `Request failed (${response.status})`;

    return { status: response.status, code: error && error.code, message };
  },

  formatDuration(totalSeconds) {
    const seconds = Math.round(totalSeconds);
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return minutes > 0 ? `${minutes} min ${rest} s` : `${rest} s`;
  },

  setFieldError(name, message) {
    const element = this.el[`${name}-error`];
    element.textContent = message || '';
    element.hidden = !message;
  },

  // ---------------------------------------------------------------------------
  // Required UX 1: creator info
  // ---------------------------------------------------------------------------

  async loadCreatorInfo() {
    this.creator = null;
    this.el['publish-fieldset'].disabled = true;
    this.el['creator-error'].hidden = true;
    this.el['creator-nickname'].textContent = 'Loading TikTok account...';
    this.el['creator-username'].textContent = '';
    this.updateFormState();

    try {
      const response = await fetch('/api/v1/video/creator-info', {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });

      if (response.status === 401) {
        window.location.href = './login.html';
        return;
      }

      if (!response.ok) {
        const error = await this.readApiError(response);
        throw new Error(error.message);
      }

      const body = await response.json();
      this.creator = body.data.creator;

      this.renderCreator();
      this.populatePrivacyOptions();
      this.applyInteractionRestrictions();

      this.el['publish-fieldset'].disabled = false;
      this.updateFormState();
    } catch (error) {
      // The creator cannot post (or TikTok is unavailable): stop here and ask to try again later
      this.creator = null;
      this.el['creator-nickname'].textContent = 'TikTok account unavailable';
      this.el['creator-error-message'].textContent = error.message;
      this.el['creator-error'].hidden = false;
      this.updateFormState();
    }
  },

  renderCreator() {
    const { creator } = this;
    this.el['creator-nickname'].textContent = creator.nickname;
    this.el['creator-username'].textContent = creator.username ? `@${creator.username}` : '';

    const img = this.el['creator-avatar-img'];
    const fallback = this.el['creator-avatar-fallback'];

    if (creator.avatarUrl) {
      img.alt = `${creator.nickname}'s avatar`;
      img.onload = () => {
        img.style.display = 'block';
        fallback.style.display = 'none';
      };
      img.onerror = () => {
        img.style.display = 'none';
        fallback.style.display = 'block';
      };
      img.src = creator.avatarUrl;
    }
  },

  // ---------------------------------------------------------------------------
  // Required UX 2: privacy options (from TikTok, no default) and interactions
  // ---------------------------------------------------------------------------

  populatePrivacyOptions() {
    const select = this.el['privacy'];
    select.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select an option';
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);

    this.creator.privacyLevelOptions.forEach((value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = PRIVACY_LABELS[value] || value;
      select.appendChild(option);
    });

    select.value = '';
  },

  applyInteractionRestrictions() {
    const settings = [
      { key: 'comment', disabled: this.creator.commentDisabled },
      { key: 'duet', disabled: this.creator.duetDisabled },
      { key: 'stitch', disabled: this.creator.stitchDisabled },
    ];

    let anyDisabled = false;

    settings.forEach(({ key, disabled }) => {
      const checkbox = this.el[`allow-${key}`];
      const row = this.el[`row-${key}`];

      // Nothing is checked by default; options turned off in TikTok are disabled and greyed out
      checkbox.checked = false;
      checkbox.disabled = disabled;
      row.classList.toggle('is-disabled', disabled);
      row.title = disabled ? 'Turned off in your TikTok settings' : '';
      anyDisabled = anyDisabled || disabled;
    });

    this.el['interaction-hint'].hidden = !anyDisabled;
  },

  // ---------------------------------------------------------------------------
  // Video selection and preview (Required UX 5: preview of the content to be posted)
  // ---------------------------------------------------------------------------

  releasePreview() {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
    const video = this.el['preview-video'];
    video.onloadedmetadata = null;
    video.onerror = null;
    video.removeAttribute('src');
    video.load();
    this.el['video-preview'].hidden = true;
  },

  onVideoChange(event) {
    const input = event.target;
    const file = input.files[0] || null;

    this.releasePreview();
    this.file = null;
    this.videoDuration = null;
    this.setFieldError('video', '');

    if (!file) {
      this.updateFormState();
      return;
    }

    if (!VALID_VIDEO_TYPES.includes(file.type)) {
      this.setFieldError('video', 'Invalid file format. Please use MP4, MOV or WebM.');
      input.value = '';
      this.updateFormState();
      return;
    }

    if (file.size > MAX_VIDEO_SIZE) {
      this.setFieldError('video', 'This video is larger than 2GB.');
      input.value = '';
      this.updateFormState();
      return;
    }

    this.file = file;
    this.objectUrl = URL.createObjectURL(file);

    const video = this.el['preview-video'];
    video.onloadedmetadata = () => {
      this.videoDuration = video.duration;
      this.updateFormState();
    };
    video.onerror = () => {
      // Some browsers cannot decode every MOV/WebM. The file can still be sent to TikTok.
      this.setFieldError('video', 'A preview is not available for this file in your browser. You can still publish it.');
    };

    video.src = this.objectUrl;
    this.el['video-preview'].hidden = false;
    this.updateFormState();
  },

  isDurationExceeded() {
    return (
      !!this.creator &&
      Number.isFinite(this.videoDuration) &&
      this.creator.maxVideoPostDurationSec > 0 &&
      this.videoDuration > this.creator.maxVideoPostDurationSec
    );
  },

  updateTitleCount() {
    this.el['title-count'].textContent = String(this.el['title'].value.length);
  },

  // ---------------------------------------------------------------------------
  // Required UX 3 and 4: commercial content disclosure and declarations
  // ---------------------------------------------------------------------------

  onPrivacyChange() {
    this.syncBrandedContentWithPrivacy();
    this.onCommercialChange();
  },

  // Branded content cannot be private: it is disabled for "Only me" and cleared if it was selected
  syncBrandedContentWithPrivacy() {
    const isPrivate = this.el['privacy'].value === 'SELF_ONLY';
    const checkbox = this.el['brand-content'];
    const row = this.el['row-brand-content'];

    if (isPrivate) {
      checkbox.checked = false;
    }

    checkbox.disabled = isPrivate;
    row.classList.toggle('is-disabled', isPrivate);
  },

  onCommercialToggle() {
    const enabled = this.el['commercial-toggle'].checked;
    this.el['commercial-toggle'].setAttribute('aria-checked', String(enabled));
    this.el['commercial-options'].hidden = !enabled;

    if (!enabled) {
      this.el['brand-organic'].checked = false;
      this.el['brand-content'].checked = false;
    }

    this.syncBrandedContentWithPrivacy();
    this.onCommercialChange();
  },

  onCommercialChange() {
    const enabled = this.el['commercial-toggle'].checked;
    const organic = this.el['brand-organic'].checked;
    const branded = this.el['brand-content'].checked;
    const isPrivate = this.el['privacy'].value === 'SELF_ONLY';

    // Label that TikTok will show on the post
    const note = this.el['commercial-label-note'];
    if (enabled && branded) {
      note.textContent = "Your video will be labeled as 'Paid partnership'. This cannot be changed once your video is posted.";
      note.hidden = false;
    } else if (enabled && organic) {
      note.textContent = "Your video will be labeled as 'Promotional content'. This cannot be changed once your video is posted.";
      note.hidden = false;
    } else {
      note.hidden = true;
    }

    this.el['brand-private-note'].hidden = !(enabled && isPrivate);
    this.el['commercial-error'].hidden = !(enabled && !organic && !branded);

    this.renderDeclaration();
    this.updateFormState();
  },

  makeLink(text, href) {
    const link = document.createElement('a');
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = text;
    return link;
  },

  // Music Usage Confirmation always; Branded Content Policy too when "Branded content" is selected
  renderDeclaration() {
    const includeBranded = this.el['commercial-toggle'].checked && this.el['brand-content'].checked;
    const container = this.el['declaration'];

    container.textContent = '';
    container.append("By posting, you agree to TikTok's ");

    if (includeBranded) {
      container.append(
        this.makeLink('Branded Content Policy', TIKTOK_LEGAL_LINKS.brandedContent),
        ' and ',
        this.makeLink('Music Usage Confirmation', TIKTOK_LEGAL_LINKS.music),
        '.',
      );
    } else {
      container.append(this.makeLink('Music Usage Confirmation', TIKTOK_LEGAL_LINKS.music), '.');
    }
  },

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  getValidationIssue() {
    if (!this.creator) return 'Waiting for your TikTok account information.';
    if (!this.file) return 'Select a video to continue.';

    if (this.isDurationExceeded()) {
      return `This video is ${this.formatDuration(this.videoDuration)} long. This TikTok account can post videos of up to ${this.formatDuration(this.creator.maxVideoPostDurationSec)}.`;
    }

    if (!this.el['title'].value.trim()) return 'Add a title to continue.';
    if (!this.el['privacy'].value) return 'Select who can view this video to continue.';

    const enabled = this.el['commercial-toggle'].checked;
    if (enabled && !this.el['brand-organic'].checked && !this.el['brand-content'].checked) {
      return 'Select "Your brand", "Branded content" or both to continue.';
    }

    if (enabled && this.el['brand-content'].checked && this.el['privacy'].value === 'SELF_ONLY') {
      return 'Branded content visibility cannot be set to private.';
    }

    return null;
  },

  updateFormState() {
    if (!this.el['publish-btn']) return;

    const issue = this.getValidationIssue();
    this.el['publish-btn'].disabled = this.busy || !!issue;
    this.el['form-hint'].textContent = this.creator && issue ? issue : '';
  },

  // ---------------------------------------------------------------------------
  // Publishing
  // ---------------------------------------------------------------------------

  async onSubmit(event) {
    event.preventDefault();

    if (this.busy || this.getValidationIssue()) return;

    this.busy = true;
    this.updateFormState();

    this.openModal('⏳', 'Sending your video to TikTok...', 'Please keep this page open until the upload finishes.', true);

    const summary = {
      filename: this.file.name,
      title: this.el['title'].value.trim(),
      nickname: this.creator.nickname,
    };

    try {
      const publishId = await this.sendToTikTok();

      this.openModal('⏳', 'Processing on TikTok...', 'TikTok is processing your video. It may take a few minutes.', true);

      const result = await this.waitForPublish(publishId);

      if (result === 'published') {
        this.recordPublication({ ...summary, publishId, status: 'published' });
        this.openModal(
          '✅',
          'Your video was posted to TikTok',
          `Posted to ${summary.nickname}. After you finish publishing your content, it may take a few minutes for the content to process and be visible on your profile.`,
          false,
        );
      } else {
        this.recordPublication({ ...summary, publishId, status: 'processing' });
        this.openModal(
          '⏳',
          'Still processing on TikTok',
          'Your video was sent and TikTok is still processing it. It may take a few minutes for the content to be visible on your profile.',
          false,
        );
      }

      this.resetForm();
    } catch (error) {
      this.recordPublication({ ...summary, status: 'failed' });
      this.openModal('❌', 'Publication failed', error.message, false);
    } finally {
      this.busy = false;
      this.updateFormState();
    }
  },

  async sendToTikTok() {
    const el = this.el;
    const formData = new FormData();

    formData.append('video', this.file);
    formData.append('title', el['title'].value.trim());
    formData.append('privacyLevel', el['privacy'].value);
    formData.append('allowComment', String(el['allow-comment'].checked));
    formData.append('allowDuet', String(el['allow-duet'].checked));
    formData.append('allowStitch', String(el['allow-stitch'].checked));
    formData.append('commercialContent', String(el['commercial-toggle'].checked));
    formData.append('brandOrganic', String(el['brand-organic'].checked));
    formData.append('brandContent', String(el['brand-content'].checked));

    const response = await fetch('/api/v1/video/publish', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await this.readApiError(response);
      throw new Error(error.message);
    }

    const body = await response.json();
    return body.data.publishId;
  },

  // Polls TikTok until the post is complete, failed, or the wait time is over
  async waitForPublish(publishId) {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    let failures = 0;

    while (Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS);

      try {
        const response = await fetch(`/api/v1/video/status/${encodeURIComponent(publishId)}`, {
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          const error = await this.readApiError(response);
          throw new Error(error.message);
        }

        const { data } = await response.json();
        failures = 0;

        if (data.status === 'PUBLISH_COMPLETE') return 'published';

        if (data.status === 'FAILED') {
          throw Object.assign(new Error(this.describeFailReason(data.failReason)), { fatal: true });
        }
      } catch (error) {
        if (error.fatal) throw error;

        failures += 1;
        if (failures >= MAX_POLL_FAILURES) {
          throw new Error(`Could not check the status of your post: ${error.message}`);
        }
      }
    }

    return 'processing';
  },

  describeFailReason(reason) {
    return FAIL_REASONS[reason] || `TikTok could not publish the video${reason ? ` (${reason})` : ''}.`;
  },

  resetForm() {
    const el = this.el;

    el['video-file'].value = '';
    this.releasePreview();
    this.file = null;
    this.videoDuration = null;
    this.setFieldError('video', '');

    el['title'].value = '';
    this.updateTitleCount();

    if (this.creator) {
      this.populatePrivacyOptions();
      this.applyInteractionRestrictions();
    }

    el['commercial-toggle'].checked = false;
    this.onCommercialToggle();
  },

  // ---------------------------------------------------------------------------
  // Status dialog
  // ---------------------------------------------------------------------------

  openModal(icon, title, message, processing) {
    const modal = this.el['status-modal'];

    this.el['status-icon'].textContent = icon;
    this.el['status-title'].textContent = title;
    this.el['status-message'].textContent = message;
    this.el['close-status'].style.display = processing ? 'none' : 'block';

    modal.classList.toggle('processing', processing);
    modal.classList.add('active');
  },

  closeModal() {
    this.el['status-modal'].classList.remove('active', 'processing');
  },

  // ---------------------------------------------------------------------------
  // Publication history (stored in this browser only)
  // ---------------------------------------------------------------------------

  recordPublication({ publishId, filename, title, status }) {
    const publications = this.readHistory();

    publications.unshift({
      id: Date.now(),
      publishId: publishId || null,
      filename,
      title,
      status,
      timestamp: new Date().toISOString(),
    });

    publications.splice(50);
    localStorage.setItem('tiktok_publications', JSON.stringify(publications));
    this.loadPublicationHistory();
  },

  readHistory() {
    try {
      const stored = JSON.parse(localStorage.getItem('tiktok_publications') || '[]');
      return Array.isArray(stored) ? stored : [];
    } catch (_) {
      return [];
    }
  },

  loadPublicationHistory() {
    const list = this.el['activity-list'] || document.getElementById('activity-list');
    if (!list) return;

    const publications = this.readHistory();
    list.textContent = '';

    if (publications.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'activity-empty';
      const text = document.createElement('p');
      text.textContent = 'No publications yet. Publish your first video to get started!';
      empty.appendChild(text);
      list.appendChild(empty);
      return;
    }

    const labels = { published: 'Published', processing: 'Processing', failed: 'Failed', draft: 'Draft' };

    publications.forEach((pub) => {
      // Older entries stored "type" and "caption"
      const status = pub.status || (pub.type === 'draft' ? 'draft' : 'published');
      const title = pub.title || pub.caption || '(No title)';

      const item = document.createElement('div');
      item.className = 'activity-item';

      const info = document.createElement('div');
      info.className = 'activity-info';

      const name = document.createElement('h3');
      name.textContent = pub.filename || 'Video';

      const caption = document.createElement('p');
      caption.textContent = title;

      const time = document.createElement('p');
      time.className = 'activity-time';
      time.textContent = new Date(pub.timestamp).toLocaleString();

      info.append(name, caption, time);

      const badge = document.createElement('div');
      badge.className = `activity-status ${status}`;
      badge.textContent = labels[status] || status;

      item.append(info, badge);
      list.appendChild(item);
    });
  },
};

// Initialize dashboard when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Dashboard.init());
} else {
  Dashboard.init();
}
