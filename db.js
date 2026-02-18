const DB_NAME = 'purelyd_db';
const DB_VERSION = 2; // Incremented for playlists

let db;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Songs Store
            if (!db.objectStoreNames.contains('songs')) {
                db.createObjectStore('songs', { keyPath: 'id' });
            }

            // Users Store
            if (!db.objectStoreNames.contains('users')) {
                db.createObjectStore('users', { keyPath: 'username' });
            }

            // Playlists Store
            if (!db.objectStoreNames.contains('playlists')) {
                db.createObjectStore('playlists', { keyPath: 'id', autoIncrement: true });
            }

            console.log("Database stores created/updated");
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = (event) => {
            reject("Database error: " + event.target.errorCode);
        };
    });
}

// User Operations
const UserDB = {
    async addUser(user) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['users'], 'readwrite');
            const store = transaction.objectStore('users');
            const request = store.add(user);
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    },

    async getUser(username) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['users'], 'readonly');
            const store = transaction.objectStore('users');
            const request = store.get(username);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async getAllUsers() {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['users'], 'readonly');
            const store = transaction.objectStore('users');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async updateUser(user) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['users'], 'readwrite');
            const store = transaction.objectStore('users');
            const request = store.put(user);
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    },

    async toggleFavorite(username, songId) {
        return new Promise(async (resolve, reject) => {
            try {
                const user = await this.getUser(username);
                if (!user) return reject("User not found");

                if (!user.favorites) user.favorites = [];
                const index = user.favorites.indexOf(songId);

                if (index === -1) {
                    user.favorites.push(songId);
                } else {
                    user.favorites.splice(index, 1);
                }

                await this.updateUser(user);
                resolve(user.favorites);
            } catch (e) {
                reject(e);
            }
        });
    }
};

// Song Operations
const SongDB = {
    async addSong(song, username) {
        const songWithUser = { ...song, username };
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['songs'], 'readwrite');
            const store = transaction.objectStore('songs');
            const request = store.put(songWithUser);
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    },

    async getSongsByUser(username) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['songs'], 'readonly');
            const store = transaction.objectStore('songs');
            const request = store.getAll();
            request.onsuccess = () => {
                const allSongs = request.result;
                const userSongs = allSongs.filter(s => s.username === username);
                resolve(userSongs);
            };
            request.onerror = () => reject(request.error);
        });
    },

    async getAllSongs() {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['songs'], 'readonly');
            const store = transaction.objectStore('songs');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async deleteSong(id) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['songs'], 'readwrite');
            const store = transaction.objectStore('songs');
            const request = store.delete(id);
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    },

    async updateSong(song) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['songs'], 'readwrite');
            const store = transaction.objectStore('songs');
            const request = store.put(song);
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }
};

// Playlist Operations
const PlaylistDB = {
    async addPlaylist(playlist) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['playlists'], 'readwrite');
            const store = transaction.objectStore('playlists');
            const request = store.add(playlist);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async getPlaylistsByUser(username) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['playlists'], 'readonly');
            const store = transaction.objectStore('playlists');
            const request = store.getAll();
            request.onsuccess = () => {
                const results = request.result.filter(p => p.username === username);
                resolve(results);
            };
            request.onerror = () => reject(request.error);
        });
    },

    async addSongToPlaylist(playlistId, songId) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['playlists'], 'readwrite');
            const store = transaction.objectStore('playlists');
            const getReq = store.get(playlistId);

            getReq.onsuccess = () => {
                const playlist = getReq.result;
                if (!playlist.songIds) playlist.songIds = [];
                if (!playlist.songIds.includes(songId)) {
                    playlist.songIds.push(songId);
                    store.put(playlist).onsuccess = () => resolve(true);
                } else {
                    resolve(true); // Already in
                }
            };
            getReq.onerror = () => reject(getReq.error);
        });
    },

    async removeSongFromPlaylist(playlistId, songId) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['playlists'], 'readwrite');
            const store = transaction.objectStore('playlists');
            const getReq = store.get(playlistId);

            getReq.onsuccess = () => {
                const playlist = getReq.result;
                playlist.songIds = playlist.songIds.filter(id => id !== songId);
                store.put(playlist).onsuccess = () => resolve(true);
            };
            getReq.onerror = () => reject(getReq.error);
        });
    },

    async getPlaylistSongs(playlistId) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['playlists', 'songs'], 'readonly');
            const pStore = transaction.objectStore('playlists');
            const sStore = transaction.objectStore('songs');

            const pReq = pStore.get(playlistId);
            pReq.onsuccess = () => {
                const p = pReq.result;
                if (!p || !p.songIds) return resolve([]);

                const sReq = sStore.getAll();
                sReq.onsuccess = () => {
                    const allSongs = sReq.result;
                    const pSongs = allSongs.filter(s => p.songIds.includes(s.id));
                    resolve(pSongs);
                };
            };
            pReq.onerror = () => reject(pReq.error);
        });
    },

    async deletePlaylist(id) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['playlists'], 'readwrite');
            const store = transaction.objectStore('playlists');
            const request = store.delete(id);
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }
};
