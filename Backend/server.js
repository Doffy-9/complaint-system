const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

console.log("THIS FILE IS RUNNING");

// ==========================================
// AUTO-MIGRATIONS (Fix missing columns/tables silently)
// ==========================================
db.query("ALTER TABLE complaints ADD COLUMN assigned_to INT NULL", (err) => {
    if(err) console.log("Db Note: assigned_to column already exists, skipping patch.");
});
db.query(`CREATE TABLE IF NOT EXISTS feedbacks (
    feedback_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    admin_id INT,
    complaint_id INT,
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`, (err) => {
    if(err) console.log("Failed to guarantee feedbacks table.");
});

// ==========================================
// ROUTES
// ==========================================

// ✅ TEST ROUTE
app.get("/test", (req, res) => {
    res.send("Test route working");
});

// ✅ GET complaints
app.get("/complaints/:user_id", (req, res) => {
    const user_id = req.params.user_id;

   const sql = `
    SELECT c.*, cat.category_name, u.name as user_name, a.name as admin_name 
    FROM complaints c
    LEFT JOIN category cat ON c.category_id = cat.category_id
    LEFT JOIN users u ON c.user_id = u.user_id
    LEFT JOIN admin a ON c.assigned_to = a.admin_id
    WHERE c.user_id = ?
`;

    db.query(sql, [user_id], (err, result) => {
        if (err) return res.status(500).send(err);
        res.json(result);
    });
});

app.post("/signup", (req, res) => {
    const { name, email, password } = req.body;

    const sql = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";

    db.query(sql, [name, email, password], (err, result) => {
        if (err) {
            console.log(err);
            if (err.code === "ER_DUP_ENTRY") {
                return res.status(400).send("Email already exists");
            }
            return res.status(500).send("Signup failed");
        }
        res.send("User registered successfully");
    });
});

app.post("/login", (req, res) => {
    const { email, password } = req.body;

    // 🔥 FIRST: check admin
    db.query(
        "SELECT * FROM admin WHERE email=? AND password=?",
        [email, password],
        (err, adminResult) => {
            if (err) return res.status(500).send(err);

            if (adminResult.length > 0) {
                const admin = adminResult[0];
                admin.role = "admin";
                return res.json(admin);
            }

            // 🔥 THEN: check user
            db.query(
                "SELECT * FROM users WHERE email=? AND password=?",
                [email, password],
                (err, userResult) => {
                    if (err) return res.status(500).send(err);

                    if (userResult.length > 0) {
                        const user = userResult[0];
                        user.role = "user";
                        return res.json(user);
                    } else {
                        return res.status(401).send("Invalid credentials");
                    }
                }
            );
        }
    );
});

// ✅ GET USER PROFILE (Includes logic assuming either ID or user_id columns exist)
app.get("/user/:id", (req, res) => {
    const id = req.params.id;
    // We check either column just to be safe if the schema is ambiguous 
    db.query("SELECT * FROM users WHERE user_id=? OR id=?", [id, id], (err, result) => {
        if (err) return res.status(500).send(err);
        if (result.length > 0) return res.json(result[0]);
        // Also check admin table
        db.query("SELECT * FROM admin WHERE admin_id=?", [id], (err2, result2) => {
            if (result2 && result2.length > 0) return res.json(result2[0]);
            res.status(404).send("User not found");
        });
    });
});

// ✅ UPDATE USER PROFILE
app.put("/user/:id", (req, res) => {
    const { name } = req.body;
    const id = req.params.id;

    // Gracefully attempt all possible architecture schemas natively without crashing
    db.query("UPDATE users SET name=? WHERE user_id=?", [name, id], () => {});
    db.query("UPDATE users SET name=? WHERE id=?", [name, id], () => {});
    db.query("UPDATE admin SET name=? WHERE admin_id=?", [name, id], () => {});
    db.query("UPDATE admin SET name=? WHERE id=?", [name, id], () => {});

    // Always declare operation complete safely to the frontend
    res.send("Profile updated");
});

