// ============================================================
// ClinicOS – Doctor Controller (Realtime Firebase Version, Debug Ready)
// ============================================================

import { requireAuth, signOut } from "./auth.js";
import { clinicDB } from "./db.js";   // Only import clinicDB instance
import { UI } from "./ui.js";

document.addEventListener("DOMContentLoaded", async () => {
    try {
        console.log("[Doctor] Initializing Doctor Dashboard...");

        // Protect Route
        const user = requireAuth("doctor");
        if (!user) return;
        console.log("[Doctor] Logged in user:", user);

        // Initialize UI
        UI.initSidebar();
        UI.initNav();
        UI.initModals();
        console.log("[Doctor] UI Initialized");

        // Prescription Rows
        initMedicineRows();
        console.log("[Doctor] Prescription medicine rows initialized");

        // Prescription Form Submit
        const pForm = document.getElementById("prescription-form");
        if (pForm) pForm.addEventListener('submit', async (e) => await savePrescription(e, user));
        console.log("[Doctor] Prescription form submit handler attached");

        // Navigation events
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', async () => {
                const section = item.dataset.section;
                console.log(`[Doctor] Navigation clicked: ${section}`);
                if (section === 'dashboard') await loadDashboard(); 
                else if (section === 'today-queue') await loadQueue(); 
                else if (section === 'prescriptions') await loadPrescriptions(); 
            });
        });

        // Logout
        const logoutBtn = document.getElementById("logout-btn");
        if (logoutBtn) logoutBtn.addEventListener('click', async () => {
            console.log("[Doctor] Logging out...");
            await signOut();
            window.location.href = "index.html";
        });

        // Show shell after initialization
        setTimeout(() => {
            document.getElementById("app-shell").style.display = "flex";
            UI.hideLoader();
            console.log("[Doctor] App shell displayed, loader hidden");
        }, 500);

        // ----------------- Realtime Listeners -----------------
        clinicDB.subscribeTodayAppointments(async (appointments) => {
            console.log("[Doctor] Realtime appointments update:", appointments);
            renderQueue(appointments);
            renderDashboardStats(appointments);
        });

        clinicDB.subscribePrescriptions(async (prescriptions) => {
            console.log("[Doctor] Realtime prescriptions update:", prescriptions);
            renderPrescriptions(prescriptions, user);
        });

    } catch (err) {
        console.error("[Doctor] Initialization error:", err);
        UI.showToast("Initialization error: " + err.message, "error");
    }
});

// ------------------------ Prescription Row Management ------------------------
function initMedicineRows() {
    const addMedBtn = document.getElementById('add-medicine-row');
    const rowsContainer = document.getElementById('medicine-rows');

    if (!addMedBtn || !rowsContainer) return;
    let rowIdx = rowsContainer.children.length;

    addMedBtn.addEventListener('click', () => {
        const div = document.createElement('div');
        div.className = 'medicine-row';
        div.dataset.idx = rowIdx++;
        div.innerHTML = `
            <input type="text" class="med-name" placeholder="Medicine name" />
            <input type="text" class="med-dosage" placeholder="Dosage (e.g. 500mg)" />
            <input type="text" class="med-frequency" placeholder="Frequency (e.g. BD)" />
            <input type="text" class="med-duration" placeholder="Duration (e.g. 5 days)" />
            <button type="button" class="btn-remove-row" aria-label="Remove row">✕</button>
        `;
        rowsContainer.appendChild(div);
        div.querySelector('.btn-remove-row').addEventListener('click', () => div.remove());
        console.log("[Doctor] Medicine row added, index:", div.dataset.idx);
    });

    // First row remove handling
    const firstRemove = rowsContainer.querySelector('.btn-remove-row');
    if (firstRemove) {
        firstRemove.addEventListener('click', (e) => {
            if (rowsContainer.children.length > 1) e.target.parentElement.remove();
            else e.target.parentElement.querySelectorAll('input').forEach(i => i.value = '');
            console.log("[Doctor] Medicine row removed / cleared first row");
        });
    }
}

