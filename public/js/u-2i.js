// ============================================================
// ClinicOS – UI Utility Module
// ============================================================

export const UI = {
    // Show/Hide Global Loader
    showLoader(message = "Loading...") {
        const loader = document.getElementById("global-loader");
        if (loader) {
            const p = loader.querySelector("p");
            if (p) p.textContent = message;
            loader.classList.remove("hidden");
        }
    },

    // hideLoader() {
    //     const loader = document.getElementById("global-loader");
    //     if (loader) {
    //         setTimeout(() => loader.classList.add("hidden"), 300);
    //     }
    // },
    hideLoader() {
    const loader = document.getElementById("global-loader");
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 300);
    }
},

    // Toast Notification System
    showToast(message, type = "info") {
        const container = document.getElementById("toast-container");
        if (!container) return;

        const toast = document.createElement("div");
        toast.className = `toast toast--${type}`;

        let icon = "ℹ️";
        if (type === "success") icon = "✅";
        if (type === "error") icon = "❌";
        if (type === "warning") icon = "⚠️";

        toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-text">${message}</span>
      <button class="toast-close" aria-label="Close" onclick="this.parentElement.remove()">&times;</button>
    `;

        container.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.classList.add("toast-exit");
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    },

    // Button Error/Loading state handling
    setButtonLoading(btnId, isLoading, originalText = "") {
        const btn = document.getElementById(btnId);
        if (!btn) return;

        const txtSpan = btn.querySelector(".btn-text");
        const spinner = btn.querySelector(".btn-spinner");

        if (isLoading) {
            btn.disabled = true;
            if (txtSpan) txtSpan.style.display = "none";
            if (spinner) spinner.style.display = "block";
        } else {
            btn.disabled = false;
            if (txtSpan) {
                txtSpan.style.display = "inline";
                if (originalText) txtSpan.textContent = originalText;
            }
            if (spinner) spinner.style.display = "none";
        }
    },

    // Set field error message
    setError(fieldId, errorMsg) {
        const errSpan = document.getElementById(`${fieldId}-error`);
        if (errSpan) errSpan.textContent = errorMsg;
    },

    clearErrors(formId) {
        const form = document.getElementById(formId);
        if (!form) return;
        const errorSpans = form.querySelectorAll(".field-error");
        errorSpans.forEach(span => span.textContent = "");
    },

    // Sidebar navigation setup
    initSidebar() {
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('sidebar-toggle');
        const mobileBtn = document.getElementById('mobile-menu-btn');

        // Desktop Collapse Toggle
        if (toggleBtn && sidebar) {
            toggleBtn.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
            });
        }

        // Mobile Overlay Toggle
        if (mobileBtn && sidebar) {
            mobileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                sidebar.classList.toggle('mobile-open');
                this.toggleOverlay();
            });
        }

        // Date
        const dateSpan = document.getElementById('topbar-date');
        if (dateSpan) {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            dateSpan.textContent = new Date().toLocaleDateString('en-US', options);
        }

        // Add Mobile Overlay
        if (!document.getElementById('sidebar-overlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'sidebar-overlay';
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);

            overlay.addEventListener('click', () => {
                if (sidebar) sidebar.classList.remove('mobile-open');
                overlay.classList.remove('open');
            });
        }

        // Set user info
        const userJson = sessionStorage.getItem("clinicos_user");
        if (userJson) {
            const user = JSON.parse(userJson);
            const nameEl = document.getElementById('sidebar-user-name');
            const avEl = document.getElementById('sidebar-avatar');
            if (nameEl) nameEl.textContent = user.name;
            if (avEl) avEl.textContent = user.name.charAt(0).toUpperCase();
        }
    },

    toggleOverlay() {
        const overlay = document.getElementById('sidebar-overlay');
        if (overlay) {
            overlay.classList.toggle('open');
        }
    },

    // Navigation Logic
    switchSection(sectionId, updateTitle = true) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(sec => {
            sec.classList.remove('active');
        });

        // Show target section
        const target = document.getElementById(`section-${sectionId}`);
        if (target) {
            target.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'auto' });
        }

        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.section === sectionId) {
                item.classList.add('active');
                if (updateTitle) {
                    const title = document.getElementById('topbar-title');
                    if (title) title.textContent = item.querySelector('span').textContent;
                }
            }
        });

        // Close mobile menu if open
        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('mobile-open')) {
            sidebar.classList.remove('mobile-open');
            this.toggleOverlay();
        }
    },

    initNav() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                if (section) this.switchSection(section);
            });
        });
    },

    // Modal setup
    initModals() {
        document.querySelectorAll('[data-modal]').forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                const modalId = trigger.getAttribute('data-modal');
                const modal = document.getElementById(modalId);
                if (modal) {
                    // If close button or cancel button
                    if (trigger.classList.contains('modal-close') || trigger.classList.contains('btn-secondary')) {
                        modal.classList.remove('open');
                    } else {
                        // If open button
                        modal.classList.add('open');
                    }
                }
            });
        });

        // Close on overlay click
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('open');
                }
            });
        });
    },

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('open');
    },

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('open');
    }
};
