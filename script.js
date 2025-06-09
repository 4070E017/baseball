// API
const STATS_API = ({ season, group, pool, limit }) =>
  `https://statsapi.mlb.com/api/v1/stats?stats=season&season=${season}` +
  `&group=${group}&sportId=1&playerPool=${pool}&limit=${limit}`;
const ROSTER_API = (teamId, season) =>
  `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster?rosterType=all&season=${season}`;
const TEAMS_API = 'https://statsapi.mlb.com/api/v1/teams?sportId=1';

// DOM & D3
const svg = d3.select('#chart');
const margin = { top: 40, right: 20, bottom: 100, left: 60 };
const chartG = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
const tooltip = d3.select('body').append('div').attr('class','tooltip').style('opacity',0);

const viewModeSel   = document.getElementById('view-mode');
const seasonSel     = document.getElementById('season-select');
const teamSel       = document.getElementById('team-select');
const playerTypeSel = document.getElementById('player-type-select');
const metricSel     = document.getElementById('metric-select');
const searchInput   = document.getElementById('player-search');
const themeToggle   = document.getElementById('theme-toggle');
const resetBtn      = document.getElementById('reset-button');

let statsData = [];
let teamMap = {};

function getSize() {
  const { width, height } = svg.node().getBoundingClientRect();
  return { width: width - margin.left - margin.right, height: height - margin.top - margin.bottom };
}

function updateMetrics() {
  metricSel.innerHTML = '';
  if (playerTypeSel.value === 'hitter') {
    ['homeRuns:全壘打 (HR)', 'rbi:打點 (RBI)', 'hits:安打 (Hits)', 'avg:打擊率 (AVG)']
      .forEach(o=>{ let [v,t]=o.split(':'); metricSel.add(new Option(t,v)); });
  } else {
    ['wins:勝投 (W)', 'era:自責分率 (ERA)', 'strikeOuts:三振 (SO)', 'saves:救援成功 (SV)']
      .forEach(o=>{ let [v,t]=o.split(':'); metricSel.add(new Option(t,v)); });
  }
}

function init() {
  for (let y = 2018; y <= 2025; y++) seasonSel.add(new Option(y, y));
  seasonSel.value = new Date().getFullYear();
  fetch(TEAMS_API)
    .then(r=>r.json())
    .then(d=> {
      d.teams.sort((a,b)=>a.name.localeCompare(b.name))
             .forEach(t=>{
               teamSel.add(new Option(t.name, t.id));
               teamMap[t.id] = t;
             });
      updateMetrics();
      draw();
    });

  // 初始主題（根據 localStorage）
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark');
    document.body.classList.remove('light');
    themeToggle.textContent = '🌞 日間模式';
  } else {
    document.body.classList.add('light');
    document.body.classList.remove('dark');
    themeToggle.textContent = '🌙 夜間模式';
  }
}

[viewModeSel, seasonSel, teamSel, playerTypeSel].forEach(el => el.addEventListener('change', () => { updateMetrics(); draw(); }));
metricSel.addEventListener('change', () => draw());
searchInput.addEventListener('input', () => draw(filtered()));

// 切換主題邏輯
themeToggle.addEventListener('click', () => {
  const isDark = document.body.classList.contains('dark');
  document.body.classList.toggle('dark', !isDark);
  document.body.classList.toggle('light', isDark);
  themeToggle.textContent = isDark ? '🌙 夜間模式' : '🌞 日間模式';
  localStorage.setItem('theme', isDark ? 'light' : 'dark');
});

resetBtn.addEventListener('click', () => {
  seasonSel.value = new Date().getFullYear();
  teamSel.selectedIndex = 0;
  viewModeSel.value = 'team';
  playerTypeSel.value = 'hitter';
  updateMetrics();
  metricSel.selectedIndex = 0;
  searchInput.value = '';
  draw();
});

