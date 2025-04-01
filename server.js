// Import required dependencies
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config();

// Initialize Express application
const app = express();
const port = process.env.PORT || 3000;

// Validate required environment variables
const requiredEnvVars = ['EMAIL_USER', 'EMAIL_PASS', 'ADMIN_EMAIL'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

// Exit if any required environment variables are missing
if (missingEnvVars.length > 0) {
    console.error('Missing required environment variables:', missingEnvVars);
    process.exit(1);
}

// Log email configuration at startup (without exposing sensitive data)
console.log('Email Configuration:', {
    user: process.env.EMAIL_USER,
    adminEmail: process.env.ADMIN_EMAIL,
    hasPassword: !!process.env.EMAIL_PASS
});

// Configure CORS middleware
// Allows requests from any origin with specific methods and headers
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Accept']
}));

// Configure middleware for parsing JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the current directory
app.use(express.static(path.join(__dirname)));

// Route handlers for different pages
// Serve contact.html for the /contact route
app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'contact.html'));
});

// Serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Configure email transporter using nodemailer
// Uses Gmail SMTP service with credentials from environment variables
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    debug: true // Enable debug logging for troubleshooting
});

// Verify email configuration on startup
transporter.verify(function(error, success) {
    if (error) {
        console.error('Transporter verification failed:', error);
    } else {
        console.log('Server is ready to send emails');
    }
});

// Contact form endpoint
app.post('/api/contact', async (req, res) => {
    try {
        // Extract form data from request body
        const { name, email, profession, message } = req.body;
        console.log('Received contact form submission:', { name, email, profession, message });

        // Validate required fields
        if (!name || !email || !profession || !message) {
            console.log('Validation failed: Missing required fields');
            return res.status(400).json({
                success: false,
                message: 'Please fill in all fields'
            });
        }

        // Validate email format using regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            console.log('Validation failed: Invalid email format');
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid email address'
            });
        }

        // Configure email content
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.ADMIN_EMAIL,
            subject: `New Contact Form Submission from ${name}`,
            text: `
                Name: ${name}
                Email: ${email}
                Profession: ${profession}
                Message: ${message}
            `,
            html: `
                <h3>New Contact Form Submission</h3>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Profession:</strong> ${profession}</p>
                <p><strong>Message:</strong> ${message}</p>
            `
        };

        // Log email configuration before sending
        console.log('Email configuration:', {
            from: process.env.EMAIL_USER,
            to: process.env.ADMIN_EMAIL
        });

        // Send email using configured transporter
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info);

        // Send success response to client
        res.json({
            success: true,
            message: 'Message sent successfully'
        });

    } catch (error) {
        // Log detailed error information for debugging
        console.error('Error sending email:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            command: error.command,
            response: error.response,
            responseCode: error.responseCode
        });

        // Send error response to client
        // Only include error message in development mode
        res.status(500).json({
            success: false,
            message: 'Failed to send message. Please try again later.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Handle 404 errors - serve index.html for any undefined routes
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

// Start the server and listen on the specified port
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}); 