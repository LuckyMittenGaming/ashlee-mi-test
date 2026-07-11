(() => {
  const db = window.STUDY_DATA;
  const app = document.getElementById('app');
  const toast = document.getElementById('toast');
  const confettiLayer = document.getElementById('confetti');
  const soundToggle = document.getElementById('soundToggle');

  const state = {
    view: 'home',
    sound: localStorage.getItem('ashlee-sound') !== 'off',
    test: null,
    flash: null,
    stats: JSON.parse(localStorage.getItem('ashlee-stats') || '{"tests":0,"best":0,"cards":0}')
  };

  const sample = arr => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = arr => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  const saveStats = () => localStorage.setItem('ashlee-stats', JSON.stringify(state.stats));
  const escapeHtml = value => String(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));

  function beep(kind = 'good') {
    if (!state.sound || !window.AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = kind === 'good' ? 'sine' : 'triangle';
    osc.frequency.value = kind === 'good' ? 660 : 210;
    gain.gain.setValueAtTime(.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .18);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + .18);
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function confetti() {
    const colors = ['#d946ef','#7c3aed','#f472b6','#f59e0b','#22c55e'];
    for (let i = 0; i < 58; i++) {
      const piece = document.createElement('i');
      piece.className = 'confetti-piece';
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = colors[i % colors.length];
      piece.style.animationDelay = `${Math.random() * .28}s`;
      piece.style.setProperty('--drift', `${-120 + Math.random() * 240}px`);
      confettiLayer.appendChild(piece);
      setTimeout(() => piece.remove(), 2100);
    }
  }

  function renderHome() {
    state.view = 'home';
    app.innerHTML = `
      <section class="hero">
        <div class="eyebrow">2026 personalized study app</div>
        <h1>Ashlee, go pass this <span class="gradient-text">damn test.</span></h1>
        <p class="lede">Theory questions, practical sequence drills, progress tracking, and motivational commentary from the man who has complete faith in you—even when he is outside taking a smoke break.</p>
        <div class="dad-note">From Dad: You already did the hard part by putting in the hours. Now we are just making the information stay in your head long enough to walk into that exam and politely kick its ass.</div>
      </section>
      <section class="mode-grid" aria-label="Study modes">
        <button class="mode-card" data-action="start-test">
          <span class="mode-icon">🧠</span><h2>85-Question Theory Test</h2>
          <p>Full-length randomized practice with explanations, category scoring, streaks, and a 90-minute timer.</p>
          <span class="card-meta">Best score: ${state.stats.best}% · ${state.stats.tests} completed</span>
        </button>
        <button class="mode-card" data-action="start-study">
          <span class="mode-icon">✨</span><h2>Quick Study Mode</h2>
          <p>Practice 20 randomized theory questions with immediate feedback. Less marathon, more focused ass-kicking.</p>
          <span class="card-meta">20 questions · untimed</span>
        </button>
        <button class="mode-card" data-action="start-practical">
          <span class="mode-icon">🧴</span><h2>Practical Flashcards</h2>
          <p>Forty-eight ordered prompts across setup, facial, waxing, makeup, and final cleanup.</p>
          <span class="card-meta">${state.stats.cards} cards reviewed</span>
        </button>
        <button class="mode-card" data-action="view-phases">
          <span class="mode-icon">⏱️</span><h2>Practical Game Plan</h2>
          <p>Review the five timed phases and the exact study-card count before running the full sequence.</p>
          <span class="card-meta">85 minutes total</span>
        </button>
      </section>`;
  }

  function startTest(length = 85) {
    const questions = shuffle(db.questions).slice(0, length).map(q => ({...q, options: q.options.map((text, originalIndex) => ({text, originalIndex}))}));
    questions.forEach(q => q.options = shuffle(q.options));
    state.test = {
      questions, index: 0, correct: 0, answered: false, selected: null, streak: 0,
      answers: [], startedAt: Date.now(), duration: length === 85 ? 90 * 60 : null,
      interval: null, mode: length === 85 ? 'Full Test' : 'Quick Study'
    };
    state.view = 'test';
    renderQuestion();
    if (state.test.duration) state.test.interval = setInterval(updateTimer, 1000);
  }

  function getRemaining() {
    if (!state.test?.duration) return null;
    return Math.max(0, state.test.duration - Math.floor((Date.now() - state.test.startedAt) / 1000));
  }

  function updateTimer() {
    const el = document.getElementById('timer');
    if (!el || !state.test) return;
    const remaining = getRemaining();
    const min = Math.floor(remaining / 60), sec = remaining % 60;
    el.textContent = `${min}:${String(sec).padStart(2,'0')}`;
    if (remaining <= 0) finishTest();
  }

  function renderQuestion() {
    const t = state.test;
    const q = t.questions[t.index];
    const pct = Math.round((t.index / t.questions.length) * 100);
    const category = db.categories[q.category];
    app.innerHTML = `
      <div class="toolbar"><button class="button secondary" data-action="quit">← Home</button><div class="pill">${escapeHtml(t.mode)}</div></div>
      <div class="scorebar">
        <span class="pill">Question ${t.index + 1} / ${t.questions.length}</span>
        <span class="pill">Score ${t.correct} · Streak ${t.streak}</span>
        ${t.duration ? '<span class="pill">⏱ <span id="timer">90:00</span></span>' : '<span class="pill">Untimed</span>'}
      </div>
      <div class="progress"><span style="width:${pct}%"></span></div>
      <section class="quiz-card">
        <div class="question-kicker">${escapeHtml(category)}</div>
        <h2 class="question">${escapeHtml(q.question)}</h2>
        <div class="answers">
          ${q.options.map((o,i) => `<button class="answer" data-answer="${i}"><strong>${String.fromCharCode(65+i)}.</strong> ${escapeHtml(o.text)}</button>`).join('')}
        </div>
        <div id="feedback"></div>
      </section>`;
    updateTimer();
  }

  function answerQuestion(index) {
    const t = state.test;
    if (!t || t.answered) return;
    t.answered = true;
    t.selected = index;
    const q = t.questions[t.index];
    const chosen = q.options[index];
    const correct = chosen.originalIndex === q.answer;
    if (correct) {
      t.correct++; t.streak++;
      beep('good'); confetti();
    } else {
      t.streak = 0; beep('bad');
    }
    t.answers.push({question: q.id, category: q.category, correct});
    document.querySelectorAll('.answer').forEach((button, i) => {
      button.disabled = true;
      const original = q.options[i].originalIndex;
      if (original === q.answer) button.classList.add('correct');
      else if (i === index) button.classList.add('wrong');
      else button.classList.add('dim');
    });
    let message = correct ? sample(db.blurbs.correct) : sample(db.blurbs.wrong);
    if (correct && [3,5,8,10].includes(t.streak)) message = sample(db.blurbs.streak);
    document.getElementById('feedback').innerHTML = `
      <div class="feedback"><strong>${escapeHtml(message)}</strong>${escapeHtml(q.rationale)}</div>
      <div class="actions"><button class="button primary" data-action="next">${t.index === t.questions.length - 1 ? 'See Results' : 'Next Question →'}</button></div>`;
  }

  function nextQuestion() {
    if (!state.test?.answered) return;
    if (state.test.index >= state.test.questions.length - 1) finishTest();
    else { state.test.index++; state.test.answered = false; state.test.selected = null; renderQuestion(); }
  }

  function finishTest() {
    const t = state.test;
    if (!t) return;
    if (t.interval) clearInterval(t.interval);
    const answeredCount = t.answers.length;
    const score = answeredCount ? Math.round((t.correct / answeredCount) * 100) : 0;
    if (t.questions.length === 85) {
      state.stats.tests++;
      state.stats.best = Math.max(state.stats.best, score);
      saveStats();
    }
    const byCat = Object.keys(db.categories).map(cat => {
      const entries = t.answers.filter(a => a.category === cat);
      const correct = entries.filter(a => a.correct).length;
      return {cat, total: entries.length, correct};
    }).filter(x => x.total);
    const passed = score >= 75;
    if (passed) confetti();
    app.innerHTML = `
      <section class="result-card">
        <div class="eyebrow">${escapeHtml(t.mode)} complete</div>
        <h1>${passed ? 'You crushed that shit.' : 'Practice did its job.'}</h1>
        <div class="result-score ${passed ? 'pass':'fail'}">${score}%</div>
        <p class="lede">${passed ? escapeHtml(sample(db.blurbs.finish)) : 'Not the score you wanted yet, but every missed question just became a target instead of a surprise.'}</p>
        <div class="breakdown">${byCat.map(x => `<div><strong>${escapeHtml(db.categories[x.cat])}</strong><br>${x.correct} / ${x.total} correct</div>`).join('')}</div>
        <p class="subtle">Study-app benchmark: 75%. This is not an official PSI score report, and exact exam scoring or content may differ.</p>
        <div class="actions"><button class="button primary" data-action="retry">Run It Again</button><button class="button secondary" data-action="home">Home</button></div>
      </section>`;
    state.test = null;
  }

  function startPractical() {
    state.flash = {cards:[...db.practical], index:0, revealed:false};
    state.view = 'practical';
    renderFlash();
  }

  function renderFlash() {
    const f = state.flash, c = f.cards[f.index];
    const pct = Math.round(((f.index + 1) / f.cards.length) * 100);
    app.innerHTML = `
      <div class="toolbar"><button class="button secondary" data-action="quit">← Home</button><span class="pill">Card ${f.index + 1} / ${f.cards.length}</span></div>
      <div class="progress"><span style="width:${pct}%"></span></div>
      <section class="flash-card">
        <div class="phase-banner"><span>${escapeHtml(c.phase)}</span><span>${c.minutes} min phase</span></div>
        <div class="flash-prompt">${escapeHtml(c.prompt)}</div>
        <div class="flash-answer ${f.revealed ? '' : 'hidden'}">${escapeHtml(c.answer)}</div>
        <div class="actions">
          ${f.revealed ? `<button class="button primary" data-action="flash-next">${f.index === f.cards.length - 1 ? 'Finish Deck' : 'Next Card →'}</button>` : '<button class="button primary" data-action="reveal">Reveal Answer</button>'}
        </div>
      </section>`;
  }

  function revealFlash() {
    state.flash.revealed = true;
    state.stats.cards++;
    saveStats();
    renderFlash();
  }

  function nextFlash() {
    if (state.flash.index >= state.flash.cards.length - 1) {
      confetti();
      app.innerHTML = `<section class="result-card"><div class="eyebrow">Practical deck complete</div><h1>Forty-eight steps reviewed.</h1><p class="lede">That is the whole sequence. Now run it again until sanitation feels automatic and the timing stops feeling like a hostage situation.</p><div class="actions"><button class="button primary" data-action="start-practical">Run Deck Again</button><button class="button secondary" data-action="home">Home</button></div></section>`;
      state.flash = null;
    } else {
      state.flash.index++;
      state.flash.revealed = false;
      renderFlash();
    }
  }

  function renderPhases() {
    state.view = 'phases';
    app.innerHTML = `
      <div class="toolbar"><button class="button secondary" data-action="home">← Home</button></div>
      <section class="result-card">
        <div class="eyebrow">Practical sequence</div>
        <h1 class="section-title">Five phases. No chaotic bullshit.</h1>
        <p class="lede">Use this as a pacing map, then drill the full 48-card deck until every sanitation decision is automatic.</p>
        <div class="phase-list">${db.phases.map((p,i) => `<div class="phase-row"><span class="phase-number">${i+1}</span><strong>${escapeHtml(p.name)}</strong><span>${p.minutes} min · ${p.count} cards</span></div>`).join('')}</div>
        <div class="actions"><button class="button primary" data-action="start-practical">Start Flashcards</button></div>
      </section>`;
  }

  app.addEventListener('click', event => {
    const answer = event.target.closest('[data-answer]');
    if (answer) return answerQuestion(Number(answer.dataset.answer));
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    const actions = {
      'start-test': () => startTest(85), 'start-study': () => startTest(20),
      'start-practical': startPractical, 'view-phases': renderPhases,
      next: nextQuestion, retry: () => startTest(85), reveal: revealFlash,
      'flash-next': nextFlash, home: renderHome, quit: () => { if(state.test?.interval) clearInterval(state.test.interval); state.test=null; state.flash=null; renderHome(); }
    };
    actions[action]?.();
  });

  document.addEventListener('click', event => {
    if (event.target.closest('[data-go="home"]')) renderHome();
  });
  soundToggle.addEventListener('click', () => {
    state.sound = !state.sound;
    localStorage.setItem('ashlee-sound', state.sound ? 'on' : 'off');
    soundToggle.textContent = state.sound ? '🔊' : '🔇';
    showToast(state.sound ? 'Sound on. Tiny victory beeps activated.' : 'Sound off. Silent ass-kicking mode.');
  });
  soundToggle.textContent = state.sound ? '🔊' : '🔇';
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/service-worker.js').catch(() => {}));
  renderHome();
})();
