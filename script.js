const teamSelect          = document.getElementById('team-select');
const seasonSelect        = document.getElementById('season-select');
const typeSelect          = document.getElementById('player-type-select');
const playerGrid          = document.getElementById('player-grid');
const modal               = document.getElementById('modal');
const modalContent        = document.getElementById('modal-content');
const favoritesCheckbox   = document.getElementById('favorites-checkbox');

const FAVORITES_KEY = 'favoritePlayers';

function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
  } catch {
    return [];
  }
}

function toggleFavorite(id) {
  const favs = getFavorites();
  const idx = favs.indexOf(id);
  if (idx === -1) favs.push(id);
  else favs.splice(idx, 1);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
}

const nameMap = {
  'Athletics':              '奧克蘭運動家',
  'Arizona Diamondbacks':   '亞利桑那響尾蛇',
  'Atlanta Braves':         '亞特蘭大勇士',
  'Baltimore Orioles':      '巴爾的摩金鶯',
  'Boston Red Sox':         '波士頓紅襪',
  'Chicago Cubs':           '芝加哥小熊',
  'Chicago White Sox':      '芝加哥白襪',
  'Cincinnati Reds':        '辛辛那提紅人',
  'Cleveland Guardians':    '克里夫蘭守護者',
  'Colorado Rockies':       '科羅拉多洛磯',
  'Detroit Tigers':         '底特律老虎',
  'Houston Astros':         '休士頓太空人',
  'Kansas City Royals':     '堪薩斯皇家',
  'Los Angeles Angels':     '洛杉磯天使',
  'Los Angeles Dodgers':    '洛杉磯道奇',
  'Miami Marlins':          '邁阿密馬林魚',
  'Milwaukee Brewers':      '密爾瓦基釀酒人',
  'Minnesota Twins':        '明尼蘇達雙城',
  'New York Mets':          '紐約大都會',
  'New York Yankees':       '紐約洋基',
  'Oakland Athletics':      '奧克蘭運動家',
  'Philadelphia Phillies':  '費城人',
  'Pittsburgh Pirates':     '匹茲堡海盜',
  'San Diego Padres':       '聖地牙哥教士',
  'San Francisco Giants':   '舊金山巨人',
  'Seattle Mariners':       '西雅圖水手',
  'St. Louis Cardinals':    '聖路易紅雀',
  'Tampa Bay Rays':         '坦帕灣光芒',
  'Texas Rangers':          '德州遊騎兵',
  'Toronto Blue Jays':      '多倫多藍鳥',
  'Washington Nationals':   '華盛頓國民'
};

for (let y = 2000; y <= 2025; y++) {
  seasonSelect.add(new Option(`${y}`, `${y}`));
}
seasonSelect.value = new Date().getFullYear();

// 載入球隊列表
async function loadTeams() {
  try {
    const res = await axios.get('https://statsapi.mlb.com/api/v1/teams?sportId=1');
    res.data.teams.forEach(t => {
      const zh = nameMap[t.name] || t.name;
      teamSelect.add(new Option(zh, t.id));
    });
  } catch (err) {
    console.error('載入球隊失敗：', err);
  }
}

