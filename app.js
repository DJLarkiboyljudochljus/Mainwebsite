const express = require('express');
const path = require('path');
require('dotenv').config();
const expressLayouts = require('express-ejs-layouts');
const mongoose = require('mongoose')
const Contact = require('./models/Contact');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const User = require('./models/user');

const app = express();

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout'); // Default layout file: views/layout.ejs

// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to make user accessable in all routes
app.use((req, res, next) => {
  res.locals.user = user | null;
  next();
})

mongoose
  .connect(process.env.MONGO_URI)
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Contact Form Submission Route
app.post('/contact', async (req, res) => {
  const { name, email, message } = req.body;

  const newContact = new Contact({ name, email, message });

  try {
    await newContact.save();
    res.redirect('/thanks')

    transporter.sendMail({
      from: email,
      to: process.env.EMAIL_USER,
      subject: "Contact Email From Website for our buisness",
      text: `${message}`,
      html: `
        <p>${message}</p>
      `
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong.');
  }
});

app.use('/api', require('./routes/api/api'));

// Start the server
const PORT = process.env.PORT
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
