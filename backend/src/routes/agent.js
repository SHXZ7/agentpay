// backend/src/routes/agent.js - Agent Shopping & Upsell Endpoints
import express from 'express';
import { runShoppingAgent, generateUpsellRecommendation } from '../agent.js';
import { getProductById } from '../db.js';

const router = express.Router();

// POST /agent/shop - Run full agent workflow
router.post('/shop', async (req, res) => {
  try {
    const { prompt, explicit_budget, force_category } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameter 'prompt'"
      });
    }

    const result = await runShoppingAgent(
      prompt,
      explicit_budget ? Number(explicit_budget) : null,
      force_category
    );

    res.json({
      success: result.success,
      ...result
    });
  } catch (error) {
    console.error("Agent Shopping Endpoint Error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /agent/upsell - Standalone upsell recommendation
router.post('/upsell', async (req, res) => {
  try {
    const { product_id, remaining_budget = 0 } = req.body;
    let product = null;
    if (product_id) {
      product = await getProductById(product_id);
    }
    const upsell = await generateUpsellRecommendation(product, Number(remaining_budget));
    res.json({
      success: true,
      upsell
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
