import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const DATA_ROOT = 'assets/data';
const LOCAL_FAVORITES_KEY = 'favoriteSongs';
const LEGACY_LOCAL_FAVORITES_KEY = 'favorites';

const firebaseConfig = {
  apiKey: 'AIzaSyDDbsIUh-1dl8oufE1EMqyw_4Jo3h87PZg',
  authDomain: 'stellive-karaoke.firebaseapp.com',
  projectId: 'stellive-karaoke',
  storageBucket: 'stellive-karaoke.firebasestorage.app',
  messagingSenderId: '880463856071',
  appId: '1:880463856071:web:fbdf89220040551c6b19e2',
  measurementId: 'G-X5C6CWLKTT',
};

const members = [
  { id: 'kanna', name: '아이리 칸나' },
  { id: 'yuni', name: '아야츠노 유니' },
  { id: 'huya', name: '사키하네 후야' },
  { id: 'mashiro', name: '네네코 마시로' },
  { id: 'hina', name: '시라유키 히나' },
  { id: 'lize', name: '아카네 리제' },
  { id: 'tabi', name: '아라하시 타비' },
  { id: 'shibuki', name: '텐코 시부키' },
  { id: 'rin', name: '아오쿠모 린' },
  { id: 'nana', name: '하나코 나나' },
  { id: 'riko', name: '유즈하 리코' },
  { id: 'GS', name: '스텔라이브 채널' },
];

const categoryLabels = {
  original: '오리지널',
  cover: '커버',
  collabo: '콜라보 / 의뢰',
  playlist: '플레이리스트',
  mashup: '매쉬업',
  concert: '콘서트',
  medley: '메들리',
};

const categoryFiles = {
  original: 'original.json',
  cover: 'cover.json',
  collabo: 'collabo.json',
  playlist: 'playlist.json',
  mashup: 'mashup.json',
  concert: 'concerts.json',
  medley: 'medley.json',
};

const fallbackFiles = {
  original: 'original.json',
  cover: 'cover.json',
  collabo: 'collabo.json',
  playlist: 'playlist.json',
  concert: 'concerts.json',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let currentUser = null;
let favoriteTitles = new Set();
let memberCategories = {};
let currentMember = 'kanna';
let currentCategory = 'original';

document.addEventListener('DOMContentLoaded', () => {
  bindNavigation();
  bindAuth();
  fetchNotices();
  fetchLastUpdateTime();
  bootSongApp();
});

async function bootSongApp() {
  memberCategories = await loadMemberCategories();
  renderSongShell();
  await selectMember(currentMember);
}

function bindNavigation() {
  document.querySelectorAll('nav a[data-member]').forEach((link) => {
    link.addEventListener('click', async (event) => {
      event.preventDefault();
      await selectMember(link.dataset.member);
    });
  });
}

function bindAuth() {
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
      await mergeLocalFavoritesToFirestore(user.uid);
      favoriteTitles = await loadRemoteFavorites(user.uid);
    } else {
      favoriteTitles = loadLocalFavorites();
    }
    renderAuthBar();
    refreshFavoriteButtons();
  });
}

function renderAuthBar() {
  const authBar = document.getElementById('auth-bar');
  if (!authBar) return;

  if (currentUser) {
    authBar.innerHTML = `
      <span class="auth-user">${escapeHtml(currentUser.displayName || currentUser.email || '로그인됨')}</span>
      <button type="button" id="logout-button">로그아웃</button>
    `;
    document.getElementById('logout-button').addEventListener('click', () => signOut(auth));
    return;
  }

  authBar.innerHTML = '<button type="button" id="login-button">Google 로그인</button>';
  document.getElementById('login-button').addEventListener('click', () => signInWithPopup(auth, provider));
}

async function loadMemberCategories() {
  try {
    return await fetchJson(`${DATA_ROOT}/member_categories.json`, 'member_categories.json');
  } catch (error) {
    console.error('멤버 카테고리 로드 실패:', error);
    return {};
  }
}

