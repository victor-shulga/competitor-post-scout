/* Summary strip (hero) and "Зрізи" (slices) built from the latest result.json.
   Everything is computed here from result.pieces, so a re-rank or a new hunt redraws it with no server change.
   Own posts (competitor name ending in "(ви)") are the benchmark: they feed the hero comparison, never the slices. */
(function () {
  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'text') n.textContent = v; else if (k === 'html') n.innerHTML = v; else n.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) if (c != null) n.append(c);
    return n;
  };
  const byId = (id) => document.getElementById(id);
  const median = (xs) => {
    const a = xs.filter((x) => x != null && !Number.isNaN(x)).sort((x, y) => x - y);
    if (!a.length) return null;
    const m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  };
  const fmtP = (v) => (v == null ? '—' : Math.round(v * 100) + '%');
  const fmtX = (v) => (v == null ? '—' : (v >= 10 ? v.toFixed(0) : v.toFixed(1)) + '×');
  const fmtN = (v) => (v == null ? '—' : v >= 10000 ? (v / 1000).toFixed(0) + 'K' : v >= 1000 ? (v / 1000).toFixed(1) + 'K' : String(Math.round(v)));
  const isOwn = (name) => /\(ви\)\s*$/.test(name || '');
  const cleanName = (name) => String(name || '').split('|')[0].trim();

  const HOOK = { contradiction: 'Заперечення', number_specific: 'Цифра в хуку', newsjack: 'Новина', outcome_build: 'Я зробив / результат', how_to: 'Як зробити', other: 'Інше' };
  const LANE = { method: 'Метод і інструкція', client_result: 'Кейси й результати', market_view: 'Думка про ринок',
                 offer_pitch: 'Послуги й запрошення', founder_story: 'Історія засновника', off_niche: 'Поза нішею' };
  Object.assign(LANE, window.CH_LABELS || {});   // a client's own topic lanes (build_static.py --client)
  const PLAT = { linkedin: 'LinkedIn', instagram: 'Instagram', youtube: 'YouTube' };
  const FMT = { image: 'картинка', document: 'PDF-карусель', video: 'відео', text: 'текст', article: 'стаття', reel: 'Reels', carousel: 'карусель', short: 'Shorts', longform: 'довге відео' };
  const HIT = 2;          // a hit = at least 2x the creator's own median reach in that format
  const MIN_REACH = 10;   // creators whose median post gets under this are too small for ratios (4 likes vs 2 is not a hit)
  const MIN_N = 5;        // a slice row needs this many posts
  const HERO_MIN_N = 10;  // a headline pick needs this many

  // One slice = group pieces by a key, rank groups by median breakout (comparable across platforms:
  // each post is measured against its own creator's median), keep groups with at least MIN_N posts.
  function slice(pieces, keyFn, labelFn, minN = MIN_N) {
    const groups = new Map();
    for (const p of pieces) {
      const k = keyFn(p);
      if (k == null) continue;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(p);
    }
    const rows = [], thin = [];
    for (const [k, ps] of groups) {
      const rated = ps.filter((p) => p.breakout != null);
      const row = { key: k, label: labelFn(k), n: ps.length, br: rated.length ? rated.filter((p) => p.breakout >= HIT).length / rated.length : null,
                    score: median(ps.map((p) => p.score)), pieces: ps };
      (ps.length >= minN && row.br != null ? rows : thin).push(row);
    }
    rows.sort((a, b) => b.br - a.br || b.score - a.score);
    const rated = pieces.filter((p) => p.breakout != null);
    return { rows, thin, all: rated.length ? rated.filter((p) => p.breakout >= HIT).length / rated.length : null };
  }

  function infoBtn(html) {
    return el('button', { type: 'button', class: 'info-btn', 'aria-label': 'Пояснення' }, 'i', el('span', { class: 'info-pop', role: 'tooltip', html }));
  }

  function barPanel(title, cols, sl, note) {
    const max = Math.max(...sl.rows.map((r) => r.br), 1e-9);
    const rows = sl.rows.slice(0, 7).map((r, i) => el('div', { class: 'row' + (i === 0 ? ' top' : '') },
      el('div', { class: 'row-top' },
        el('span', { class: 'name', title: r.label }, r.label, el('small', { text: 'n=' + r.n })),
        el('span', { class: 'meta', text: 'бал ' + Math.round(r.score) })),
      el('div', { class: 'bar-line' },
        el('span', { class: 'bar', style: 'width:' + Math.max(3, (r.br / max) * 78).toFixed(1) + '%' }),
        el('span', { class: 'bar-val', text: fmtP(r.br) }))));
    const thinNote = sl.thin.length ? ' Замало постів для висновку: ' + sl.thin.map((t) => t.label + ' (' + t.n + ')').join(', ') + '.' : '';
    return el('div', { class: 'cut' },
      el('h3', {}, title, infoBtn(note + thinNote)),
      el('div', { class: 'cols' }, el('span', { text: cols[0] }), el('span', { text: cols[1] })),
      rows.length ? rows : el('p', { class: 'empty-note', text: 'Немає груп з ' + MIN_N + '+ постами.' }));
  }

  // Words that show up more often in the top quarter (by hunt score) than in everything collected.
  const STOP = new Set(('the and for you your with that this are was have from not but what how all can our more they their about just will been when into out one get who why its it\'s than then them were also only very most some like make made need want over most post posts here there know still even much many these those would could should every after before because which while where being really thing things people time year years week today that\'s right anyone without don\'t i\'m you\'re ' +
    'це що як для від але так вже щоб або при над під про без його її їх цей ця ці той та тих коли тому бо якщо навіть дуже більше менше який яка які чому треба можна буде було були мені мене ваш ваша ваші свій своя свої наш наша наші тут там теж ще лише тільки після перед через також кожен кожна всі все весь ' +
    'это что как для или при над под про без его она они этот эта эти тот когда потому если даже очень больше меньше который которая которые почему нужно можно будет было были мне меня ваш наш тут там тоже еще только после перед через также каждый все весь').split(/\s+/));
  function words(p) {
    const text = ((p.title || '') + ' ' + (p.snippet || '').slice(0, 280)).toLowerCase();
    const out = new Set();
    for (const w of text.match(/[\p{L}][\p{L}\-']{3,}/gu) || []) if (!STOP.has(w)) out.add(w);
    return out;
  }
  function keywordPanel(pieces) {
    if (pieces.length < 20) return null;
    const sorted = [...pieces].sort((a, b) => b.score - a.score);
    const top = sorted.slice(0, Math.max(5, Math.round(sorted.length / 4)));
    const dfAll = new Map(), dfTop = new Map();
    for (const p of pieces) for (const w of words(p)) dfAll.set(w, (dfAll.get(w) || 0) + 1);
    for (const p of top) for (const w of words(p)) dfTop.set(w, (dfTop.get(w) || 0) + 1);
    const rows = [];
    for (const [w, t] of dfTop) {
      const a = dfAll.get(w) || 0;
      if (t < 5 || a < 8) continue;
      const lift = (t / top.length) / (a / pieces.length);
      if (lift < 1.2) continue;
      rows.push({ label: w, n: t, all: a, br: lift });
    }
    rows.sort((a, b) => b.br - a.br || b.n - a.n);
    const max = Math.max(...rows.map((r) => r.br), 1e-9);
    const list = rows.slice(0, 8).map((r, i) => el('div', { class: 'row' + (i === 0 ? ' top' : '') },
      el('div', { class: 'row-top' },
        el('span', { class: 'name', title: r.label }, r.label, el('small', { text: r.n + ' з ' + top.length })),
        el('span', { class: 'meta', text: 'усього ' + r.all })),
      el('div', { class: 'bar-line' },
        el('span', { class: 'bar', style: 'width:' + Math.max(3, (r.br / max) * 78).toFixed(1) + '%' }),
        el('span', { class: 'bar-val', text: r.br.toFixed(1) + '×' }))));
    return el('div', { class: 'cut' },
      el('h3', {}, 'Слова з найкращих постів', infoBtn(
        '<b>Що це.</b> Слова із заголовка й перших рядків, які в найкращій чверті постів (за балом) трапляються частіше, ніж у всіх зібраних. ' +
        '<b>Смуга</b> = у скільки разів частіше. «3 з ' + top.length + '» = у скількох найкращих постах є слово, «усього» = у скількох з усіх ' + pieces.length + '. ' +
        'Беруться слова, що є хоча б у 5 найкращих постах і 8 загалом.')),
      el('div', { class: 'cols' }, el('span', { text: 'у найкращих' }), el('span', { text: 'частіше в' })),
      list.length ? list : el('p', { class: 'empty-note', text: 'Повторюваних слів у найкращих постах не знайшлося.' }));
  }

  // Concrete hooks to copy: the 2 strongest hook types, 3 best titles each.
  function examplesPanel(hooks) {
    const items = [];
    for (const r of hooks.rows.filter((r) => r.key !== 'other').slice(0, 2)) {
      for (const p of [...r.pieces].sort((a, b) => b.score - a.score).slice(0, 3)) {
        items.push(el('li', {},
          el('span', { class: 'tag', text: r.label }), el('br'),
          el('a', { href: p.url || '#', target: '_blank', rel: 'noopener', text: p.title || '(без заголовка)' }),
          el('span', { class: 'who', text: cleanName(p.competitor) + ' · ' + (PLAT[p.platform] || p.platform) + ' · ' + fmtX(p.breakout) + ' від звичайного' })));
      }
    }
    return el('div', { class: 'cut' },
      el('h3', {}, 'Хуки, які варто взяти', infoBtn('Два типи хуків із найбільшою часткою хітів і по три найкращі заголовки кожного (за балом). Відкривається оригінальний пост.')),
      el('div', { class: 'cols' }, el('span', { text: 'приклади' }), el('span', { text: '' })),
      items.length ? el('ul', { class: 'ex' }, items) : el('p', { class: 'empty-note', text: 'Мало даних.' }));
  }

  function heroStats(result, comp, own, hooks, lanes, fmts, who, collected) {
    const ul = byId('hero-stats');
    if (!ul) return;
    const cards = [];
    // 1. Own LinkedIn median vs the best competitor median on the same platform.
    const ownRow = (result.competitors || []).find((c) => isOwn(c.name) && c.platform === 'linkedin');
    const rivals = (result.competitors || []).filter((c) => !isOwn(c.name) && c.platform === 'linkedin' && c.pieces > 0);
    const best = rivals.sort((a, b) => (b.median_views || 0) - (a.median_views || 0))[0];
    if (ownRow && best) {
      cards.push(el('li', { class: 'hstat lead-stat' },
        el('p', { class: 'lbl', text: 'Ви в LinkedIn' }),
        el('p', { class: 'val' }, fmtN(ownRow.median_views), el('small', { text: 'медіана' })),
        el('p', { class: 'sub', text: 'найкращий конкурент: ' + fmtN(best.median_views) + ' (' + cleanName(best.name) + ')' })));
    }
    cards.push(el('li', { class: 'hstat' },
      el('p', { class: 'lbl', text: 'Зібрано' }),
      el('p', { class: 'val' }, String(collected.length), el('small', { text: 'постів' })),
      el('p', { class: 'sub', text: new Set(collected.map((p) => cleanName(p.competitor))).size + ' конкурентів · ' + (result.window_days || 80) + ' днів' })));
    const pick = (sl, lbl) => {
      const r = sl.rows.find((x) => x.n >= HERO_MIN_N && x.key !== 'other');
      if (!r) return;
      if (!r.br) {   // no group reached a single hit: say so instead of crowning a 0% «best»
        cards.push(el('li', { class: 'hstat' }, el('p', { class: 'lbl', text: lbl }), el('p', { class: 'val', text: '—' }),
          el('p', { class: 'sub', text: 'жодного хіта · n=' + sl.rows.reduce((s, x) => s + x.n, 0) })));
        return;
      }
      cards.push(el('li', { class: 'hstat' },
        el('p', { class: 'lbl', text: lbl }),
        el('p', { class: 'val' }, fmtP(r.br), el('small', { text: 'хітів' })),
        el('p', { class: 'sub', text: r.label + ' · n=' + r.n })));
    };
    pick(hooks, 'Найкращий хук');
    pick(lanes, 'Найкраща тема');
    pick(fmts, 'Найкращий формат');
    pick(who, 'Хто вистрілює');
    ul.replaceChildren(...cards.slice(0, 6));
    const sub = byId('hero-sub');
    if (sub) sub.textContent = 'Останній прогін: ' + (result.generated_at || '').slice(0, 10).split('-').reverse().join('.') + ' · хіт = пост удвічі сильніший за звичайний рівень автора';
  }

  window.renderInsights = function (result) {
    const raw = (result.pieces || []).filter((p) => p.jev);
    const med = new Map();
    for (const p of raw) { const k = p.competitor + '|' + p.platform; if (!med.has(k)) med.set(k, []); med.get(k).push(p.reach); }
    const tiny = new Set([...med].filter(([, v]) => (median(v) || 0) < MIN_REACH).map(([k]) => k));
    const all = raw.filter((p) => !tiny.has(p.competitor + '|' + p.platform));
    const tinyNames = [...tiny].map((k) => { const [n, pl] = k.split('|'); return cleanName(n) + ' (' + (PLAT[pl] || pl) + ')'; });
    const own = all.filter((p) => isOwn(p.competitor));
    const comp = all.filter((p) => !isOwn(p.competitor) && p.breakout != null);
    const hooks = slice(comp, (p) => p.jev.hook_type, (k) => HOOK[k] || k);
    const lanes = slice(comp.filter((p) => p.jev.topic_lane !== 'off_niche'), (p) => p.jev.topic_lane, (k) => LANE[k] || k);
    const fmts = slice(comp, (p) => p.platform + '·' + p.format, (k) => { const [pl, f] = k.split('·'); return (PLAT[pl] || pl) + ' · ' + (FMT[f] || f); });
    const who = slice(comp, (p) => cleanName(p.competitor) + '|' + p.platform, (k) => { const [n, pl] = k.split('|'); return n + ' · ' + (PLAT[pl] || pl); }, 8);
    heroStats(result, comp, own, hooks, lanes, fmts, who, raw.filter((p) => !isOwn(p.competitor)));

    const meta = byId('cuts-meta');
    if (meta) meta.textContent = comp.length + ' постів конкурентів' + (own.length ? ', ваші ' + own.length + ' не враховано' : '') +
      (tinyNames.length ? ', ' + tinyNames.length + ' замалих акаунтів пропущено' : '') + ' · хіт = пост, що вдвічі перевершив звичайний рівень автора · у середньому хітів ' + fmtP(hooks.all);
    const cols = ['частка хітів', 'медіана балу'];
    const panels = [
      barPanel('Хуки', cols, hooks, '<b>Тип хука</b> визначає Jev за першим рядком поста. <b>Хіт</b> = пост, чиє охоплення щонайменше вдвічі більше за медіану самого автора в тому ж форматі: так порівнюються великі й малі акаунти й різні мережі. Смуга = частка хітів у групі, праворуч медіанний бал (попит × відповідність вашій аудиторії, 0–100). У групі мінімум ' + MIN_N + ' постів.'),
      barPanel('Теми', cols, lanes, 'Тема поста за Jev. Пости «поза нішею» не показуються. Відрив і бал рахуються так само, як у хуках.'),
      barPanel('Формати', cols, fmts, 'Мережа й формат поста. У LinkedIn охоплення = реакції + коментарі (перегляди бачить лише автор), в Instagram і YouTube = перегляди.'),
      barPanel('Хто частіше вистрілює', cols, who, (tinyNames.length ? '<b>Не враховано</b> (медіана поста менше ' + MIN_REACH + ' взаємодій чи переглядів, частки на таких числах шумлять): ' + tinyNames.join(', ') + '. ' : '') + 'Частка постів-хітів кожного автора в кожній мережі. Висока частка = автор регулярно перевершує свій же рівень, тобто знає, що заходить його аудиторії, а не просто має велику аудиторію.'),
      keywordPanel(comp),
      examplesPanel(hooks),
    ].filter(Boolean);
    const box = byId('cuts');
    if (box) box.replaceChildren(...panels);
  };
})();
