const express = require('express');
const mongoose = require('mongoose');
const mongoURI = 'mongodb+srv://Grizak:<Mammaebast11%21%3F>@djlarkiboyljudochljus.9ezbm.mongodb.net/?retryWrites=true&w=majority&appName=DJLarkiboyLjudOchLjus'
const session = require('express-session');
const bcrypt = require('bcrypt');
const User = require('./models/user');
const authRoutes = require('./routes/auth');
const app = express();

mongoose.connect(mongoURI)
  .then(() => console.log('Connected to MongoDB')) 
  .catch(err => {
    console.error('Error connecting to MongoDB:', err.message);
    // Optionally shut down the server if you can't connect to the database
    process.exit(1); // Exit the app if MongoDB can't connect
  });


// Middleware
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
   secret: 'secret-key',
   resave: false,
   saveUninitialized: false
}));

// Routes
app.use('/auth', authRoutes);

// Homepage
app.get('/', (req, res) => {
   res.render('index', { user: req.session.user });
});

app.get('/equipment', (req, res) => {
  res.render('equipment', { user: req.session.user });
});

app.get('/about', (req, res) => {
  res.render('about', { user: req.session.user });
});

app.get('/account', (req, res) => {
  res.render('account/account', { user: req.session.user });
});

app.get('/error', (req, res) => {
  res.render('error')
})

const PORT = 3001;
app.listen(PORT, () => {
   console.log(`Server running on http://localhost:${PORT}`);
});