function renderSongShell() {
  const songApp = document.getElementById('song-app');
  if (!songApp) return;

  songApp.innerHTML = `
    <div class="song-toolbar">
      <select id="member-select" aria-label="멤버 선택">
        ${members.map((member) => `<option value="${member.id}">${member.name}</option>`).join('')}
      </select>
      <button type="button" id="favorite-filter-button" class="ghost-button">즐겨찾기</button>
    </div>
    <div id="category-tabs" class="category-tabs"></div>
    <div id="song-list" class="song-list"></div>
  `;

  document.getElementById('member-select').addEventListener('change', async (event) => {
    await selectMember(event.target.value);
  });
  document.getElementById('favorite-filter-button').addEventListener('click', renderFavorites);
}

async function selectMember(memberId) {
  currentMember = memberId;
  document.getElementById('member-select').value = memberId;
  document.querySelectorAll('nav a[data-member]').forEach((link) => {
    link.classList.toggle('active', link.dataset.member === memberId);
  });

  const categories = getCategoriesForMember(memberId);
  currentCategory = categories.includes(currentCategory) ? currentCategory : categories[0];
  renderCategoryTabs(categories);
  await selectCategory(currentCategory);
}

function getCategoriesForMember(memberId) {
  const configured = memberCategories[memberId];
  if (Array.isArray(configured) && configured.length > 0) return configured;
  return ['original', 'cover', 'collabo', 'playlist', 'concert'];
}

function renderCategoryTabs(categories) {
  const tabs = document.getElementById('category-tabs');
  tabs.innerHTML = categories
    .map((category) => `
      <button type="button" class="category-tab ${category === currentCategory ? 'active' : ''}" data-category="${category}">
        ${categoryLabels[category] || category}
      </button>
    `)
    .join('');

  tabs.querySelectorAll('.category-tab').forEach((button) => {
    button.addEventListener('click', async () => {
      await selectCategory(button.dataset.category);
    });
  });
}

async function selectCategory(category) {
  currentCategory = category;
  renderCategoryTabs(getCategoriesForMember(currentMember));
  const list = document.getElementById('song-list');
  list.innerHTML = '<p class="no-data">곡 목록을 불러오는 중입니다...</p>';

  try {
    const data = await loadCategoryData(currentMember, category);
    if (category === 'playlist' || category === 'mashup' || category === 'medley') {
      renderGroupedSongs(normalizePlaylists(data, category));
    } else if (category === 'concert') {
      renderConcerts(data);
    } else {
      renderSongs(data);
    }
  } catch (error) {
    console.error('곡 목록 로드 실패:', error);
    list.innerHTML = '<p class="error-msg">곡 목록을 불러오지 못했습니다.</p>';
  }
}

async function loadCategoryData(memberId, category) {
  const fileName = categoryFiles[category] || `${category}.json`;
  const fallback = fallbackFiles[category];
  return fetchJson(`${DATA_ROOT}/${memberId}/${fileName}`, fallback);
}

function normalizePlaylists(data, category) {
  return data.map((item) => ({
    title: item.playlistTitle || item.mashupTitle || item.MedleyTitle || categoryLabels[category],
    songs: item.songs || item.tracks || [],
  }));
}

function renderSongs(songs) {
  const list = document.getElementById('song-list');
  if (!Array.isArray(songs) || songs.length === 0) {
    list.innerHTML = '<p class="no-data">등록된 곡이 없습니다.</p>';
    return;
  }

  list.innerHTML = songs.map(renderSongRow).join('');
  bindFavoriteButtons(list);
}

function renderGroupedSongs(groups) {
  const list = document.getElementById('song-list');
  if (!groups.length) {
    list.innerHTML = '<p class="no-data">등록된 목록이 없습니다.</p>';
    return;
  }

  list.innerHTML = groups
    .map((group) => `
      <details class="song-group" open>
        <summary>${escapeHtml(group.title)} <span>${group.songs.length}곡</span></summary>
        ${group.songs.map(renderSongRow).join('')}
      </details>
    `)
    .join('');
  bindFavoriteButtons(list);
}

