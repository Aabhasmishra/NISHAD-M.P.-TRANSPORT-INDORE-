module.exports = (challanDB, sendChallanNotification) => {
  const router = require('express').Router();

  // Save challan – now accepts to_pay, paid, plpl (optional)
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

      sendChallanNotification({
        challan_no: result.challan_no,
        truck_no: req.body.truck_no,
        from_location: req.body.from,
        destination: req.body.destination,
      });

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

  router.get('/challan/latest', async (req, res) => {
    try {
      const challanNo = await challanDB.getLatestChallan();
      res.json({ challan_no: challanNo });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get challan(s) – includes all freight fields
  router.get('/challan', async (req, res) => {
    try {
      if (req.query.challan_no) {
        const challan = await challanDB.getChallan(req.query.challan_no);
        if (challan) {
          res.json(challan);
        } else {
          res.status(404).json({ error: "Challan not found" });
        }
      } else {
        const challans = await challanDB.getAllChallans();
        res.json(challans);
      }
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Update challan – accepts any freight fields including to_pay, paid, plpl
  router.put('/challan/:challan_no', async (req, res) => {
    try {
      // Ensure at least one field is provided
      if (Object.keys(req.body).length === 0) {
        return res.status(400).json({
          success: false,
          error: "No fields to update"
        });
      }

      // Basic validation for required core fields if they are present
      const { date, truck_no, driver_no, from, destination, builty_no } = req.body;
      if (date !== undefined && !date) {
        return res.status(400).json({ success: false, error: "date cannot be empty" });
      }
      if (truck_no !== undefined && !truck_no) {
        return res.status(400).json({ success: false, error: "truck_no cannot be empty" });
      }
      if (driver_no !== undefined && !driver_no) {
        return res.status(400).json({ success: false, error: "driver_no cannot be empty" });
      }
      if (from !== undefined && !from) {
        return res.status(400).json({ success: false, error: "from cannot be empty" });
      }
      if (destination !== undefined && !destination) {
        return res.status(400).json({ success: false, error: "destination cannot be empty" });
      }
      if (builty_no !== undefined && !builty_no) {
        return res.status(400).json({ success: false, error: "builty_no cannot be empty" });
      }

      const challan = await challanDB.updateChallan(req.params.challan_no, req.body);
      if (challan) {
        res.json({
          success: true,
          updated_at: challan.updated_at,
          message: "Challan updated successfully"
        });
      } else {
        res.status(404).json({ error: "Challan not found" });
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
      const success = await challanDB.deleteChallan(req.params.challan_no);
      if (success) {
        res.json({
          success: true,
          message: "Challan deleted successfully"
        });
      } else {
        res.status(404).json({ error: "Challan not found" });
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
