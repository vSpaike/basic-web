const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const path = require('path');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 5000;

// public directory is at the project root (sibling of back)
const publicPath = path.join(__dirname, '..', 'public');
const uploadsPath = path.join(__dirname, '..', 'uploads');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

app.use(express.static(publicPath));
app.use('/uploads', express.static(uploadsPath));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({
    secret: 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// DB config from env with sensible defaults for local dev
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'db_auth',
    multipleStatements: true,
};

let db;

// Try to connect with retries (useful because DB container may not be ready yet)
function connectWithRetry(attemptsLeft = 20, delayMs = 2000) {
    const conn = mysql.createConnection(dbConfig);
    conn.connect(function (err) {
        if (err) {
            console.error('MySQL connection failed:', err.message);
            try { conn.destroy(); } catch (e) {}
            if (attemptsLeft > 0) {
                console.log(`Retrying MySQL connection in ${delayMs}ms... (${attemptsLeft} attempts left)`);
                setTimeout(() => connectWithRetry(attemptsLeft - 1, delayMs), delayMs);
            } else {
                console.error('Could not connect to MySQL after multiple attempts. Exiting.');
                process.exit(1);
            }
        } else {
            db = conn;
            console.log('Connected to MySQL database');
            // start server after successful DB connection
            startServer();
        }
    });
}

// Start the Express server (called after DB connection)
function startServer() {
    app.listen(port, function () {
        console.log('Node server is running on port ' + port);
    });
}

function verifyLetter(input) {
    const regexLettres = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/;
    return regexLettres.test(input);
}


// Begin connection attempts
connectWithRetry();

app.get('/', function (req, res) {
    res.sendFile(path.join(publicPath, 'index.html'));
});

app.get('/register', function (req, res) {
    res.sendFile(path.join(publicPath, 'register.html'));
});

// Serve the index as the login page (there's no login.html in public)
app.get('/login', function (req, res) {
    res.sendFile(path.join(publicPath, 'index.html'));
});

app.post('/register', function (req, res) {
    const nom = req.body.nom;
    const prenom = req.body.prenom;
    const password = req.body.password;
    const email = req.body.email;

    if (!nom || !prenom || !email || !password) {
        return res.status(400).send('Missing required fields');
    }

    if(!verifyLetter(nom)) {
        return res.status(400).send('Nom (lastname) contains invalid characters. Only letters, spaces, apostrophes and hyphens are allowed.');
    }
    
    if(!verifyLetter(prenom)) {
        return res.status(400).send('Prénom (firstname) contains invalid characters. Only letters, spaces, apostrophes and hyphens are allowed.');
    }
    
    const sql = 'INSERT INTO clients (nom, prenom, email, password) VALUES (?, ?, ?, ?)';
    db.query(sql, [nom, prenom, email, password], function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).send('Erreur serveur');
        }
        res.redirect('/login');
    });
});

app.post('/login', function (req, res) {
    const email = req.body.email || req.body.username;
    const password = req.body.password;

    if (!email || !password) {
        return res.status(400).send('Missing email or password');
    }

    const sql = 'SELECT * FROM clients WHERE email = ? AND password = ?';
    db.query(sql, [email, password], function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).send('Erreur serveur');
        }
        if (result.length > 0) {
            // Create session
            req.session.user = {
                email: result[0].email,
                nom: result[0].nom,
                prenom: result[0].prenom,
                profile_image: result[0].profile_image
            };
            res.sendFile(path.join(publicPath, 'accueil.html'));
        } else {
            res.status(401).send('Invalid username or password');
        }
    });
});

// Middleware to check if user is logged in
function requireLogin(req, res, next) {
    if (req.session && req.session.user) {
        next();
    } else {
        res.status(401).send('You must be logged in to access this page');
    }
}

// Profile page
app.get('/profil', requireLogin, function (req, res) {
    res.sendFile(path.join(publicPath, 'profil.html'));
});

// Get current user profile
app.get('/get-profile', requireLogin, function (req, res) {
    res.json(req.session.user);
});

// Update profile
app.post('/update', requireLogin, function (req, res) {
    const nom = req.body.nom;
    const prenom = req.body.prenom;
    const email = req.session.user.email; // Use session email, don't allow changing it

    if (!nom || !prenom) {
        return res.status(400).send('Missing required fields');
    }

    if(!verifyLetter(nom)) {
        return res.status(400).send('Nom (lastname) contains invalid characters. Only letters, spaces, apostrophes and hyphens are allowed.');
    }
    
    if(!verifyLetter(prenom)) {
        return res.status(400).send('Prénom (firstname) contains invalid characters. Only letters, spaces, apostrophes and hyphens are allowed.');
    }

    const sql = 'UPDATE clients SET nom = ?, prenom = ? WHERE email = ?';
    db.query(sql, [nom, prenom, email], function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).send('Erreur serveur');
        }
        // Update session
        req.session.user.nom = nom;
        req.session.user.prenom = prenom;
        res.redirect('/profil');
    });
});

// Upload profile image
app.post('/upload-profile-image', requireLogin, upload.single('profile_image'), function (req, res) {
    if (!req.file) {
        return res.status(400).send('No file uploaded');
    }

    const imageUrl = '/uploads/' + req.file.filename;
    const email = req.session.user.email;

    // Delete old profile image if it exists
    if (req.session.user.profile_image) {
        const oldImagePath = path.join(__dirname, '..', req.session.user.profile_image);
        if (fs.existsSync(oldImagePath)) {
            try {
                fs.unlinkSync(oldImagePath);
            } catch (err) {
                console.error('Error deleting old image:', err);
            }
        }
    }

    const sql = 'UPDATE clients SET profile_image = ? WHERE email = ?';
    db.query(sql, [imageUrl, email], function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).send('Erreur serveur');
        }
        // Update session
        req.session.user.profile_image = imageUrl;
        res.redirect('/profil');
    });
});

// Logout
app.get('/logout', function (req, res) {
    req.session.destroy(function(err) {
        if (err) {
            console.error(err);
            return res.status(500).send('Erreur lors de la déconnexion');
        }
        res.redirect('/login');
    });
});

app.post('/objet', function (req, res) {
    const objet = req.body.objet || req.body.name || req.body.nom;
    const prix = req.body.price || req.body.prix;

    if (!objet || !prix) {
        return res.status(400).send('Missing objet or prix');
    }
    
    if(isNaN(prix)) {
        return res.status(400).send('Prix must be a number');
    }

    if(!verifyLetter(objet)) {
        return res.status(400).send('Objet contains invalid characters');
    }

    const regexPrix = /^\d+(\.\d{1,2})?$/;
    if(!regexPrix.test(prix)) {
        return res.status(400).send('Prix format is invalid');
    }

    const sql = 'INSERT INTO objets (objet, prix) VALUES (?, ?)';
    db.query(sql, [objet, prix], function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).send('Erreur serveur');
        }
        res.redirect('/prix.html');
    });
});

app.get('/objets', function (req, res) {
    const sql = 'SELECT * FROM objets';
    db.query(sql, function (err, results) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
        res.json(results);
    });
});

app.delete('/delete_objet', function (req, res) {
    const objet = req.body.objet;
    const prix = req.body.prix;
    if (!objet || prix === undefined) {
        return res.status(400).send('Missing objet or prix');
    }
    const sql = 'DELETE FROM objets WHERE objet = ? AND prix = ?';
    console.log(`Deleting objet: ${objet} with prix: ${prix}`);
    db.query(sql, [objet, prix], function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).send('Erreur serveur');
        }
        return res.status(204).send();
    });
});

// server is started after successful DB connection

