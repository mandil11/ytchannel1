document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    let myVideos = JSON.parse(localStorage.getItem('d11_videos')) || [];
    let myIdeas = JSON.parse(localStorage.getItem('d11_ideas')) || [];
    let currentDeleteId = null;
    let deleteType = null; // 'video' or 'idea'

    function saveState() {
        localStorage.setItem('d11_videos', JSON.stringify(myVideos));
        localStorage.setItem('d11_ideas', JSON.stringify(myIdeas));
    }

    // --- DOM Elements ---
    const screens = {
        login: document.getElementById('login-screen'),
        main: document.getElementById('main-screen')
    };
    
    const loader = document.getElementById('sync-loader');

    const inputs = {
        password: document.getElementById('password-input'),
        globalSearch: document.getElementById('global-search-input'),
        newIdea: document.getElementById('new-idea-input'),
        videoTitle: document.getElementById('new-title'),
        videoLink: document.getElementById('new-link')
    };

    const btns = {
        login: document.getElementById('login-btn'),
        logout: document.getElementById('logout-btn'),
        mobileLogout: document.getElementById('mobile-logout-btn'),
        mobileAdd: document.getElementById('mobile-add-btn'),
        addIdea: document.getElementById('add-idea-btn'),
        gotoIdeas: document.querySelector('.goto-ideas-btn'),
        openAddVideo: document.getElementById('open-add-modal'),
        closeAddVideo: document.getElementById('close-modal'),
        cancelAdd: document.getElementById('cancel-add'),
        saveVideo: document.getElementById('save-video'),
        clearSearch: document.getElementById('clear-search'),
        cancelDelete: document.getElementById('cancel-delete'),
        confirmDelete: document.getElementById('confirm-delete')
    };

    const modals = {
        addVideo: document.getElementById('add-modal'),
        delete: document.getElementById('delete-modal')
    };

    const containers = {
        videoList: document.getElementById('video-list'),
        ideasList: document.getElementById('ideas-list'),
        notFound: document.getElementById('not-found-msg'),
        noIdeas: document.getElementById('no-ideas-msg'),
        resultCount: document.getElementById('result-count')
    };

    const stats = {
        weeklyCount: document.getElementById('weekly-count'),
        weeklyProgress: document.getElementById('weekly-progress'),
        weeklyMsg: document.getElementById('weekly-msg'),
        ideaCount: document.getElementById('idea-count-stat')
    };

    // --- Loading System (Sync Simulation) ---
    function showSync(callback, delay = 600) {
        loader.classList.remove('hidden');
        setTimeout(() => {
            if (callback) callback();
            loader.classList.add('hidden');
        }, delay);
    }

    // --- Tab Navigation ---
    const switchTab = (tabId) => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        const btn = document.querySelector(`[data-tab="${tabId}"]`);
        if(btn) btn.classList.add('active');
        
        const content = document.getElementById(`tab-${tabId}`);
        if(content) content.classList.add('active');
        
        // Clear search when leaving library
        if(tabId !== 'library') {
            inputs.globalSearch.value = '';
            btns.clearSearch.style.display = 'none';
        }
    };

    document.querySelectorAll('[data-tab]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabId = e.currentTarget.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    if(btns.gotoIdeas) {
        btns.gotoIdeas.addEventListener('click', () => switchTab('ideas'));
    }

    // --- Authentication ---
    const handleLogin = () => {
        if (inputs.password.value === '0630') {
            showSync(() => {
                screens.login.classList.remove('active');
                screens.main.classList.add('active');
                renderAll();
            }, 800);
            inputs.password.value = '';
            document.getElementById('login-error').style.display = 'none';
        } else {
            document.getElementById('login-error').style.display = 'block';
        }
    };

    const handleLogout = () => {
        showSync(() => {
            screens.main.classList.remove('active');
            screens.login.classList.add('active');
            switchTab('dashboard'); // reset to dashboard
        }, 500);
    };

    btns.login.addEventListener('click', handleLogin);
    inputs.password.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });
    btns.logout.addEventListener('click', handleLogout);
    btns.mobileLogout.addEventListener('click', handleLogout);

    // --- Dashboard Stats Logic ---
    function updateDashboardStats() {
        stats.ideaCount.textContent = myIdeas.length;

        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0,0,0,0);

        let weekCount = 0;
        myVideos.forEach(v => {
            const vDate = new Date(v.timestamp);
            if(vDate >= startOfWeek) weekCount++;
        });

        stats.weeklyCount.textContent = weekCount;
        
        let percentage = (weekCount / 7) * 100;
        if(percentage > 100) percentage = 100;
        stats.weeklyProgress.style.width = `${percentage}%`;

        if (weekCount === 0) {
            stats.weeklyMsg.textContent = "Start your week strong! Let's upload.";
            stats.weeklyProgress.style.background = "linear-gradient(90deg, #ef4444, #f59e0b)";
        } else if (weekCount >= 7) {
            stats.weeklyMsg.textContent = "🎉 Goal Achieved! You are unstoppable.";
            stats.weeklyProgress.style.background = "#10b981";
        } else {
            stats.weeklyMsg.textContent = `${7 - weekCount} more to go this week. Keep creating!`;
            stats.weeklyProgress.style.background = "linear-gradient(90deg, #3b82f6, #10b981)";
        }
    }

    // --- Video Logic ---
    function getYouTubeID(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    const openAddModal = () => modals.addVideo.classList.add('active');
    const closeAddModal = () => modals.addVideo.classList.remove('active');

    btns.openAddVideo.addEventListener('click', openAddModal);
    btns.mobileAdd.addEventListener('click', openAddModal);
    btns.closeAddVideo.addEventListener('click', closeAddModal);
    btns.cancelAdd.addEventListener('click', closeAddModal);

    btns.saveVideo.addEventListener('click', () => {
        const title = inputs.videoTitle.value.trim();
        let link = inputs.videoLink.value.trim();
        
        if (!title || !link) return alert('Please fill out both title and link');
        if (!link.startsWith('http')) link = 'https://' + link;

        const ytID = getYouTubeID(link);
        const img = ytID ? `https://img.youtube.com/vi/${ytID}/hqdefault.jpg` 
                         : `https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=500`;

        myVideos.unshift({
            id: Date.now().toString(),
            title, link, img,
            date: new Date().toLocaleDateString(),
            timestamp: Date.now()
        });

        // Use loading system
        showSync(() => {
            saveState();
            renderVideos(myVideos);
            updateDashboardStats();
            switchTab('library');
            closeAddModal();
            inputs.videoTitle.value = ''; inputs.videoLink.value = '';
        });
    });

    const renderVideos = (videosToRender) => {
        containers.videoList.innerHTML = '';
        if (videosToRender.length === 0) {
            containers.videoList.style.display = 'none';
            containers.notFound.classList.remove('hidden');
            containers.resultCount.textContent = '0 results';
        } else {
            containers.videoList.style.display = 'flex';
            containers.notFound.classList.add('hidden');
            containers.resultCount.textContent = `${videosToRender.length} video${videosToRender.length !== 1 ? 's' : ''} in library`;
            
            videosToRender.forEach((video, index) => {
                const card = document.createElement('a');
                card.className = 'video-card-horiz';
                card.href = video.link;
                card.target = '_blank';
                card.style.animationDelay = `${(index % 10) * 0.05}s`;
                
                card.innerHTML = `
                    <div class="video-thumb">
                        <img src="${video.img}" alt="${video.title}">
                        <div class="play-overlay">▶</div>
                    </div>
                    <div class="video-info">
                        <div class="video-title" title="${video.title}">${video.title}</div>
                        <div class="video-meta">Published: ${video.date}</div>
                    </div>
                    <button class="del-btn del-btn-abs" data-id="${video.id}" data-type="video">Delete</button>
                `;
                containers.videoList.appendChild(card);
            });
            attachDeleteListeners();
        }
    };

    // Global Search
    inputs.globalSearch.addEventListener('input', () => {
        const query = inputs.globalSearch.value.toLowerCase().trim();
        btns.clearSearch.style.display = query.length > 0 ? 'block' : 'none';
        
        // Auto-switch to library tab if typing in global search
        if(!document.getElementById('tab-library').classList.contains('active')) {
            switchTab('library');
        }

        renderVideos(myVideos.filter(v => v.title.toLowerCase().includes(query)));
    });
    
    btns.clearSearch.addEventListener('click', () => {
        inputs.globalSearch.value = '';
        inputs.globalSearch.dispatchEvent(new Event('input'));
    });

    // --- Ideas Logic ---
    btns.addIdea.addEventListener('click', () => {
        const text = inputs.newIdea.value.trim();
        if(!text) return;
        
        myIdeas.unshift({ id: Date.now().toString(), text, date: new Date().toLocaleDateString() });
        
        showSync(() => {
            saveState();
            renderIdeas();
            updateDashboardStats();
            inputs.newIdea.value = '';
        }, 400);
    });

    const renderIdeas = () => {
        containers.ideasList.innerHTML = '';
        if(myIdeas.length === 0) {
            containers.noIdeas.classList.remove('hidden');
        } else {
            containers.noIdeas.classList.add('hidden');
            myIdeas.forEach((idea, index) => {
                const div = document.createElement('div');
                div.className = 'idea-row';
                div.style.animation = `fadeIn ${0.3 + (index * 0.1)}s ease`;
                div.innerHTML = `
                    <div>
                        <div class="idea-title">${idea.text}</div>
                        <span class="idea-date">Vaulted on: ${idea.date}</span>
                    </div>
                    <div class="idea-actions">
                        <button class="primary-btn make-video-btn" data-id="${idea.id}" data-text="${idea.text}" style="padding: 10px 15px; font-size:14px;">Make Video</button>
                        <button class="del-btn" data-id="${idea.id}" data-type="idea">Discard</button>
                    </div>
                `;
                containers.ideasList.appendChild(div);
            });

            // Convert Idea to Video Logic
            document.querySelectorAll('.make-video-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const text = e.target.getAttribute('data-text');
                    inputs.videoTitle.value = text;
                    openAddModal();
                });
            });

            attachDeleteListeners();
        }
    };

    // --- Delete Flow ---
    function attachDeleteListeners() {
        document.querySelectorAll('.del-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault(); 
                e.stopPropagation(); 
                currentDeleteId = e.target.getAttribute('data-id');
                deleteType = e.target.getAttribute('data-type');
                modals.delete.classList.add('active');
            });
        });
    }

    btns.confirmDelete.addEventListener('click', () => {
        showSync(() => {
            if(deleteType === 'video') {
                myVideos = myVideos.filter(v => v.id !== currentDeleteId);
                renderVideos(inputs.globalSearch.value ? myVideos.filter(v => v.title.toLowerCase().includes(inputs.globalSearch.value.toLowerCase())) : myVideos);
            } else if(deleteType === 'idea') {
                myIdeas = myIdeas.filter(i => i.id !== currentDeleteId);
                renderIdeas();
            }
            saveState();
            updateDashboardStats();
            modals.delete.classList.remove('active');
        }, 500);
    });

    btns.cancelDelete.addEventListener('click', () => {
        modals.delete.classList.remove('active');
    });

    // --- Initial Render ---
    function renderAll() {
        updateDashboardStats();
        renderVideos(myVideos);
        renderIdeas();
    }
});
