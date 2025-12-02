module.exports = (challanDB) => {
  const router = require('express').Router();

  // Save challan
  router.post('/challan', async (req, res) => {
    try {
      const { date, truck_no, driver_no, from, destination, builty_no } = req.body;
      if (!date || !truck_no || !driver_no || !from || !destination || !builty_no) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: date, truck_no, driver_no, from, destination, or builty_no"
        });
      }

      const result = await challanDB.saveChallan(req.body);
      res.status(201).json({
        success: true,
        challan_no: result.challan_no,
        created_at: result.created_at,
        message: "Challan saved successfully",
      });
    } catch (err) {
      res.status(400).json({ 
        success: false, 
        error: err.message 
      });
    }
  });

  router.get('/challan', async (req, res) => {
    try {
      if (req.query.challan_no) {
        const challan = await challanDB.getChallan(req.query.challan_no);
        if (challan) {
          res.json(challan);
        } else {
          res.status(404).json({ 
            error: "Challan not found" 
          });
        }
      } else {
        const challans = await challanDB.getAllChallans();
        res.json(challans);
      }
    } catch (err) {
      res.status(400).json({ 
        error: err.message 
      });
    }
  });

  // Update challan
  router.put('/challan/:challan_no', async (req, res) => {
    try {
      const { date, truck_no, driver_no, from, destination, builty_no } = req.body;
      if (!date || !truck_no || !driver_no || !from || !destination || !builty_no) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: date, truck_no, driver_no, from, destination, or builty_no"
        });
      }

      const challan = await challanDB.updateChallan(
        req.params.challan_no, 
        req.body
      );
      
      if (challan) {
        res.json({
          success: true,
          updated_at: challan.updated_at,
          message: "Challan updated successfully"
        });
      } else {
        res.status(404).json({ 
          error: "Challan not found" 
        });
      }
    } catch (err) {
      res.status(400).json({ 
        success: false, 
        error: err.message 
      });
    }
  });

  // Delete challan
  router.delete('/challan/:challan_no', async (req, res) => {
    try {
      const success = await challanDB.deleteChallan(
        req.params.challan_no
      );
      
      if (success) {
        res.json({
          success: true,
          message: "Challan deleted successfully"
        });
      } else {
        res.status(404).json({ 
          error: "Challan not found" 
        });
      }
    } catch (err) {
      res.status(400).json({ 
        success: false, 
        error: err.message 
      });
    }
  });

  return router;
};