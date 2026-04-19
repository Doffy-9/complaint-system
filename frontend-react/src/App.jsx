import { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [complaints, setComplaints] = useState([]);
  
  const [currentView, setCurrentView] = useState(() => localStorage.getItem("view") || "dashboard"); 
  const [showNewComplaintModal, setShowNewComplaintModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    localStorage.setItem("view", currentView);
  }, [currentView]);

  // Load User Info reliably
  useEffect(() => {
    const savedRole = localStorage.getItem("role");
    const savedUserId = localStorage.getItem("user_id");

    if (savedRole && savedUserId) {
      fetch(`http://127.0.0.1:3001/user/${savedUserId}`)
        .then(res => {
          if (res.ok) return res.json();
          return { name: localStorage.getItem("name") || "User", email: localStorage.getItem("email") || "No Email" };
        })
        .then(profileObject => {
          const userData = { 
            role: savedRole, 
            user_id: savedUserId,
            admin_id: savedRole === 'admin' ? savedUserId : null,
            name: profileObject.name || profileObject.username || "User",
            email: profileObject.email
          };
          setUser(userData);
          loadComplaints(userData);
        })
        .catch(() => {
           const fallbackData = {
              role: savedRole, user_id: savedUserId, admin_id: savedRole === 'admin' ? savedUserId : null,
              name: localStorage.getItem("name") || "User", email: localStorage.getItem("email")
           };
           setUser(fallbackData);
           loadComplaints(fallbackData);
        });
    }
  }, []);

  const loadComplaints = async (userData) => {
  let url = "";

  if (userData.role === "admin") {
    url = "http://127.0.0.1:3001/admin/complaints";
  } else {
    url = `http://127.0.0.1:3001/complaints/${userData.user_id}`;
  }

  try {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setComplaints(data);
    }
  } catch (error) {
    console.error("Failed to load complaints");
  }
};

  const logout = () => {
    localStorage.clear();
    setUser(null);
    setComplaints([]);
    setCurrentView("dashboard");
  };

  const reloadUserProfile = async () => {
  try {
    const res = await fetch(`http://127.0.0.1:3001/user/${user.user_id}`);
    if (res.ok) {
      const profile = await res.json();

      const updatedUser = {
        ...user,
        name: profile.name,
        email: profile.email
      };

      setUser(updatedUser);

      // 🔥 also update localStorage
      localStorage.setItem("name", profile.name);
      localStorage.setItem("email", profile.email);
    }
  } catch (err) {
    console.log("Profile reload failed");
  }
};

  const getHeaderTitle = () => {
    const hour = new Date().getHours();
    let greeting = "Good Evening";
    if (hour < 12) greeting = "Good Morning";
    else if (hour < 18) greeting = "Good Afternoon";
    
    switch (currentView) {
      case 'dashboard': return user?.role === 'admin' ? "Team Operations Desk" : "Your Service Requests";
      case 'profile': return "Your Profile";
      case 'feedback': return "Community Feedback";
      default: return "";
    }
  }

// 🔥 ADD THIS BLOCK HERE
if (!user) {
  return <AuthView setUser={setUser} loadComplaints={loadComplaints} />;
}

  return (
    <div className="main-layout bg-dark">
      <aside className={`sidebar glass ${sidebarOpen ? '' : 'closed'}`}>
        <div className="brand">
          <span>Complaint Hub</span>
        </div>
        
        <div className="nav-menu">
          <button 
            className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentView('dashboard')}
          >
            Dashboard
          </button>
          
          <button 
            className={`nav-item ${currentView === 'profile' ? 'active' : ''}`}
            onClick={() => setCurrentView('profile')}
          >
            Profile
          </button>

          <button 
            className={`nav-item ${currentView === 'feedback' ? 'active' : ''}`}
            onClick={() => setCurrentView('feedback')}
          >
            Feedback
          </button>

          {user?.role === 'user' && (
             <button 
               className="nav-item raise-btn"
               onClick={() => setShowNewComplaintModal(true)}
             >
               + Raise Complaint
             </button>
          )}
        </div>

        <div className="logout-box">
          <button className="logout-btn" onClick={logout}>
            Logout
          </button>
        </div>
      </aside>

      <div className="content-wrapper">
         <header className="top-header glass">
           <button className="menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
             ☰
           </button>
           <h3 className="header-title">{getHeaderTitle()}</h3>
         </header>

         <main className="content-area">
           {currentView === 'dashboard' && (
             <DashboardView 
               user={user} 
               complaints={complaints} 
               refresh={() => loadComplaints(user)} 
             />
           )}
           {currentView === 'profile' && (
             <ProfileView 
               user={user} 
               complaints={complaints} 
               reloadProfile={reloadUserProfile}
             />
           )}
           {currentView === 'feedback' && (
             <FeedbackView user={user} complaints={complaints} />
           )}
         </main>
      </div>

      {showNewComplaintModal && (
        <NewComplaintModal 
          user={user} 
          close={() => setShowNewComplaintModal(false)}
          refresh={() => loadComplaints(user)}
        />
      )}
    </div>
  );
}

