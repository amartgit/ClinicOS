// ============================================================
// ClinicOS – Receptionist Controller (Debug & Realtime Firebase)
// ============================================================

import { requireAuth, signOut } from "./auth.js";
import { clinicDB } from "./db.js"; // only import clinicDB instance
import { UI } from "./ui.js";

document.addEventListener("DOMContentLoaded", async () => {
    try {
        console.log("[Receptionist] Initializing Receptionist Dashboard...");

        const user = requireAuth("receptionist");
        if (!user) return;
        console.log("[Receptionist] Logged in user:", user);

        // Initialize UI
        UI.initSidebar();
        UI.initNav();
        UI.initModals();
        console.log("[Receptionist] UI Initialized");

        // Initial placeholders
        renderDashboardStats([]);
        renderTodayPatients([]);
        renderAllPatients([]);
        renderBilling([]);
        console.log("[Receptionist] Initial render placeholders loaded");

        // Navigation events
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', async () => {
                const section = item.dataset.section;
                console.log(`[Receptionist] Navigation clicked: ${section}`);
                if (section === 'dashboard' || section === 'appointments') await renderTodayPatients([]);
                if (section === 'patients') await renderAllPatients([]);
                if (section === 'billing') await renderBilling([]);
            });
        });

        // Patient registration
        const form = document.getElementById("register-patient-form");
        if (form) form.addEventListener("submit", registerPatient);

        // Logout
        const logoutBtn = document.getElementById("logout-btn");
        if (logoutBtn) logoutBtn.addEventListener('click', async () => {
            console.log("[Receptionist] Logging out...");
            await signOut();
            window.location.href = "index.html";
        });

        // Show shell after initialization
        setTimeout(() => {
            document.getElementById("app-shell").style.display = "flex";
            UI.hideLoader();
            console.log("[Receptionist] App shell displayed, loader hidden");
        }, 500);

        // ----------------- Realtime Listeners -----------------
        clinicDB.subscribeTodayAppointments(async (appointments) => {
            console.log("[Receptionist] Realtime appointments update:", appointments);
            renderDashboardStats(appointments);
            renderTodayPatients(appointments);
        });

        clinicDB.subscribePatients(async (patients) => {
            console.log("[Receptionist] Realtime patients update:", patients.length);
            renderAllPatients(patients);
        });

        clinicDB.subscribeBilling(async (bills) => {
            console.log("[Receptionist] Realtime billing update:", bills.length);
            renderBilling(bills);
        });

    } catch (err) {
        console.error("[Receptionist] Initialization error:", err);
        UI.showToast("Initialization error: " + err.message, "error");
    }
});

// ----------------- Patient Registration -----------------
async function registerPatient(e) {
    e.preventDefault();
    UI.clearErrors("register-patient-form");

    const pName = document.getElementById("p-name").value.trim();
    const pPhone = document.getElementById("p-phone").value.trim();
    const pAge = document.getElementById("p-age").value;
    const pGender = document.getElementById("p-gender").value;
    const pAddress = document.getElementById("p-address").value;
    const pCharges = document.getElementById("p-charges").value;
    const pStatus = document.getElementById("p-payment-status").value;

    console.log("[Receptionist] Registering patient:", { pName, pPhone, pAge, pGender });

    // Validation
    let isValid = true;
    if (!pName) { UI.setError('p-name', 'Required'); isValid = false; }
    if (!pPhone || !/^\d{10}$/.test(pPhone)) { UI.setError('p-phone', 'Invalid Phone'); isValid = false; }
    if (!pAge || pAge < 0 || pAge > 150) { UI.setError('p-age', 'Invalid Age'); isValid = false; }
    if (!pGender) { UI.setError('p-gender', 'Required'); isValid = false; }
    if (!pCharges || pCharges < 0) { UI.setError('p-charges', 'Invalid Charges'); isValid = false; }
    if (!isValid) return;

    UI.setButtonLoading('register-patient-btn', true, 'Register & Generate Token');

    try {
        const result = await clinicDB.registerPatient(
            { name: pName, phone: pPhone, age: pAge, gender: pGender, address: pAddress },
            { reason: "General Consultation" },
            { charges: pCharges, paymentStatus: pStatus }
        );

        if (!result || !result.patient || !result.appointment || !result.bill) {
            throw new Error("Registration failed, please try again");
        }

        console.log("[Receptionist] Patient registered successfully:", result.patient);
        console.log("[Receptionist] Generated token:", result.token);

        // Show token preview
        form.reset();
        const tokenPreview = document.getElementById('token-preview');
        tokenPreview.style.display = 'block';
        document.getElementById('token-display').textContent = result.token;
        document.getElementById('token-patient-info').innerHTML = `
            <strong>${result.patient.name}</strong> (${result.patient.age}/${result.patient.gender})<br>
            Phone: ${result.patient.phone}<br>
            Charges: ₹${result.bill.charges} [${result.bill.paymentStatus}]
        `;
        document.getElementById('token-date').textContent = new Date().toLocaleString();
        UI.showToast(`Token ${result.token} generated successfully!`, 'success');

    } catch (err) {
        console.error("[Receptionist] Error registering patient:", err);
        UI.showToast(err.message || 'Registration failed', 'error');
    } finally {
        UI.setButtonLoading('register-patient-btn', false, 'Register & Generate Token');
    }
}

