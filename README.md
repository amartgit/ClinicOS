```markdown
# ClinicOS – Doctor & Receptionist Management System

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Firebase Setup](#firebase-setup)
- [Installation & Deployment](#installation--deployment)
- [Usage](#usage)
- [Logging & Monitoring](#logging--monitoring)
- [Firestore Security Rules](#firestore-security-rules)
- [Future Enhancements](#future-enhancements)
- [License](#license)
- [Live Demo](#live-demo)

---

## Overview

**ClinicOS** is a web-based clinic management system for **doctors and receptionists**, offering **real-time patient, appointment, and billing management** with **Firebase** and **Vanilla JavaScript**.

Key functionalities include:

- Real-time updates for appointments, billing, and prescriptions
- Role-based access (Doctor / Receptionist)
- Token generation for daily patient queues
- Dashboard statistics for quick insights

---

## Features

### Doctor Dashboard
- View daily patient stats and pending consultation queue
- Add prescriptions with medicines, dosage, frequency, and duration
- View patient history and past prescriptions

### Receptionist Dashboard
- Register patients with auto-generated tokens
- Manage appointments, billing, and payment status
- Search and filter patients
- Dashboard stats: daily revenue, pending bills, last token

### Authentication & Logging
- Firebase Authentication (Email/Password)
- Role-based access control
- Login/logout events logged in Firestore (`auth_logs`)

### Real-Time Updates
- Firestore snapshot listeners for:
  - Dashboard stats
  - Patient queue
  - Billing updates

---

## Tech Stack

| Layer        | Technology               |
| ------------ | ----------------------- |
| Frontend     | HTML, CSS, Vanilla JS    |
| Backend / DB | Firebase Firestore       |
| Auth         | Firebase Authentication  |
| Hosting      | Firebase Hosting         |

---

## Project Structure

```

/clinicOS
│
├── index.html             # Login page
├── doctor.html            # Doctor dashboard
├── receptionist.html      # Receptionist dashboard
├── css/
│   ├── main.css
│   ├── login.css
│   └── dashboard.css
├── js/
│   ├── firebase-config.js
│   ├── auth.js
│   ├── db.js
│   ├── ui.js
│   ├── login.js
│   ├── doctor.js
│   └── receptionist.js
└── README.md

````

---

## Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a project.
2. Enable **Firestore Database** (Production mode).
3. Enable **Firebase Authentication** (Email/Password).
4. Add a **Web App** and copy the config to `firebase-config.js`.

### Firestore Collections

- `users` → User profiles with `uid`, `email`, `role`, `name`
- `patients` → Patient records
- `appointments` → Appointments with token info
- `prescriptions` → Linked to patients and appointments
- `billing` → Charges and payment status
- `tokens` → Daily token counters
- `auth_logs` → Authentication events

---

## Installation & Deployment

### Local Development

```bash
# Clone repo
git clone https://github.com/amartgit/ClinicOS.git
cd ClinicOS

# Install Firebase CLI if not installed
npm install -g firebase-tools

# Serve locally
firebase serve
````

Open `http://localhost:5000` to test.

### Deploy to Firebase Hosting

```bash
# Login to Firebase
firebase login

# Initialize Firebase Hosting (if not already)
firebase init hosting

# Deploy
firebase deploy --only hosting
```

---

## Usage

### Login

* Doctor demo: `doctor@clinic.com / doctor123`
* Receptionist demo: `recp@clinic.com / recp123`

### Doctor

* View today’s patients and pending queue
* Start consultation → add prescription → save
* View patient history

### Receptionist

* Register patient → auto-generate token and bill
* Manage payments (mark as Paid/Unpaid)
* Search patients and view profiles

---

## Logging & Monitoring

All login attempts (success or failure) are logged in `auth_logs`:

* `uid` (if available)
* `action` (login-success, login-failed, logout)
* `message`
* `timestamp`

Admins can review logs via Firebase console.

---

## Firestore Security Rules

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function isReceptionist() {
      return isAuthenticated() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'receptionist';
    }

    match /patients/{docId} {
      allow read, write: if isReceptionist();
    }

    match /appointments/{docId} {
      allow read, write: if isReceptionist();
    }

    match /billing/{docId} {
      allow read, write: if isReceptionist();
    }

    match /users/{userId} {
      allow read: if isReceptionist() && userId == request.auth.uid;
    }
  }
}
```

---

## Future Enhancements

* Real-time notifications for new patients
* SMS/email reminders for appointments
* PDF export of prescriptions and bills
* Role-based UI improvements for doctors and receptionists
* Multi-clinic support

---

## Live Demo

Access ClinicOS online via Firebase Hosting:

**[View ClinicOS Live](https://your-firebase-project.web.app/)**

*(Replace the URL with your actual deployed Firebase Hosting URL)*

---

## License

Free to use, modify, and deploy for development and learning purposes.

---

## Author

**Amar Tarmale**
Internship Project – Full Stack Web Development
