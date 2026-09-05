// backend/src/routes/products.js - GET /products
import express from 'express';
import { getProducts, addAuditLog } from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { category, max_price } = req.query;
    const products = await getProducts(category, max_price);

    await addAuditLog({
      actor: "AGENT_OR_CLIENT",
      action: "CATALOG_QUERIED",
      status: "SUCCESS",
      details: `Retrieved ${products.length} products (category: ${category || 'all'}, max_price: ${max_price || 'none'})`,
      payload: { category, max_price, count: products.length }
    });

    res.json({
      success: true,
      protocol: "ACP/1.0",
      count: products.length,
      products
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
