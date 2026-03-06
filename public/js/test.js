import { clinicDB } from "./db.js";

async function testDB() {
    console.log("Testing DB connection...");
    try {
        const testToken = await clinicDB.generateToken();
        console.log("Generated Token:", testToken);

        const todayAppointments = await clinicDB.getTodayAppointments();
        console.log("Today's Appointments:", todayAppointments);

        const stats = await clinicDB.getStats();
        console.log("Today's Stats:", stats);
    } catch (err) {
        console.error("DB Test Error:", err);
    }
}

testDB();