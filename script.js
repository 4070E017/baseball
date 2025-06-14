// script.js

// —— 英文隊名 → 中文對照表 ——
const nameMap = {
  'Athletics':              '奧克蘭運動家',
  'Arizona Diamondbacks':   '亞利桑那響尾蛇',
  'Atlanta Braves':         '亞特蘭大勇士',
  'Baltimore Orioles':      '巴爾的摩金鷹',
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

// —— API URL 生成器 ——
const STATS_API = ({ season, group, pool, limit }) =>
  `https://statsapi.mlb.com/api/v1/stats?stats=season&season=${season}` +
  `&group=${group}&sportId=1&playerPool=${pool}&limit=${limit}`;
const ROSTER_API = (teamId, season) =>
  `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster?rosterType=activeRoster&season=${season}`;
const TEAMS_API  = 'https://statsapi.mlb.com/api/v1/teams?sportId=1';

// —— DOM Elements ——
const seasonSelect      = document.getElementById('season-select');
const teamSelect        = document.getElementById('team-select');
const typeSelect        = document.getElementById('player-type-select');
const leaderSelect      = document.getElementById('leader-select');
const favoritesCheckbox = document.getElementById('favorites-checkbox');
const playerGrid        = document.getElementById('player-grid');
const barChart          = document.getElementById('bar-chart');
const modal             = document.getElementById('modal');
const modalContent      = document.getElementById('modal-content');

// —— 最愛功能 ——
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
  const idx  = favs.indexOf(id);
  if (idx === -1) favs.push(id);
  else          favs.splice(idx, 1);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
}

// —— 初始化 年份下拉 ——
for (let y = 2000; y <= 2025; y++) {
  seasonSelect.add(new Option(y, y));
}
seasonSelect.value = new Date().getFullYear();

// —— 載入球隊列表 ——
async function loadTeams() {
  try {
    const res = await axios.get(TEAMS_API);
    res.data.teams
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach(t => {
        const zh = nameMap[t.name] || t.name;
        teamSelect.add(new Option(zh, t.id));
      });
    teamSelect.value = teamSelect.options[0].value;
    await loadPlayers();
  } catch (err) {
    console.error('載入球隊失敗：', err);
  }
}

// —— 載入並顯示球員卡片 ——
async function loadPlayers() {
  playerGrid.style.display = '';
  barChart.style.display   = 'none';
  leaderSelect.value       = '';

  const season     = seasonSelect.value;
  const teamId     = teamSelect.value;
  const playerType = typeSelect.value;
  const onlyFavs   = favoritesCheckbox.checked;
  const rosterURL  = ROSTER_API(teamId, season);
  const favs       = getFavorites();

  try {
    const res = await axios.get(rosterURL);
    playerGrid.innerHTML = '';

    for (const [i, p] of res.data.roster.entries()) {
      const id        = p.person.id;
      const isPitcher = p.position.type.toLowerCase().includes('pitcher');
      const isHitter  = !isPitcher;
      const isFav     = favs.includes(id);

      if (onlyFavs && !isFav) continue;
      if (playerType === 'pitcher' && !(isPitcher || p.person.fullName === 'Shohei Ohtani')) continue;
      if (playerType === 'hitter'  && !(isHitter  || p.person.fullName === 'Shohei Ohtani')) continue;

      let classification = '';
      if (isPitcher) {
        try {
          const sr   = await axios.get(
            `https://statsapi.mlb.com/api/v1/people/${id}/stats?stats=season&season=${season}&group=pitching`
          );
          const stat = sr.data.stats[0]?.splits[0]?.stat;
          if (stat) classification = stat.gamesStarted > 0 ? '先發投手' : '後援投手';
        } catch {}
      }

      const card = document.createElement('div');
      card.className            = 'player-card';
      card.style.animationDelay = `${i * 0.05}s`;

      const favBtn = document.createElement('span');
      favBtn.className   = 'fav-btn';
      favBtn.textContent = isFav ? '★' : '☆';
      favBtn.title       = isFav ? '取消最愛' : '加入最愛';
      favBtn.addEventListener('click', e => {
        e.stopPropagation();
        toggleFavorite(id);
        const now = getFavorites().includes(id);
        favBtn.textContent = now ? '★' : '☆';
        favBtn.title       = now ? '取消最愛' : '加入最愛';
      });

      const img = new Image();
      img.alt    = p.person.fullName;
      img.onerror = () => { img.onerror = null; img.src = 'img/placeholder.png'; };
      img.src    = `https://midfield.mlbstatic.com/v1/people/${id}/headshot/67/current`;

      const nameEl   = document.createElement('h2');
      nameEl.textContent = p.person.fullName;
      nameEl.title       = p.person.fullName;

      const posEl    = document.createElement('p');
      posEl.textContent = `位置：${p.position.name}`;
      const jerseyEl = document.createElement('p');
      jerseyEl.textContent = `背號：${p.jerseyNumber || 'N/A'}`;
      const roleEl   = document.createElement('p');
      if (classification) roleEl.textContent = `角色：${classification}`;

      card.append(favBtn, img, nameEl, posEl, jerseyEl, roleEl);
      playerGrid.appendChild(card);
      card.addEventListener('click', () => showModal(p, classification, season));
    }
  } catch (err) {
    console.error('載入球員列表失敗：', err);
  }
}

