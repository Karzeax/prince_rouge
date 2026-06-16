(function () {
    "use strict";

    var currentTurn = 0;

    var ROW_COORDS = [-26, -27, -28, -29, -30, -31, -32, -33, -34, -35, -36, -37, -38, -39];
    var COL_COORDS = [45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58];

    var grid = document.getElementById("grid");
    var historyTable = document.getElementById("history-table");
    var dateEl = document.getElementById("date");
    var timeEl = document.getElementById("time");
    var turnLabelEl = document.getElementById("turn-label");
    var slider = document.getElementById("turn-slider");
    var display = document.getElementById("turn-display");
    var prevBtn = document.getElementById("prev-btn");
    var nextBtn = document.getElementById("next-btn");
    var historic = document.querySelector(".historic");

    // ===================== Bilan du combat =====================
    var BILAN = {
        title: "Prince Rouge",
        enemies: ["Prince Rouge", "Fiélon", "Flammeliée", "Lampade", "Sonneur ardent"],
        exclude: ["Mulet"],
        tamed: ["Tréant", "Fantôme"],
        tickTo: "[CIC] Sephy",
        note: "Le tick de brûlure subi par le Prince Rouge (attaque explosive) est attribué à Sephy. Les dégâts des ennemis ne sont pas comptabilisés."
    };

    function stripTags(s) {
        return (s || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    }

    function computeStats() {
        var VERBS = ["lance le sort", "active son tour", "attaque", "utilise", "soigne"];
        var stats = {};
        function ensure(n) {
            if (!stats[n]) stats[n] = { name: n, dmg: 0, hits: 0, crit: 0, maxHit: 0, maxCrit: false, heal: 0, heals: 0, maxHeal: 0, burn: 0, support: 0, img: "" };
            return stats[n];
        }
        function isExcluded(n) { return BILAN.enemies.indexOf(n) !== -1 || BILAN.exclude.indexOf(n) !== -1; }
        var regenSource = {};

        for (var ti = 0; ti < TURNS.length; ti++) {
            if (TURNS[ti].isBilan) continue;
            var hist = TURNS[ti].history || [];
            for (var hi = 0; hi < hist.length; hi++) {
                var ev = hist[hi], raw = ev.text || "", txt = stripTags(raw), res = stripTags(ev.result || "");
                var imgm = raw.match(/src="([^"]+)"/);

                if (/Soutien dévoué/.test(txt)) {
                    var iu = txt.indexOf("utilise");
                    if (iu > 0) {
                        var sa = txt.slice(0, iu).trim();
                        if (!isExcluded(sa)) { var su = ensure(sa); if (imgm && !su.img) su.img = imgm[1]; su.support++; }
                    }
                } else if (txt.indexOf(" soutient ") !== -1) {
                    var sa2 = txt.slice(0, txt.indexOf(" soutient ")).trim();
                    if (!isExcluded(sa2)) { var su2 = ensure(sa2); if (imgm && !su2.img) su2.img = imgm[1]; su2.support++; }
                }

                var rg = txt.match(/lance le sort Régénération sur (.+)$/);
                if (rg) { regenSource[rg[1].trim()] = txt.slice(0, txt.indexOf("lance le sort")).trim(); }

                var idx = -1, verb = null;
                for (var v = 0; v < VERBS.length; v++) {
                    var p = txt.indexOf(VERBS[v]);
                    if (p > 0 && (idx === -1 || p < idx)) { idx = p; verb = VERBS[v]; }
                }
                if (idx <= 0) continue;
                var actor = txt.slice(0, idx).trim();
                var dmgM = res.match(/-(\d+)\s*PV/), healM = res.match(/\+(\d+)\s*PV/), crit = /Critique/i.test(res);

                if (verb === "active son tour") {
                    if (dmgM && BILAN.enemies.indexOf(actor) !== -1 && BILAN.tickTo) {
                        ensure(BILAN.tickTo).burn += parseInt(dmgM[1], 10);
                    } else if (healM && regenSource[actor] && !isExcluded(regenSource[actor])) {
                        var rt = ensure(regenSource[actor]), rhv = parseInt(healM[1], 10);
                        rt.heal += rhv; rt.heals++; if (rhv > rt.maxHeal) rt.maxHeal = rhv;
                    }
                    continue;
                }
                if (dmgM && !isExcluded(actor)) {
                    var s = ensure(actor);
                    if (imgm && !s.img) s.img = imgm[1];
                    var d = parseInt(dmgM[1], 10);
                    s.dmg += d; s.hits++; if (crit) s.crit++;
                    if (d > s.maxHit) { s.maxHit = d; s.maxCrit = crit; }
                } else if (!isExcluded(actor) && /Blocage|Esquive/.test(res)) {
                    var sb = ensure(actor);
                    if (imgm && !sb.img) sb.img = imgm[1];
                    sb.hits++;
                }
                if (healM && !isExcluded(actor) && (verb === "soigne" || /Gu[ée]rison/i.test(txt))) {
                    var sh = ensure(actor), dhv = parseInt(healM[1], 10);
                    if (imgm && !sh.img) sh.img = imgm[1];
                    sh.heal += dhv; sh.heals++; if (dhv > sh.maxHeal) sh.maxHeal = dhv;
                }
            }
        }
        var arr = [];
        for (var k in stats) {
            if (stats.hasOwnProperty(k)) {
                var o = stats[k];
                o.total = o.dmg + o.burn;
                o.avg = o.hits ? Math.round(o.dmg / o.hits) : 0;
                o.rate = o.hits ? Math.round(o.crit / o.hits * 100) : 0;
                arr.push(o);
            }
        }
        arr.sort(function (a, b) { return b.total - a.total || b.heal - a.heal; });
        return arr;
    }

    function dispName(n) { return n.replace("[CIC] ", "").trim(); }
    function avatarTag(s) {
        return s.img ? '<img class="bilan-ava" src="' + s.img + '" alt="">' : '<span class="bilan-ava bilan-ava-empty"></span>';
    }
    function isTamed(n) { return BILAN.tamed.indexOf(n) !== -1; }

    function mvpCard(label, s, value, kind) {
        return '<div class="bilan-card' + (kind === "heal" ? " bilan-card-heal" : "") + '">' +
            '<div class="bilan-card-label">' + label + '</div>' +
            '<div class="bilan-card-row">' + avatarTag(s) + '<span class="bilan-card-name">' + dispName(s.name) + '</span></div>' +
            '<div class="bilan-card-val">' + value + '</div>' +
        '</div>';
    }

    function buildBilanHTML() {
        var arr = computeStats();
        var dealers = arr.filter(function (p) { return p.total > 0; });
        var participants = arr.filter(function (p) { return p.total > 0 || p.hits > 0 || p.heals > 0 || p.support > 0; });
        var seen = {}, nbTurns = 0;
        for (var i = 0; i < TURNS.length; i++) {
            var tn = TURNS[i].turn;
            if (TURNS[i].isBilan || !tn) continue;
            if (!seen[tn]) { seen[tn] = true; nbTurns++; }
        }
        var totalDmg = 0; dealers.forEach(function (p) { totalDmg += p.total; });
        var maxTotal = dealers.length ? dealers[0].total : 1;

        var topDmg = dealers[0];
        var bigHit = arr.slice().sort(function (a, b) { return b.maxHit - a.maxHit; })[0];
        var critKing = arr.slice().sort(function (a, b) { return b.crit - a.crit || b.rate - a.rate; })[0];
        var healer = arr.slice().sort(function (a, b) { return b.heal - a.heal; })[0];
        var bigHeal = arr.slice().sort(function (a, b) { return b.maxHeal - a.maxHeal; })[0];
        var topSup = arr.slice().sort(function (a, b) { return b.support - a.support; })[0];

        var html = '<div class="bilan">';
        html += '<div class="bilan-head">Bilan du combat — ' + BILAN.title + '</div>';
        html += '<div class="bilan-sub">' + nbTurns + ' tours · ' + totalDmg + ' dégâts infligés par le Cirque du Chaos · ' + participants.length + ' protagonistes</div>';

        html += '<div class="bilan-mvp">';
        html += mvpCard("Top dégâts", topDmg, topDmg.total + " PV");
        html += mvpCard("Plus gros coup", bigHit, "−" + bigHit.maxHit + " PV" + (bigHit.maxCrit ? " crit." : ""));
        html += mvpCard("Roi du critique", critKing, critKing.crit + " crit. · " + critKing.rate + "%");
        if (topSup && topSup.support > 0) html += mvpCard("Meilleur support", topSup, topSup.support + (topSup.support > 1 ? " soutiens" : " soutien"));
        if (healer && healer.heal > 0) html += mvpCard("Meilleur soigneur", healer, "+" + healer.heal + " PV", "heal");
        if (bigHeal && bigHeal.maxHeal > 0) html += mvpCard("Plus gros soin", bigHeal, "+" + bigHeal.maxHeal + " PV", "heal");
        html += '</div>';

        html += '<div class="bilan-stitle">Dégâts infligés par protagoniste</div>';
        html += '<div class="bilan-bars">';
        participants.forEach(function (p, i) {
            var w = Math.round(p.total / maxTotal * 100);
            var cls = i === 0 ? "r1" : i === 1 ? "r2" : i === 2 ? "r3" : (isTamed(p.name) ? "rt" : "rn");
            var medal = '<span class="bilan-medal' + (i < 3 ? "" : " bilan-medal-n") + '">' + (i + 1) + '</span>';
            html += '<div class="bilan-bar-row">' +
                '<div class="bilan-bar-name">' + medal + avatarTag(p) + '<span>' + dispName(p.name) + '</span></div>' +
                '<div class="bilan-bar-track"><div class="bilan-bar-fill ' + cls + '" style="width:' + w + '%"></div></div>' +
                '<div class="bilan-bar-val">' + p.total + ' PV</div>' +
            '</div>';
        });
        html += '</div>';

        html += '<div class="bilan-stitle">Détail</div>';
        html += '<div class="bilan-tablewrap"><table class="bilan-table"><thead><tr><th>#</th><th>Protagoniste</th><th>Dégâts</th><th>Coups</th><th>Moy.</th><th>Crit.</th></tr></thead><tbody>';
        participants.forEach(function (p, i) {
            html += '<tr>' +
                '<td>' + (i + 1) + '</td>' +
                '<td class="bilan-td-name">' + avatarTag(p) + '<span>' + dispName(p.name) + '</span></td>' +
                '<td>' + (p.total ? '<b>' + p.total + '</b>' : '0') + '</td>' +
                '<td>' + p.hits + '</td>' +
                '<td>' + p.avg + '</td>' +
                '<td>' + (p.crit ? p.crit + ' (' + p.rate + '%)' : '0') + '</td>' +
            '</tr>';
        });
        html += '</tbody></table></div>';

        var support = arr.filter(function (p) { return p.heals > 0 || p.support > 0; });
        support.sort(function (a, b) { return b.heals - a.heals || b.support - a.support; });
        if (support.length) {
            html += '<div class="bilan-stitle">Soins &amp; soutiens</div>';
            html += '<div class="bilan-tablewrap"><table class="bilan-table"><thead><tr><th>Protagoniste</th><th>Soins</th><th>PV soignés</th><th>Soutiens</th></tr></thead><tbody>';
            support.forEach(function (p) {
                html += '<tr>' +
                    '<td class="bilan-td-name">' + avatarTag(p) + '<span>' + dispName(p.name) + '</span></td>' +
                    '<td>' + p.heals + '</td>' +
                    '<td class="bilan-heal">' + (p.heal ? '+' + p.heal + ' PV' : '0') + '</td>' +
                    '<td>' + p.support + '</td>' +
                '</tr>';
            });
            html += '</tbody></table></div>';
        }

        html += '</div>';
        return html;
    }

    function getAltText(src) {
        if (!src) return "";
        var filename = src.split("/").pop().replace(".gif", "").replace(/%20/g, " ");
        
        // Mapping des personnages et monstres spécifiques
        var nameMap = {
            "HalfelinM": "Loxka",
            "83": "Prince Rouge",
            "82": "Flammeliée",
            "81": "Sonneur ardent",
            "80": "Fiélon",
            "79": "Lampade",
            "72": "Fantôme",
            "37": "Mulet",
            "29": "Tréant",
            "11": "Campement",
            "13": "Dépouille",
            "41": "Débris",
            "97": "Barricade",
            "124": "Montagne basaltique",
            "133": "Hache dans le basalte"
        };
        
        if (src.indexOf("/lieu/") !== -1) return nameMap[filename] || "Lieu " + filename;
        if (src.indexOf("/monstre/") !== -1) return nameMap[filename] || "Monstre " + filename;
        if (src.indexOf("/pj/") !== -1) return nameMap[filename] || filename;
        if (src.indexOf("/sol/") !== -1) return "Sol " + filename;
        return filename;
    }

    function createDiv(className, text) {
        var div = document.createElement("div");
        div.className = className;
        if (text !== undefined) div.textContent = text;
        return div;
    }

    function renderTurn(index) {
        var turn = TURNS[index];

        if (turn.isBilan) {
            dateEl.textContent = "Le Cirque du Chaos";
            timeEl.textContent = "";
            turnLabelEl.textContent = turn.turn;
            grid.className = "bilan-wrap";
            grid.innerHTML = buildBilanHTML();
            historyTable.innerHTML = "";
            if (historic) historic.style.display = "none";
            slider.value = index;
            display.textContent = (index + 1) + " / " + TURNS.length;
            prevBtn.disabled = index === 0;
            nextBtn.disabled = index === TURNS.length - 1;
            document.title = BILAN.title + " - Bilan";
            return;
        }
        if (historic) historic.style.display = "";
        grid.className = "grid-container";

        // Header
        dateEl.textContent = turn.date;
        timeEl.textContent = turn.time;
        turnLabelEl.textContent = turn.turn;

        // Grid
        grid.innerHTML = "";

        for (var row = 0; row < 14; row++) {
            // Row coordinate label
            grid.appendChild(createDiv(
                "item " + (row % 2 === 0 ? "pair" : "impair"),
                ROW_COORDS[row]
            ));

            // Game cells
            for (var col = 0; col < 14; col++) {
                var cellDiv = document.createElement("div");
                cellDiv.className = "item";
                var src = turn.grid[row][col];
                if (src) {
                    var img = document.createElement("img");
                    img.src = src;
                    img.alt = getAltText(src);
                    img.title = getAltText(src);
                    cellDiv.appendChild(img);
                }
                grid.appendChild(cellDiv);
            }
        }

        // Bottom row: corner + column labels
        grid.appendChild(createDiv("item neutral"));
        for (var c = 0; c < 14; c++) {
            grid.appendChild(createDiv(
                "item " + (c % 2 === 0 ? "impair" : "pair"),
                COL_COORDS[c]
            ));
        }

        // History
        historyTable.innerHTML = "";
        for (var i = 0; i < turn.history.length; i++) {
            var event = turn.history[i];
            var tr = document.createElement("tr");
            tr.className = i % 2 === 0 ? "tr-impair" : "tr-pair";

            if (event.time || event.result) {
                var tdTime = document.createElement("td");
                tdTime.textContent = event.time;
                var tdText = document.createElement("td");
                tdText.innerHTML = event.text;
                var tdResult = document.createElement("td");
                tdResult.innerHTML = event.result;
                tr.appendChild(tdTime);
                tr.appendChild(tdText);
                tr.appendChild(tdResult);
            } else {
                var td = document.createElement("td");
                td.innerHTML = event.text;
                tr.appendChild(td);
            }

            historyTable.appendChild(tr);
        }

        // Navigation state
        slider.value = index;
        display.textContent = (index + 1) + " / " + TURNS.length;
        prevBtn.disabled = index === 0;
        nextBtn.disabled = index === TURNS.length - 1;

        // Update page title
        document.title = "Prince Rouge - " + turn.turn;
    }

    function go(index) {
        if (index >= 0 && index < TURNS.length) {
            currentTurn = index;
            renderTurn(currentTurn);
        }
    }

    // Navigation
    TURNS.push({ isBilan: true, turn: "Bilan du combat" });
    slider.max = TURNS.length - 1;
    slider.addEventListener("input", function (e) {
        go(parseInt(e.target.value, 10));
    });
    prevBtn.addEventListener("click", function () { go(currentTurn - 1); });
    nextBtn.addEventListener("click", function () { go(currentTurn + 1); });
    prevBtn.addEventListener("touchstart", function (e) { if (!prevBtn.disabled) { e.preventDefault(); go(currentTurn - 1); } }, { passive: false });
    nextBtn.addEventListener("touchstart", function (e) { if (!nextBtn.disabled) { e.preventDefault(); go(currentTurn + 1); } }, { passive: false });

    document.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft") go(currentTurn - 1);
        if (e.key === "ArrowRight") go(currentTurn + 1);
        if (e.key === "Home") go(0);
        if (e.key === "End") go(TURNS.length - 1);
    });

    // Prevent double-tap zoom on grid (iOS Safari)
    var lastTap = 0;
    document.getElementById("grid").addEventListener("touchend", function (e) {
        var now = Date.now();
        if (now - lastTap < 300) { e.preventDefault(); }
        lastTap = now;
    }, { passive: false });

    // Initial render
    renderTurn(0);
})();
