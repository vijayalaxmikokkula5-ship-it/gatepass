const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'database.json');

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Helper function to read database
function readDatabase() {
  const data = fs.readFileSync(DB_PATH, 'utf8');
  return JSON.parse(data);
}

// Helper function to write database
function writeDatabase(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Generate unique ID
function generateId() {
  return 'PASS-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// API 1: Student creates a gate pass request
app.post('/api/passes/create', (req, res) => {
  try {
    const { studentId, studentName, rollNumber, reason } = req.body;
    
    if (!studentId || !studentName || !rollNumber || !reason) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const db = readDatabase();
    const newPass = {
      id: generateId(),
      studentId,
      studentName,
      rollNumber,
      reason,
      status: 'pending',
      requestDate: new Date().toISOString(),
      moderatorRemarks: null,
      approvedDate: null,
      usedDate: null
    };

    db.passes.push(newPass);
    writeDatabase(db);

    res.status(201).json({ 
      message: 'Gate pass request created successfully', 
      pass: newPass 
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// API 2: Get all passes (with optional filtering)
app.get('/api/passes', (req, res) => {
  try {
    const { status, studentId } = req.query;
    const db = readDatabase();
    let passes = db.passes;

    if (status) {
      passes = passes.filter(p => p.status === status);
    }
    if (studentId) {
      passes = passes.filter(p => p.studentId === studentId);
    }

    res.json({ passes });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// API 3: Get single pass by ID
app.get('/api/passes/:id', (req, res) => {
  try {
    const db = readDatabase();
    const pass = db.passes.find(p => p.id === req.params.id);

    if (!pass) {
      return res.status(404).json({ error: 'Pass not found' });
    }

    res.json({ pass });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// API 4: Moderator approves/rejects pass
app.put('/api/passes/:id/moderate', (req, res) => {
  try {
    const { action, remarks } = req.body;
    
    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approve or reject' });
    }

    const db = readDatabase();
    const passIndex = db.passes.findIndex(p => p.id === req.params.id);

    if (passIndex === -1) {
      return res.status(404).json({ error: 'Pass not found' });
    }

    db.passes[passIndex].status = action === 'approve' ? 'approved' : 'rejected';
    db.passes[passIndex].moderatorRemarks = remarks || null;
    db.passes[passIndex].approvedDate = new Date().toISOString();

    writeDatabase(db);

    res.json({ 
      message: `Pass ${action}d successfully`, 
      pass: db.passes[passIndex] 
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// API 5: Gatekeeper verifies and uses pass
app.put('/api/passes/:id/verify', (req, res) => {
  try {
    const db = readDatabase();
    const passIndex = db.passes.findIndex(p => p.id === req.params.id);

    if (passIndex === -1) {
      return res.status(404).json({ error: 'Pass not found' });
    }

    const pass = db.passes[passIndex];

    if (pass.status !== 'approved') {
      return res.status(400).json({ 
        error: 'Pass is not approved', 
        status: pass.status 
      });
    }

    if (pass.usedDate) {
      return res.status(400).json({ 
        error: 'Pass already used', 
        usedDate: pass.usedDate 
      });
    }

    db.passes[passIndex].usedDate = new Date().toISOString();
    db.passes[passIndex].status = 'used';

    writeDatabase(db);

    res.json({ 
      message: 'Pass verified and marked as used', 
      pass: db.passes[passIndex] 
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📊 Database: ${DB_PATH}`);
});
