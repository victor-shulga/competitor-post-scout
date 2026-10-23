// Market (TAM → SAM → SOM) and competitor offers, drawn from window.CH_DATA.market / .offers (build_static.py).
// Both blocks are optional: a build without market.json / offers.json renders nothing. Static build only.
(function () {
  const D = window.CH_DATA || {};
  const AN = (D.analysis && D.analysis.items) || [];
  if (!D.market && !(D.offers && D.offers.length) && !AN.length) return;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const n0 = (v) => v == null ? '—' : Math.round(v).toLocaleString('uk-UA');
  const usd = (v) => v == null ? '—' : '$' + Math.round(v).toLocaleString('en-US');
  const musd = (v) => v == null ? null : v >= 1e9 ? '$' + (v / 1e9).toFixed(1).replace('.', ',') + ' млрд' : v >= 1e6 ? '$' + (v / 1e6).toFixed(1).replace('.', ',') + ' млн' : '$' + Math.round(v / 1000) + 'K';
  const isOwn = (name) => /\(ви\)\s*$/.test(name || '');
  const info = (html) => `<button type="button" class="ex-info" aria-label="Пояснення">i<span class="ex-pop" role="tooltip">${html}</span></button>`;

  function marketHTML(M) {
    const R = 116, cx = 120, by = 236, rOf = (c) => R * Math.sqrt(Math.max(c, 0) / M.tam.count);
    const circ = (k, fill, stroke, min) => { const r = Math.max(rOf(M[k].count), min || 0); return `<circle cx="${cx}" cy="${by - r}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`; };
    const lab = (k, min, color) => `<text x="${cx}" y="${by - 2 * Math.max(rOf(M[k].count), min || 0) + (k === 'som' ? -6 : 24)}" text-anchor="middle" class="ex-svg-t" fill="${color}">${M[k].label}</text>`;
    const svg = `<svg class="ex-svg" viewBox="0 0 240 240" role="img" aria-label="TAM, SAM і SOM як вкладені кола">` +
      circ('tam', 'var(--ex-tam)', 'var(--ex-line)') + circ('sam', 'var(--ex-sam)', 'var(--ex-line2)') + circ('som', 'var(--accent)', 'var(--accent-focus)', 6) +
      lab('tam', 0, 'var(--muted)') + lab('sam', 0, 'var(--muted)') + lab('som', 6, 'var(--accent-focus)') + '</svg>';
    const shades = ['var(--ex-p1)', 'var(--ex-p2)', 'var(--ex-p3)', 'var(--ex-p4)'];
    const parts = (p, unit) => !p || !p.length ? '' :
      `<div class="ex-parts">${p.map(([, c], i) => `<i style="width:${(c / p.reduce((a, [, x]) => a + x, 0) * 100).toFixed(1)}%;background:${shades[i % 4]}"></i>`).join('')}</div>` +
      `<div class="ex-legend">${p.map(([l, c]) => `${esc(l)} ${n0(c)}${unit || ''}`).join(' · ')}</div>`;
    const row = (k) => {
      const x = M[k], money = musd(x.usd != null ? x.usd : (M.unit_usd && !x.no_money ? x.count * M.unit_usd : null));
      return `<div class="ex-row ${k}"><div class="t">${x.label}</div><div class="n">${esc(x.name)}</div><div class="v">${x.approx ? '≈ ' : ''}${n0(x.count)}</div>` +
        `<div class="d">${esc(x.def)}</div><div class="m">${money ? money + '/рік' : ''}</div>` +
        (x.range ? `<div class="ex-range">${esc(x.range)}</div>` : '') + parts(x.parts, x.parts_unit) +
        (x.note ? `<div class="ex-legend">${esc(x.note)}</div>` : '') + '</div>';
    };
    const share = M.sam.count ? (M.som.count / M.sam.count * 100).toFixed(1).replace('.', ',') : null;
    const note = `<b>TAM</b>: усі компанії, яким теоретично можна продати. <b>SAM</b>: ті, кому офер підходить без натяжок. <b>SOM</b>: ${esc(M.som.how || 'скільки реально досяжно зараз')}.` +
      (M.unit_usd ? ` Гроші = компанії × ${usd(M.unit_usd)} на рік (${esc(M.unit_label || '')}).` : '') +
      ` Джерело: ${esc(M.source)}, виміряно ${esc(M.measured)}. Точність кожного числа написана під ним.` + (share ? ` SOM = ${share}% SAM.` : '');
    return `<div class="ex-head"><h2>Ринок${info(note)}</h2><p class="ex-sub">компанії${M.unit_usd ? ' й гроші на рік' : ''} · виміряно ${esc(M.measured)}</p></div>` +
      `<div class="ex-market">${svg}<div class="ex-rows">${row('tam')}${row('sam')}${row('som')}</div></div>`;
  }

  function bars(rows, fmt) {
    const max = Math.max(...rows.map((r) => r.v), 1e-9);
    return rows.map((r) => `<div class="ex-br"><span class="k" title="${esc(r.label)}">${esc(r.label)}</span><span class="track"><span class="fill" style="width:${Math.max(2, r.v / max * 100).toFixed(1)}%;background:${r.own ? 'var(--accent)' : 'var(--ex-bar)'}"></span></span><span class="v">${fmt(r.v)}</span></div>`).join('');
  }

  function offersHTML(offers) {
    const rivals = offers.filter((o) => !isOwn(o.name));
    const cell = (v) => v ? esc(v) : '<span class="muted">—</span>';
    const priceOf = (o) => o.price_from_usd_month != null ? usd(o.price_from_usd_month) + '/міс' : o.price_one_off_usd != null ? usd(o.price_one_off_usd) + ' разово' : null;
    const NET = { youtube: 'YouTube', instagram: 'Instagram', tiktok: 'TikTok', x: 'X', facebook: 'Facebook' };
    const cards = offers.map((o) => {
      const price = priceOf(o), tiers = (o.tiers || []).filter((t) => t.price).slice(0, 4);
      const nets = Object.entries(o.socials || {}).filter(([, u]) => u).map(([k, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${NET[k] || k}</a>`).join(' · ');
      const row = (k, v) => `<dt>${k}</dt><dd>${v}</dd>`;
      return `<details class="ex-oc${isOwn(o.name) ? ' own' : ''}"><summary><div class="ex-oc-head"><b>${esc(o.name)}</b>` +
        `<span class="ex-tag">${esc(o.model || 'невідомо')}</span><span class="sp"></span><span class="ex-price${price ? '' : ' none'}">${price ? 'від ' + esc(price) : 'ціна не публічна'}</span></div>` +
        `<p class="ex-lead">${esc(o.core_offer || o.icp || '')}</p><span class="ex-more">Деталі</span></summary><dl>` +
        (o.site ? row('Сайт', `<a href="${esc(o.site)}" target="_blank" rel="noopener">${esc(o.site.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</a>`) : '') +
        row('Кому', cell(o.icp)) + row('Що продають', cell(o.core_offer) + (tiers.length ? '<ul>' + tiers.map((t) => `<li>${esc(t.name)}: <b>${esc(t.price)}</b></li>`).join('') + '</ul>' : '')) +
        row('Вхід', cell(o.entry_offer)) + row('Гарантія', cell(o.guarantee)) + row('Докази', cell(o.proof)) + (nets ? row('Соцмережі', nets) : '') + '</dl></details>';
    }).join('');
    const monthly = offers.filter((o) => o.price_from_usd_month != null).map((o) => ({ label: o.name, v: o.price_from_usd_month, own: isOwn(o.name) })).sort((a, b) => b.v - a.v);
    const oneoff = offers.filter((o) => o.price_one_off_usd != null).map((o) => ({ label: o.name, v: o.price_one_off_usd, own: isOwn(o.name) })).sort((a, b) => b.v - a.v);
    const models = {}; rivals.forEach((o) => { const m = o.model || 'невідомо'; models[m] = (models[m] || 0) + 1; });
    const modelRows = Object.entries(models).map(([label, v]) => ({ label, v })).sort((a, b) => b.v - a.v);
    const nPub = rivals.filter((o) => o.price_from_usd_month != null || o.price_one_off_usd != null).length;
    const cut = (t, body, note) => `<div class="ex-cut"><h3>${esc(t)}${note ? info(note) : ''}</h3>${body}</div>`;
    const empty = (t) => `<p class="muted">${t}</p>`;
    const note = 'Зібрано з публічних сторінок сайтів (головна, ціни, послуги, гарантії). Чого на сайті немає, стоїть «—», нічого не дописано. «Ціна від» = найдешевший публічний платіж: місячний, якщо є, інакше разовий.';
    return `<div class="ex-head"><h2>Офери${info(note)}</h2><p class="ex-sub">${rivals.length} конкурентів · ціну публікують ${nPub} · ваш офер першим</p></div>` +
      `<div class="ex-cuts">` +
      cut('Ціна на місяць', monthly.length ? bars(monthly, usd) : empty('Ніхто не публікує місячну ціну'), 'Найдешевший публічний місячний платіж кожного. Це різні продукти: від супроводу одного сайту до виділеного розробника, тож порівнюйте з тим, що написано в картці. Колір бренду = ви.') +
      cut('Разовий проєкт', oneoff.length ? bars(oneoff, usd) : empty('Разових цін немає'), 'Найдешевший публічний разовий платіж за проєкт чи сторінку.') +
      cut('Модель роботи', bars(modelRows, (v) => String(v)), 'Скільки конкурентів продають підпискою, фіксом за проєкт, погодинно чи змішано.') +
      `</div><div class="ex-tools"><button type="button" data-all="ex-oc-grid">Розгорнути все</button></div><div class="ex-oc-grid">${cards}</div>`;
  }

  function analysisHTML(A) {
    const TONE = { edge: 'перевага', gap: 'дірка', watch: 'стежити' };
    const note = 'Висновки з постів конкурентів за 80 днів і їхніх оферів на сайтах. Зелена смуга = перевага, червона = дірка, сіра = за чим стежити. Цифри звірені з даними цієї сторінки.';
    return `<div class="ex-head"><h2>Що з цього випливає${info(note)}</h2><p class="ex-sub">${A.items.length} висновків · написано ${esc(A.written)}</p></div>` +
      `<div class="ex-tools"><button type="button" data-all="ex-an">Розгорнути все</button></div>` +
      `<div class="ex-an">${A.items.map((a) => `<details class="ex-an-card ${esc(a.tone)}"><summary><div class="ex-an-tag">${TONE[a.tone] || ''}</div><h3>${esc(a.title)}</h3><span class="ex-more">Чому і що робити</span></summary><div class="ex-body"><p>${esc(a.text)}</p><p class="act"><b>Що робити</b>${esc(a.action)}</p></div></details>`).join('')}</div>`;
  }

  function mount() {
    const hero = document.querySelector('.hero') || document.querySelector('main section');
    const host = hero && (hero.closest('section') || hero);
    if (!host) return;
    const wrap = (id, html) => { const s = document.createElement('section'); s.className = 'tile ex-tile'; s.id = id; s.innerHTML = `<div class="wrap">${html}</div>`; return s; };
    let after = host;
    if (D.market) { const s = wrap('market-tile', marketHTML(D.market)); after.after(s); after = s; }
    if (AN.length) { const s = wrap('analysis-tile', analysisHTML(D.analysis)); after.after(s); after = s; }
    if (D.offers && D.offers.length) {
      const own = D.offers.filter((o) => isOwn(o.name)), rest = D.offers.filter((o) => !isOwn(o.name));
      const s = wrap('offers-tile', offersHTML(own.concat(rest))); after.after(s);
    }
    document.addEventListener('click', (e) => {
      const b = e.target.closest('.ex-info');
      document.querySelectorAll('.ex-info.open').forEach((x) => { if (x !== b) x.classList.remove('open'); });
      if (b) b.classList.toggle('open');
      const all = e.target.closest('[data-all]');
      if (all) {
        const box = all.closest('.wrap').querySelector('.' + all.dataset.all);
        const ds = [...box.querySelectorAll('details')], open = !ds.every((d) => d.open);
        ds.forEach((d) => { d.open = open; });
        all.textContent = open ? 'Згорнути все' : 'Розгорнути все';
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
