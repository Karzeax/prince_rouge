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

    function getAltText(src) {
        if (!src) return "";
        var filename = src.split("/").pop().replace(".gif", "").replace(/%20/g, " ");
        if (src.indexOf("/lieu/") !== -1) return "Lieu " + filename;
        if (src.indexOf("/monstre/") !== -1) return "Monstre " + filename;
        if (src.indexOf("/pj/") !== -1) return filename;
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
    slider.max = TURNS.length - 1;
    slider.addEventListener("input", function (e) {
        go(parseInt(e.target.value, 10));
    });
    prevBtn.addEventListener("click", function () { go(currentTurn - 1); });
    nextBtn.addEventListener("click", function () { go(currentTurn + 1); });

    document.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft") go(currentTurn - 1);
        if (e.key === "ArrowRight") go(currentTurn + 1);
        if (e.key === "Home") go(0);
        if (e.key === "End") go(TURNS.length - 1);
    });

    // Initial render
    renderTurn(0);
})();
