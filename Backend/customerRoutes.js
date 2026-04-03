module.exports = (customersDB) => {
  const router = require('express').Router();

  // Get customer by name (unchanged)
  router.get('/customers', async (req, res) => {
    try {
      console.log("Customer Routes Called");
      const customer = await customersDB.getCustomerByName(req.query.name);
      if (customer) {
        const response = {
          ...customer,
          gstin: customer.id_type === "GST Number" ? customer.id_number : "UIN"
        };
        res.json(response);
      } else {
        res.status(404).json({ error: "Customer not found" });
      }
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Get all customer names (unchanged)
  router.get('/customers/all-names', async (req, res) => {
    try {
      const names = await customersDB.getAllCustomerNames();
      res.json(names);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Get all customers (unchanged)
  router.get('/customers/all', async (req, res) => {
    try {
      const customers = await customersDB.getAllCustomers();
      res.json(customers);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Create customer (unchanged)
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

  // Update customer (unchanged)
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

  // Delete customer (unchanged)
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

  // Search customers by ID number only (partial match allowed)
  router.get('/customers/search', async (req, res) => {
    try {
      const { id_number } = req.query;

      if (!id_number || id_number.trim() === '') {
        return res.status(400).json({ error: "ID number is required for search" });
      }

      const results = await customersDB.searchCustomersByIdNumber(id_number.trim());
      res.json(results);
    } catch (err) {
      console.error('Customer search error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
