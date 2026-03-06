// ============================================================
// ClinicOS – Firebase Authentication Logic with Logging
// ============================================================

import { auth, db } from "./firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * Logs authentication events (date-wise, user-wise)
 * @param {string|null} uid
 * @param {string} action
 * @param {string} message
 */
async function logAuthEvent(uid, action, message) {
    try {
        const dateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
        const logId = Date.now().toString(36) + Math.random().toString(36).substring(2);
        await setDoc(doc(db, "auth_logs", `${dateStr}_${logId}`), {
            uid: uid || null,
            action,
            message,
            timestamp: Date.now()
        });
    } catch (err) {
        console.error("Failed to log auth event:", err.message);
    }
}

// ------------------ Sign In ------------------
export async function signIn(email, password, selectedRole) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;

        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            await logAuthEvent(firebaseUser.uid, "login-failed", "User not found");
            throw new Error("user-not-found");
        }

        const userData = userSnap.data();
        if (userData.role !== selectedRole) {
            await logAuthEvent(firebaseUser.uid, "login-failed", "Role mismatch");
            throw new Error("role-mismatch");
        }

        const user = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role: userData.role,
            name: userData.name || selectedRole === "doctor" ? "Doctor" : "Receptionist"
        };

        localStorage.setItem("clinicos_user", JSON.stringify(user));
        await logAuthEvent(firebaseUser.uid, "login-success", `Logged in as ${user.role}`);

        return user;

    } catch (err) {
        // Log Firebase auth errors even if no uid available
        const logUid = err?.customUid || null;
        await logAuthEvent(logUid, "login-error", err.message || "Unknown error during login");
        throw err;
    }
}

// ------------------ Get Current Logged User ------------------
export function getCurrentUser() {
    try {
        const user = localStorage.getItem("clinicos_user");
        return user ? JSON.parse(user) : null;
    } catch (err) {
        console.error("Error reading current user:", err.message);
        return null;
    }
}

// ------------------ Logout ------------------
export async function signOut() {
    try {
        const user = getCurrentUser();
        if (user) await logAuthEvent(user.uid, "logout", "User logged out");
    } catch (err) {
        console.error("Error logging logout:", err.message);
    }
    localStorage.removeItem("clinicos_user");
}

// ------------------ Require Auth ------------------
export function requireAuth(expectedRole = null) {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = "index.html";
        return null;
    }
    if (expectedRole && user.role !== expectedRole) {
        window.location.href = "index.html";
        return null;
    }
    return user;
}