const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Session = require('../models/Session');

// GET: Fetch all data for the dashboards
router.get('/', async (req, res) => {
  try {
    // 1. Get all students (hide passwords)
    const students = await User.find({ role: 'Student' }).select('-password');

    // 2. Get all sessions
    const sessions = await Session.find()
      .populate('studentObjId', 'name studentId')
      .sort({ checkInTime: -1 });

    // 3. FORCE RE-CALCULATE DURATIONS (Fixes the "0 mins" bug)
    const processedSessions = sessions.map(session => {
      const sess = session.toObject();
      if (sess.checkInTime && sess.checkOutTime) {
        const diffMs = new Date(sess.checkOutTime) - new Date(sess.checkInTime);
        sess.durationMinutes = Math.round(diffMs / 60000);
      } else {
        sess.durationMinutes = 0; // Still active
      }
      return sess;
    });

    res.json({ students, sessions: processedSessions });
  } catch (err) {
    console.error('Dashboard Error:', err);
    res.status(500).json({ error: 'Server error fetching dashboard data' });
  }
});

module.exports = router;
