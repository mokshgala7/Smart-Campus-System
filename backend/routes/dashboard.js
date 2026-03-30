const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Session = require('../models/Session');

// GET: Fetch all data for the dashboards
router.get('/', async (req, res) => {
  try {
    // 1. Get all students (but hide their passwords for security)
    const students = await User.find({ role: 'Student' }).select('-password');
    
    // 2. Get all sessions and attach the student's name to each log
    const sessions = await Session.find()
      .populate('studentObjId', 'name studentId')
      .sort({ checkInTime: -1 }); // Sort by newest first

    res.json({ students, sessions });
  } catch (err) {
    console.error('Dashboard Error:', err);
    res.status(500).json({ error: 'Server error fetching dashboard data' });
  }
});

module.exports = router;