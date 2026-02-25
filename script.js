document.addEventListener('DOMContentLoaded', () => {
    // ---- ESTADO DE LA APLICACIÓN ----
    let users = [];
    let nextUserCode = 1;

    // ---- ELEMENTOS DEL DOM ----
    const tabs = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Registro
    const songsContainer = document.getElementById('songs-container');
    const registroForm = document.getElementById('registro-form');
    
    // Visualizar
    const usersList = document.getElementById('users-list');
    
    // Sortear
    const btnSortear = document.getElementById('btn-sortear');
    const sorteoAnimation = document.getElementById('sorteo-animation');
    const sorteoResults = document.getElementById('sorteo-results');
    const queueList = document.getElementById('queue-list');

    // ---- INICIALIZAR INPUTS DE CANCIONES ----
    function initSongsInputs() {
        songsContainer.innerHTML = '';
        for (let i = 1; i <= 5; i++) {
            const songHTML = `
                <div class="song-entry" data-priority="${i}">
                    <h4>Prioridad ${i} ${i === 1 ? '(Por defecto)' : ''}</h4>
                    <div>
                        <input type="text" id="artist-${i}" placeholder="Artista de la canción" ${i === 1 ? 'required' : ''}>
                    </div>
                    <div>
                        <input type="text" id="title-${i}" placeholder="Nombre de la canción" ${i === 1 ? 'required' : ''}>
                    </div>
                </div>
            `;
            songsContainer.insertAdjacentHTML('beforeend', songHTML);
        }
    }

    initSongsInputs();

    // ---- CAMBIO DE PESTAÑAS ----
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remover activos
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Activar actual
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');

            if (tab.dataset.tab === 'visualizar') {
                renderUsers();
            }
        });
    });

    // ---- LÓGICA DE REGISTRO ----
    registroForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = document.getElementById('user-name').value;
        const songs = [];
        let hasValidSong = false;

        for (let i = 1; i <= 5; i++) {
            const artist = document.getElementById(`artist-${i}`).value.trim();
            const title = document.getElementById(`title-${i}`).value.trim();
            
            if (artist && title) {
                songs.push({
                    id: `${Date.now()}-${i}`,
                    priority: i,
                    artist: artist,
                    title: title
                });
                hasValidSong = true;
            }
        }

        if (!hasValidSong) {
            alert('El abismo requiere al menos un himno. Llena la Prioridad 1.');
            return;
        }

        const newUser = {
            id: nextUserCode,
            code: `ALMA-${String(nextUserCode).padStart(3, '0')}`,
            name: name,
            songs: songs,
            selectedSong: { ...songs[0] } // Por defecto la de prioridad 1
        };

        users.push(newUser);
        nextUserCode++;
        
        registroForm.reset();
        
        // Efecto visual rápido
        const btn = registroForm.querySelector('button');
        const oldText = btn.textContent;
        btn.textContent = '¡REGISTRADO EN LA OSCURIDAD!';
        btn.style.backgroundColor = 'var(--accent-purple)';
        btn.style.borderColor = 'var(--accent-purple)';
        
        setTimeout(() => {
            btn.textContent = oldText;
            btn.style.backgroundColor = '';
            btn.style.borderColor = '';
        }, 2000);
    });

    // ---- LÓGICA DE VISUALIZAR ----
    function getAllSongsInSystem() {
        let allSongs = [];
        users.forEach(u => {
            u.songs.forEach(s => {
                allSongs.push({
                    originalUserId: u.id,
                    originalUserName: u.name,
                    ...s
                });
            });
        });
        return allSongs;
    }

    function renderUsers() {
        usersList.innerHTML = '';
        const allSongs = getAllSongsInSystem();

        if (users.length === 0) {
            usersList.innerHTML = '<p style="color: var(--text-secondary); text-align: center; grid-column: 1/-1;">El abismo está vacío. Aún no hay almas registradas.</p>';
            return;
        }

        users.forEach(user => {
            const card = document.createElement('div');
            card.className = 'user-card';

            const songsHTML = user.songs.map(song => 
                `<li>
                    <div class="song-info">
                        <span class="song-artist">${song.artist}</span>
                        <span class="song-title">${song.title}</span>
                    </div>
                    <span class="priority-badge p-${song.priority}">P${song.priority}</span>
                    <button class="btn-small btn-danger" onclick="deleteSong(${user.id}, '${song.id}')">X</button>
                </li>`
            ).join('');

            // Generar opciones para el selector de canción (propias y de otros)
            const optionsHTML = allSongs.map(song => {
                const isSelected = user.selectedSong && 
                                   user.selectedSong.artist === song.artist && 
                                   user.selectedSong.title === song.title;
                const ownershipText = song.originalUserId === user.id ? '(Tuya)' : `(De ${song.originalUserName})`;
                // Usamos artist|title como value para facil parsing
                return `<option value="${song.artist}|${song.title}" ${isSelected ? 'selected' : ''}>
                    ${song.artist} - ${song.title} ${ownershipText}
                </option>`;
            }).join('');

            card.innerHTML = `
                <div class="user-card-header">
                    <h3>${user.name}</h3>
                    <span class="user-code">${user.code}</span>
                </div>
                
                <ul class="user-songs">
                    ${songsHTML}
                </ul>
                
                <div class="selected-song-control">
                    <h4>Canción elegida para cantar:</h4>
                    <select id="select-song-${user.id}" onchange="changeSelectedSong(${user.id}, this.value)">
                        ${optionsHTML}
                    </select>
                </div>

                <button class="btn-primary" style="margin-top: 1rem; padding: 0.8rem; font-size: 0.9rem;" onclick="deleteUser(${user.id})">ELIMINAR ALMA</button>
            `;
            
            usersList.appendChild(card);
        });
    }

    window.deleteUser = function(userId) {
        if(confirm('¿Seguro que deseas eliminar a esta alma del registro para siempre?')) {
            users = users.filter(u => u.id !== userId);
            renderUsers();
        }
    };

    window.deleteSong = function(userId, songId) {
        const user = users.find(u => u.id === userId);
        if (user) {
            const songToDelete = user.songs.find(s => s.id === songId);
            user.songs = user.songs.filter(s => s.id !== songId);
            
            // Si la canción eliminada era la que iba a cantar, asignarle otra o nada
            if (user.selectedSong && songToDelete && 
                user.selectedSong.artist === songToDelete.artist && 
                user.selectedSong.title === songToDelete.title) {
                user.selectedSong = user.songs.length > 0 ? { ...user.songs[0] } : null;
            }
            renderUsers();
        }
    };

    window.changeSelectedSong = function(userId, songValue) {
        const user = users.find(u => u.id === userId);
        if (user) {
            const [artist, title] = songValue.split('|');
            user.selectedSong = { artist, title };
        }
    };

    // ---- LÓGICA DE SORTEO ----
    btnSortear.addEventListener('click', () => {
        if (users.length === 0) {
            alert('El abismo está vacío. Registra al menos una persona.');
            return;
        }

        // Ocultar resultados, mostrar animación
        sorteoResults.classList.add('hidden');
        sorteoAnimation.classList.remove('hidden');
        btnSortear.disabled = true;
        
        // Cambiar texto glitch dinámicamente
        const glitchText = sorteoAnimation.querySelector('.glitch-text');
        const originalText = glitchText.textContent;
        let interval = setInterval(() => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
            let randomStr = '';
            for(let i=0; i<15; i++) {
                randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            glitchText.textContent = randomStr;
            glitchText.setAttribute('data-text', randomStr);
        }, 100);

        // Terminar animación
        setTimeout(() => {
            clearInterval(interval);
            glitchText.textContent = originalText;
            glitchText.setAttribute('data-text', originalText);
            
            sorteoAnimation.classList.add('hidden');
            btnSortear.disabled = false;
            generateQueue();
            sorteoResults.classList.remove('hidden');
            
            // Scroll a los resultados
            sorteoResults.scrollIntoView({ behavior: 'smooth' });
        }, 3000); // 3 segundos de mezcla caótica
    });

    function generateQueue() {
        // Mezclar usuarios (Fisher-Yates)
        let shuffled = [...users];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        queueList.innerHTML = '';
        shuffled.forEach((user, index) => {
            const li = document.createElement('li');
            li.className = 'queue-item';
            
            const songDisplay = user.selectedSong 
                ? `<span style="color:var(--text-primary)">${user.selectedSong.artist}</span> - ${user.selectedSong.title}`
                : 'Sin canción... cantará el silencio.';

            li.innerHTML = `
                <div class="queue-number">${index + 1}</div>
                <div class="queue-details">
                    <div class="queue-name">${user.name}</div>
                    <div class="queue-song">🎤 ${songDisplay}</div>
                </div>
                <div class="queue-code">${user.code}</div>
            `;
            
            // Animación en cascada
            li.style.animationDelay = `${index * 0.15}s`;
            li.style.animation = 'fadeIn 0.5s ease backwards';
            
            queueList.appendChild(li);
        });
    }
});
