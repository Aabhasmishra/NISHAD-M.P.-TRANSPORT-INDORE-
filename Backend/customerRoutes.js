module.exports = (customersDB) => {
  const router = require('express').Router();

  // Validate customer by name and ID number
  router.get('/customers', async (req, res) => {
    try {
      const { name, id_number } = req.query;
      if (!name || !id_number) {
        return res.status(400).json({ 
          valid: false, 
          error: "Both 'name' and 'id_number' query parameters are required" 
        });
      }

      const isValid = await customersDB.getCustomerByName(name, id_number);
      if (isValid) {
        res.json({ valid: true, message: "Customer details are valid" });
      } else {
        res.status(404).json({ valid: false, message: "Customer details not found" });
      }
    } catch (err) {
      res.status(500).json({ valid: false, error: err.message });
    }
  });

  // Get all customer names
  router.get('/customers/all-names', async (req, res) => {
    try {
      const names = await customersDB.getAllCustomerNames();
      res.json(names);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Get all customers
  router.get('/customers/all', async (req, res) => {
    try {
      const customers = await customersDB.getAllCustomers();
      res.json(customers);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Create customer
  router.post('/customers', async (req, res) => {
    try {
      const result = await customersDB.createCustomer(req.body);
      res.status(201).json({
        success: true,
        message: "Customer created successfully",
        data: result
      });
    } catch (err) {
      if (err.message.includes('already exists')) {
        res.status(409).json({ 
          success: false, 
          error: err.message 
        });
      } else {
        res.status(400).json({ 
          success: false, 
          error: err.message 
        });
      }
    }
  });

  // Update customer
  router.put('/customers/:name', async (req, res) => {
    try {
      const success = await customersDB.updateCustomerByName(req.params.name, req.body);
      if (success) {
        res.json({ 
          success: true,
          message: "Customer updated successfully" 
        });
      } else {
        res.status(404).json({ 
          success: false,
          error: "Customer not found" 
        });
      }
    } catch (err) {
      if (err.message.includes('already exists')) {
        res.status(409).json({ 
          success: false, 
          error: err.message 
        });
      } else {
        res.status(400).json({ 
          success: false, 
          error: err.message 
        });
      }
    }
  });

  // Delete customer
  router.delete('/customers/:name', async (req, res) => {
    try {
      const success = await customersDB.deleteCustomerByName(req.params.name);
      if (success) {
        res.json({ 
          success: true,
          message: "Customer deleted successfully" 
        });
      } else {
        res.status(404).json({ 
          success: false,
          error: "Customer not found" 
        });
      }
    } catch (err) {
      res.status(400).json({ 
        success: false, 
        error: err.message 
      });
    }
  });

  // Search customers (partial match for suggestions OR exact lookup by name+id)
  router.get('/customers/search', async (req, res) => {
    try {
      const { q, name, id_number } = req.query;
      
      // If name and id_number are provided, do exact lookup
      if (name && id_number) {
        const customer = await customersDB.getCustomerByName(name, id_number);
        if (customer) {
          return res.json(customer);
        } else {
          return res.status(404).json({ error: "Customer not found with the given name and ID number" });
        }
      }
      
      // Otherwise, do partial search for suggestions
      const results = await customersDB.searchCustomers(q || '');
      res.json(results);
    } catch (err) {
      console.error('Customer search error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
