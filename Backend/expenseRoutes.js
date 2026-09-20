/* ============================================================================
   expenseRoutes.js — mounted at /api by Mainserver3.js
   ---------------------------------------------------------------------------
   GET    /api/expenses?station=Indore&year=2026&month=9
   POST   /api/expenses            body: { station, entries: [...] }
   DELETE /api/expenses            body: { exp_ids: [...] }
   ========================================================================== */

module.exports = (expenseDB) => {
  const router = require("express").Router();

  /* ---------- GET : all entries of a station for one month ---------- */
  router.get("/expenses", async (req, res) => {
    try {
      const { station, year, month } = req.query;

      if (!station) {
        return res.status(400).json({ success: false, error: "station is required" });
      }
      const y = Number(year);
      const m = Number(month);
      if (!Number.isInteger(y) || y < 2000 || y > 2100) {
        return res.status(400).json({ success: false, error: "year must be a valid number" });
      }
      if (!Number.isInteger(m) || m < 1 || m > 12) {
        return res.status(400).json({ success: false, error: "month must be 1-12" });
      }

      const entries = await expenseDB.getExpensesByStationAndMonth(station, y, m);
      res.json({
        success: true,
        station,
        month: `${y}-${String(m).padStart(2, "0")}`,
        entries,
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* ---------- POST : insert-or-update edited entries ---------- */
  router.post("/expenses", async (req, res) => {
    try {
      const { station, entries } = req.body;

      if (!station) {
        return res.status(400).json({ success: false, error: "station is required" });
      }
      if (!Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({
          success: false,
          error: "entries must be a non-empty array",
        });
      }

      const saved = await expenseDB.upsertExpenses(station, entries);
      res.status(200).json({
        success: true,
        station,
        saved_count: saved.length,
        saved,
      });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  /* ---------- DELETE : remove specific entries by exp_id ---------- */
  router.delete("/expenses", async (req, res) => {
    try {
      const { exp_ids } = req.body;
      if (!Array.isArray(exp_ids) || exp_ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: "exp_ids must be a non-empty array",
        });
      }
      const deleted = await expenseDB.deleteExpenses(exp_ids);
      res.json({ success: true, deleted });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  return router;
};
