import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updatePassword as fbUpdatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getDatabase, ref, set, get, push, update, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyBJW_BwyZzxqumyDsyACddWZMUKJv1O9as",
    authDomain: "ak-playvideo.firebaseapp.com",
    projectId: "ak-playvideo",
    storageBucket: "ak-playvideo.firebasestorage.app",
    messagingSenderId: "452155991718",
    appId: "1:452155991718:web:ed000387953f275b61f667",
    measurementId: "G-7SMG285W8H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);

// Global Variables
let currentUser = null;
let selectedFile = null;
let currentPostId = null;

// Auth State Observer
onAuthStateChanged(auth, async (user) => {
    if (user) {
        await loadUserData(user.uid);
        showMainApp();
        loadPosts();
    } else {
        showLoginPage();
    }
});

// Load User Data
async function loadUserData(uid) {
    try {
        const userRef = ref(db, `users/${uid}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
            currentUser = { uid, ...snapshot.val() };
            updateProfileDisplay();
        }
    } catch (error) {
        console.error('Error loading user:', error);
    }
}

// Show/Hide Pages
function showLoginPage() {
    document.getElementById('loginPage').classList.add('active');
    document.getElementById('registerPage').classList.remove('active');
    document.getElementById('mainApp').classList.remove('active');
}

function showMainApp() {
    document.getElementById('loginPage').classList.remove('active');
    document.getElementById('registerPage').classList.remove('active');
    document.getElementById('mainApp').classList.add('active');
}

// Register - SIMPLE VERSION
window.register = async () => {
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirm').value;

    if (!username || !password || !confirm) {
        alert('Sila isi semua field!');
        return;
    }

    if (password !== confirm) {
        alert('Password tidak sama!');
        return;
    }

    if (username.length < 3) {
        alert('Username minimum 3 huruf!');
        return;
    }

    if (password.length < 6) {
        alert('Password minimum 6 huruf!');
        return;
    }

    try {
        // Buat email unik dari username + timestamp
        const timestamp = Date.now();
        const email = `${username.toLowerCase()}_${timestamp}@locatwet.com`;
        
        console.log('Trying to create user with email:', email);
        
        // Create user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;
        
        console.log('User created! UID:', uid);
        
        // Save user data
        await set(ref(db, `users/${uid}`), {
            username: username,
            email: email,
            bio: 'Selamat datang ke LocaTwet!',
            createdAt: timestamp
        });
        
        console.log('User data saved!');

        // Save account locally
        saveAccountToLocal(username, password, email);
        
        alert('Berjaya daftar! Selamat datang ' + username + '!');
        
        // Clear form
        document.getElementById('regUsername').value = '';
        document.getElementById('regPassword').value = '';
        document.getElementById('regConfirm').value = '';
        
    } catch (error) {
        console.error('Register error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        if (error.code === 'auth/email-already-in-use') {
            alert('Username ini sudah digunakan! Cuba username lain.');
        } else if (error.code === 'auth/weak-password') {
            alert('Password terlalu lemah!');
        } else if (error.code === 'auth/invalid-email') {
            alert('Format email tidak sah!');
        } else {
            alert('Ralat: ' + error.message);
        }
    }
};

// Login - SIMPLE VERSION
window.login = async () => {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        alert('Sila isi username dan password!');
        return;
    }

    try {
        // Check dari local storage dulu
        const accounts = JSON.parse(localStorage.getItem('locatwet_accounts') || '[]');
        const account = accounts.find(acc => acc.username === username);
        
        if (!account) {
            alert('Username tidak dijumpai! Sila daftar dulu.');
            return;
        }

        console.log('Trying to login with email:', account.email);
        
        // Login dengan email yang disimpan
        await signInWithEmailAndPassword(auth, account.email, password);
        
        console.log('Login successful!');
        
    } catch (error) {
        console.error('Login error:', error);
        
        if (error.code === 'auth/wrong-password') {
            alert('Password salah!');
        } else if (error.code === 'auth/user-not-found') {
            alert('Akaun tidak wujud!');
        } else if (error.code === 'auth/invalid-credential') {
            alert('Username atau password salah!');
        } else {
            alert('Login gagal: ' + error.message);
        }
    }
};

// Save Account to Local Storage
function saveAccountToLocal(username, password, email) {
    let accounts = JSON.parse(localStorage.getItem('locatwet_accounts') || '[]');
    
    // Remove if already exists
    accounts = accounts.filter(acc => acc.username !== username);
    
    // Add to beginning
    accounts.unshift({ username, password, email });
    
    // Keep only 3 accounts
    if (accounts.length > 3) {
        accounts = accounts.slice(0, 3);
    }
    
    localStorage.setItem('locatwet_accounts', JSON.stringify(accounts));
    console.log('Account saved to localStorage');
}

// Show Register/Login
window.showRegister = () => {
    document.getElementById('loginPage').classList.remove('active');
    document.getElementById('registerPage').classList.add('active');
};

window.showLogin = () => {
    document.getElementById('registerPage').classList.remove('active');
    document.getElementById('loginPage').classList.add('active');
};

// Logout
window.logout = async () => {
    if (confirm('Log keluar?')) {
        await signOut(auth);
        currentUser = null;
    }
};

// Update Profile Display
function updateProfileDisplay() {
    if (currentUser) {
        document.getElementById('profileAvatar').textContent = currentUser.username.charAt(0).toUpperCase();
        document.getElementById('profileUsername').textContent = currentUser.username;
        document.getElementById('profileBio').textContent = currentUser.bio || 'Selamat datang!';
    }
}

// Show Page
window.showPage = (page) => {
    document.getElementById('feedPage').classList.add('hidden');
    document.getElementById('uploadPage').classList.add('hidden');
    document.getElementById('profilePage').classList.add('hidden');
    
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    if (page === 'feed') {
        document.getElementById('feedPage').classList.remove('hidden');
        document.querySelectorAll('.nav-btn')[0].classList.add('active');
        loadPosts();
    } else if (page === 'upload') {
        document.getElementById('uploadPage').classList.remove('hidden');
        document.querySelectorAll('.nav-btn')[1].classList.add('active');
    } else if (page === 'profile') {
        document.getElementById('profilePage').classList.remove('hidden');
        document.querySelectorAll('.nav-btn')[2].classList.add('active');
    }
};

// Preview File
window.previewFile = () => {
    const file = document.getElementById('fileInput').files[0];
    if (!file) return;

    selectedFile = file;
    const reader = new FileReader();
    
    reader.onload = (e) => {
        const preview = document.getElementById('previewArea');
        if (file.type.startsWith('image/')) {
            preview.innerHTML = `<img src="${e.target.result}">`;
        } else if (file.type.startsWith('video/')) {
            preview.innerHTML = `<video src="${e.target.result}" controls></video>`;
        }
    };
    
    reader.readAsDataURL(file);
};

// Upload Post
window.uploadPost = async () => {
    if (!selectedFile) {
        alert('Sila pilih gambar atau video!');
        return;
    }

    const caption = document.getElementById('postCaption').value.trim();
    
    try {
        // Upload file
        const fileName = `${Date.now()}_${selectedFile.name}`;
        const fileRef = storageRef(storage, `posts/${fileName}`);
        const snapshot = await uploadBytes(fileRef, selectedFile);
        const mediaUrl = await getDownloadURL(snapshot.ref);

        // Save post
        const postRef = push(ref(db, 'posts'));
        await set(postRef, {
            userId: currentUser.uid,
            username: currentUser.username,
            caption: caption,
            mediaUrl: mediaUrl,
            mediaType: selectedFile.type.startsWith('image/') ? 'image' : 'video',
            likes: 0,
            timestamp: Date.now()
        });

        alert('Post berjaya!');
        
        // Reset
        document.getElementById('postCaption').value = '';
        document.getElementById('previewArea').innerHTML = '';
        document.getElementById('fileInput').value = '';
        selectedFile = null;
        
        showPage('feed');
    } catch (error) {
        console.error('Upload error:', error);
        alert('Gagal upload: ' + error.message);
    }
};

// Load Posts
function loadPosts() {
    const postsRef = ref(db, 'posts');
    
    onValue(postsRef, (snapshot) => {
        const posts = [];
        snapshot.forEach((child) => {
            posts.push({ id: child.key, ...child.val() });
        });
        
        posts.sort((a, b) => b.timestamp - a.timestamp);
        displayPosts(posts);
    });
}

// Display Posts
function displayPosts(posts) {
    const container = document.getElementById('postsContainer');
    
    if (posts.length === 0) {
        container.innerHTML = '<div class="loading">Tiada post lagi</div>';
        return;
    }

    container.innerHTML = posts.map(post => {
        const isLiked = post.likedBy && post.likedBy[currentUser.uid];
        const likesCount = post.likes || 0;
        const commentsCount = post.comments ? Object.keys(post.comments).length : 0;
        
        const mediaTag = post.mediaType === 'image' 
            ? `<img src="${post.mediaUrl}" class="post-media">`
            : `<video src="${post.mediaUrl}" class="post-media" controls></video>`;

        return `
            <div class="post">
                <div class="post-header">
                    <div class="avatar">${post.username.charAt(0).toUpperCase()}</div>
                    <div class="post-user">
                        <div class="post-username">${post.username}</div>
                        <div class="post-time">${formatTime(post.timestamp)}</div>
                    </div>
                </div>
                ${mediaTag}
                ${post.caption ? `<div class="post-caption">${escapeHtml(post.caption)}</div>` : ''}
                <div class="post-actions">
                    <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${post.id}')">
                        ${isLiked ? '❤️' : '🤍'} ${likesCount}
                    </button>
                    <button class="action-btn" onclick="showComments('${post.id}')">
                        💬 ${commentsCount}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Baru';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    
    return new Date(timestamp).toLocaleDateString('ms-MY');
}

// Toggle Like
window.toggleLike = async (postId) => {
    try {
        const postRef = ref(db, `posts/${postId}`);
        const snapshot = await get(postRef);
        const post = snapshot.val();

        const likedBy = post.likedBy || {};
        const isLiked = likedBy[currentUser.uid];

        if (isLiked) {
            delete likedBy[currentUser.uid];
            await update(postRef, {
                likes: Math.max(0, (post.likes || 0) - 1),
                likedBy: likedBy
            });
        } else {
            likedBy[currentUser.uid] = true;
            await update(postRef, {
                likes: (post.likes || 0) + 1,
                likedBy: likedBy
            });
        }
    } catch (error) {
        console.error('Like error:', error);
    }
};

// Show Comments
window.showComments = async (postId) => {
    currentPostId = postId;
    document.getElementById('commentModal').classList.add('active');
    
    const commentsRef = ref(db, `posts/${postId}/comments`);
    onValue(commentsRef, (snapshot) => {
        const comments = [];
        snapshot.forEach((child) => {
            comments.push({ id: child.key, ...child.val() });
        });
        
        comments.sort((a, b) => a.timestamp - b.timestamp);
        displayComments(comments);
    });
};

function displayComments(comments) {
    const container = document.getElementById('commentsList');
    
    if (comments.length === 0) {
        container.innerHTML = '<div class="loading">Tiada komen</div>';
        return;
    }

    container.innerHTML = comments.map(comment => `
        <div class="comment">
            <div class="comment-header">
                <div class="comment-avatar">${comment.username.charAt(0).toUpperCase()}</div>
                <span class="comment-username">${comment.username}</span>
            </div>
            <div class="comment-text">${escapeHtml(comment.text)}</div>
        </div>
    `).join('');
}

// Post Comment
window.postComment = async () => {
    const text = document.getElementById('commentInput').value.trim();
    
    if (!text) {
        alert('Tulis komen dulu!');
        return;
    }

    try {
        const commentRef = push(ref(db, `posts/${currentPostId}/comments`));
        await set(commentRef, {
            userId: currentUser.uid,
            username: currentUser.username,
            text: text,
            timestamp: Date.now()
        });

        document.getElementById('commentInput').value = '';
    } catch (error) {
        console.error('Comment error:', error);
    }
};

// Edit Profile
window.showEditModal = () => {
    document.getElementById('editUsername').value = currentUser.username;
    document.getElementById('editModal').classList.add('active');
};

window.updateUsername = async () => {
    const newUsername = document.getElementById('editUsername').value.trim();
    
    if (!newUsername || newUsername.length < 3) {
        alert('Username minimum 3 huruf!');
        return;
    }

    try {
        await update(ref(db, `users/${currentUser.uid}`), {
            username: newUsername
        });

        currentUser.username = newUsername;
        updateProfileDisplay();
        closeModal('editModal');
        alert('Username updated!');
    } catch (error) {
        alert('Gagal update!');
    }
};

// Change Password
window.showPasswordModal = () => {
    document.getElementById('passwordModal').classList.add('active');
};

window.updatePassword = async () => {
    const oldPass = document.getElementById('oldPassword').value;
    const newPass = document.getElementById('newPassword').value;

    if (!oldPass || !newPass) {
        alert('Isi semua field!');
        return;
    }

    if (newPass.length < 6) {
        alert('Password baru minimum 6 huruf!');
        return;
    }

    try {
        const user = auth.currentUser;
        const credential = EmailAuthProvider.credential(user.email, oldPass);
        
        await reauthenticateWithCredential(user, credential);
        await fbUpdatePassword(user, newPass);

        document.getElementById('oldPassword').value = '';
        document.getElementById('newPassword').value = '';
        closeModal('passwordModal');
        alert('Password changed!');
    } catch (error) {
        if (error.code === 'auth/wrong-password') {
            alert('Password lama salah!');
        } else {
            alert('Gagal!');
        }
    }
};

// Switch Account
window.showSwitchModal = () => {
    const accounts = JSON.parse(localStorage.getItem('locatwet_accounts') || '[]');
    const container = document.getElementById('accountsList');
    
    if (accounts.length === 0) {
        container.innerHTML = '<div class="loading">Tiada akaun lain</div>';
    } else {
        container.innerHTML = accounts.map(acc => `
            <div class="account-item" onclick="switchToAccount('${acc.username}', '${acc.password}', '${acc.email}')">
                <div class="account-info">
                    <div class="account-avatar">${acc.username.charAt(0).toUpperCase()}</div>
                    <span>${acc.username}</span>
                </div>
                ${acc.username === currentUser.username ? '<span style="color:#667eea">✓</span>' : ''}
            </div>
        `).join('');
    }
    
    document.getElementById('switchModal').classList.add('active');
};

window.switchToAccount = async (username, password, email) => {
    if (username === currentUser.username) {
        alert('Dah guna akaun ni!');
        return;
    }

    try {
        await signOut(auth);
        await signInWithEmailAndPassword(auth, email, password);
        closeModal('switchModal');
    } catch (error) {
        alert('Gagal switch!');
    }
};

// Close Modal
window.closeModal = (modalId) => {
    document.getElementById(modalId).classList.remove('active');
    
    if (modalId === 'commentModal') {
        document.getElementById('commentInput').value = '';
        currentPostId = null;
    }
};
