const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Serve static frontend files
app.use(express.static('public'));

// MongoDB Connection (Fallback to Local / In-memory mockup logic)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vehicle_rental_db';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Database'))
  .catch(err => console.log('⚠️ MongoDB Connection Note: Running with Local Mongo/Memory DB instance.'));

// Schemas
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const BookingSchema = new mongoose.Schema({
  userEmail: String,
  vehicleName: String,
  startDate: String,
  days: Number,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Booking = mongoose.model('Booking', BookingSchema);

// In-Memory Fallback Storage (if MongoDB is not installed locally)
const memoryUsers = [];
const memoryBookings = [];

// API Endpoints
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  try {
    if (mongoose.connection.readyState === 1) {
      const existingUser = await User.findOne({ email });
      if (existingUser) return res.status(400).json({ message: 'User already exists!' });

      const newUser = new User({ email, password });
      await newUser.save();
    } else {
      if (memoryUsers.find(u => u.email === email)) {
        return res.status(400).json({ message: 'User already exists!' });
      }
      memoryUsers.push({ email, password });
    }
    res.status(201).json({ message: 'Registration Successful! Saved to Database.', user: { email } });
  } catch (err) {
    res.status(500).json({ message: 'Server Error during registration.' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    let user;
    if (mongoose.connection.readyState === 1) {
      user = await User.findOne({ email, password });
    } else {
      user = memoryUsers.find(u => u.email === email && u.password === password);
    }

    if (!user) {
      return res.status(400).json({ message: 'Invalid Email or Password!' });
    }

    res.json({ message: 'Login Successful!', user: { email: user.email } });
  } catch (err) {
    res.status(500).json({ message: 'Server Error during login.' });
  }
});

app.post('/api/book', async (req, res) => {
  const { userEmail, vehicleName, startDate, days } = req.body;
  try {
    if (mongoose.connection.readyState === 1) {
      const newBooking = new Booking({ userEmail, vehicleName, startDate, days });
      await newBooking.save();
    } else {
      memoryBookings.push({ userEmail, vehicleName, startDate, days, createdAt: new Date() });
    }
    res.status(201).json({ message: 'Booking request successfully stored in backend!' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to record booking.' });
  }
});

// Admin Route to view stored data
app.get('/api/admin/data', async (req, res) => {
  if (mongoose.connection.readyState === 1) {
    const users = await User.find({}, '-password');
    const bookings = await Booking.find();
    res.json({ users, bookings });
  } else {
    res.json({ users: memoryUsers, bookings: memoryBookings });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 DriveEase Server running on http://localhost:${PORT}`));