function AuthView({ setUser, loadComplaints }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!email || !password || (!isLogin && !name)) {
      alert("Please fill in all fields.");
      return;
    }

    if (isLogin) {
      try {
        const res = await fetch("http://127.0.0.1:3001/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });

        if (res.ok) {
          const userData = await res.json();
          // Safety ID fallback mapping perfectly mapping 'id' dynamically 
          const activeUserId = userData.user_id || userData.admin_id || userData.id;
          
          localStorage.setItem("user_id", activeUserId);
          localStorage.setItem("role", userData.role);
          localStorage.setItem("name", userData.name || "User");
          localStorage.setItem("email", userData.email || "");

          userData.user_id = activeUserId;
          const cleanUser = {
            ...userData,
            user_id: activeUserId,
            admin_id: userData.admin_id || (userData.role === 'admin' ? activeUserId : null)
          };

          setUser(cleanUser);
          loadComplaints(cleanUser);
        } else {
          alert("Invalid login credentials.");
        }
      } catch (error) {
        alert("Server error. Ensure backend is running.");
      }
    } else {
      try {
        const res = await fetch("http://127.0.0.1:3001/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password })
        });
        const msg = await res.text();
        alert(msg);
        if (res.ok) setIsLogin(true);
      } catch (error) {
        alert("Server error. Ensure backend is running.");
      }
    }
  };

  return (
    <div className="app-container bg-dark">
      <div className="auth-wrapper">
        <div className="auth-card glass">
          <h1>Welcome Back</h1>
          <div className="auth-tabs">
            <button 
              className={`tab-btn ${isLogin ? 'active' : ''}`} 
              onClick={(e) => { e.preventDefault(); setIsLogin(true); }}
            >
              Login
            </button>
            <button 
              className={`tab-btn ${!isLogin ? 'active' : ''}`} 
              onClick={(e) => { e.preventDefault(); setIsLogin(false); }}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleAuth}>
            {!isLogin && (
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}
            
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                className="form-control"
                placeholder="hello@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="submit-btn">
              {isLogin ? "Sign In" : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function FeedbackView({ user, complaints }) {
  const [feedback, setFeedback] = useState("");
  const [selectedComplaintId, setSelectedComplaintId] = useState("");
  const [adminFeedbacks, setAdminFeedbacks] = useState([]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetch(`http://127.0.0.1:3001/admin/feedbacks/${user.user_id}`)
        .then(res => res.json())
        .then(data => setAdminFeedbacks(data))
        .catch(() => {});
    }
  }, [user.role, user.user_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(!feedback) return;
    
    // Explicitly trace feedback to Admin who solved the ticket
    const complaintObj = complaints.find(c => c.complaint_id.toString() === selectedComplaintId);
    if (!complaintObj || !complaintObj.assigned_to) {
       alert("Please verify your selected ticket contains a recognized Administrator who handled it.");
       return;
    }

    try {
       const res = await fetch("http://127.0.0.1:3001/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
              user_id: user.user_id, 
              admin_id: complaintObj.assigned_to,
              complaint_id: complaintObj.complaint_id,
              message: feedback 
          })
       });
       if(res.ok) {
          alert("Thank you! Feedback permanently traced to resolving admin successfully.");
          setFeedback("");
          setSelectedComplaintId("");
       }
    } catch(err) {
       alert("Server error processing feedback");
    }
  };

  // Only allow feedback on effectively resolved claims naturally assigned implicitly to specific admins.
  const resolvedComplaints = complaints.filter(c => c.status && c.status.toLowerCase() === 'resolved' && c.assigned_to);

  // Admin View Rendering
  if (user?.role === 'admin') {
    return (
      <div className="profile-wrapper">
         <h1 style={{marginBottom: '2rem'}}>Direct Feedback Inbox</h1>
         {adminFeedbacks.length === 0 ? (
            <div className="empty-state glass">
              <h3>No Feedback Found</h3>
              <p>You have not received any direct insights strictly attached to your handled tickets yet.</p>
            </div>
         ) : (
            <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
               {adminFeedbacks.map(f => (
                  <div key={f.feedback_id} className="profile-card glass" style={{flexDirection: 'column', alignItems: 'flex-start', padding: '1.5rem', margin: 0}}>
                     <h3 style={{marginBottom: '0.25rem'}}>Reference Task: {f.complaint_title}</h3>
                     <p style={{fontSize: '0.85rem', color: 'var(--primary)', marginBottom: '1rem', fontWeight: 'bold'}}>
                        Sourced From User Name: {f.user_name}
                     </p>
                     <p style={{background: 'var(--input-bg)', padding: '1rem', borderRadius: '8px', width: '100%'}}>
                       "{f.message}"
                     </p>
                  </div>
               ))}
            </div>
         )}
      </div>
    );
  }

  return (
    <div className="profile-wrapper">
       <div className="profile-card glass" style={{flexDirection: 'column', alignItems: 'flex-start'}}>
          <h1>Evaluate Admin Performance</h1>
          <p style={{marginBottom: '2rem', color: 'var(--text-muted)'}}>Provide direct feedback regarding the final ticket resolutions! All insights seamlessly route back linking explicitly to the Administrator who cleared your issue!</p>
          
          {resolvedComplaints.length === 0 ? (
             <div className="empty-state" style={{border: 'none', padding: '1rem 0'}}>
                <p style={{background: 'var(--input-bg)', padding: '1.25rem', borderRadius: '8px'}}>You do not currently have any resolved complaints formally carrying an active admin designation to evaluate safely at this juncture.</p>
             </div>
          ) : (
             <form style={{width: '100%'}} onSubmit={handleSubmit}>
                <div className="form-group">
                   <label>Select Solved Issue Context</label>
                   <select 
                      className="form-control" 
                      value={selectedComplaintId}
                      onChange={(e) => setSelectedComplaintId(e.target.value)}
                      required
                      style={{cursor: 'pointer'}}
                   >
                     <option value="" disabled>-- Verify Target Resolved Ticket --</option>
                     {resolvedComplaints.map(c => (
                        <option key={c.complaint_id} value={c.complaint_id}>
                           Issue #{c.complaint_id} - "{c.title}" (Resolved by {c.admin_name || `Admin ID - ${c.assigned_to}`})
                        </option>
                     ))}
                   </select>
                </div>
                <div className="form-group" style={{marginTop: '1.25rem'}}>
                   <label>Formal Experience Details</label>
                   <textarea 
                      className="form-control"
                      rows="5"
                      placeholder="Comment on responsiveness, closure resolution capability, etc..."
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      required
                   />
                </div>
                <button type="submit" className="submit-btn" style={{width: 'max-content', padding: '1rem 2rem'}}>Submit Feedback</button>
             </form>
          )}
       </div>
    </div>
  )
}

