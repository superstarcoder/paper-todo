  let _earthLat = null, _earthLng = null, _earthTimer = null, _earthFrame = null, _earthDate = null;

  function startEarthMode() {
    if (_earthLat !== null) { renderSky(); scheduleEarthTick(); return; }
    // Try geolocation (only asked once per session if not already granted)
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          _earthLat = pos.coords.latitude;
          _earthLng = pos.coords.longitude;
          renderSky(); scheduleEarthTick();
        },
        () => {
          // Denied or unavailable — use UTC time, no location (still looks beautiful)
          _earthLat = 0; _earthLng = 0;
          renderSky(); scheduleEarthTick();
        },
        { timeout: 6000 }
      );
    } else {
      _earthLat = 0; _earthLng = 0;
      renderSky(); scheduleEarthTick();
    }
  }

  function stopEarthMode() {
    if (_earthTimer) { clearTimeout(_earthTimer); _earthTimer = null; }
    if (_earthFrame) { cancelAnimationFrame(_earthFrame); _earthFrame = null; }
    const canvas = document.getElementById('earth-sky');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function scheduleEarthTick() {
    if (_earthTimer) clearTimeout(_earthTimer);
    // Re-render every 60 seconds
    _earthTimer = setTimeout(() => { if (currentTheme === 'earth') { renderSky(); scheduleEarthTick(); } }, 60000);
  }

  // ── Solar position (simplified VSOP) ─────────────────
  function getSolarPosition(date, lat, lng) {
    const rad = Math.PI / 180;
    const JD = date.getTime() / 86400000 + 2440587.5;
    const n = JD - 2451545.0;
    const L = (280.46 + 0.9856474 * n) % 360;
    const g = (357.528 + 0.9856003 * n) % 360;
    const lambda = L + 1.915 * Math.sin(g * rad) + 0.020 * Math.sin(2 * g * rad);
    const epsilon = 23.439 - 0.0000004 * n;
    const sinDec = Math.sin(epsilon * rad) * Math.sin(lambda * rad);
    const dec = Math.asin(sinDec) / rad;
    const RA = Math.atan2(Math.cos(epsilon * rad) * Math.sin(lambda * rad), Math.cos(lambda * rad)) / rad;
    // Hour angle — normalize properly
    const GMST = (6.697375 + 0.0657098242 * n + (date.getUTCHours() + date.getUTCMinutes()/60 + date.getUTCSeconds()/3600)) % 24;
    const LST = ((GMST * 15 + lng) % 360 + 360) % 360;
    const RA360 = ((RA % 360) + 360) % 360;
    const HA = ((LST - RA360) % 360 + 360) % 360; // 0-360, morning=270-360, afternoon=0-90
    const HArad = HA > 180 ? (HA - 360) * rad : HA * rad; // convert to -180..180 range
    // Altitude
    const sinAlt = Math.sin(lat * rad) * Math.sin(dec * rad) + Math.cos(lat * rad) * Math.cos(dec * rad) * Math.cos(HArad);
    const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt))) / rad;
    // Azimuth (0=N, 90=E, 180=S, 270=W)
    const cosAlt = Math.cos(Math.asin(Math.max(-1, Math.min(1, sinAlt))));
    const cosAz = cosAlt > 0.0001
      ? (Math.sin(dec * rad) - Math.sin(lat * rad) * sinAlt) / (Math.cos(lat * rad) * cosAlt)
      : 0;
    let az = Math.acos(Math.max(-1, Math.min(1, cosAz))) / rad;
    if (Math.sin(HArad) > 0) az = 360 - az; // afternoon: sun moves west
    return { alt, az };
  }

  function getMoonPosition(date, lat, lng) {
    const rad = Math.PI / 180;
    const JD = date.getTime() / 86400000 + 2440587.5;
    const T = (JD - 2451545.0) / 36525;
    const Lm = (218.3165 + 481267.8813 * T) % 360;
    const Mm = (134.9634 + 477198.8676 * T) % 360;
    const D  = (297.8502 + 445267.1115 * T) % 360;
    const lambda = Lm + 6.289 * Math.sin(Mm * rad) - 1.274 * Math.sin((2*D - Mm) * rad) + 0.658 * Math.sin(2*D*rad);
    const beta = 5.128 * Math.sin((93.272 + 483202.0175 * T) * rad);
    const epsilon = 23.439 - 0.0000004 * (JD - 2451545.0);
    const sinDec = Math.sin(epsilon * rad) * Math.sin(lambda * rad) + Math.cos(epsilon * rad) * Math.sin(beta * rad);
    const dec = Math.asin(Math.max(-1, Math.min(1, sinDec))) / rad;
    const RA = Math.atan2(Math.cos(epsilon * rad) * Math.sin(lambda * rad) - Math.tan(beta * rad) * Math.sin(epsilon * rad), Math.cos(lambda * rad)) / rad;
    const GMST = (6.697375 + 0.0657098242 * (JD - 2451545.0) + (date.getUTCHours() + date.getUTCMinutes()/60)) % 24;
    const LST = (GMST * 15 + lng + 360) % 360;
    const HA = LST - ((RA + 360) % 360);
    const sinAlt = Math.sin(lat * rad) * Math.sin(dec * rad) + Math.cos(lat * rad) * Math.cos(dec * rad) * Math.cos(HA * rad);
    const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt))) / rad;
    const cosAz = (Math.sin(dec * rad) - Math.sin(lat * rad) * sinAlt) / (Math.cos(lat * rad) * Math.cos(Math.asin(sinAlt)));
    const az = (Math.acos(Math.max(-1, Math.min(1, cosAz))) / rad + (Math.sin(HA * rad) > 0 ? 180 : 0)) % 360;
    // Moon phase (0-1, 0=new, 0.5=full)
    const phase = ((D % 360) + 360) % 360 / 360;
    return { alt, az, phase };
  }

  function getPhase(sunAlt, sunAz) {
    // Use azimuth to tell AM from PM: az < 180 = sun in east (morning side), az > 180 = west (evening side)
    const isEvening = sunAz > 180;
    if (sunAlt > 20)  return isEvening ? 'golden' : 'day';
    if (sunAlt > 6)   return isEvening ? 'golden' : 'morning';
    if (sunAlt > 0)   return isEvening ? 'dusk'   : 'golden';
    if (sunAlt > -6)  return isEvening ? 'dusk'   : 'dawn';
    if (sunAlt > -12) return isEvening ? 'night'  : 'dawn';
    return 'night';
  }

  // Convert az/alt to canvas x/y (az=0 is left edge, going right)
  function celestialToXY(az, alt, W, H) {
    // Map azimuth so sun arcs naturally: rises east (left), peaks south (center), sets west (right)
    // Az: 0=N, 90=E, 180=S, 270=W
    // We want: 90(E) → x=0, 180(S) → x=W/2, 270(W) → x=W
    // Shift so east=0: az-90, then normalize 0-180 → 0-W
    // Use the 90..270 arc (daytime for northern hemisphere) mapped to full canvas width
    const azShifted = ((az - 90 + 360) % 360); // E=0, S=90, W=180, N=270
    const x = (azShifted / 180) * W; // 0(E)→0, 180(W)→W; N goes off-screen (fine)
    const y = H * 0.72 - (alt / 90) * H * 0.68;
    return { x, y };
  }

  function renderSky() {
    if (currentTheme !== 'earth') return;
    const canvas = document.getElementById('earth-sky');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const W = canvas.width, H = canvas.height;
    const ctx = canvas.getContext('2d');

    const now = _earthDate ? new Date(_earthDate) : new Date();
    const lat = _earthLat ?? 0, lng = _earthLng ?? 0;
    const sun  = getSolarPosition(now, lat, lng);
    const moon = getMoonPosition(now, lat, lng);
    const phase = getPhase(sun.alt, sun.az);

    // Set data-earth-phase for CSS
    document.documentElement.setAttribute('data-earth-phase', phase);

    // ── Sky gradient ─────────────────────────────────────
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    const SKY = {
      day:     ['#87ceeb','#b8e4f7','#daf0ff'],
      morning: ['#4a90c4','#7ab8e0','#c8e8f8'],
      golden:  ['#3a6a9a','#c87840','#e8b878'],
      dusk:    ['#1e3060','#7a4060','#c87850'],
      dawn:    ['#0e1838','#3a3070','#c07858'],
      night:   ['#020510','#080e28','#101840'],
    };
    const [top, mid, bot] = SKY[phase];
    skyGrad.addColorStop(0, top);
    skyGrad.addColorStop(0.5, mid);
    skyGrad.addColorStop(1, bot);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // ── Stars (night/dawn/dusk) ───────────────────────────
    if (phase === 'night' || phase === 'dawn' || phase === 'dusk') {
      const starCount = phase === 'night' ? 220 : 80;
      const starAlpha = phase === 'night' ? 0.9 : 0.4;
      ctx.save();
      let sx = 12345;
      const rand = () => { sx = (sx * 1664525 + 1013904223) & 0xffffffff; return (sx >>> 0) / 0xffffffff; };
      for (let i = 0; i < starCount; i++) {
        const x = rand() * W, y = rand() * H * 0.72;
        const r = 0.4 + rand() * 1.2;
        const a = (0.4 + rand() * 0.6) * starAlpha;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fill();
      }
      ctx.restore();
    }

    // ── Sun ───────────────────────────────────────────────
    if (sun.alt > -8) {
      const sp = celestialToXY(sun.az, sun.alt, W, H);
      const sunR = 36;
      ctx.save();
      if (sun.alt > 0) {
        const glowSize = phase === 'golden' || phase === 'dusk' || phase === 'dawn' ? 120 : 80;
        const glow = ctx.createRadialGradient(sp.x, sp.y, sunR * 0.5, sp.x, sp.y, glowSize);
        const glowColor = phase === 'golden' || phase === 'dusk' || phase === 'dawn' ? 'rgba(220,140,60,' : 'rgba(255,240,180,';
        glow.addColorStop(0, glowColor + '0.25)'); glow.addColorStop(1, glowColor + '0)');
        ctx.fillStyle = glow;
        ctx.fillRect(sp.x - glowSize, sp.y - glowSize, glowSize * 2, glowSize * 2);
        const sunGrad = ctx.createRadialGradient(sp.x - sunR * 0.3, sp.y - sunR * 0.3, 2, sp.x, sp.y, sunR);
        sunGrad.addColorStop(0, '#fffde0');
        sunGrad.addColorStop(0.4, phase === 'golden' || phase === 'dusk' ? '#f0b840' : '#ffe866');
        sunGrad.addColorStop(1, phase === 'golden' || phase === 'dusk' ? '#e07820' : '#ffd020');
        ctx.beginPath(); ctx.arc(sp.x, sp.y, sunR, 0, Math.PI * 2);
        ctx.fillStyle = sunGrad; ctx.fill();
      } else {
        ctx.beginPath(); ctx.rect(0, 0, W, H * 0.72 + 2); ctx.clip();
        const sunGrad = ctx.createRadialGradient(sp.x, sp.y, 2, sp.x, sp.y, sunR);
        sunGrad.addColorStop(0, '#f8d870'); sunGrad.addColorStop(1, '#d06820');
        ctx.beginPath(); ctx.arc(sp.x, sp.y, sunR, 0, Math.PI * 2);
        ctx.fillStyle = sunGrad; ctx.fill();
      }
      ctx.restore();
    }

    // ── Moon ──────────────────────────────────────────────
    if (moon.alt > -5) {
      const mp = celestialToXY(moon.az, moon.alt, W, H);
      const moonR = 24;
      ctx.save();
      if (moon.alt < 0) { ctx.beginPath(); ctx.rect(0, 0, W, H * 0.72 + 2); ctx.clip(); }
      if (moon.alt > 0) {
        const mglow = ctx.createRadialGradient(mp.x, mp.y, moonR, mp.x, mp.y, moonR * 3);
        mglow.addColorStop(0, 'rgba(220,230,255,0.18)'); mglow.addColorStop(1, 'rgba(220,230,255,0)');
        ctx.fillStyle = mglow;
        ctx.fillRect(mp.x - moonR * 3, mp.y - moonR * 3, moonR * 6, moonR * 6);
      }
      ctx.beginPath(); ctx.arc(mp.x, mp.y, moonR, 0, Math.PI * 2);
      ctx.fillStyle = '#e8e8f0'; ctx.fill();
      ctx.strokeStyle = 'rgba(180,180,210,0.5)'; ctx.lineWidth = 1; ctx.stroke();
      const phaseAngle = moon.phase * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(mp.x, mp.y, moonR, -Math.PI / 2, Math.PI / 2);
      const shadowX = mp.x + Math.cos(phaseAngle) * moonR;
      ctx.bezierCurveTo(shadowX, mp.y + moonR, shadowX, mp.y - moonR, mp.x, mp.y - moonR);
      ctx.closePath();
      ctx.fillStyle = 'rgba(20,24,40,0.82)'; ctx.fill();
      ctx.restore();
    }

    // ── Scenery (hills, flowers, trees, clouds) ───────────
    const horizon = H * 0.72;
    const SCENE = {
      day:     { hill1: '#4a8a2a', hill2: '#3a7020', hill3: '#5a9a30', ground: '#3a6a1a', groundDark: '#2a5010', trunk: '#5a3a1a', foliage1: '#2d7a20', foliage2: '#3a9028', flower: ['#ff6688','#ffdd44','#ff88aa','#aa44ff','#44aaff'] },
      morning: { hill1: '#4a8a2a', hill2: '#3a6a1a', hill3: '#5a9030', ground: '#386018', groundDark: '#284810', trunk: '#4a3018', foliage1: '#287020', foliage2: '#347828', flower: ['#ff8899','#ffee66','#ffaacc','#cc88ff','#88ccff'] },
      golden:  { hill1: '#6a7820', hill2: '#5a6818', hill3: '#7a8828', ground: '#5a5c10', groundDark: '#3a3c08', trunk: '#6a4020', foliage1: '#5a6818', foliage2: '#687820', flower: ['#ffaa44','#ffdd22','#ffcc66','#ff8833','#eecc44'] },
      dusk:    { hill1: '#4a5018', hill2: '#383c10', hill3: '#585e20', ground: '#383a0a', groundDark: '#242508', trunk: '#3a2a10', foliage1: '#384018', foliage2: '#404818', flower: ['#ff7744','#ffaa22','#ff8844','#cc5522','#ddaa33'] },
      dawn:    { hill1: '#2a3820', hill2: '#1e2c18', hill3: '#303e22', ground: '#1c2810', groundDark: '#101808', trunk: '#2a1e10', foliage1: '#243020', foliage2: '#2c3828', flower: ['#cc6688','#aa8844','#cc88aa','#8844cc','#4488aa'] },
      night:   { hill1: '#1a2e18', hill2: '#121e10', hill3: '#203620', ground: '#101808', groundDark: '#080e04', trunk: '#181008', foliage1: '#162814', foliage2: '#1e3018', flower: ['#446688','#336655','#664488','#338866','#224466'] },
    };
    const sc = SCENE[phase];

    let _seed = 9876;
    const rng = () => { _seed = (_seed * 1664525 + 1013904223) & 0xffffffff; return (_seed >>> 0) / 0xffffffff; };

    // Far hill
    const hillPts1 = [];
    for (let x = 0; x <= W; x += W / 6) hillPts1.push({ x, y: horizon - (0.06 + rng() * 0.10) * H });
    hillPts1[0].y = horizon; hillPts1[hillPts1.length - 1].y = horizon;
    ctx.beginPath(); ctx.moveTo(0, horizon);
    for (let i = 0; i < hillPts1.length - 1; i++) {
      const mx = (hillPts1[i].x + hillPts1[i+1].x) / 2, my = (hillPts1[i].y + hillPts1[i+1].y) / 2;
      ctx.quadraticCurveTo(hillPts1[i].x, hillPts1[i].y, mx, my);
    }
    ctx.lineTo(W, horizon); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
    const hg1 = ctx.createLinearGradient(0, horizon - H * 0.14, 0, H);
    hg1.addColorStop(0, sc.hill2); hg1.addColorStop(1, sc.groundDark);
    ctx.fillStyle = hg1; ctx.fill();

    // Mid hill
    _seed = 5432;
    const hillPts2 = [];
    for (let x = 0; x <= W; x += W / 5) hillPts2.push({ x, y: horizon - (0.04 + rng() * 0.13) * H });
    hillPts2[0].y = horizon; hillPts2[hillPts2.length - 1].y = horizon;
    ctx.beginPath(); ctx.moveTo(0, horizon);
    for (let i = 0; i < hillPts2.length - 1; i++) {
      const mx = (hillPts2[i].x + hillPts2[i+1].x) / 2, my = (hillPts2[i].y + hillPts2[i+1].y) / 2;
      ctx.quadraticCurveTo(hillPts2[i].x, hillPts2[i].y, mx, my);
    }
    ctx.lineTo(W, horizon); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
    const hg2 = ctx.createLinearGradient(0, horizon - H * 0.16, 0, H);
    hg2.addColorStop(0, sc.hill3); hg2.addColorStop(1, sc.ground);
    ctx.fillStyle = hg2; ctx.fill();

    // Foreground ground
    const groundGrad = ctx.createLinearGradient(0, horizon, 0, H);
    groundGrad.addColorStop(0, sc.hill1); groundGrad.addColorStop(0.4, sc.ground); groundGrad.addColorStop(1, sc.groundDark);
    ctx.fillStyle = groundGrad; ctx.fillRect(0, horizon, W, H);

    // Tree helper
    const drawTree = (x, baseY, h, type) => {
      const trunkW = h * 0.1, trunkH = h * 0.35;
      ctx.fillStyle = sc.trunk;
      ctx.fillRect(x - trunkW / 2, baseY - trunkH, trunkW, trunkH);
      if (type === 'round') {
        const cr = h * 0.38, cy = baseY - trunkH - cr * 0.7;
        const tg = ctx.createRadialGradient(x - cr * 0.2, cy - cr * 0.2, cr * 0.1, x, cy, cr);
        tg.addColorStop(0, sc.foliage2); tg.addColorStop(1, sc.foliage1);
        ctx.beginPath(); ctx.arc(x, cy, cr, 0, Math.PI * 2); ctx.fillStyle = tg; ctx.fill();
        ctx.beginPath(); ctx.arc(x + cr * 0.4, cy + cr * 0.2, cr * 0.65, 0, Math.PI * 2); ctx.fillStyle = sc.foliage1; ctx.fill();
        ctx.beginPath(); ctx.arc(x - cr * 0.35, cy + cr * 0.1, cr * 0.6, 0, Math.PI * 2); ctx.fillStyle = sc.foliage2; ctx.fill();
      } else {
        for (let t = 0; t < 3; t++) {
          const ty = baseY - trunkH - t * h * 0.22, tw = h * (0.55 - t * 0.1), th2 = h * (0.32 + t * 0.04);
          ctx.beginPath(); ctx.moveTo(x, ty - th2); ctx.lineTo(x + tw / 2, ty); ctx.lineTo(x - tw / 2, ty); ctx.closePath();
          ctx.fillStyle = t % 2 === 0 ? sc.foliage1 : sc.foliage2; ctx.fill();
        }
      }
    };

    // Flower helper
    const drawFlower = (x, y, color) => {
      const r = 2.5 + rng() * 2;
      ctx.strokeStyle = sc.foliage2; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - r * 4); ctx.stroke();
      ctx.fillStyle = color;
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(a) * r * 1.2, y - r * 4 + Math.sin(a) * r * 1.2, r * 0.9, r * 0.6, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath(); ctx.arc(x, y - r * 4, r * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = '#fffaaa'; ctx.fill();
    };

    // Flowers (behind trees)
    if (phase !== 'night') {
      _seed = 3141;
      for (let i = 0; i < 28; i++) {
        const fx = rng() * W, fy = horizon + rng() * H * 0.12;
        const color = sc.flower[Math.floor(rng() * sc.flower.length)];
        ctx.save(); ctx.globalAlpha = phase === 'dawn' || phase === 'dusk' ? 0.5 : 0.75;
        drawFlower(fx, fy, color); ctx.restore();
      }
    }

    // Trees (in front of flowers)
    _seed = 7777;
    for (let i = 0; i < 14; i++) {
      const tx = rng() * W, depth = rng();
      const baseY = horizon + depth * H * 0.08, treeH = H * (0.06 + depth * 0.08);
      const type = rng() > 0.5 ? 'round' : 'pine';
      ctx.save(); ctx.globalAlpha = 0.55 + depth * 0.35;
      drawTree(tx, baseY, treeH, type); ctx.restore();
    }

    // Clouds (in front of everything — behind hills would be wrong; clouds go above hills)
    if (phase === 'day' || phase === 'morning' || phase === 'golden') {
      ctx.save();
      ctx.globalAlpha = phase === 'golden' ? 0.12 : 0.20;
      const drawCloud = (cx, cy, scale) => {
        ctx.beginPath();
        ctx.arc(cx, cy, 40 * scale, 0, Math.PI * 2);
        ctx.arc(cx + 38 * scale, cy - 12 * scale, 32 * scale, 0, Math.PI * 2);
        ctx.arc(cx + 74 * scale, cy, 36 * scale, 0, Math.PI * 2);
        ctx.arc(cx + 38 * scale, cy + 10 * scale, 28 * scale, 0, Math.PI * 2);
        ctx.fillStyle = 'white'; ctx.fill();
      };
      drawCloud(W * 0.08, H * 0.18, 0.9);
      drawCloud(W * 0.52, H * 0.12, 1.1);
      drawCloud(W * 0.78, H * 0.25, 0.75);
      ctx.restore();
    }
  }

  window.addEventListener('resize', () => { if (currentTheme === 'earth') renderSky(); });

  // ── Earth time widget ─────────────────────────────────
  const PHASE_ICONS = { day: '☀️', morning: '🌤', golden: '🌅', dusk: '🌇', dawn: '🌄', night: '🌙' };

  function updateEarthWidget() {
    if (currentTheme !== 'earth') return;
    const d = _earthDate ? new Date(_earthDate) : new Date();
    const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    const phase = document.documentElement.getAttribute('data-earth-phase') || 'day';
    document.getElementById('earth-time-display').textContent = timeStr;
    document.getElementById('earth-date-display').textContent = dateStr + (_earthDate ? ' ✎' : '');
    document.getElementById('earth-phase-icon').textContent = PHASE_ICONS[phase] || '☀️';
    document.getElementById('earth-phase-label').textContent = phase;
  }

  function toggleEarthTimeEdit() {
    const edit = document.getElementById('earth-time-edit');
    const isOpen = edit.classList.toggle('open');
    if (isOpen) {
      // Pre-fill with current (possibly overridden) time
      const d = _earthDate ? new Date(_earthDate) : new Date();
      // datetime-local format: YYYY-MM-DDTHH:MM
      const pad = n => String(n).padStart(2, '0');
      const val = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      document.getElementById('earth-dt-input').value = val;
    }
  }

  function earthPreview() {
    // Live preview as user scrubs
    const val = document.getElementById('earth-dt-input').value;
    if (!val) return;
    _earthDate = val; // store as string, new Date(val) works
    renderSky();
    updateEarthWidget();
  }

  function earthApplyTime() {
    const val = document.getElementById('earth-dt-input').value;
    if (val) {
      _earthDate = val;
      renderSky();
      updateEarthWidget();
    }
    document.getElementById('earth-time-edit').classList.remove('open');
    // Restart tick from this fixed time (won't auto-advance unless user resets)
  }

  function earthResetTime() {
    _earthDate = null;
    document.getElementById('earth-time-edit').classList.remove('open');
    renderSky();
    updateEarthWidget();
    scheduleEarthTick();
  }

  // Clock: update widget display every second; re-render sky every minute
  let _earthClockTimer = null;
  function startEarthClock() {
    if (_earthClockTimer) clearInterval(_earthClockTimer);
    _earthClockTimer = setInterval(() => {
      if (currentTheme !== 'earth') { clearInterval(_earthClockTimer); return; }
      if (!_earthDate) updateEarthWidget(); // live clock ticks
    }, 1000);
  }

  const _origStartEarth = startEarthMode;
  function startEarthMode() {
    if (_earthLat !== null) { renderSky(); scheduleEarthTick(); updateEarthWidget(); startEarthClock(); return; }
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => { _earthLat = pos.coords.latitude; _earthLng = pos.coords.longitude; renderSky(); scheduleEarthTick(); updateEarthWidget(); startEarthClock(); },
        () => { _earthLat = 0; _earthLng = 0; renderSky(); scheduleEarthTick(); updateEarthWidget(); startEarthClock(); },
        { timeout: 6000 }
      );
    } else { _earthLat = 0; _earthLng = 0; renderSky(); scheduleEarthTick(); updateEarthWidget(); startEarthClock(); }
  }
