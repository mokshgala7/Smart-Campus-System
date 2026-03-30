const cron = require('node-cron');
const nodemailer = require('nodemailer');
const Session = require('./models/Session');

// Setup the email sender
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ⏰ The Schedule: Run at exactly 4:00 PM (16:00) every day
cron.schedule('0 16 * * *', async () => {
  try {
    console.log('\n[AUTOMATION] ⏰ 4:00 PM Triggered! Generating Daily History Report...');
    
    // Get today's date formatted as YYYY-MM-DD
    const todayString = new Date().toISOString().split('T')[0];
    
    // Find all gate sessions from today and pull the student data
    const sessions = await Session.find({ date: todayString }).populate('studentObjId');
    
    if (sessions.length === 0) {
      console.log('[AUTOMATION] No campus activity today. Skipping email.');
      return;
    }

    // Build the rows for the email table
    let tableRows = sessions.map(s => {
      const checkIn = new Date(s.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const checkOut = s.checkOutTime ? new Date(s.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '⚠️ Still Inside';
      const name = s.studentObjId ? s.studentObjId.name : 'Unknown';
      
      return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>${name}</strong></td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; color: #4CAF50;">${checkIn}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; color: #F44336;">${checkOut}</td>
        </tr>
      `;
    }).join('');

    // Send the master digest to the Admin
    await transporter.sendMail({
      from: `"Smart Campus Automations" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Sends it to your Admin inbox
      subject: `📊 Daily Campus History Report: ${todayString}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 3px solid #000; border-radius: 8px; max-width: 600px;">
          <h2 style="margin-top: 0; border-bottom: 3px solid #FF9800; padding-bottom: 10px;">End of Day Gate Report</h2>
          <p>Here is the complete log of all student entries and exits for today.</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <tr style="background-color: #eee;">
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #000;">Student</th>
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #000;">Check-In</th>
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #000;">Check-Out</th>
            </tr>
            ${tableRows}
          </table>
          <p style="font-size: 12px; color: #777; margin-top: 20px;">Generated automatically by the Node.js Cron Scheduler.</p>
        </div>
      `
    });

    console.log('[AUTOMATION] ✅ 4:00 PM Daily Report sent successfully!');
  } catch (err) {
    console.error('[AUTOMATION] ❌ Error generating report:', err);
  }
});