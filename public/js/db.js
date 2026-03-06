// ============================================================
// ClinicOS – Firebase Database Service with Realtime Subscriptions + Debug
// ============================================================

import { db } from "./firebase-config.js";

import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    deleteDoc,
    onSnapshot,
    query,
    where,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export class Database {

    async set(storeName, item) {
        console.log(`[DB] Setting item in ${storeName}:`, item);
        const ref = doc(db, storeName, item.id);
        await setDoc(ref, item);
        return item;
    }

    async get(storeName, id) {
        console.log(`[DB] Getting item from ${storeName} with id: ${id}`);
        const ref = doc(db, storeName, id);
        const snap = await getDoc(ref);
        const data = snap.exists() ? snap.data() : null;
        console.log(`[DB] Retrieved:`, data);
        return data;
    }

    async getAll(storeName) {
        console.log(`[DB] Getting all items from ${storeName}`);
        const snapshot = await getDocs(collection(db, storeName));
        const data = [];
        snapshot.forEach(doc => data.push(doc.data()));
        console.log(`[DB] Retrieved ${data.length} items from ${storeName}`);
        return data;
    }

    async delete(storeName, id) {
        console.log(`[DB] Deleting item from ${storeName} with id: ${id}`);
        await deleteDoc(doc(db, storeName, id));
    }

    generateId() {
        const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
        console.log(`[DB] Generated ID:`, id);
        return id;
    }

    getTodayDateStr() {
        const d = new Date();
        const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        console.log(`[DB] Today's date string:`, todayStr);
        return todayStr;
    }

    async generateToken() {
        const dateStr = this.getTodayDateStr();
        console.log(`[DB] Generating token for date: ${dateStr}`);
        let tokenDoc = await this.get("tokens", dateStr);
        if (!tokenDoc) tokenDoc = { id: dateStr, count: 0 };
        tokenDoc.count += 1;
        await this.set("tokens", tokenDoc);
        console.log(`[DB] Generated token:`, tokenDoc.count);
        return tokenDoc.count;
    }

    async registerPatient(patientData, appointmentData, billData) {
        console.log("[DB] Registering patient:", patientData);

        const patientId = this.generateId();
        const patient = { id: patientId, ...patientData, createdAt: Date.now(), totalVisits: 1 };
        await this.set("patients", patient);

        const token = await this.generateToken();
        const appointmentId = this.generateId();
        const appointment = {
            id: appointmentId,
            patientId,
            date: this.getTodayDateStr(),
            token,
            status: "Waiting",
            timestamp: Date.now(),
            ...appointmentData
        };
        await this.set("appointments", appointment);

        const billId = this.generateId();
        const bill = {
            id: billId,
            patientId,
            appointmentId,
            date: this.getTodayDateStr(),
            token,
            timestamp: Date.now(),
            ...billData
        };
        await this.set("billing", bill);

        console.log("[DB] Patient registration complete:", { patient, appointment, bill, token });
        return { patient, appointment, bill, token };
    }

    async getTodayAppointments() {
        const today = this.getTodayDateStr();
        console.log(`[DB] Fetching today's appointments for ${today}`);
        const q = query(collection(db, "appointments"), where("date", "==", today), orderBy("token"));
        const snapshot = await getDocs(q);
        const appointments = [];
        snapshot.forEach(doc => appointments.push(doc.data()));
        console.log(`[DB] Retrieved ${appointments.length} appointments`);
        return appointments;
    }

    async getTodayBills() {
        const today = this.getTodayDateStr();
        console.log(`[DB] Fetching today's bills for ${today}`);
        const all = await this.getAll("billing");
        const todayBills = all.filter(b => b.date === today);
        console.log(`[DB] Retrieved ${todayBills.length} bills`);
        return todayBills;
    }

    async getStats() {
        const today = this.getTodayDateStr();
        console.log(`[DB] Calculating stats for ${today}`);
        const bills = await this.getAll("billing");
        const todayBills = bills.filter(b => b.date === today);

        let totalRevenue = 0, pendingBills = 0;
        todayBills.forEach(b => {
            if (b.paymentStatus === "Paid") totalRevenue += Number(b.charges);
            else pendingBills++;
        });

        const tokens = await this.get("tokens", today);

        const stats = {
            patientsToday: todayBills.length,
            revenueToday: totalRevenue,
            pendingToday: pendingBills,
            lastToken: tokens ? tokens.count : 0
        };
        console.log("[DB] Stats:", stats);
        return stats;
    }

    // ------------------ Realtime Subscriptions ------------------
    subscribeTodayAppointments(callback) {
        const today = this.getTodayDateStr();
        console.log("[DB] Subscribing to today's appointments for realtime updates");
        const q = query(collection(db, "appointments"), where("date", "==", today), orderBy("token", "asc"));
        return onSnapshot(q, snapshot => {
            const appointments = [];
            snapshot.forEach(doc => appointments.push(doc.data()));
            console.log(`[DB] Realtime appointments updated: ${appointments.length} items`);
            callback(appointments);
        });
    }

    subscribePatients(callback) {
        console.log("[DB] Subscribing to patients collection for realtime updates");
        const q = query(collection(db, "patients"), orderBy("createdAt", "desc"));
        return onSnapshot(q, snapshot => {
            const patients = [];
            snapshot.forEach(doc => patients.push(doc.data()));
            console.log(`[DB] Realtime patients updated: ${patients.length} items`);
            callback(patients);
        });
    }

    subscribeBilling(callback) {
        console.log("[DB] Subscribing to billing collection for realtime updates");
        const q = query(collection(db, "billing"), orderBy("timestamp", "desc"));
        return onSnapshot(q, snapshot => {
            const bills = [];
            snapshot.forEach(doc => bills.push(doc.data()));
            console.log(`[DB] Realtime bills updated: ${bills.length} items`);
            callback(bills);
        });
    }

    // ------------------ Realtime Subscriptions for Prescriptions ------------------
subscribePrescriptions(callback) {
    console.log("[DB] Subscribing to prescriptions collection for realtime updates");
    const q = query(collection(db, "prescriptions"), orderBy("timestamp", "desc"));
    return onSnapshot(q, snapshot => {
        const prescriptions = [];
        snapshot.forEach(doc => prescriptions.push(doc.data()));
        console.log(`[DB] Realtime prescriptions updated: ${prescriptions.length} items`);
        callback(prescriptions);
    });
}

    // For inline global functions
    async viewBill(billId) {
        console.log(`[DB] Viewing bill: ${billId}`);
        return await this.get("billing", billId);
    }

    async markPaid(billId) {
        console.log(`[DB] Marking bill as paid: ${billId}`);
        const bill = await this.get("billing", billId);
        if (bill) {
            bill.paymentStatus = "Paid";
            await this.set("billing", bill);
            console.log(`[DB] Bill updated:`, bill);
        }
        return bill;
    }
}

export const clinicDB = new Database();