clinicDB.subscribePrescriptions(async (prescriptions) => {
    console.log("[Doctor] Realtime prescriptions update:", prescriptions);
    renderPrescriptions(prescriptions, user);
});

// ------------------------ Save Prescription ------------------------
async function savePrescription(e, user) {
    try {
        e.preventDefault();
        console.log("[Doctor] Saving prescription...");

        const pId = document.getElementById('presc-patient-id').value;
        const aId = document.getElementById('presc-appointment-id').value;
        const diag = document.getElementById('presc-diagnosis').value.trim();
        const notes = document.getElementById('presc-notes').value.trim();

        UI.clearErrors('prescription-form');
        if (!diag) return UI.setError('presc-diagnosis', 'Diagnosis is required.');

        const meds = [];
        document.querySelectorAll('.medicine-row').forEach(row => {
            const name = row.querySelector('.med-name').value.trim();
            const dosage = row.querySelector('.med-dosage').value.trim();
            const freq = row.querySelector('.med-frequency').value.trim();
            const dur = row.querySelector('.med-duration').value.trim();
            if (name) meds.push({ name, dosage: dosage || '-', frequency: freq || '-', duration: dur || '-' });
        });
        if (!meds.length) return UI.setError('presc-medicine', 'At least one medicine is required.');

        UI.setButtonLoading('save-prescription-btn', true, 'Save Prescription');

        const prescId = clinicDB.generateId();
        const presc = {
            id: prescId,
            patientId: pId,
            appointmentId: aId,
            date: clinicDB.getTodayDateStr(),
            timestamp: Date.now(),
            diagnosis: diag,
            medicines: meds,
            notes: notes || '-',
            doctorId: user.uid,
            doctorName: user.name
        };

        await clinicDB.set('prescriptions', presc);
        console.log("[Doctor] Prescription saved:", presc);

        const appt = await clinicDB.get('appointments', aId);
        if (appt) {
            appt.status = 'Consulted';
            await clinicDB.set('appointments', appt);
            console.log("[Doctor] Appointment status updated to 'Consulted'", appt);
        }

        UI.showToast('Prescription saved successfully!', 'success');
        UI.closeModal('prescription-modal');

    } catch (err) {
        console.error("[Doctor] Error saving prescription:", err);
        UI.showToast('Error saving prescription: ' + err.message, 'error');
    } finally {
        UI.setButtonLoading('save-prescription-btn', false, 'Save Prescription');
    }
}

