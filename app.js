// app.js

const express = require('express');
const path = require('path');
require('dotenv').config();
const expressLayouts = require('express-ejs-layouts');
const mongoose = require('mongoose')
const Contact = require('./models/Contact');
const { title } = require('process');

const app = express();

const session = require('express-session');

// Set up session middleware
app.use(session({
  secret: process.env.SESSION_SECRET, // Use a strong secret
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set secure: true in production
}));

// Middleware to check if user is authenticated
app.use((req, res, next) => {
  res.locals.user = req.session.userId ? req.session.userId : null; // Assuming user ID is stored in the session
  next();
});

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout'); // Default layout file: views/layout.ejs

// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));

mongoose
  .connect(process.env.MONGOURI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err))

// Define routes here (we'll add them in the next step)

// Home Route
app.get('/', (req, res) => {
  res.render('index', { title: 'Home' });
});

// About Route
app.get('/about', (req, res) => {
  res.render('about', { title: 'About Us' });
});

// Contact Route
app.get('/contact', (req, res) => {
  res.render('contact', { title: 'Contact Us' });
});

app.get('/thanks', (req, res) => {
  res.render('thanks', { title: 'Thank You' });
});

app.get('/equipment', (req, res) => {
  res.render('equipment', { title: 'Equipment' });
});

app.get('/services', (req, res) => {
  res.render('services', { title: 'Services' })
})

app.get('/auth/register', (req,res) => {
  res.render('register', { title: 'Register' });
});

app.get('/auth/login', (req,res) => {
  const error = req.query.error || null;
  res.render('login', { title: 'Login', error })
})

// Middleware to parse incoming form data
app.use(express.urlencoded({ extended: true }));

// Contact Form Submission Route
app.post('/contact', async (req, res) => {
  const { name, email, message } = req.body;

  const newContact = new Contact({ name, email, message });

  try {
    await newContact.save();
    res.redirect('/thanks')
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong.');
  }
});

app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = new User({ username, email, password: hashedPassword });

  try {
    await user.save();
    res.render('success', { message: "Registration successful", target: "/auth/login" });
  } catch (error) {
    res.render('error', { error: "Error registering user: " + error.message, target: "/auth/register", title: "Error" });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });

  if (user && await bcrypt.compare(password, user.password)) {
    req.session.userId = user._id; // Save user ID in session
    res.render('success', { message: "Login successful", target: "/" });
  } else {
    res.render('error', { error: "Invalid credentials", target: "/auth/login", title: "Error" });
  }
});

// Start the server
const PORT = process.env.PORT
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