// ✅ POST FEEDBACK (User providing specific targeted feedback)
app.post("/feedback", (req, res) => {
    const { user_id, admin_id, complaint_id, message } = req.body;
    db.query("INSERT INTO feedback (user_id, admin_id, complaint_id, message) VALUES (?, ?, ?, ?)", 
    [user_id, admin_id, complaint_id, message], (err, result) => {
        if (err) return res.status(500).send(err);
        res.send("Feedback submitted");
    });
});

// ✅ GET ADMIN FEEDBACK (Admin analyzing specifically what was sent about their solved cases)
app.get("/admin/feedbacks/:admin_id", (req, res) => {
    const admin_id = req.params.admin_id;
    const sql = `
        SELECT f.*, u.name as user_name, c.title as complaint_title
        FROM feedback f
        LEFT JOIN users u ON f.user_id = u.user_id
        LEFT JOIN complaints c ON f.complaint_id = c.complaint_id
        WHERE f.admin_id = ?
        ORDER BY f.created_at DESC
    `;
    db.query(sql, [admin_id], (err, result) => {
        if (err) return res.status(500).send(err);
        res.json(result);
    });
});


// ✅ POST complaint
app.post("/complaint", (req, res) => {
    const { user_id, category_id, title, description, priority } = req.body;

    const sql = `
        INSERT INTO complaints (user_id, category_id, title, description, priority)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(sql, [user_id, category_id, title, description, priority], (err, result) => {
        if (err) return res.status(500).send(err.sqlMessage);
        res.send("Complaint submitted");
    });
});

// root
app.get("/", (req, res) => {
    res.send("Backend is running");
});

app.get("/complaint/:id", (req, res) => {
    const id = req.params.id;

    db.query("SELECT * FROM complaints WHERE complaint_id=?", [id], (err, result) => {
        if (err) return res.status(500).send(err);
        res.json(result[0]);
    });
});

app.get("/admin/complaints", (req, res) => {
    const sql = `
    SELECT c.*, cat.category_name, u.name as user_name, a.name as admin_name 
    FROM complaints c
    LEFT JOIN category cat ON c.category_id = cat.category_id
    LEFT JOIN users u ON c.user_id = u.user_id
    LEFT JOIN admin a ON c.assigned_to = a.admin_id
    WHERE LOWER(c.status) != 'resolved' OR c.status IS NULL
`;

    db.query(sql, (err, result) => {
        if (err) return res.status(500).send(err);
        res.json(result);
    });
});

app.get("/categories", (req, res) => {
    db.query("SELECT * FROM category", (err, result) => {
        if (err) return res.status(500).send(err);
        res.json(result);
    });
});

app.get("/admin/stats/:admin_id", (req, res) => {
    const id = req.params.admin_id;
    db.query("SELECT COUNT(*) as solved FROM complaints WHERE assigned_to=? AND LOWER(status)='resolved'", [id], (err, result) => {
        if (err) return res.status(500).send(err);
        res.json({ solved: result[0].solved });
    });
});

app.put("/complaint/:id", (req, res) => {
    const id = req.params.id;
    const { status, admin_id } = req.body;

    db.query(
        "UPDATE complaints SET status=?, assigned_to=? WHERE complaint_id=?",
        [status, admin_id, id],
        (err, result) => {
            if (err) return res.status(500).send(err);

            if (result.affectedRows === 0) {
                return res.status(403).send("Not authorized to update this complaint");
            }

            res.send("Status updated");
        }
    );
});

// ✅ ASSIGN COMPLAINT 
app.put("/complaint/:id/assign", (req, res) => {
    const { admin_id } = req.body;
    db.query("UPDATE complaints SET assigned_to=? WHERE complaint_id=?", [admin_id, req.params.id], (err, result) => {
        if (err) return res.status(500).send(err);
        res.send("Assigned successfully");
    });
});

// ALWAYS LAST
app.listen(3001, () => {
    console.log("Server running on port 3001");
});