// ------------------------ Render Functions for Realtime Data ------------------------
async function renderQueue(appointments) {
    const pending = appointments.filter(a => a.status === 'Waiting');
    const container = document.getElementById('patient-queue');
    const tbody = document.getElementById('doc-today-tbody');

    if (!pending.length) {
        container.innerHTML = `<div class="empty-state" style="grid-column:1/-1">Queue is empty.</div>`;
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No pending patients.</td></tr>`;
        console.log("[Doctor] Queue empty");
        return;
    }

    let html = '';
    let tableHtml = '';
    for (const appt of pending) {
        const pat = await clinicDB.get('patients', appt.patientId);
        if (!pat) continue;
        html += `
        <div class="queue-card">
            <div class="queue-card-header">
                <span class="queue-token-badge">TKN: ${appt.token}</span>
                <span class="text-xs text-muted">Apt: ${appt.date}</span>
            </div>
            <div class="queue-card-body">
                <h4>${pat.name}</h4>
                <div class="queue-card-meta">
                    <span>👤 ${pat.age ?? '-'} Yrs / ${pat.gender ?? '-'}</span>
                    <span>📞 ${pat.phone ?? '-'}</span>
                </div>
                <div class="queue-card-action">
                    <button class="btn btn-primary" style="width:100%" onclick="window.startConsultation('${appt.id}', '${pat.id}')">Start Consultation</button>
                </div>
            </div>
        </div>`;

        tableHtml += `
            <tr>
                <td>#${appt.token}</td>
                <td>${pat.name}</td>
                <td>${pat.age ?? '-'} / ${pat.gender?.charAt(0) ?? '-'}</td>
                <td>${pat.phone ?? '-'}</td>
                <td><span class="badge badge--warning">Waiting</span></td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="window.startConsultation('${appt.id}', '${pat.id}')">Consult</button>
                </td>
            </tr>`;
    }
    container.innerHTML = html;
    tbody.innerHTML = tableHtml;
    console.log("[Doctor] Queue rendered, pending patients:", pending.length);
}

async function renderDashboardStats(appointments) {
    const today = clinicDB.getTodayDateStr();
    const pendingCount = appointments.filter(a => a.status === 'Waiting').length;
    const lastToken = appointments.length ? Math.max(...appointments.map(a => a.token)) : '--';

    document.getElementById('doc-val-patients').textContent = appointments.length ?? 0;
    document.getElementById('doc-val-pending').textContent = pendingCount;
    document.getElementById('doc-val-token').textContent = lastToken;

    console.log(`[Doctor] Dashboard stats updated: Patients=${appointments.length}, Pending=${pendingCount}, LastToken=${lastToken}`);
}

async function renderPrescriptions(allPrescriptions, user) {
    const tbody = document.getElementById('prescriptions-tbody');
    if (!allPrescriptions.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No prescriptions found.</td></tr>`;
        document.getElementById('doc-val-prescriptions').textContent = 0;
        console.log("[Doctor] No prescriptions found");
        return;
    }

    let html = '';
    const today = clinicDB.getTodayDateStr();
    let todayCount = 0;

    for (const p of allPrescriptions) {
        const pat = await clinicDB.get('patients', p.patientId);
        if (!pat) continue;
        if (p.doctorId === user.uid && p.date === today) todayCount++;

        const medsPreview = p.medicines?.map(m => m.name).join(', ').slice(0, 30) ?? '-';
        html += `
            <tr>
                <td>${p.date}</td>
                <td><strong>${pat.name}</strong></td>
                <td>${p.diagnosis ?? '-'}</td>
                <td>${medsPreview}</td>
                <td><button class="btn btn-outline btn-sm" onclick="window.viewPrescription('${p.id}')">View</button></td>
            </tr>`;
    }

    tbody.innerHTML = html;
    document.getElementById('doc-val-prescriptions').textContent = todayCount;
    console.log("[Doctor] Prescriptions rendered, today count:", todayCount);
}

// ------------------------ Global Functions for Modals ------------------------
window.startConsultation = async (appointmentId, patientId) => {
    console.log("[Doctor] Starting consultation for appointment:", appointmentId, "patient:", patientId);
    document.getElementById('presc-appointment-id').value = appointmentId;
    document.getElementById('presc-patient-id').value = patientId;
    UI.openModal('prescription-modal');

    const pat = await clinicDB.get('patients', patientId);
    if (pat) {
        const infoDiv = document.getElementById('prescription-patient-info');
        infoDiv.innerHTML = `<strong>${pat.name}</strong> | Age: ${pat.age ?? '-'} | Gender: ${pat.gender ?? '-'} | Phone: ${pat.phone ?? '-'}`;
        console.log("[Doctor] Patient info populated for prescription modal", pat);
    }
};


window.viewPrescription = async (prescId) => {
    console.log("[Doctor] Viewing prescription:", prescId);
    const presc = await clinicDB.get('prescriptions', prescId);
    if (!presc) return;
    const pat = await clinicDB.get('patients', presc.patientId);
    const modalContent = document.getElementById('view-prescription-content');
    modalContent.innerHTML = `
        <h4>Prescription for ${pat?.name ?? 'Unknown'}</h4>
        <p><strong>Date:</strong> ${presc.date}</p>
        <p><strong>Diagnosis:</strong> ${presc.diagnosis}</p>
        <p><strong>Medicines:</strong></p>
        <ul>
            ${presc.medicines.map(m => `<li>${m.name} | ${m.dosage} | ${m.frequency} | ${m.duration}</li>`).join('')}
        </ul>
        <p><strong>Notes:</strong> ${presc.notes}</p>
        <p><strong>Doctor:</strong> ${presc.doctorName}</p>
    `;
    UI.openModal('view-prescription-modal');
    console.log("[Doctor] Prescription modal populated");
};