// 載入並顯示球員卡片（含最愛 & 先發/後援分類）
async function loadPlayers() {
  const season       = seasonSelect.value;
  const teamId       = teamSelect.value;
  const playerType   = typeSelect.value;         
  const showFavOnly  = favoritesCheckbox.checked;
  const rosterURL    = `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster?rosterType=activeRoster&season=${season}`;
  const currentFavs  = getFavorites();

  try {
    const res = await axios.get(rosterURL);
    playerGrid.innerHTML = '';

    for (const [idx, p] of res.data.roster.entries()) {
      const id         = p.person.id;
      const posType    = p.position.type.toLowerCase();
      const isPitcher  = posType.includes('pitcher');
      const isHitter   = !isPitcher;
      const isFav      = currentFavs.includes(id);

      if (showFavOnly && !isFav) continue;

      if (playerType === 'pitcher' && !(isPitcher || p.person.fullName === 'Shohei Ohtani')) continue;
      if (playerType === 'hitter'  && !(isHitter  || p.person.fullName === 'Shohei Ohtani')) continue;

      let classification = '';
      if (isPitcher) {
        try {
          const statURL = `https://statsapi.mlb.com/api/v1/people/${id}/stats?stats=season&season=${season}&group=pitching`;
          const statRes = await axios.get(statURL);
          const splits  = statRes.data.stats?.[0]?.splits;
          const stats   = splits?.length ? splits[0].stat : null;
          if (stats) classification = stats.gamesStarted > 0 ? '先發投手' : '後援投手';
        } catch { /* ignore */ }
      }

      const card = document.createElement('div');
      card.className = 'player-card';
      card.style.animationDelay = `${idx * 0.05}s`;

      const favBtn = document.createElement('span');
      favBtn.className = 'fav-btn';
      favBtn.textContent = isFav ? '★' : '☆';
      favBtn.title = isFav ? '取消最愛' : '加入最愛';
      favBtn.addEventListener('click', e => {
        e.stopPropagation();
        toggleFavorite(id);
        const nowFav = getFavorites().includes(id);
        favBtn.textContent = nowFav ? '★' : '☆';
        favBtn.title = nowFav ? '取消最愛' : '加入最愛';
        favBtn.classList.add('pop');
        favBtn.addEventListener(
          'animationend',
          () => favBtn.classList.remove('pop'),
          { once: true }
        );
      });

      const img = new Image();
      img.alt = p.person.fullName;
      img.onerror = function() {
        this.onerror = null;
        this.src = 'images/placeholder.png';
      };
      img.src = `https://midfield.mlbstatic.com/v1/people/${id}/headshot/67/current`;

      const nameEl   = document.createElement('h2');
      nameEl.textContent = p.person.fullName;
      const posEl    = document.createElement('p');
      posEl.textContent = `位置：${p.position.name}`;
      const jerseyEl = document.createElement('p');
      jerseyEl.textContent = `背號：${p.jerseyNumber || 'N/A'}`;
      const roleEl   = document.createElement('p');
      if (classification) roleEl.textContent = `角色：${classification}`;

      card.append(favBtn, img, nameEl, posEl, jerseyEl, roleEl);
      playerGrid.appendChild(card);

      card.addEventListener('click', async () => {
        let statsHtml = '';
        if (isPitcher) {
          try {
            const statURL = `https://statsapi.mlb.com/api/v1/people/${id}/stats?stats=season&season=${season}&group=pitching`;
            const statRes = await axios.get(statURL);
            const splits  = statRes.data.stats?.[0]?.splits;
            const stats   = splits?.length ? splits[0].stat : null;
            if (stats) {
              statsHtml += `<h3>投球數據</h3>`;
              statsHtml += `<p>ERA：${stats.era || 'N/A'}</p>`;
              statsHtml += `<p>勝投：${stats.wins ?? 'N/A'}</p>`;
              statsHtml += `<p>三振：${stats.strikeOuts ?? 'N/A'}</p>`;
              statsHtml += `<p>救援成功：${stats.saves ?? 'N/A'}</p>`;
              statsHtml += `<p>先發場次：${stats.gamesStarted ?? 0}</p>`;
            } else statsHtml = '<p>查無投球統計</p>';
          } catch {
            statsHtml = '<p>讀取投球統計失敗</p>';
          }
        } else {
          try {
            const statURL = `https://statsapi.mlb.com/api/v1/people/${id}/stats?stats=season&season=${season}&group=hitting`;
            const statRes = await axios.get(statURL);
            const splits  = statRes.data.stats?.[0]?.splits;
            const stats   = splits?.length ? splits[0].stat : null;
            if (stats) {
              statsHtml += `<h3>打擊數據</h3>`;
              statsHtml += `<p>平均打擊率：${stats.avg || 'N/A'}</p>`;
              statsHtml += `<p>全壘打：${stats.homeRuns ?? 'N/A'}</p>`;
              statsHtml += `<p>三振：${stats.strikeOuts ?? 'N/A'}</p>`;
              statsHtml += `<p>安打：${stats.hits ?? 'N/A'}</p>`;
            } else statsHtml = '<p>查無打擊統計</p>';
          } catch {
            statsHtml = '<p>讀取打擊統計失敗</p>';
          }
        }

        modalContent.innerHTML = `
          <h2>${p.person.fullName}</h2>
          <p>位置：${p.position.name}</p>
          <p>背號：${p.jerseyNumber || 'N/A'}</p>
          <p>狀態：${p.status?.code === 'I' ? '傷兵名單'
                    : p.status?.code === 'N' ? '已離隊'
                    : '現役'}</p>
          ${classification ? `<p>角色：${classification}</p>` : ''}
          ${statsHtml}
          <button id="close-btn">關閉</button>
        `;
        modal.classList.remove('hidden');
        document.getElementById('close-btn')
                .addEventListener('click', () => modal.classList.add('hidden'));
      });
    }
  } catch (err) {
    console.error('載入球員列表失敗：', err);
  }
}

window.addEventListener('click', e => {
  if (e.target === modal) modal.classList.add('hidden');
});

document.getElementById('load-btn').addEventListener('click', loadPlayers);
favoritesCheckbox.addEventListener('change', loadPlayers);
loadTeams();
