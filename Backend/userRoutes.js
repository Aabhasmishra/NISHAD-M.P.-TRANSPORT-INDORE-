module.exports = (userDB) => {
  const router = require('express').Router();

  // Search users by name
  router.get('/users/search', async (req, res) => {
    try {
      const users = await userDB.searchUsers(req.query.name);
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get all users
  router.get('/users/all', async (req, res) => {
    try {
      const users = await userDB.getAllUsers();
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get user by ID
  router.get('/users/:id', async (req, res) => {
    try {
      const user = await userDB.getUserById(req.params.id);
      if (user) {
        res.json(user);
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Check User and password for Login
  router.post('/users/authenticate', async (req, res) => {
    try {
      const { identifier, password } = req.body;
      
      // Search by name or mobile number
      const { rows } = await userDB.query(
        `SELECT * FROM users 
        WHERE (name = $1 OR mobile_number = $1) 
        AND password = $2 
        LIMIT 1`,
        [identifier, password]
      );

      if (rows.length > 0) {
        const user = rows[0];
        
        // Check if user is active
        if (user.status !== 'Active') {
          return res.status(401).json({ 
            success: false,
            message: "Your account is inactive. Please contact administrator.",
            status: 'inactive'
          });
        }
        
        res.json({ 
          success: true,
          user: {
            id: user.id,
            name: user.name,
            type: user.type,
            mobile_number: user.mobile_number
          }
        });
      } else {
        res.status(401).json({ 
          success: false,
          message: "Invalid credentials" 
        });
      }
    } catch (err) {
      res.status(500).json({ 
        success: false,
        message: err.message 
      });
    }
  });

  // Create new user
  router.post('/users', async (req, res) => {
    try {
      const newUser = await userDB.createUser(req.body);
      res.status(201).json(newUser);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Update user
  router.put('/users/:id', async (req, res) => {
    try {
      const updatedUser = await userDB.updateUser(req.params.id, req.body);
      if (updatedUser) {
        res.json(updatedUser);
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Delete user
  router.delete('/users/:id', async (req, res) => {
    try {
      const success = await userDB.deleteUser(req.params.id);
      if (success) {
        res.json({ message: 'User deleted successfully' });
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  return router;
};