const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const XLSX = require('xlsx');
require('dotenv').config();

const app = express();

// CORS Configuration
const allowedOrigins = [
  'https://attendance-management-system-z5qd.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://attendance-v875.onrender.com'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || process.env.Mongo_URI;
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ============= SCHEMAS =============

// Your existing Attendance Schema (from index.js)
const attendanceCountSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true,
    default: Date.now
  },
  presentCount: {
    type: Number,
    required: true,
    default: 0
  },
  absentCount: {
    type: Number,
    required: true,
    default: 0
  },
  leaveCount: {
    type: Number,
    required: true,
    default: 0
  },
  odCount: {
    type: Number,
    required: true,
    default: 0
  },
  lateCount: {
    type: Number,
    required: true,
    default: 0
  },
  totalStudents: {
    type: Number,
    required: true
  },
  studentRecords: [{
    studentId: String,
    rollNo: String,
    name: String,
    status: String
  }],
  attendanceData: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

attendanceCountSchema.index({ 'studentRecords.name': 1 });
attendanceCountSchema.index({ 'studentRecords.rollNo': 1 });

// Admin Schema
const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'admin' }
});

// Student Schema for First Year (25CYSE)
const firstYearStudentSchema = new mongoose.Schema({
  sNo: { type: Number, required: true },
  rollNumber: { type: String, required: true, unique: true },
  registerNo: { type: String, required: true },
  studentName: { type: String, required: true },
  year: { type: Number, default: 1 },
  department: { type: String, default: 'CSE' },
  section: { type: String, default: 'E' },
  createdAt: { type: Date, default: Date.now }
});

// Student Schema for Second Year (24CYSE)
const secondYearStudentSchema = new mongoose.Schema({
  sNo: { type: Number, required: true },
  rollNo: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  regNo: { type: String },
  year: { type: Number, default: 2 },
  department: { type: String, default: 'CSE' },
  section: { type: String, default: 'C' },
  createdAt: { type: Date, default: Date.now }
});

const AttendanceCount = mongoose.model('AttendanceCount', attendanceCountSchema);
const Admin = mongoose.model('Admin', adminSchema);
const FirstYearStudent = mongoose.model('FirstYearStudent', firstYearStudentSchema);
const SecondYearStudent = mongoose.model('SecondYearStudent', secondYearStudentSchema);