function ProfileView({ user, complaints, reloadProfile }) {
  const [adminSolved, setAdminSolved] = useState(0);

  useEffect(() => {
    if (user.role === 'admin') {
      fetch(`http://127.0.0.1:3001/admin/stats/${user.admin_id || user.user_id}?t=${Date.now()}`)
        .then(res => res.json())
        .then(data => setAdminSolved(data.solved))
        .catch(() => {});
    }
  }, [user]);

  let raised = complaints.length;
  let solved;

  if (user.role === "admin") {
    solved = adminSolved;
  } else {
    solved = complaints.filter(c => c.status === "Resolved").length;
  }

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user.name || "");

  const handleSave = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:3001/user/${user.user_id || user.admin_id}`, {
         method: "PUT",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ name: editName })
      });
      if(res.ok) {
         alert("Profile successfully updated on backend.");
         localStorage.setItem("name", editName);
         await reloadProfile();
         setIsEditing(false);
      } else {
         alert("Database rejection during processing.");
      }
    } catch(err) {
      alert("Failed to update profile name - ensure server connectivity");
    }
  };

  return (
    <div className="profile-wrapper">
      <div className="profile-card glass">
         {!isEditing ? (
            <button className="edit-toggle-btn" onClick={() => { setIsEditing(true); setEditName(user.name); }}>Edit Profile</button>
         ) : null}
         
         <div className="avatar">
            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
         </div>
         <div className="profile-info">
            {!isEditing ? (
               <>
                  <h1>{user.name}</h1>
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>User ID:</strong> #{user.user_id || user.admin_id}</p>
                  <p><strong>Account Role:</strong> <span style={{textTransform: 'capitalize'}}>{user.role}</span></p>
               </>
            ) : (
               <div style={{display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px'}}>
                  <label style={{color: 'var(--text-muted)'}}>Full Name Revision</label>
                  <input className="form-control" value={editName} onChange={(e) => setEditName(e.target.value)} />
                  
                  <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                     <button className="submit-btn" style={{margin: '0', padding: '0.5rem'}} onClick={handleSave}>Save Revision</button>
                     <button className="submit-btn" style={{margin: '0', padding: '0.5rem', background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)'}} onClick={() => setIsEditing(false)}>Cancel</button>
                  </div>
               </div>
            )}
         </div>
      </div>

      <div className="stats-grid">
         <div className="stat-card glass">
            <h2 className="stat-value">{raised}</h2>
            <p className="stat-label">
               {user.role === 'admin' ? "Global Pool Tickets" : "Total Issues Raised"}
            </p>
         </div>
         
         <div className="stat-card glass">
            <h2 className="stat-value success">{solved}</h2>
            <p className="stat-label">
               {user.role === 'admin' ? "Your Handled Tickets" : "Successfully Solved"}
            </p>
         </div>
      </div>
    </div>
  );
}

function DashboardView({ user, complaints, refresh }) {
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  const handleUpdate = async (e, complaint, field, value) => {
    e.stopPropagation();
    try {
      const targetedAdminId = (field === 'status') 
           ? (user.admin_id || user.user_id) 
           : (complaint.assigned_to || null);
           
      const payload = {
        status: complaint.status,
        priority: complaint.priority,
        admin_id: targetedAdminId
      };
      payload[field] = value;
      
      const res = await fetch(`http://127.0.0.1:3001/complaint/${complaint.complaint_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await refresh();
      }
    } catch (err) {}
  };

  const handleAssignToMe = async (e, complaintId) => {
    e.stopPropagation();
    try {
      const res = await fetch(`http://127.0.0.1:3001/complaint/${complaintId}/assign`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_id: user.admin_id || user.user_id })
      });
      if (res.ok){await refresh(); } 
      else alert("Assignment request failed.");
    } catch(err) {
      alert("System communication failure for Claim action.");
    }
  };

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-header">
        <h1>{user.role === 'admin' ? "Team Operations Desk" : "Your Service Requests"}</h1>
        <p>Monitor your active tickets, collaborate, and keep things moving smoothly.</p>
      </div>

      {complaints.length === 0 ? (
        <div className="empty-state glass">
          <h3>All caught up!</h3>
          <p>The queue is completely clear right now. Take a deep breath!</p>
        </div>
      ) : (
        <div className="grid-container">
          {complaints.map((c, index) => (
            <div 
              className="complaint-card glass slide-fade-up bounce-hover" 
              key={c.complaint_id} 
              onClick={() => setSelectedComplaint(c)}
              style={{cursor: 'pointer', animationDelay: `${index * 0.1}s`}}
            >
              <div className="card-header">
                <span className="card-id">#{c.complaint_id}</span>
                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px'}}>
                  <div>
                    {c.priority && (
                      <span className="badge priority">
                        {c.priority}
                      </span>
                    )}
                    <span className={`badge ${c.status?.toLowerCase() === 'resolved' ? 'resolved' : 'pending'}`}>
                      {c.status || "Pending"}
                    </span>
                  </div>
                  {c.admin_name && (
                    <span className="badge assigned" style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                      Handled by: {c.admin_name}
                    </span>
                  )}
                </div>
              </div>
              
              <h3 className="card-title">{c.title}</h3>
              {c.category_name && <p style={{fontSize: '0.8rem', color: 'var(--primary)', marginBottom: '8px'}}>{c.category_name}</p>}
              
              {user.role === 'admin' && c.user_name && (
                <p style={{fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px'}}>
                  Sent from: <span style={{color: 'var(--text-muted)'}}>{c.user_name}</span>
                </p>
              )}
              
              <p className="card-desc">
                {c.description && c.description.length > 100 
                  ? c.description.substring(0, 100) + '...' 
                  : (c.description || "No description provided.")}
              </p>
              
              {user.role === 'admin' && (
                <div className="admin-actions" style={{display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap'}}>
                  <select 
                    className="status-select" 
                    value={c.status || 'Pending'}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => handleUpdate(e, c, 'status', e.target.value)}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                  
                  <select 
                    className="status-select" 
                    value={c.priority || 'Low'}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => handleUpdate(e, c, 'priority', e.target.value)}
                    style={{borderColor: 'var(--primary)', color: 'var(--primary)'}}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                  
                  {(!c.assigned_to) && (
                     <button className="assign-btn" onClick={(e) => handleAssignToMe(e, c.complaint_id)}>
                       Claim Task
                     </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedComplaint && (
         <div className="modal-overlay" onClick={(e) => {
          if(e.target.className === 'modal-overlay') setSelectedComplaint(null);
        }}>
          <div className="modal-content glass" style={{maxWidth: '600px'}}>
             <button className="close-btn" onClick={() => setSelectedComplaint(null)}>&times;</button>
             <h2 style={{marginBottom: '1rem'}}>Complaint Info / #{selectedComplaint.complaint_id}</h2>
             
             <div style={{marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem'}}>
               <div style={{flex: '1 1 45%'}}>
                   <span style={{color: 'var(--text-muted)', fontSize: '0.85rem'}}>Status</span><br/>
                   <span className={`badge ${selectedComplaint.status?.toLowerCase() === 'resolved' ? 'resolved' : 'pending'}`}>
                      {selectedComplaint.status || "Pending"}
                   </span>
               </div>
               <div style={{flex: '1 1 45%'}}>
                   <span style={{color: 'var(--text-muted)', fontSize: '0.85rem'}}>Priority</span><br/>
                   {selectedComplaint.priority && (
                      <span className="badge priority">
                        {selectedComplaint.priority}
                      </span>
                    )}
               </div>
               
               {user.role === 'admin' && (
                 <div style={{flex: '1 1 45%'}}>
                     <span style={{color: 'var(--text-muted)', fontSize: '0.85rem'}}>Reported By</span><br/>
                     <span style={{fontWeight: '500'}}>{selectedComplaint.user_name || `User #${selectedComplaint.user_id}`}</span> 
                 </div>
               )}
               <div style={{flex: '1 1 45%'}}>
                   <span style={{color: 'var(--text-muted)', fontSize: '0.85rem'}}>Admin Assigned</span><br/>
                   <span style={{fontWeight: '500', color: selectedComplaint.admin_name ? 'var(--text-main)' : 'var(--text-muted)'}}>
                       {selectedComplaint.admin_name || 'Unassigned'}
                   </span>
               </div>
               <div style={{flex: '1 1 100%'}}>
                   <span style={{color: 'var(--text-muted)', fontSize: '0.85rem'}}>Time Filed</span><br/>
                   <span style={{fontWeight: '500'}}>
                       {selectedComplaint.created_at ? new Date(selectedComplaint.created_at).toLocaleString() : 'Not Available'}
                   </span>
               </div>
             </div>

             <div style={{marginTop: '1.5rem', background: 'var(--input-bg)', padding: '1rem', borderRadius: '8px'}}>
                 <h3 style={{fontSize: '1.1rem', marginBottom: '0.5rem'}}>{selectedComplaint.title}</h3>
                 <p style={{whiteSpace: 'pre-wrap', color: 'var(--text-main)', fontSize: '0.95rem'}}>
                   {selectedComplaint.description}
                 </p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NewComplaintModal({ user, close, refresh }) {
  const [categories, setCategories] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priority, setPriority] = useState("Low");

  useEffect(() => {
    fetch("http://127.0.0.1:3001/categories")
      .then(res => res.json())
      .then(data => {
        setCategories(data);
        if(data.length > 0) setCategoryId(data[0].category_id);
      })
      .catch(err => console.log("Could not load categories", err));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !description || !categoryId) {
      alert("Please fill all required fields.");
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:3001/complaint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.user_id,
          category_id: categoryId,
          title,
          description,
          priority: "Low"
        })
      });

      if (res.ok) {
        alert("Complaint submitted successfully!");
        await refresh();
        close();
      } else {
        alert("System Error: The database rejected the submission format.");
      }
    } catch (err) {
      alert("Server error.");
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => {
      if(e.target.className === 'modal-overlay') close();
    }}>
      <div className="modal-content glass">
        <button className="close-btn" onClick={close}>&times;</button>
        <h2 style={{marginBottom: '1.5rem'}}>Submit Formal Complaint</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title</label>
            <input type="text" className="form-control" value={title} onChange={e => setTitle(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Category</label>
            <select className="form-control" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
              {categories.map(cat => (
                <option key={cat.category_id} value={cat.category_id}>{cat.category_name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Description Details</label>
            <textarea className="form-control" rows="4" value={description} onChange={e => setDescription(e.target.value)} required />
          </div>
          <button type="submit" className="submit-btn" style={{marginTop: '0.5rem'}}>Submit Request</button>
        </form>
      </div>
    </div>
  );
}

export default App;