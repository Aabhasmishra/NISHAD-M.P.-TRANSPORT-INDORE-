module.exports = (crossingDB) => {
  const router = require('express').Router();

  // Save crossing statement
  router.post('/crossing', async (req, res) => {
    try {
      const { date, builty_no } = req.body;
      if (!date || !builty_no) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: date or builty_no"
        });
      }

      const result = await crossingDB.saveCrossingStatement(req.body);
      res.status(201).json({
        success: true,
        cx_number: result.cx_number,
        created_at: result.created_at,
        message: "Crossing statement saved successfully",
      });
    } catch (err) {
      res.status(400).json({ 
        success: false, 
        error: err.message 
      });
    }
  });

  // Get crossing statement
  router.get('/crossing', async (req, res) => {
    try {
      if (req.query.cx_number) {
        const crossing = await crossingDB.getCrossingStatement(req.query.cx_number);
        if (crossing) {
          res.json(crossing);
        } else {
          res.status(404).json({ 
            error: "Crossing statement not found" 
          });
        }
      } else {
        const crossings = await crossingDB.getAllCrossingStatements();
        res.json(crossings);
      }
    } catch (err) {
      res.status(400).json({ 
        error: err.message 
      });
    }
  });

  // Update crossing statement
  router.put('/crossing/:cx_number', async (req, res) => {
    try {
      const { date, builty_no } = req.body;
      if (!date || !builty_no) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: date or builty_no"
        });
      }

      const crossing = await crossingDB.updateCrossingStatement(
        req.params.cx_number, 
        req.body
      );
      
      if (crossing) {
        res.json({
          success: true,
          updated_at: crossing.updated_at,
          message: "Crossing statement updated successfully"
        });
      } else {
        res.status(404).json({ 
          error: "Crossing statement not found" 
        });
      }
    } catch (err) {
      res.status(400).json({ 
        success: false, 
        error: err.message 
      });
    }
  });

  // Delete crossing statement
  router.delete('/crossing/:cx_number', async (req, res) => {
    try {
      const success = await crossingDB.deleteCrossingStatement(
        req.params.cx_number
      );
      
      if (success) {
        res.json({
          success: true,
          message: "Crossing statement deleted successfully"
        });
      } else {
        res.status(404).json({ 
          error: "Crossing statement not found" 
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