// ============= MIDDLEWARE =============

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// File upload configuration
const upload = multer({ 
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.ms-excel', 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel and CSV files are allowed'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

// ============= AUTHENTICATION ROUTES =============

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin._id, username: admin.username, role: admin.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({ token, username: admin.username, role: admin.role });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= FIRST YEAR ENDPOINTS (25CYSE) =============

app.get('/api/students/first-year', authenticateToken, async (req, res) => {
  try {
    const students = await FirstYearStudent.find().sort({ sNo: 1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/students/first-year/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    const students = data.map((row, index) => ({
      sNo: row['S. No'] || row.SNo || index + 1,
      rollNumber: row['Roll Number'] || row.rollNumber || '',
      registerNo: row['Register No'] || row.registerNo || '',
      studentName: row['Student Name'] || row.studentName || row.Name || '',
      year: 1,
      department: 'CSE',
      section: 'E'
    }));

    await FirstYearStudent.deleteMany({});
    await FirstYearStudent.insertMany(students);
    
    res.json({ 
      message: 'First Year students uploaded successfully', 
      count: students.length 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= SECOND YEAR ENDPOINTS (24CYSE) =============

app.get('/api/students/second-year', authenticateToken, async (req, res) => {
  try {
    const students = await SecondYearStudent.find().sort({ sNo: 1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/students/second-year/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    const students = data.map((row, index) => ({
      sNo: row.SNo || row['S. No'] || index + 1,
      rollNo: row.RollNo || row['Roll Number'] || '',
      name: row.Name || row['Student Name'] || '',
      regNo: row.RegNo || row['Register No'] || '',
      year: 2,
      department: 'CSE',
      section: 'C'
    }));

    await SecondYearStudent.deleteMany({});
    await SecondYearStudent.insertMany(students);
    
    res.json({ 
      message: 'Second Year students uploaded successfully', 
      count: students.length 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= ATTENDANCE ROUTES (Your existing routes from index.js) =============

// Save daily attendance count
app.post('/api/', async (req, res) => {
  try {
    const {
      presentCount,
      absentCount,
      leaveCount,
      odCount,
      lateCount,
      totalStudents,
      attendanceData,
      studentRecords
    } = req.body;

    const attendanceCount = new AttendanceCount({
      presentCount,
      absentCount,
      leaveCount,
      odCount,
      lateCount,
      totalStudents,
      attendanceData,
      studentRecords
    });
    
    const savedRecord = await attendanceCount.save();
    res.status(201).json(savedRecord);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get attendance history
app.get('/api/', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = {};
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const records = await AttendanceCount.find(query)
      .sort({ date: -1 })
      .limit(30);
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get student attendance history
app.get('/api/student', async (req, res) => {
  try {
    const { name, rollNo } = req.query;
    let query = {};

    if (name) {
      query['studentRecords.name'] = { $regex: name, $options: 'i' };
    }
    if (rollNo) {
      query['studentRecords.rollNo'] = rollNo;
    }

    const records = await AttendanceCount.find(query).sort({ date: -1 });

    if (records.length === 0) {
      return res.status(404).json({ message: 'No records found for this student' });
    }

    const studentStats = {
      totalDays: records.length,
      presentDays: 0,
      absentDays: 0,
      leaveDays: 0,
      odDays: 0,
      lateDays: 0,
      dates: {
        present: [],
        absent: [],
        leave: [],
        od: [],
        late: []
      }
    };

    records.forEach(record => {
      const studentRecord = record.studentRecords.find(sr => 
        (name && sr.name.toLowerCase().includes(name.toLowerCase())) || 
        (rollNo && sr.rollNo === rollNo)
      );

      if (studentRecord) {
        const date = record.date.toLocaleDateString();
        switch (studentRecord.status) {
          case 'Present':
            studentStats.presentDays++;
            studentStats.dates.present.push(date);
            break;
          case 'Absent':
            studentStats.absentDays++;
            studentStats.dates.absent.push(date);
            break;
          case 'Leave':
            studentStats.leaveDays++;
            studentStats.dates.leave.push(date);
            break;
          case 'On Duty':
            studentStats.odDays++;
            studentStats.dates.od.push(date);
            break;
          case 'Late':
            studentStats.lateDays++;
            studentStats.dates.late.push(date);
            break;
        }
      }
    });

    res.json({
      studentInfo: records[0].studentRecords.find(sr => 
        (name && sr.name.toLowerCase().includes(name.toLowerCase())) || 
        (rollNo && sr.rollNo === rollNo)
      ),
      statistics: studentStats
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get attendance for specific date
app.get('/api/:date', async (req, res) => {
  try {
    const date = new Date(req.params.date);
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));
    
    const record = await AttendanceCount.findOne({
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });
    
    if (!record) {
      return res.status(404).json({ message: 'No record found for this date' });
    }
    
    res.json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get statistics
app.get('/api/stats/summary', async (req, res) => {
  try {
    const stats = await AttendanceCount.aggregate([
      {
        $group: {
          _id: null,
          avgPresent: { $avg: '$presentCount' },
          avgAbsent: { $avg: '$absentCount' },
          avgLeave: { $avg: '$leaveCount' },
          avgOD: { $avg: '$odCount' },
          totalDays: { $sum: 1 }
        }
      }
    ]);
    
    res.json(stats[0] || {});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete record
app.delete('/api/:id', async (req, res) => {
  try {
    const record = await AttendanceCount.findByIdAndDelete(req.params.id);
    
    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }
    
    res.json({ message: 'Record deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// ============= INITIALIZE =============

async function initializeDatabase() {
  try {
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await Admin.create({
        username: 'admin',
        password: hashedPassword
      });
      console.log('✅ Initial admin created: username=admin, password=admin123');
    }

    const firstYearCount = await FirstYearStudent.countDocuments();
    const secondYearCount = await SecondYearStudent.countDocuments();

    console.log(`📊 Database Status:`);
    console.log(`   First Year Students: ${firstYearCount}`);
    console.log(`   Second Year Students: ${secondYearCount}`);
    
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// ============= START SERVER =============
const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  await initializeDatabase();
  console.log('✨ Ready to accept requests!');
});