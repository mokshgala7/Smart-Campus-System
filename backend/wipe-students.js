require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Session = require('./models/Session');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('🔗 Connected to Database...');
  
  // 1. Delete ALL Students (but leave the Admin alone)
  const studentResult = await User.deleteMany({ role: 'Student' });
  console.log(`🗑️ Cleared ${studentResult.deletedCount} Student accounts.`);

  // 2. Delete ALL Gate History (so your dashboard resets to zero)
  const sessionResult = await Session.deleteMany({});
  console.log(`🗑️ Cleared ${sessionResult.deletedCount} Gate History records.`);

  console.log('\n✅ Wipe complete! Your system is clean and ready for real data.');
  process.exit(0);

}).catch(err => {
  console.error('❌ Database Error:', err);
  process.exit(1);
});