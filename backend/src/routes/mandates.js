// backend/src/routes/mandates.js - Mandate endpoints
import express from 'express';
import { createMandate, verifyMandateSignature } from '../mandates.js';
import { getMandate } from '../db.js';

const router = express.Router();

// POST /mandates - Issue new AP2 mandate
router.post('/', async (req, res) => {
  try {
    const { max_budget, allowed_categories, validity_minutes, user_intent, agent_id, merchant_id } = req.body;

    if (!max_budget || isNaN(Number(max_budget))) {
      return res.status(400).json({
        success: false,
        error: "Field 'max_budget' (number) is required."
      });
    }

    const mandate = await createMandate({
      max_budget: Number(max_budget),
      allowed_categories: allowed_categories || ["electronics", "accessories"],
      validity_minutes: validity_minutes ? Number(validity_minutes) : 15,
      user_intent: user_intent || "Agent programmatic shopping",
      agent_id: agent_id || "groq_shopping_agent",
      merchant_id: merchant_id || "rzp_merchant_acp_demo"
    });

    res.status(201).json({
      success: true,
      protocol: "AP2/1.0",
      mandate
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /mandates/:id - Inspect mandate and verify signature
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const mandate = await getMandate(id);

    if (!mandate) {
      return res.status(404).json({
        success: false,
        error: `Mandate '${id}' not found.`
      });
    }

    const isSignatureValid = verifyMandateSignature(mandate);

    res.json({
      success: true,
      protocol: "AP2/1.0",
      mandate,
      is_signature_valid: isSignatureValid
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
