const express = require('express');
require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path')

const app = express();
const PORT = process.env.PORT || 3000;

// Error handeling middleware
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ message: err.message || 'Server Error' });
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }))

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Error Connecting to MongoDB", err));

// Routes
app.use('/api', require('./routes/api'));

// Wildcard route
app.all('*', (req, res) => {
  res.status(404).json({ message: "404 Not Found" })
})

app.listen(PORT, () => {
  console.log(`Server runnning on http://localhost:${PORT}`);
});