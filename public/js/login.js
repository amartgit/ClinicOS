// ============================================================
// ClinicOS – Login Script (Firebase Ready with Debug Logs)
// ============================================================

import { signIn, getCurrentUser } from "./auth.js";
import { UI } from "./ui.js";

document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM loaded: Login page initializing...");

    // Check if already logged in
    const user = getCurrentUser();
    console.log("Current user:", user);
    if (user) {
        console.log("User already logged in, redirecting to dashboard...");
        window.location.href = user.role === "doctor" ? "doctor.html" : "receptionist.html";
        return;
    }

    // Elements
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const demoHint = document.getElementById("demo-hint");
    const loginForm = document.getElementById("login-form");
    const toggleBtn = document.getElementById("toggle-password");
    const loginBtn = document.getElementById("login-btn");

    // Role Tabs
    const tabs = document.querySelectorAll(".role-tab");
    let activeRole = "doctor";

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            activeRole = tab.dataset.role;
            console.log("Selected role:", activeRole);

            if (activeRole === "doctor") {
                demoHint.innerHTML = "<strong>Demo:</strong> doctor@clinic.com / doctor123";
                emailInput.value = "doctor@clinic.com";
                passwordInput.value = "doctor123";
            } else {
                demoHint.innerHTML = "<strong>Demo:</strong> recp@clinic.com / recp123";
                emailInput.value = "recp@clinic.com";
                passwordInput.value = "recp123";
            }
        });
    });

    // Prefill initial demo
    emailInput.value = "doctor@clinic.com";
    passwordInput.value = "doctor123";

    // Toggle Password Visibility
    if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
            const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
            passwordInput.setAttribute("type", type);
            console.log("Password visibility toggled:", type);
        });
    }

    // Handle Login Submit
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            console.log("Login form submitted:", { email: emailInput.value, role: activeRole });

            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            // Validation
            UI.clearErrors("login-form");
            let isValid = true;
            if (!email) {
                UI.setError("email", "Email is required");
                isValid = false;
            }
            if (!password) {
                UI.setError("password", "Password is required");
                isValid = false;
            }
            if (!isValid) return;

            // Show loader
            console.log("Starting sign-in process...");
            UI.setButtonLoading("login-btn", true, "Signing In...");
            UI.showLoader("Signing in...");

            try {
                const user = await signIn(email, password, activeRole);
                console.log("Sign-in success:", user);

                // Minimal delay for UX
                setTimeout(() => {
                    console.log("Redirecting user to dashboard...");
                    window.location.href = user.role === "doctor" ? "doctor.html" : "receptionist.html";
                }, 300);

            } catch (error) {
                console.error("Sign-in error:", error);
                if (error.message.includes("not exist")) {
                    UI.setError("email", "Account not found");
                } else if (error.message.includes("Incorrect password")) {
                    UI.setError("password", "Incorrect password");
                } else if (error.message.includes("authorized")) {
                    UI.setError("email", "Account unauthorized for this role");
                } else {
                    UI.showToast(error.message, "error");
                }
            } finally {
                console.log("Sign-in process finished, hiding loader...");
                UI.setButtonLoading("login-btn", false, "Sign In");
                UI.hideLoader();
            }
        });
    }

    // Hide loader initially
    console.log("Initial loader hide");
    UI.hideLoader();
});