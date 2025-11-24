module.exports = (transporterDB) => {
  const router = require('express').Router();

  // Create a new transporter
  router.post('/transporters', transporterDB.upload.single('declaration_upload'), async (req, res) => {
    try {
      const result = await transporterDB.createTransporter(req.body, req.file);
      res.status(201).json({ 
        vehicleNumber: result.vehicleNumber,
        message: 'Transporter created successfully' 
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Get all transporters
  router.get('/transporters/all', async (req, res) => {
    try {
      const transporters = await transporterDB.getAllTransporters();
      res.json(transporters);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get transporter by vehicle number or search
  router.get('/transporters', async (req, res) => {
    try {
      const searchTerm = req.query.search;
      
      if (!searchTerm) {
        return res.status(400).json({ error: 'Search term is required' });
      }

      const transporter = await transporterDB.getTransporter(searchTerm);
      res.json(transporter);
    } catch (err) {
      if (err.message === 'Transporter not found') {
        res.status(404).json({ error: err.message });
      } else {
        res.status(500).json({ error: err.message });
      }
    }
  });

  // Update transporter
  router.put('/transporters/:vehicleNumber', async (req, res) => {
    try {
      await transporterDB.updateTransporter(req.params.vehicleNumber, req.body);
      res.json({ message: 'Transporter updated successfully' });
    } catch (err) {
      if (err.message === 'Transporter not found') {
        res.status(404).json({ error: err.message });
      } else {
        res.status(400).json({ error: err.message });
      }
    }
  });

  // Delete transporter
  router.delete('/transporters/:vehicleNumber', async (req, res) => {
    try {
      await transporterDB.deleteTransporter(req.params.vehicleNumber);
      res.json({ message: 'Transporter deleted successfully' });
    } catch (err) {
      if (err.message === 'Transporter not found') {
        res.status(404).json({ error: err.message });
      } else {
        res.status(400).json({ error: err.message });
      }
    }
  });

  return router;
};