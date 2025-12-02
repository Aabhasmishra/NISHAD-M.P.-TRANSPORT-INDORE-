module.exports = (transportDB) => {
  const router = require('express').Router();

  // Save transport record
  router.post('/transport-records', async (req, res) => {
    try {
      const result = await transportDB.saveTransportRecord(req.body);
      res.status(201).json({
        success: true,
        grNo: result.grNo,
        created_at: result.created_at,
        updated_at: result.updated_at,
        message: "Transport record saved successfully",
      });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Get transport records
  router.get('/transport-records', async (req, res) => {
    try {
      if (req.query.grNo) {
        const record = await transportDB.getTransportRecord(req.query.grNo);
        record ? res.json(record) : res.status(404).json({ error: "Transport record not found" });
      } else {
        res.json(await transportDB.getAllTransportRecords());
      }
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Get transport history
  router.get('/transport-records/history', async (req, res) => {
    try {
      const { consignor, consignee } = req.query;
      res.json(await transportDB.getTransportHistory(consignor || '', consignee || ''));
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Update transport record
  router.put('/transport-records/:grNo', async (req, res) => {
    try {
      const record = await transportDB.updateTransportRecord(req.params.grNo, req.body);
      if (record) {
        res.json({
          success: true,
          updated_at: record.updated_at,
          message: "Transport record updated successfully"
        });
      } else {
        res.status(404).json({ error: "Transport record not found" });
      }
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Delete transport record
  router.delete('/transport-records/:grNo', async (req, res) => {
    try {
      const success = await transportDB.deleteTransportRecord(req.params.grNo);
      if (success) {
        res.json({ success: true, message: "Transport record deleted successfully" });
      } else {
        res.status(404).json({ error: "Transport record not found" });
      }
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  return router;
};