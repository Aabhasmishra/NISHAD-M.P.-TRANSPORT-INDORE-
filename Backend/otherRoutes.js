// otherRoutes.js
const router = require('express').Router();

module.exports = (otherDB) => {
  // GET all stations as an array
  router.get('/other/stations', async (req, res) => {
    try {
      const stationString = await otherDB.getStationList();
      if (!stationString) {
        return res.json([]);
      }
      const stations = stationString.split(' | ').filter(s => s.trim() !== '');
      res.json(stations);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST add a new station (single station)
  router.post('/other/stations', async (req, res) => {
    try {
      const { station } = req.body;
      if (!station || typeof station !== 'string' || station.trim() === '') {
        return res.status(400).json({ error: 'Station name is required' });
      }
      const newStation = station.trim();
      // Get current list
      const currentString = await otherDB.getStationList();
      let stations = currentString ? currentString.split(' | ').filter(s => s.trim() !== '') : [];
      // Check if already exists (case-insensitive)
      if (stations.some(s => s.toLowerCase() === newStation.toLowerCase())) {
        return res.status(400).json({ error: 'Station already exists' });
      }
      stations.push(newStation);
      // Update database (the update function sorts)
      await otherDB.updateStationList(stations);
      // Return updated list
      const updatedString = await otherDB.getStationList();
      const updatedStations = updatedString.split(' | ').filter(s => s.trim() !== '');
      res.json({ message: 'Station added successfully', stations: updatedStations });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
