const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Session = require('../models/Session');
const nodemailer = require('nodemailer'); // <-- IMPORT NODEMAILER

// --- SETUP THE EMAIL DISPATCHER ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// --- THE SERVER'S BRAIN FOR HARDWARE MODE ---
let currentHardwareMode = 'GATE'; 
let latestEnrolledRFID = null;
let latestEnrolledFinger = null;
let liveStatusMessage = 'Waiting for hardware...'; 

router.get('/mode', (req, res) => res.json({ mode: currentHardwareMode }));

router.post('/set-mode', (req, res) => {
  const { mode } = req.body;
  if (mode === 'ENROLL' || mode === 'GATE') {
    currentHardwareMode = mode;
    latestEnrolledRFID = null;
    latestEnrolledFinger = null;
    liveStatusMessage = mode === 'ENROLL' ? 'Waiting for RFID card tap...' : 'Waiting for hardware...';
    res.json({ message: `Hardware switched to ${mode} mode.` });
  } else {
    res.status(400).json({ error: 'Invalid mode' });
  }
});

router.post('/enroll-update', (req, res) => {
  if (req.body.message) {
    liveStatusMessage = req.body.message;
    console.log(`Hardware Status: ${liveStatusMessage}`);
  }
  res.json({ success: true });
});

router.get('/enroll-status', (req, res) => {
  res.json({ rfid: latestEnrolledRFID, fingerprint: latestEnrolledFinger, message: liveStatusMessage });
});

// --- THE MAIN HARDWARE SCAN ROUTE ---
router.post('/scan', async (req, res) => {
  try {
    const { rfidTag, fingerId } = req.body; 

    if (currentHardwareMode === 'ENROLL') {
      latestEnrolledRFID = rfidTag;
      latestEnrolledFinger = fingerId;
      liveStatusMessage = 'Hardware scan complete! Saving to database...';
      return res.json({ message: 'Enrollment data received!' });
    } 
    
    // --- NORMAL GATE LOGIC ---
    const student = await User.findOne({ studentId: rfidTag, role: 'Student' });
    if (!student) return res.status(404).json({ error: 'Access Denied.' });

    const now = new Date();
    const todayString = now.toISOString().split('T')[0]; 
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (student.currentStatus === 'Outside') {
      // ==========================================
      // 🟢 CHECK IN LOGIC & EMAIL
      // ==========================================
      const newSession = new Session({ studentObjId: student._id, date: todayString, checkInTime: now });
      await newSession.save();
      student.currentStatus = 'Inside';
      await student.save();

      // Send Check-In Email (Fire and forget)
      transporter.sendMail({
        from: `"Smart Campus Security" <${process.env.EMAIL_USER}>`,
        to: student.email,
        subject: '🟢 Campus Check-In Alert',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 2px solid #4CAF50; border-radius: 10px; max-width: 500px;">
            <h2 style="color: #4CAF50; margin-top: 0;">Access Granted: Checked In</h2>
            <p>Hello <strong>${student.name}</strong>,</p>
            <p>Your campus ID was scanned successfully at the main gate.</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Date:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${todayString}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Check-In Time:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${timeString}</td></tr>
            </table>
            <p style="color: #777; font-size: 12px; margin-top: 20px;">This is an automated security alert from your Smart Campus System.</p>
          </div>
        `
      }).catch(err => console.error("Email error:", err));

      return res.json({ message: 'Checked In', status: 'Inside' });

    } else {
      // ==========================================
      // 🔴 CHECK OUT LOGIC, CALCULATION & EMAIL
      // ==========================================
      const activeSession = await Session.findOne({ studentObjId: student._id, checkOutTime: { $exists: false } }).sort({ checkInTime: -1 });
      
      let durationMinutes = 0;
      let checkInTimeString = "Unknown";
      let formattedDuration = "00:00:00"; // New HH:MM:SS format

      if (activeSession) {
        activeSession.checkOutTime = now;
        
        // Calculate exact seconds difference
        const diffInSeconds = Math.floor((now - activeSession.checkInTime) / 1000);
        
        // Math to convert total seconds into HH:MM:SS
        const h = Math.floor(diffInSeconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((diffInSeconds % 3600) / 60).toString().padStart(2, '0');
        const s = (diffInSeconds % 60).toString().padStart(2, '0');
        formattedDuration = `${h}:${m}:${s}`;

        durationMinutes = Math.round(diffInSeconds / 60);
        activeSession.durationMinutes = durationMinutes; // Keeping this for the DB history mapping
        
        checkInTimeString = new Date(activeSession.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        await activeSession.save();
      }

      student.currentStatus = 'Outside';
      await student.save();

      // Fetch the last 3 completed sessions for the history table
      const recentHistory = await Session.find({ studentObjId: student._id, checkOutTime: { $exists: true } })
                                         .sort({ checkInTime: -1 })
                                         .limit(3);

      let historyHtml = recentHistory.map(session => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; font-size: 14px;">${session.date}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; font-size: 14px;">${session.durationMinutes} mins</td>
        </tr>
      `).join('');

      // Send Check-Out Email with HH:MM:SS format
      transporter.sendMail({
        from: `"Smart Campus Security" <${process.env.EMAIL_USER}>`,
        to: student.email,
        subject: '🔴 Campus Check-Out & Summary',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 2px solid #F44336; border-radius: 10px; max-width: 500px;">
            <h2 style="color: #F44336; margin-top: 0;">Access Granted: Checked Out</h2>
            <p>Hello <strong>${student.name}</strong>,</p>
            <p>You have successfully checked out of the campus.</p>
            
            <h3 style="background-color: #eee; padding: 10px; margin-bottom: 0;">Today's Session</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 0;">
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Check-In:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${checkInTimeString}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Check-Out:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${timeString}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd; color: #1976D2;"><strong>Exact Time Spent:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd; color: #1976D2; font-weight: bold; font-size: 18px;">${formattedDuration}</td></tr>
            </table>

            <h3 style="background-color: #eee; padding: 10px; margin-bottom: 0; margin-top: 20px;">Recent History</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 0;">
              <tr><th style="padding: 8px; text-align: left; border-bottom: 2px solid #000;">Date</th><th style="padding: 8px; text-align: left; border-bottom: 2px solid #000;">Duration</th></tr>
              ${historyHtml || '<tr><td colspan="2" style="padding: 8px;">No previous history found.</td></tr>'}
            </table>
          </div>
        `
      }).catch(err => console.error("Email error:", err));

      return res.json({ message: 'Checked Out', status: 'Outside' });
    }
  } catch (err) {
    console.error('Hardware API Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;