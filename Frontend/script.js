async function submitComplaint() {
    const category = document.getElementById("category").value;

    if (!category) {
        alert("Please select category");
        return;
        
    }

    const data = {
    user_id: localStorage.getItem("user_id") || 1,
    category_id: category,
    title: document.getElementById("title").value,
    description: document.getElementById("description").value,
    priority: document.getElementById("priority").value
};

    const res = await fetch("http://localhost:3000/complaint", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });

    const msg = await res.text();
    alert(msg);
}
async function signup() {
    const name = document.getElementById("name").value;
    const email = document.getElementById("signup_email").value;
    const password = document.getElementById("signup_password").value;

    if (!name || !email || !password) {
        alert("Please fill all fields");
        return;
    }

    const data = { name, email, password };

    const res = await fetch("http://localhost:3000/signup", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });

    const msg = await res.text();
    alert(msg);
}

async function loadComplaints() {
    const role = localStorage.getItem("role");
    const userId = localStorage.getItem("user_id");

    let url = "";

    if (role === "admin") {
        url = "http://localhost:3000/admin/complaints";
    } else {
        url = `http://localhost:3000/complaints/${userId}`;
    }

    const res = await fetch(url);
    const data = await res.json();

    const list = document.getElementById("list");
    list.innerHTML = "";

   data.forEach(c => {
    const item = document.createElement("li");

    const time = new Date(c.created_at).toLocaleString();

    let content = "";

    if (role === "admin") {
        content = `
            ID: ${c.complaint_id} | Title: ${c.title} |Category: ${c.category_name} 
            | Priority: ${c.priority} | Status: ${c.status} | Time: ${time}
            <button onclick="updateStatus(${c.complaint_id})">Resolve</button>
        `;
    } else {
        content = `
            ID: ${c.complaint_id} | Title: ${c.title} 
            | Priority: ${c.priority} | Status: ${c.status} | Time: ${time}
        `;
    }

    item.innerHTML = content;
    list.appendChild(item);
});
}


async function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if (!email || !password) {
        alert("Enter email and password");
        return;
    }

    const res = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
    });

    if (res.ok) {
        const user = await res.json();

        localStorage.setItem("user_id", user.user_id);
        localStorage.setItem("role", user.role);

        alert("Login success");
    } else {
        alert("Invalid login");
    }
    location.reload();
}

async function trackComplaint() {
    const id = document.getElementById("trackId").value;

    if (!id) {
        alert("Enter complaint ID");
        return;
    }

    const res = await fetch(`http://localhost:3000/complaint/${id}`);

    if (!res.ok) {
        document.getElementById("trackResult").innerText = "Not found";
        return;
    }

    const data = await res.json();

    if (!data) {
        document.getElementById("trackResult").innerText = "Not found";
        return;
    }

    document.getElementById("trackResult").innerText =
        `ID: ${data.complaint_id} | Status: ${data.status} | Priority: ${data.priority}`;
}

async function updateStatus(id) {
    await fetch(`http://localhost:3000/complaint/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: "Resolved" })
    });

    alert("Status updated");
    loadComplaints();
}

async function loadCategories() {
    const res = await fetch("http://localhost:3000/categories");
    const data = await res.json();

    console.log("Categories:", data); // ✅ inside function

    const dropdown = document.getElementById("category");
    dropdown.innerHTML = "<option value=''>Select Category</option>";

    data.forEach(cat => {
        const option = document.createElement("option");
        option.value = cat.category_id;
        option.textContent = cat.category_name;
        dropdown.appendChild(option);
    });
}

function showUser() {
    const userId = localStorage.getItem("user_id");
    const role = localStorage.getItem("role");

    const userInfo = document.getElementById("userInfo");
    const authSection = document.getElementById("authSection");

    if (role === "admin" && userId) {
        userInfo.innerText = "Logged in as ADMIN";
        authSection.style.display = "none";
    } else if (userId) {
        userInfo.innerText = "Logged in as User ID: " + userId;
        authSection.style.display = "none";
    } else {
        userInfo.innerText = "Not logged in";
        authSection.style.display = "block";
    }
}

function searchComplaints(query) {
    const items = document.querySelectorAll("#list li");

    items.forEach(item => {
        item.style.display =
            item.innerText.toLowerCase().includes(query.toLowerCase())
                ? ""
                : "none";
    });
}

function logout() {
    localStorage.clear();   // 👈 clears EVERYTHING (user_id + role)

    alert("Logged out");

    location.reload();      // 👈 force refresh UI
}


window.onload = function () {
    loadCategories();
    showUser();   // 👈 ADD THIS
};