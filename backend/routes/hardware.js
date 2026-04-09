const express = require('express');
const router = express.Router();
const User = require('../models/User'); 
const Session = require('../models/Session');

// State variables for Admin UI
let currentMode = 'GATE';
let enrollState = { rfid: null, fingerprint: null, message: 'Waiting for hardware scan...' };

// 1. Hardware checks this to switch modes
router.get('/mode', (req, res) => {
  res.send(currentMode);
});

// 2. Admin UI sets this to ENROLL
router.post('/set-mode', (req, res) => {
  const newMode = req.body.mode;
  if (!['GATE', 'ENROLL'].includes(newMode)) {
    return res.status(400).json({ error: 'Invalid mode.' });
  }
  currentMode = newMode;
  if (currentMode === 'ENROLL') {
    enrollState = { rfid: null, fingerprint: null, message: 'System is in ENROLL Mode. Waiting for scan...' };
  }
  res.json({ success: true, mode: currentMode });
});

// 3. Hardware sends live updates here
router.post('/enroll-update', (req, res) => {
  if (req.body.message) enrollState.message = req.body.message;
  if (req.body.rfid) enrollState.rfid = req.body.rfid;
  // BUG 4 FIX: Normalize to String immediately so the entire pipeline is type-consistent.
  if (req.body.fingerId !== undefined && req.body.fingerId !== null) {
    enrollState.fingerprint = String(req.body.fingerId);
  }
  res.sendStatus(200);
});

// 4. Admin UI listens to this to complete the registration
router.get('/enroll-status', (req, res) => {
  res.json(enrollState);
});

// 5. 🚨 STRICT 2FA GATE LOGIC 🚨
router.post('/scan', async (req, res) => {
  try {
    const { rfidTag, fingerId } = req.body;

    // BUG 1 FIX: Query both fields on the SAME document AND cast fingerId to String
    // to guarantee a type-safe match against the String-typed schema field.
    const user = await User.findOne({ studentId: rfidTag, fingerprintId: String(fingerId), role: 'Student' });

    if (!user) {
      return res.status(403).json({ error: "ACCESS DENIED: Card and Fingerprint do not match!" });
    }

    // Process Check-In / Check-Out
    const today = new Date().toISOString().split('T')[0];
    const activeSession = await Session.findOne({ studentObjId: user._id, checkOutTime: null });

    if (activeSession) {
      activeSession.checkOutTime = new Date();
      await activeSession.save();
      user.currentStatus = 'Outside';
      await user.save();
      return res.status(200).json({ message: "Check-out successful" });
    } else {
      const newSession = new Session({ studentObjId: user._id, checkInTime: new Date(), date: today });
      await newSession.save();
      user.currentStatus = 'Inside';
      await user.save();
      return res.status(201).json({ message: "Check-in successful" });
    }
  } catch (error) {
    console.error("Scan Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;