const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcrypt');
const User = require('./models/user');
const authRoutes = require('./routes/auth');
const app = express();

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/djlarkiboy', {
   useNewUrlParser: true,
   useUnifiedTopology: true
})
  .then(() => console.log('Connected to MongoDB')) 
  .catch(err => {
    console.error('Error connecting to MongoDB:', err.message)
    res.render
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

const PORT = 3001;
app.listen(PORT, () => {
   console.log(`Server running on http://localhost:${PORT}`);
});
