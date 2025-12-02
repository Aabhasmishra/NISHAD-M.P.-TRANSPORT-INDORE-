module.exports = (statusDB) => {
  const router = require('express').Router();

  // Create new status
  router.post('/status', async (req, res) => {
    try {
      const { 
        gr_no, 
        challan_status = 'Book', 
        payment_status = 'NA',
        crossing_status = 'Book' 
      } = req.body;
      
      if (!gr_no) {
        return res.status(400).json({ 
          error: "GR number is required" 
        });
      }

      const success = await statusDB.createStatus(
        gr_no, 
        challan_status, 
        payment_status, 
        crossing_status
      );
      
      if (success) {
        res.status(201).json({
          success: true,
          message: "Status created successfully"
        });
      } else {
        res.status(400).json({ 
          error: "Failed to create status" 
        });
      }
    } catch (err) {
      res.status(400).json({ 
        success: false, 
        error: err.message 
      });
    }
  });

  // Get status
  router.get('/status', async (req, res) => {
    try {
      if (req.query.gr_no) {
        const status = await statusDB.getStatus(req.query.gr_no);
        if (status) {
          res.json(status);
        } else {
          res.status(404).json({ 
            error: "Status not found" 
          });
        }
      } else {
        const statuses = await statusDB.getAllStatus();
        res.json(statuses);
      }
    } catch (err) {
      res.status(400).json({ 
        error: err.message 
      });
    }
  });

  // Update status
  router.put('/status/:gr_no', async (req, res) => {
    try {
      const { challan_status, payment_status, crossing_status } = req.body;
      const grNo = req.params.gr_no;

      let success;
      if (challan_status !== undefined && payment_status !== undefined && crossing_status !== undefined) {
        // Update all statuses
        success = await statusDB.updateStatus(grNo, challan_status, payment_status, crossing_status);
      } else if (challan_status !== undefined && payment_status !== undefined) {
        // Update challan and payment status
        success = await statusDB.updateStatus(grNo, challan_status, payment_status, 'Book');
      } else if (challan_status !== undefined && crossing_status !== undefined) {
        // Update challan and crossing status
        success = await statusDB.updateStatus(grNo, challan_status, 'NA', crossing_status);
      } else if (payment_status !== undefined && crossing_status !== undefined) {
        // Update payment and crossing status
        success = await statusDB.updateStatus(grNo, 'Book', payment_status, crossing_status);
      } else if (challan_status !== undefined) {
        // Update only challan status
        success = await statusDB.updateChallanStatus(grNo, challan_status);
      } else if (payment_status !== undefined) {
        // Update only payment status
        success = await statusDB.updatePaymentStatus(grNo, payment_status);
      } else if (crossing_status !== undefined) {
        // Update only crossing status
        success = await statusDB.updateCrossingStatus(grNo, crossing_status);
      } else {
        return res.status(400).json({ 
          error: "Either challan_status, payment_status or crossing_status is required" 
        });
      }
      
      if (success) {
        res.json({
          success: true,
          message: "Status updated successfully"
        });
      } else {
        res.status(404).json({ 
          error: "Failed to update status" 
        });
      }
    } catch (err) {
      res.status(400).json({ 
        success: false, 
        error: err.message 
      });
    }
  });

  // Delete status
  router.delete('/status/:gr_no', async (req, res) => {
    try {
      const success = await statusDB.deleteStatus(req.params.gr_no);
      
      if (success) {
        res.json({
          success: true,
          message: "Status deleted successfully"
        });
      } else {
        res.status(404).json({ 
          error: "Status not found" 
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