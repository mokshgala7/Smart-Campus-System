require('dotenv').config(); // Load your .env variables
const mongoose = require('mongoose');
const User = require('./models/User');
const Session = require('./models/Session');

// Connect to the database using the URI in your .env file
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('🔗 Connected to Database...');
    
    // 1. Delete all users who have the role of "Student" (Keeps your Admins safe!)
    const studentResult = await User.deleteMany({ role: 'Student' });
    console.log(`🗑️ Deleted ${studentResult.deletedCount} Students.`);

    // 2. Delete all attendance sessions (To clear the "Live Gate Activity" board)
    const sessionResult = await Session.deleteMany({});
    console.log(`🗑️ Deleted ${sessionResult.deletedCount} Attendance Logs.`);

    console.log('✅ System successfully reset! You have a clean slate.');
    process.exit(0); // Tell Node.js to close the script
  })
  .catch(err => {
    console.error('❌ Database error:', err);
    process.exit(1);
  });