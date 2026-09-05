// backend/src/routes/audit.js - Forensic Audit Trail
import express from 'express';
import { getAuditLogs, resetDatabase, addAuditLog } from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 100;
    const logs = await getAuditLogs(limit);
    res.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/reset', async (req, res) => {
  try {
    await resetDatabase();
    await addAuditLog({
      actor: "SYSTEM",
      action: "DATABASE_RESET",
      status: "SUCCESS",
      details: "Audit logs and transaction state reset to default sandbox demo mode."
    });
    res.json({
      success: true,
      message: "Database & state reset successfully."
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