function renderConcerts(concerts) {
  const groups = concerts.map((concert) => ({
    title: concert.concertTitle || concert.concertId || '콘서트',
    songs: (concert.parts || []).flatMap((part) => part.songs || []),
    parts: concert.parts || [],
  }));

  const list = document.getElementById('song-list');
  if (!groups.length) {
    list.innerHTML = '<p class="no-data">등록된 콘서트가 없습니다.</p>';
    return;
  }

  list.innerHTML = groups
    .map((concert) => `
      <details class="song-group" open>
        <summary>${escapeHtml(concert.title)} <span>${concert.songs.length}곡</span></summary>
        ${concert.parts.map((part) => `
          <div class="part-title">${escapeHtml(part.partTitle || '')}</div>
          ${(part.songs || []).map(renderSongRow).join('')}
        `).join('')}
      </details>
    `)
    .join('');
  bindFavoriteButtons(list);
}

async function renderFavorites() {
  currentCategory = '';
  renderCategoryTabs(getCategoriesForMember(currentMember));
  const allSongs = await fetchJson(`${DATA_ROOT}/all.json`, 'all.json');
  const favorites = allSongs.filter((song) => favoriteTitles.has(song.title));
  renderSongs(favorites);
}

function renderSongRow(song) {
  const isFavorite = favoriteTitles.has(song.title);
  return `
    <article class="song-row">
      <div class="song-meta">
        <h3>${escapeHtml(song.title || '')}</h3>
        <p>${escapeHtml(song.originalArtist || '')} | ${renderNumbers(song)}</p>
      </div>
      <button type="button" class="favorite-button ${isFavorite ? 'active' : ''}" data-title="${escapeAttr(song.title || '')}" aria-label="즐겨찾기">
        ${isFavorite ? '★' : '☆'}
      </button>
    </article>
  `;
}

function renderNumbers(song) {
  const numbers = [];
  if (song.tj) numbers.push(`TJ ${escapeHtml(song.tj)}`);
  if (song.tj60) numbers.push(`TJ60 ${escapeHtml(song.tj60)}`);
  if (song.tj60mr) numbers.push(`TJ MR ${escapeHtml(song.tj60mr)}`);
  if (song.ky) numbers.push(`KY ${escapeHtml(song.ky)}`);
  return numbers.length ? numbers.join(' / ') : '번호 정보 없음';
}

function bindFavoriteButtons(root) {
  root.querySelectorAll('.favorite-button').forEach((button) => {
    button.addEventListener('click', async () => {
      const title = button.dataset.title;
      if (!title) return;

      if (favoriteTitles.has(title)) {
        favoriteTitles.delete(title);
      } else {
        favoriteTitles.add(title);
      }
      updateFavoriteButton(button, title);
      await saveFavorites();
    });
  });
}

function refreshFavoriteButtons() {
  document.querySelectorAll('.favorite-button').forEach((button) => {
    updateFavoriteButton(button, button.dataset.title);
  });
}

function updateFavoriteButton(button, title) {
  const isFavorite = favoriteTitles.has(title);
  button.classList.toggle('active', isFavorite);
  button.textContent = isFavorite ? '★' : '☆';
}

async function saveFavorites() {
  const list = [...favoriteTitles];
  if (!currentUser) {
    localStorage.setItem(LOCAL_FAVORITES_KEY, JSON.stringify(list));
    localStorage.setItem(LEGACY_LOCAL_FAVORITES_KEY, JSON.stringify(list));
    return;
  }

  await setDoc(doc(db, 'users', currentUser.uid), {
    favoriteSongs: list,
    favorites: list,
    lastUpdated: serverTimestamp(),
  }, { merge: true });
}

function loadLocalFavorites() {
  const raw = localStorage.getItem(LOCAL_FAVORITES_KEY) || localStorage.getItem(LEGACY_LOCAL_FAVORITES_KEY);
  try {
    return new Set(JSON.parse(raw || '[]'));
  } catch {
    return new Set();
  }
}