async function draw(filteredList) {
  chartG.selectAll('*').remove();
  const season = +seasonSel.value;
  const mode   = viewModeSel.value;
  const type   = playerTypeSel.value;
  const metric = metricSel.value;
  const teamId = teamSel.value;
  const group  = type.startsWith('pitcher') ? 'pitching' : 'hitting';

  try {
    const res = await fetch(STATS_API({ season, group, pool:'all', limit:5000 }));
    if (!res.ok) throw new Error(`Stats HTTP ${res.status}`);
    const sj = await res.json();
    const splits = sj.stats?.[0]?.splits || [];

    let ids = null;
    if (mode==='team') {
      const rres = await fetch(ROSTER_API(teamId,season));
      if (!rres.ok) throw new Error(`Roster HTTP ${rres.status}`);
      const rj = await rres.json();
      ids = rj.roster.map(p=>p.person.id);
    }

    let list = splits.filter(d => {
      if (ids && !ids.includes(d.player.id)) return false;
      if (type==='pitcher-starter') return +d.stat.gamesStarted>0;
      if (type==='pitcher-relief') return +d.stat.gamesStarted===0 && +d.stat.gamesFinished>0;
      return true;
    }).map(d => {
      const p = d.player;
      const s = d.stat;
      const t = d.team;
      let v=0;
      switch(metric){
        case 'homeRuns': v=+s.homeRuns; break;
        case 'rbi': v=+s.rbi; break;
        case 'hits': v=+s.hits; break;
        case 'avg': v=s.avg?+s.avg:0; break;
        case 'wins': v=+s.wins; break;
        case 'era': v=s.era?+s.era:0; break;
        case 'strikeOuts': v=+s.strikeOuts; break;
        case 'saves': v=+s.saves; break;
      }
      return {
        id: p.id,
        name: p.fullName,
        value: v,
        teamId: t?.id,
        teamName: t?.name
      };
    }).filter(d => d.value > 0);

    statsData = (filteredList||list)
      .sort((a,b)=>b.value-a.value)
      .slice(0,20);

    render(metric);
  } catch (e) {
    console.error('資料載入錯誤：', e);
    chartG.append('text')
      .attr('x', getSize().width/2)
      .attr('y', getSize().height/2)
      .attr('text-anchor','middle')
      .text('資料載入錯誤');
  }
}

function filtered(){
  const kw = searchInput.value.trim().toLowerCase();
  return statsData.filter(d => d.name.toLowerCase().includes(kw));
}

function render(metric){
  const { width, height } = getSize();
  if (!statsData.length) {
    chartG.append('text')
      .attr('x', width/2).attr('y', height/2)
      .attr('text-anchor','middle')
      .text('無資料');
    return;
  }

  const x = d3.scaleBand().domain(statsData.map(d=>d.name)).range([0,width]).padding(0.2);
  const y = d3.scaleLinear().domain([0,d3.max(statsData,d=>d.value)]).nice().range([height,0]);

  chartG.append('g')
    .attr('transform',`translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll('text').attr('transform','rotate(0)').style('text-anchor','middle').style('fill', 'currentColor');
  chartG.append('g').call(d3.axisLeft(y)).selectAll('text').style('fill', 'currentColor');

  const bars = chartG.selectAll('.bar')
    .data(statsData)
    .enter().append('rect')
      .attr('class','bar')
      .attr('x',d=>x(d.name))
      .attr('y',height)
      .attr('width',x.bandwidth())
      .attr('height',0)
      .on('mouseover',(e,d)=>{
        tooltip.style('opacity',1)
          .html(`<strong>${d.name}</strong><br>${metricSel.selectedOptions[0].text}: ${d.value}`)
          .style('left',e.pageX+10+'px').style('top',e.pageY-28+'px');
      })
      .on('mousemove',e=>{
        tooltip.style('left',e.pageX+10+'px').style('top',e.pageY-28+'px');
      })
      .on('mouseout',()=>tooltip.style('opacity',0))
      .on('click',(_,d)=>{
        const playerImg = `https://midfield.mlbstatic.com/v1/people/${d.id}/headshot/67/current`;
        const teamLogo = d.teamId ? `https://www.mlbstatic.com/team-logos/${d.teamId}.svg` : '';
        document.getElementById('modal-body').innerHTML = `
          <img src="${playerImg}" alt="${d.name}" />
          <h2>${d.name}</h2>
          <p>${metricSel.selectedOptions[0].text}: ${d.value}</p>
          ${d.teamName ? `<p>${d.teamName}</p>` : ''}
          ${teamLogo ? `<img src="${teamLogo}" alt="Team Logo" style="max-height:40px;">` : ''}
        `;
        document.getElementById('modal').classList.remove('hidden');
      });

  bars.transition()
      .duration(800)
      .attr('y',d=>y(d.value))
      .attr('height',d=>height-y(d.value));

  document.querySelector('.modal .close').onclick = ()=>{
    document.getElementById('modal').classList.add('hidden');
  };
}

window.addEventListener('resize', ()=> draw());
init();