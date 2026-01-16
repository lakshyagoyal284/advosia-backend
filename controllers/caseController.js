import pool from '../config/db.js';

// @desc    Get all cases
// @route   GET /api/cases
// @access  Private
export const getAllCases = async (req, res) => {
  try {
    let query = 'SELECT * FROM cases';
    const params = [];

    // Filter cases based on user role
    if (req.user.role === 'client') {
      query += ' WHERE user_id = ?';
      params.push(req.user.id);
    } else if (req.user.role === 'lawyer') {
      query += ' WHERE status = ?';
      params.push('open');
    }

    query += ' ORDER BY created_at DESC';

    const [cases] = await pool.execute(query, params);
    res.json(cases);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get case by ID
// @route   GET /api/cases/:id
// @access  Private
export const getCaseById = async (req, res) => {
  try {
    const { id } = req.params;
    
    let query = 'SELECT * FROM cases WHERE id = ?';
    const params = [id];

    // Permission check based on user role
    if (req.user.role === 'client') {
      // Clients can only view their own cases
      query += ' AND user_id = ?';
      params.push(req.user.id);
    } else if (req.user.role === 'lawyer') {
      // Lawyers can view open cases
      query += ' AND status = ?';
      params.push('open');
    }
    // Admins can view all cases (no additional filter needed)

    const [cases] = await pool.execute(query, params);
    
    if (cases.length === 0) {
      return res.status(404).json({ message: 'Case not found' });
    }

    res.json(cases[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create new case
// @route   POST /api/cases
// @access  Private
export const createCase = async (req, res) => {
  try {
    const { title, description, category } = req.body;
    
    // Only clients can create cases
    if (req.user.role !== 'client') {
      return res.status(403).json({ message: 'Only clients can create cases' });
    }

    const query = `
      INSERT INTO cases (user_id, title, description, category, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'open', NOW(), NOW())
    `;
    
    const [result] = await pool.execute(query, [req.user.id, title, description, category]);
    
    // Get the created case
    const [newCase] = await pool.execute('SELECT * FROM cases WHERE id = ?', [result.insertId]);
    
    res.status(201).json(newCase[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update case
// @route   PUT /api/cases/:id
// @access  Private
export const updateCase = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, status } = req.body;
    
    // Check if case exists and user has permission
    const checkQuery = 'SELECT * FROM cases WHERE id = ?';
    const [existingCases] = await pool.execute(checkQuery, [id]);
    
    if (existingCases.length === 0) {
      return res.status(404).json({ message: 'Case not found' });
    }
    
    const caseItem = existingCases[0];
    
    // Check permissions
    if (req.user.role !== 'admin' && caseItem.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this case' });
    }
    
    const updateQuery = `
      UPDATE cases 
      SET title = ?, description = ?, category = ?, status = ?, updated_at = NOW()
      WHERE id = ?
    `;
    
    await pool.execute(updateQuery, [title, description, category, status, id]);
    
    // Get updated case
    const [updatedCase] = await pool.execute('SELECT * FROM cases WHERE id = ?', [id]);
    
    res.json(updatedCase[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete case
// @route   DELETE /api/cases/:id
// @access  Private
export const deleteCase = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if case exists and user has permission
    const checkQuery = 'SELECT * FROM cases WHERE id = ?';
    const [existingCases] = await pool.execute(checkQuery, [id]);
    
    if (existingCases.length === 0) {
      return res.status(404).json({ message: 'Case not found' });
    }
    
    const caseItem = existingCases[0];
    
    // Check permissions (only admin or case owner can delete)
    if (req.user.role !== 'admin' && caseItem.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this case' });
    }
    
    await pool.execute('DELETE FROM cases WHERE id = ?', [id]);
    
    res.json({ message: 'Case deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