// ----------------- Render Functions -----------------
async function renderDashboardStats(appointments = []) {
    const today = new Date().toISOString().split('T')[0];
    const pending = appointments.filter(a => a.status === 'Waiting');
    const lastToken = appointments.length ? Math.max(...appointments.map(a => a.token)) : 0;

    document.getElementById('val-patients-today').textContent = appointments.length;
    document.getElementById('val-pending').textContent = pending.length;
    document.getElementById('val-last-token').textContent = lastToken || '--';

    const allBills = await clinicDB.getAll('billing');
    const todayRevenue = allBills.filter(b => b.date === today)
        .reduce((sum, b) => sum + Number(b.charges || 0), 0);
    document.getElementById('val-revenue-today').textContent = `₹${todayRevenue}`;

    console.log("[Receptionist] Dashboard stats updated:", {
        totalAppointments: appointments.length,
        pending: pending.length,
        lastToken,
        todayRevenue
    });
}

async function renderTodayPatients(appointments = []) {
    const tbodyDash = document.getElementById('today-patients-tbody');
    if (!appointments.length) {
        tbodyDash.innerHTML = `<tr><td colspan="7" class="empty-state">No appointments today.</td></tr>`;
        console.log("[Receptionist] No appointments today");
        return;
    }

    let html = '';
    const allBills = await clinicDB.getAll('billing');

    for (const appt of appointments) {
        const patient = await clinicDB.get('patients', appt.patientId);
        if (!patient) continue;
        const bill = allBills.find(b => b.appointmentId === appt.id);
        const statusBadge = appt.status === 'Completed' ? 'badge--success'
            : appt.status === 'Consulted' ? 'badge--purple' : 'badge--blue';
        const payBadge = bill?.paymentStatus === 'Paid' ? 'badge--paid' : 'badge--unpaid';

        html += `
            <tr>
                <td><strong>#${appt.token}</strong></td>
                <td>${patient.name}</td>
                <td>${patient.age} / ${patient.gender.charAt(0)}</td>
                <td>${patient.phone}</td>
                <td><span class="badge ${statusBadge}">${appt.status}</span></td>
                <td>₹${bill?.charges || 0}</td>
                <td><span class="badge ${payBadge}">${bill?.paymentStatus || 'unknown'}</span></td>
            </tr>`;
    }

    tbodyDash.innerHTML = html;
    console.log("[Receptionist] Today's appointments rendered:", appointments.length);
}

async function renderAllPatients(patients = []) {
    const tbody = document.getElementById('all-patients-tbody');
    const searchBox = document.getElementById('all-patients-search');

    const render = (data) => {
        if (!data.length) {
            tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No patients found.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(p => `
            <tr>
                <td><strong>${p.name}</strong></td>
                <td>${p.age} / ${p.gender.charAt(0)}</td>
                <td>${p.phone}</td>
                <td><div style="max-width:180px;overflow:hidden;text-overflow:ellipsis;" title="${p.address}">${p.address || '-'}</div></td>
                <td>${p.totalVisits}</td>
                <td><button class="btn btn-outline btn-sm" onclick="window.UI.openModal('edit-patient-modal')">Edit</button></td>
            </tr>`).join('');
    };

    render(patients.sort((a, b) => b.createdAt - a.createdAt));
    console.log("[Receptionist] All patients rendered:", patients.length);

    if (searchBox) {
        searchBox.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            render(patients.filter(p => p.name.toLowerCase().includes(val) || p.phone.includes(val)));
            console.log("[Receptionist] Patient search filter applied:", val);
        });
    }
}

async function renderBilling(bills = []) {
    const tbody = document.getElementById('billing-tbody');
    const filterBox = document.getElementById('billing-filter');

    const render = async (data) => {
        if (!data.length) {
            tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No bills found.</td></tr>`;
            console.log("[Receptionist] No bills to display");
            return;
        }

        const allPatients = await clinicDB.getAll('patients');
        tbody.innerHTML = data.map(bill => {
            const patient = allPatients.find(p => p.id === bill.patientId);
            if (!patient) return '';
            const payBadge = bill.paymentStatus === 'Paid' ? 'badge--paid' : 'badge--unpaid';

            return `
                <tr>
                    <td>${bill.date}</td>
                    <td>#${bill.token}</td>
                    <td><strong>${patient.name}</strong></td>
                    <td>₹${bill.charges}</td>
                    <td><span class="badge ${payBadge}" id="status-badge-${bill.id}">${bill.paymentStatus}</span></td>
                    <td>
                        <div style="display:flex;gap:8px;">
                            <button class="btn btn-primary btn-sm" onclick="window.viewBill('${bill.id}')">View</button>
                            ${bill.paymentStatus === 'Unpaid' ? `<button class="btn btn-success btn-sm" onclick="window.markPaid('${bill.id}')">Pay</button>` : ''}
                        </div>
                    </td>
                </tr>`;
        }).join('');
        console.log("[Receptionist] Billing table rendered, bills count:", data.length);
    };

    await render(bills);

    if (filterBox) {
        filterBox.addEventListener('change', async (e) => {
            const val = e.target.value;
            const filtered = val === 'all' ? bills : bills.filter(b => b.paymentStatus === val);
            await render(filtered);
            console.log("[Receptionist] Billing filter applied:", val);
        });
    }
}

// ----------------- Expose globally -----------------
window.UI = UI;
window.viewBill = clinicDB.viewBill;
window.markPaid = clinicDB.markPaid;

console.log("[Receptionist] Debug-ready receptionist.js loaded successfully");