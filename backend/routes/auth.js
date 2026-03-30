const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const nodemailer = require('nodemailer'); // <-- 1. IMPORT NODEMAILER

// --- SETUP THE EMAIL DISPATCHER ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// --- POST: SMART REGISTER ROUTE ---
router.post('/register', async (req, res) => {
  try {
    const { role, name, email, password, sap_id, studentId, fingerprintId } = req.body;

    // SCENARIO 1: Admin is Provisioning Hardware (Comes from Admin Dashboard)
    if (studentId && fingerprintId) {
      const existingUser = await User.findOne({ $or: [{ email }, { sap_id }] });
      if (existingUser) return res.status(400).json({ error: 'Student with this Email or SAP ID already exists.' });

      const newUser = new User({
        role: 'Student', name, email, sap_id, studentId, fingerprintId,
        isRegistered: false // Flag to show the student hasn't set a password yet
      });
      await newUser.save();

      // --- 2. SEND THE WELCOME EMAIL ---
      try {
        await transporter.sendMail({
          from: `"Smart Campus Security" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: '🔐 Your Campus ID is Ready!',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 2px solid #000; border-radius: 10px; max-width: 500px;">
              <h2 style="color: #4CAF50;">Hardware Provisioned Successfully</h2>
              <p>Hello <strong>${name}</strong>,</p>
              <p>The campus admin has successfully linked your physical ID card and fingerprint to the security grid.</p>
              <p>To activate your campus access, please go to the student portal and claim your account using your official SAP ID:</p>
              <h3 style="background-color: #FFC107; padding: 10px; text-align: center; border: 2px solid #000; border-radius: 5px;">
                SAP ID: ${sap_id}
              </h3>
              <p>Welcome to the Smart Campus!</p>
            </div>
          `
        });
        console.log(`✉️ Welcome email dispatched to ${email}`);
      } catch (mailErr) {
        console.error("Email failed to send, but user was created:", mailErr);
      }

      return res.status(201).json({ message: 'Hardware provisioned successfully!' });
    }

    // SCENARIO 2: Student is Claiming their Account (Comes from Login Screen)
    if (role === 'Student') {
      // Find the "shell" account the Admin created
      const user = await User.findOne({ sap_id, email });

      if (!user) {
        return res.status(404).json({ error: 'No hardware provisioned for this SAP ID and Email. Please see the Admin.' });
      }
      if (user.isRegistered) {
        return res.status(400).json({ error: 'This account has already been claimed. Please log in.' });
      }

      // Secure the account with the student's new password
      user.password = await bcrypt.hash(password, 10);
      user.isRegistered = true;
      if (name) user.name = name; // Update name just in case they typed it differently
      
      await user.save();
      return res.status(200).json({ message: 'Account claimed successfully! You can now log in.' });
    }

    // SCENARIO 3: A New Admin is Registering (Comes from Login Screen)
    if (role === 'Admin') {
      const existingAdmin = await User.findOne({ email });
      if (existingAdmin) return res.status(400).json({ error: 'An Admin with this email already exists.' });

      const hashedPassword = await bcrypt.hash(password, 10);
      const newAdmin = new User({ role: 'Admin', name, email, password: hashedPassword, isRegistered: true });
      await newAdmin.save();
      return res.status(201).json({ message: 'Admin account created successfully!' });
    }

    return res.status(400).json({ error: 'Invalid registration request.' });

  } catch (err) {
    console.error('Registration Error:', err);
    if (err.code === 11000) return res.status(400).json({ error: 'Duplicate data detected.' });
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// --- POST: SECURE LOGIN ROUTE ---
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'User not found. Please check your email.' });

    // Prevent students from logging in if they haven't claimed their account yet
    if (user.role === 'Student' && !user.isRegistered) {
      return res.status(403).json({ error: 'Please register your account first using your SAP ID.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Incorrect password.' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({ message: 'Login successful', token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

module.exports = router;