async function loadRemoteFavorites(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return new Set();
  const data = snap.data();
  return new Set(data.favoriteSongs || data.favorites || []);
}

async function mergeLocalFavoritesToFirestore(uid) {
  const localSet = loadLocalFavorites();
  if (localSet.size === 0) return;

  const remoteSet = await loadRemoteFavorites(uid);
  const merged = new Set([...remoteSet, ...localSet]);
  await setDoc(doc(db, 'users', uid), {
    favoriteSongs: [...merged],
    favorites: [...merged],
    lastUpdated: serverTimestamp(),
  }, { merge: true });
}

async function fetchJson(path, fallbackPath) {
  let response = await fetch(path);
  if (!response.ok && fallbackPath) response = await fetch(fallbackPath);
  if (!response.ok) throw new Error(`${path} 로드 실패`);
  return response.json();
}

async function fetchLastUpdateTime() {
  try {
    const response = await fetch('https://api.github.com/repos/skrtjd/stellive_karaoke_app_data/commits?path=assets/data/notices.json&page=1&per_page=1');
    const commits = await response.json();

    if (commits && commits.length > 0) {
      const lastDate = new Date(commits[0].commit.committer.date);
      const year = lastDate.getFullYear();
      const month = String(lastDate.getMonth() + 1).padStart(2, '0');
      const day = String(lastDate.getDate()).padStart(2, '0');
      const hours = String(lastDate.getHours()).padStart(2, '0');
      const mins = String(lastDate.getMinutes()).padStart(2, '0');
      const secs = String(lastDate.getSeconds()).padStart(2, '0');

      document.getElementById('last-update-time').innerText =
        `최근 공지 업데이트: ${year}-${month}-${day}-${hours}-${mins}-${secs}`;
    }
  } catch (error) {
    console.error('업데이트 시간 로드 실패:', error);
  }
}

async function fetchNotices() {
  try {
    const notices = await fetchJson(`${DATA_ROOT}/notices.json`, 'notices.json');
    notices.sort((a, b) => b.date.localeCompare(a.date));
    renderNotices(notices);
  } catch (error) {
    console.error('공지 로드 실패:', error);
  }
}

function renderNotices(notices) {
  const container = document.getElementById('notice-container');
  container.innerHTML = '';

  let currentGroup = '';
  let currentContentDiv = null;

  notices.forEach((notice) => {
    const yearMonthKey = notice.date.substring(0, 7);
    const [year, month] = yearMonthKey.split('-');

    if (currentGroup !== yearMonthKey) {
      currentGroup = yearMonthKey;

      const groupHeader = document.createElement('button');
      groupHeader.className = 'group-header accordion';
      groupHeader.innerHTML = `📅 ${year}년 ${parseInt(month, 10)}월 <span class="arrow">▼</span>`;
      container.appendChild(groupHeader);

      currentContentDiv = document.createElement('div');
      currentContentDiv.className = 'panel';
      container.appendChild(currentContentDiv);

      groupHeader.addEventListener('click', function () {
        this.classList.toggle('active');
        const panel = this.nextElementSibling;
        const arrow = this.querySelector('.arrow');
        if (panel.style.display === 'none') {
          panel.style.display = 'block';
          arrow.innerText = '▼';
        } else {
          panel.style.display = 'none';
          arrow.innerText = '▶';
        }
      });
    }

    const noticeCard = document.createElement('div');
    noticeCard.className = 'notice-card';
    const displayDate = notice.date.substring(0, 10);

    noticeCard.innerHTML = `
      <div class="notice-time">${escapeHtml(displayDate)}</div>
      <div class="notice-title"><h3>${escapeHtml(notice.title)}</h3></div>
      <div class="notice-body"><p>${escapeHtml(notice.body).replace(/\n/g, '<br>')}</p></div>
    `;

    currentContentDiv.appendChild(noticeCard);
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll('`', '&#096;');
}
