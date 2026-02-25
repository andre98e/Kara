import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    onSnapshot,
    doc,
    deleteDoc,
    updateDoc,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBdw4lYnpqQGPLgAKz936XnhV3saHF3yQU",
    authDomain: "karaoke-b2434.firebaseapp.com",
    projectId: "karaoke-b2434",
    storageBucket: "karaoke-b2434.firebasestorage.app",
    messagingSenderId: "136338036566",
    appId: "1:136338036566:web:14a114f1f0a2eb4dc8a8f7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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

    // Edición (Inyectado dinámicamente para no tocar el HTML base)
    if (!document.getElementById('edit-modal')) {
        const modalHTML = `
        <div id="edit-modal" class="modal-overlay hidden">
            <div class="modal-content">
                <div class="section-header">
                    <h2>EDITAR ALMA</h2>
                    <p>Modifica el nombre y sus canciones.</p>
                </div>
                <form id="edit-form">
                    <input type="hidden" id="edit-user-id">
                    <div class="form-group main-input">
                        <label for="edit-user-name">Nombre del Cantante</label>
                        <input type="text" id="edit-user-name" required>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; margin-top: 2rem;">
                        <h3 class="songs-title" style="margin-top:0; border-bottom:none; padding-bottom:0;">Sus Canciones</h3>
                        <button type="button" id="btn-add-song" class="btn-small" style="color:var(--accent-purple); border-color:var(--accent-purple); display:none;">+ AÑADIR</button>
                    </div>

                    <div id="edit-songs-container">
                        <!-- Generado por JS -->
                    </div>

                    <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                        <button type="button" class="btn-primary btn-danger" id="close-edit-modal" style="flex: 1;">CANCELAR</button>
                        <button type="submit" class="btn-primary" style="flex: 1; margin-top: 0;">GUARDAR CAMBIOS</button>
                    </div>
                </form>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-form');
    const closeEditModal = document.getElementById('close-edit-modal');
    const editSongsContainer = document.getElementById('edit-songs-container');
    const editUserName = document.getElementById('edit-user-name');
    const editUserId = document.getElementById('edit-user-id');
    const btnAddSong = document.getElementById('btn-add-song');

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

    // ---- ESCUCHAR FIREBASE EN TIEMPO REAL ----
    const usersCol = collection(db, 'users');
    const q = query(usersCol, orderBy('timestamp', 'asc'));

    onSnapshot(q, (snapshot) => {
        users = [];
        let maxCodeNum = 0;

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            users.push({ id: docSnap.id, ...data });

            if (data.code && data.code.startsWith('ALMA-')) {
                const num = parseInt(data.code.split('-')[1]);
                if (!isNaN(num) && num > maxCodeNum) {
                    maxCodeNum = num;
                }
            }
        });

        nextUserCode = maxCodeNum + 1;

        // Actualizar la vista si estamos en la pestaña VISUALIZAR
        if (document.getElementById('visualizar').classList.contains('active')) {
            renderUsers();
        }
    });

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
    registroForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('user-name').value;
        const songs = [];
        let hasValidSong = false;

        for (let i = 1; i <= 5; i++) {
            const artist = document.getElementById(`artist-${i}`).value.trim();
            const title = document.getElementById(`title-${i}`).value.trim();

            if (artist && title) {
                songs.push({
                    id: `${Date.now()}-${name}-${i}`,
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

        const btn = registroForm.querySelector('button');
        btn.disabled = true;

        try {
            const newUserCode = `ALMA-${String(nextUserCode).padStart(3, '0')}`;
            await addDoc(collection(db, 'users'), {
                code: newUserCode,
                name: name,
                songs: songs,
                selectedSong: { ...songs[0] },
                timestamp: Date.now()
            });

            registroForm.reset();

            const oldText = btn.textContent;
            btn.textContent = '¡REGISTRADO EN LA OSCURIDAD!';
            btn.style.backgroundColor = 'var(--accent-purple)';
            btn.style.borderColor = 'var(--accent-purple)';

            setTimeout(() => {
                btn.textContent = oldText;
                btn.style.backgroundColor = '';
                btn.style.borderColor = '';
            }, 2000);
        } catch (error) {
            console.error("Error al registrar:", error);
            alert("El abismo rechazó tu alma. (Error de conexión)");
        } finally {
            btn.disabled = false;
        }
    });

    // ---- LÓGICA DE VISUALIZAR ----
    function getAllSongsInSystem() {
        let allSongs = [];
        users.forEach(u => {
            if (!u.songs) return;
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

            const userSongs = user.songs || [];
            const songsHTML = userSongs.map(song =>
                `<li>
                    <div class="song-info">
                        <span class="song-artist">${song.artist}</span>
                        <span class="song-title">${song.title}</span>
                    </div>
                    <span class="priority-badge p-${song.priority}">P${song.priority}</span>
                    <button class="btn-small btn-danger" onclick="window.deleteSong('${user.id}', '${song.id}')">X</button>
                </li>`
            ).join('');

            // Generar opciones para el selector de canción (propias y de otros)
            const optionsHTML = allSongs.map(song => {
                const isSelected = user.selectedSong &&
                    user.selectedSong.artist === song.artist &&
                    user.selectedSong.title === song.title;
                const ownershipText = song.originalUserId === user.id ? '(Tuya)' : `(De ${song.originalUserName})`;
                // Usamos artista y título separados por ~~~
                const valueSafe = `${song.artist}~~~${song.title}`;
                return `<option value="${valueSafe}" ${isSelected ? 'selected' : ''}>
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
                    <select onchange="window.changeSelectedSong('${user.id}', this.value)">
                        ${optionsHTML}
                    </select>
                </div>

                <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                    <button class="btn-primary" style="flex: 1; padding: 0.8rem; font-size: 0.9rem; margin-top: 0; border-color: var(--accent-purple); color: var(--accent-purple);" onclick="window.openEditModal('${user.id}')">✏️ EDITAR</button>
                    <button class="btn-primary btn-danger" style="flex: 1; padding: 0.8rem; font-size: 0.9rem; margin-top: 0;" onclick="window.deleteUser('${user.id}')">❌ ELIMINAR</button>
                </div>
            `;

            usersList.appendChild(card);
        });
    }

    // Funciones globales para botones
    let currentEditSongsCount = 0;

    function renderEditSongsInputs(songsArray) {
        editSongsContainer.innerHTML = '';
        currentEditSongsCount = songsArray.length;

        songsArray.forEach((song, idx) => {
            const i = idx + 1;
            const songHTML = `
                <div class="song-entry edit-song-entry" data-priority="${i}">
                    <h4>Prioridad ${i} ${i === 1 ? '(Por defecto)' : ''}</h4>
                    <div>
                        <input type="text" class="edit-artist-input" value="${song.artist || ''}" placeholder="Artista de la canción" ${i === 1 ? 'required' : ''}>
                    </div>
                    <div>
                        <input type="text" class="edit-title-input" value="${song.title || ''}" placeholder="Nombre de la canción" ${i === 1 ? 'required' : ''}>
                    </div>
                </div>
            `;
            editSongsContainer.insertAdjacentHTML('beforeend', songHTML);
        });

        btnAddSong.style.display = currentEditSongsCount < 5 ? 'block' : 'none';
    }

    window.openEditModal = function (userId) {
        const user = users.find(u => u.id === userId);
        if (!user) return;

        editUserId.value = user.id;
        editUserName.value = user.name;

        const songsToEdit = user.songs && user.songs.length > 0
            ? [...user.songs].sort((a, b) => a.priority - b.priority)
            : [{ priority: 1, artist: '', title: '' }];

        renderEditSongsInputs(songsToEdit);

        editModal.classList.remove('hidden');
    };

    btnAddSong.addEventListener('click', () => {
        if (currentEditSongsCount < 5) {
            currentEditSongsCount++;
            const i = currentEditSongsCount;
            const songHTML = `
                <div class="song-entry edit-song-entry" data-priority="${i}">
                    <h4>Prioridad ${i}</h4>
                    <div>
                        <input type="text" class="edit-artist-input" placeholder="Artista de la canción">
                    </div>
                    <div>
                        <input type="text" class="edit-title-input" placeholder="Nombre de la canción">
                    </div>
                </div>
            `;
            editSongsContainer.insertAdjacentHTML('beforeend', songHTML);

            if (currentEditSongsCount >= 5) {
                btnAddSong.style.display = 'none';
            }
        }
    });

    closeEditModal.addEventListener('click', () => {
        editModal.classList.add('hidden');
    });

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const userId = editUserId.value;
        const name = editUserName.value.trim();
        const user = users.find(u => u.id === userId);
        if (!user) return;

        const newSongs = [];
        let hasValidSong = false;

        const entries = editSongsContainer.querySelectorAll('.edit-song-entry');
        entries.forEach((entry, idx) => {
            const priority = parseInt(entry.getAttribute('data-priority')) || (idx + 1);
            const artist = entry.querySelector('.edit-artist-input').value.trim();
            const title = entry.querySelector('.edit-title-input').value.trim();

            if (artist && title) {
                const oldSong = user.songs ? user.songs.find(s => s.priority === priority) : null;
                const normalizedPriority = newSongs.length + 1;
                newSongs.push({
                    id: oldSong ? oldSong.id : `${Date.now()}-${name}-${normalizedPriority}`,
                    priority: normalizedPriority,
                    artist: artist,
                    title: title
                });
                hasValidSong = true;
            }
        });

        if (!hasValidSong) {
            alert('El abismo requiere al menos un himno. Llena la Prioridad 1.');
            return;
        }

        let newSelectedSong = user.selectedSong;
        const selectedStillExists = newSelectedSong && newSongs.some(s => s.artist === newSelectedSong.artist && s.title === newSelectedSong.title);
        if (!selectedStillExists) {
            newSelectedSong = { ...newSongs[0] };
        }

        try {
            const btn = editForm.querySelector('button[type="submit"]');
            btn.disabled = true;
            await updateDoc(doc(db, 'users', userId), {
                name: name,
                songs: newSongs,
                selectedSong: newSelectedSong
            });
            editModal.classList.add('hidden');
            btn.disabled = false;
        } catch (error) {
            console.error("Error al actualizar:", error);
            alert("No se pudo actualizar el alma en el abismo.");
            editForm.querySelector('button[type="submit"]').disabled = false;
        }
    });

    window.deleteUser = async function (userId) {
        if (confirm('¿Seguro que deseas eliminar a esta alma del registro para siempre?')) {
            try {
                await deleteDoc(doc(db, 'users', userId));
            } catch (e) {
                console.error("Error al eliminar", e);
            }
        }
    };

    window.deleteSong = async function (userId, songId) {
        const user = users.find(u => u.id === userId);
        if (user) {
            const songToDelete = user.songs.find(s => s.id === songId);
            const newSongs = user.songs.filter(s => s.id !== songId);

            let newSelectedSong = user.selectedSong || null;
            if (user.selectedSong && songToDelete &&
                user.selectedSong.artist === songToDelete.artist &&
                user.selectedSong.title === songToDelete.title) {
                newSelectedSong = newSongs.length > 0 ? { ...newSongs[0] } : null;
            }

            try {
                await updateDoc(doc(db, 'users', userId), {
                    songs: newSongs,
                    selectedSong: newSelectedSong
                });
            } catch (e) {
                console.error("Error al eliminar canción", e);
            }
        }
    };

    window.changeSelectedSong = async function (userId, songValue) {
        const user = users.find(u => u.id === userId);
        if (user) {
            const [artist, title] = songValue.split('~~~');
            try {
                await updateDoc(doc(db, 'users', userId), {
                    selectedSong: { artist, title }
                });
            } catch (e) {
                console.error("Error al cambiar canción seleccionada", e);
            }
        }
    };

    // ---- LÓGICA DE SORTEO ----
    btnSortear.addEventListener('click', () => {
        if (users.length === 0) {
            alert('El abismo está vacío. Registra al menos una persona.');
            return;
        }

        sorteoResults.classList.add('hidden');
        sorteoAnimation.classList.remove('hidden');
        btnSortear.disabled = true;

        const glitchText = sorteoAnimation.querySelector('.glitch-text');
        const originalText = glitchText.textContent;
        let interval = setInterval(() => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
            let randomStr = '';
            for (let i = 0; i < 15; i++) {
                randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            glitchText.textContent = randomStr;
            glitchText.setAttribute('data-text', randomStr);
        }, 100);

        setTimeout(() => {
            clearInterval(interval);
            glitchText.textContent = originalText;
            glitchText.setAttribute('data-text', originalText);

            sorteoAnimation.classList.add('hidden');
            btnSortear.disabled = false;
            generateQueue();
            sorteoResults.classList.remove('hidden');

            sorteoResults.scrollIntoView({ behavior: 'smooth' });
        }, 3000);
    });

    function generateQueue() {
        // Copia local para el sorteo
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

            li.style.animationDelay = `${index * 0.15}s`;
            li.style.animation = 'fadeIn 0.5s ease backwards';

            queueList.appendChild(li);
        });
    }
});
