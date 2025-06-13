const teamSelect    = document.getElementById('team-select');
const seasonSelect  = document.getElementById('season-select');
const typeSelect    = document.getElementById('player-type-select');
const playerGrid    = document.getElementById('player-grid');
const modal         = document.getElementById('modal');
const modalContent  = document.getElementById('modal-content');

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

async function loadPlayers() {
  const season     = seasonSelect.value;
  const teamId     = teamSelect.value;
  const playerType = typeSelect.value;
  const rosterURL  = `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster?rosterType=activeRoster&season=${season}`;

  try {
    const res = await axios.get(rosterURL);
    playerGrid.innerHTML = '';

    res.data.roster.forEach((p, idx) => {
      const positionName = p.position.type.toLowerCase();
      const isPitcher    = positionName.includes('pitcher');
      const isHitter     = !isPitcher;

      if (playerType === 'pitcher' && !(isPitcher || p.person.fullName === 'Shohei Ohtani')) return;
      if (playerType === 'hitter'  && !(isHitter  || p.person.fullName === 'Shohei Ohtani')) return;

      const card = document.createElement('div');
      card.className = 'player-card';
      card.style.animationDelay = `${idx * 0.05}s`;

      const img = new Image();
      img.alt = p.person.fullName;
      img.onerror = () => {
        img.src = 'placeholder.png';
      };
      img.src = `https://midfield.mlbstatic.com/v1/people/${p.person.id}/headshot/67/current`;

      const nameEl   = document.createElement('h2');
      nameEl.textContent = p.person.fullName;
      const posEl    = document.createElement('p');
      posEl.textContent = `位置：${p.position.name}`;
      const jerseyEl = document.createElement('p');
      jerseyEl.textContent = `背號：${p.jerseyNumber || 'N/A'}`;

      card.append(img, nameEl, posEl, jerseyEl);

      card.addEventListener('click', async () => {
        const group   = playerType === 'hitter' ? 'hitting' : 'pitching';
        const statURL = `https://statsapi.mlb.com/api/v1/people/${p.person.id}/stats?stats=season&season=${season}&group=${group}`;
        try {
          const statRes = await axios.get(statURL);
          const splits = statRes.data.stats?.[0]?.splits;
          const stats  = splits?.length ? splits[0].stat : null;

          let statsHtml = '';
          if (stats) {
            statsHtml += `<h3>${group==='hitting'?'打擊數據':'投球數據'}</h3>`;
            if (group === 'hitting') {
              statsHtml += `<p>平均打擊率：${stats.avg  || 'N/A'}</p>`;
              statsHtml += `<p>全壘打：${stats.homeRuns ?? 'N/A'}</p>`;
              statsHtml += `<p>三振：${stats.strikeOuts ?? 'N/A'}</p>`;
              statsHtml += `<p>安打：${stats.hits ?? 'N/A'}</p>`;
            } else {
              statsHtml += `<p>ERA：${stats.era  || 'N/A'}</p>`;
              statsHtml += `<p>勝投：${stats.wins ?? 'N/A'}</p>`;
              statsHtml += `<p>三振：${stats.strikeOuts ?? 'N/A'}</p>`;
              statsHtml += `<p>救援成功：${stats.saves ?? 'N/A'}</p>`;
            }
          } else {
            statsHtml = '<p>查無統計資料</p>';
          }

          modalContent.innerHTML = `
            <h2>${p.person.fullName}</h2>
            <p>位置：${p.position.name}</p>
            <p>背號：${p.jerseyNumber || 'N/A'}</p>
            ${statsHtml}
            <button id="close-btn">關閉</button>
          `;
          modal.classList.remove('hidden');
          document.getElementById('close-btn')
                  .addEventListener('click', () => modal.classList.add('hidden'));
        } catch (e) {
          console.error('讀取統計資料失敗：', e);
        }
      });

      playerGrid.appendChild(card);
    });
  } catch (err) {
    console.error('載入球員列表失敗：', err);
  }
}

window.addEventListener('click', e => {
  if (e.target === modal) modal.classList.add('hidden');
});

document.getElementById('load-btn').addEventListener('click', loadPlayers);
loadTeams();
