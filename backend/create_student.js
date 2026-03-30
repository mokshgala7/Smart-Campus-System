const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const User = require('./models/User');

async function createTestStudent() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Check if Moksh already exists
    const exists = await User.findOne({ studentId: '1.moksh' });
    if (exists) {
      console.log('Student Moksh already exists!');
      process.exit();
    }

    const hashedPassword = await bcrypt.hash('student123', 10);

    const testStudent = new User({
      role: 'Student',
      name: 'Moksh',
      email: 'moksh@college.edu',
      password: hashedPassword,
      studentId: '1.moksh',
      fingerprintId: 1,
      phone: '+1234567890' // Dummy phone for WhatsApp later
    });

    await testStudent.save();
    console.log('✅ Success! Test Student Moksh enrolled in DB.');
    process.exit();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

createTestStudent();