// —— 卡片點擊打開統計 Modal ——
async function showModal(p, classification, season) {
  const isPitcher = p.position.type.toLowerCase().includes('pitcher');
  const group     = isPitcher ? 'pitching' : 'hitting';
  let statsHtml   = '';

  try {
    const sr   = await axios.get(
      `https://statsapi.mlb.com/api/v1/people/${p.person.id}/stats?stats=season&season=${season}&group=${group}`
    );
    const stat = sr.data.stats[0]?.splits[0]?.stat;
    if (stat) {
      if (isPitcher) {
        statsHtml = `
          <h3>投球數據</h3>
          <p>ERA：${stat.era || 'N/A'}</p>
          <p>勝投：${stat.wins || 'N/A'}</p>
          <p>三振：${stat.strikeOuts || 'N/A'}</p>
          <p>救援：${stat.saves || 'N/A'}</p>
        `;
      } else {
        statsHtml = `
          <h3>打擊數據</h3>
          <p>打擊率：${stat.avg || 'N/A'}</p>
          <p>全壘打：${stat.homeRuns || 'N/A'}</p>
          <p>安打：${stat.hits || 'N/A'}</p>
        `;
      }
    } else {
      statsHtml = '<p>查無統計資料</p>';
    }
  } catch {
    statsHtml = '<p>讀取統計失敗</p>';
  }

  modalContent.innerHTML = `
    <h2>${p.person.fullName}</h2>
    <p>位置：${p.position.name}</p>
    <p>背號：${p.jerseyNumber || 'N/A'}</p>
    ${classification ? `<p>角色：${classification}</p>` : ''}
    ${statsHtml}
    <button id="video-btn">觀看高光</button>
    <button id="close-btn">關閉</button>
  `;
  modal.classList.remove('hidden');
  document.getElementById('close-btn').onclick = () => modal.classList.add('hidden');
  document.getElementById('video-btn').onclick = () => {
    const q = encodeURIComponent(p.person.fullName + ' highlights');
    window.open(`https://www.youtube.com/results?search_query=${q}`, '_blank');
  };
}

// —— 長條圖 Modal ——
function showBarModal(playerId, fullName, teamEng, value, label) {
  const zhTeam = nameMap[teamEng] || teamEng;
  modalContent.innerHTML = `
    <img src="https://midfield.mlbstatic.com/v1/people/${playerId}/headshot/180/current"
         alt="${fullName}"
         style="border-radius:50%;width:100px;height:100px;margin-bottom:1rem;">
    <h2 style="margin:0.5rem 0;">${fullName}</h2>
    <p style="margin:0.25rem 0;font-size:1rem;">隊伍：${zhTeam}</p>
    <p style="margin:0.25rem 0;font-size:1rem;">${label}：${value}</p>
    <button id="close-btn">關閉</button>
  `;
  modal.classList.remove('hidden');
  document.getElementById('close-btn').onclick = () => modal.classList.add('hidden');
}

// —— 排行榜選單變動 ——
leaderSelect.addEventListener('change', () => {
  if (!leaderSelect.value) {
    playerGrid.style.display = '';
    barChart.style.display   = 'none';
    loadPlayers();
  } else {
    playerGrid.style.display = 'none';
    barChart.style.display   = '';
    const [stat, label, group] = leaderSelect.value.split('|');
    loadLeaders(stat, label, group);
  }
});

// —— 載入並渲染排行榜 ——
async function loadLeaders(stat, label, group) {
  const season = seasonSelect.value;
  const url    = STATS_API({ season, group, pool: 'all', limit: 5000 });

  try {
    const res    = await fetch(url);
    const json   = await res.json();
    const splits = json.stats[0]?.splits || [];

    let list = splits.map(d => ({
      playerId: d.player.id,
      name:     d.player.fullName,
      team:     d.team.name,
      value:    +d.stat[stat] || 0
    })).filter(d => d.value > 0);

    list.sort((a, b) => stat === 'era'
      ? a.value - b.value
      : b.value - a.value
    );

    const statsData = list.slice(0, 20).map((d, i) => ({ ...d, rank: i + 1 }));
    renderBars(statsData, label);
  } catch (err) {
    console.error('載入排行失敗：', err);
    barChart.innerHTML = `<p style="text-align:center;color:#e0e6f3;">無法取得排行資料</p>`;
  }
}

// —— 渲染條形圖並綁定點擊 ——
function renderBars(statsData, label) {
  barChart.innerHTML = '';
  const max = Math.max(...statsData.map(d => d.value), 1);

  statsData.forEach(d => {
    const item      = document.createElement('div');
    item.className  = 'bar-item';

    const labelEl   = document.createElement('div');
    labelEl.className = 'bar-label';
    labelEl.textContent = `${d.rank}. ${d.name}`;
    labelEl.title       = d.name;
    labelEl.addEventListener('click', e => {
      e.stopPropagation();
      labelEl.classList.toggle('expanded');
    });

    const bar       = document.createElement('div');
    bar.className   = 'bar-value';
    bar.setAttribute('data-value', d.value);
    bar.style.width = '0%';
    bar.style.cursor= 'pointer';

    bar.addEventListener('click', e => {
      e.stopPropagation();
      document.querySelectorAll('.bar-value.active')
        .forEach(b => b.classList.remove('active'));
      bar.classList.toggle('active');
      showBarModal(d.playerId, d.name, d.team, d.value, label);
    });

    item.append(labelEl, bar);
    barChart.appendChild(item);

    requestAnimationFrame(() => {
      bar.style.width = ((d.value / max) * 100) + '%';
    });
  });
}

// —— 點擊空白關閉 Modal ——
window.addEventListener('click', e => {
  if (e.target === modal) modal.classList.add('hidden');
});

// —— 綁定篩選事件 ——
favoritesCheckbox.addEventListener('change', loadPlayers);
typeSelect.addEventListener('change',      loadPlayers);
seasonSelect.addEventListener('change',    loadPlayers);
teamSelect.addEventListener('change',      loadPlayers);

// —— 啟動 ——
loadTeams();
