// --- Constants ---
      const TRADES_STORAGE_KEY = "tradingJournalTrades_v20";
      const SETTINGS_STORAGE_KEY = "tradingJournalSettings_v20";
  // Removed client persistence of AI key for security (backend proxy handles key)

      // --- State Variables ---
      let trades = [];
      let settings = {};
      let aiChatHistory = [];
      let activeFilters = [];

      // --- Analysis Data State variables ---
      let currentStats = {};
      let currentSimulationResults = {};
      let markovStats = {};
      let dayOfWeekStats = {};
      let advancedSequenceStats = {};
      let dailyRateStats = {};

      // Chart instances
      let equityCurveChartInstance,
        jumpDiffusionPnLChartInstance,
        dashboardEquityChartInstance,
        markovAfterWinChartInstance,
        markovAfterLossChartInstance,
        dayOfWeekWinsChartInstance,
        dayOfWeekLossesChartInstance,
        nextWinPredictionChartInstance,
        nextLossPredictionChartInstance,
        dailyWinRateChartInstance,
        dailyLossRateChartInstance;

      // --- Chart.js Defaults ---
      Chart.defaults.color = "#94a3b8";
      Chart.defaults.borderColor = "#334155";
      Chart.defaults.font.family = "'Inter', sans-serif";

      // --- Utility Functions ---
      const showMessageBox = (message, type, duration = 3000) => {
        const el = document.getElementById("messageBox");
        el.textContent = message;
        el.className =
          "fixed bottom-5 right-5 text-white px-6 py-3 rounded-lg shadow-lg z-50 text-base transition-all duration-300 transform opacity-100 translate-x-0";
        if (type === "success") el.classList.add("bg-green-600");
        else if (type === "error") el.classList.add("bg-red-600");
        else el.classList.add("bg-blue-600");
        setTimeout(() => {
          el.classList.add("translate-x-full", "opacity-0");
        }, duration);
      };

      const showConfirmModal = (message) => {
        return new Promise((resolve) => {
          const modal = document.getElementById("confirmModal");
          document.getElementById("confirmMessage").textContent = message;
          modal.classList.add("active");
          const yesBtn = document.getElementById("confirmYes");
          const noBtn = document.getElementById("confirmNo");
          const cleanup = (result) => {
            modal.classList.remove("active");
            yesBtn.replaceWith(yesBtn.cloneNode(true));
            noBtn.replaceWith(noBtn.cloneNode(true));
            resolve(result);
          };
          yesBtn.addEventListener("click", () => cleanup(true), { once: true });
          noBtn.addEventListener("click", () => cleanup(false), { once: true });
        });
      };

      const formatISODate = (date) => {
        if (!date) return "";
        const d = new Date(date);
        const pad = (num) => (num < 10 ? "0" + num : num);
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
          d.getDate()
        )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      };

      const saveAppData = () => {
        const currentSettings = {
          initialBalance:
            parseFloat(document.getElementById("initialBalance").value) || 0,
          activeFilters: activeFilters,
          varMode: document.querySelector(
            "#varModeSelector .var-mode-btn.active"
          ).dataset.mode,
          manualVaRValue:
            parseFloat(document.getElementById("manualVaRInput").value) || 0,
          tradesPerSeriesMode: document.querySelector(
            "#tradesPerSeriesModeSelector .tail-mode-btn.active"
          ).dataset.mode,
          numTradesPerSet:
            parseInt(document.getElementById("numTradesPerSet").value) || 10,
          numSimulationSets:
            parseInt(document.getElementById("numSimulationSets").value) ||
            1000,
          tailMode: document.querySelector(
            "#tailModeSelector .tail-mode-btn.active"
          ).dataset.mode,
          tailLossThreshold:
            parseFloat(document.getElementById("tailLossThreshold").value) ||
            -3,
          tailWinThreshold:
            parseFloat(document.getElementById("tailWinThreshold").value) || 5,
          jumpProbability:
            parseFloat(document.getElementById("jumpProbability").value) || 0,
          avgJumpPnL:
            parseFloat(document.getElementById("avgJumpPnL").value) || 0,
        };
        localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(trades));
        localStorage.setItem(
          SETTINGS_STORAGE_KEY,
          JSON.stringify(currentSettings)
        );
        // Do NOT persist AI key locally anymore.
      };

      const loadAppData = () => {
        let savedTrades = [];
        let savedSettings = null;

        try {
          savedTrades =
            JSON.parse(localStorage.getItem(TRADES_STORAGE_KEY)) || [];
        } catch (e) {
          console.error(
            "Could not parse trades from localStorage. Resetting.",
            e
          );
          showMessageBox(
            "Error loading trades. Data may have been corrupted. Resetting trades.",
            "error",
            5000
          );
          savedTrades = [];
        }

        try {
          savedSettings = JSON.parse(
            localStorage.getItem(SETTINGS_STORAGE_KEY)
          );
        } catch (e) {
          console.error(
            "Could not parse settings from localStorage. Using defaults.",
            e
          );
          showMessageBox(
            "Error loading settings. Using default configuration.",
            "error",
            5000
          );
          savedSettings = null;
        }

        trades = savedTrades;
        trades.sort((a, b) => new Date(a.date) - new Date(b.date));

        const defaultSettings = {
          initialBalance: 0.0,
          activeFilters: [],
          varMode: "auto",
          manualVaRValue: 0,
          tradesPerSeriesMode: "manual",
          numTradesPerSet: 10,
          numSimulationSets: 1000,
          tailMode: "auto",
          tailLossThreshold: -3,
          tailWinThreshold: 5,
          jumpProbability: 0,
          avgJumpPnL: 0,
        };

        settings = { ...defaultSettings, ...savedSettings };

        document.getElementById("initialBalance").value =
          settings.initialBalance.toFixed(2);
        activeFilters = settings.activeFilters || [];
        document.getElementById("manualVaRInput").value = (
          settings.manualVaRValue || 0
        ).toFixed(2);
        document.getElementById("numTradesPerSet").value =
          settings.numTradesPerSet;
        document.getElementById("numSimulationSets").value =
          settings.numSimulationSets;
        document.getElementById("tailLossThreshold").value =
          settings.tailLossThreshold;
        document.getElementById("tailWinThreshold").value =
          settings.tailWinThreshold;
        document.getElementById("jumpProbability").value =
          settings.jumpProbability;
        document.getElementById("avgJumpPnL").value = settings.avgJumpPnL;

        // AI key no longer loaded from localStorage.
      };

      function setVarModeUI(mode) {
        document
          .querySelectorAll("#varModeSelector .var-mode-btn")
          .forEach((b) => b.classList.remove("active"));
        document
          .querySelector(`#varModeSelector [data-mode="${mode}"]`)
          .classList.add("active");
        document
          .getElementById("manualVaRContainer")
          .classList.toggle("hidden", mode !== "limit");
        document
          .getElementById("autoVaRContainer")
          .classList.toggle("hidden", mode === "limit");
      }

      function setTradesPerSeriesModeUI(mode) {
        document
          .querySelectorAll("#tradesPerSeriesModeSelector .tail-mode-btn")
          .forEach((b) => b.classList.remove("active"));
        document
          .querySelector(`#tradesPerSeriesModeSelector [data-mode="${mode}"]`)
          .classList.add("active");
        document.getElementById("numTradesPerSet").disabled = mode === "auto";
      }

      function setTailModeUI(mode) {
        document
          .querySelectorAll("#tailModeSelector .tail-mode-btn")
          .forEach((b) => b.classList.remove("active"));
        document
          .querySelector(`#tailModeSelector [data-mode="${mode}"]`)
          .classList.add("active");
        const manualSettings = document.getElementById("manualTailSettings");
        const autoSettings = document.getElementById("autoTailSettings");
        manualSettings.style.display = mode === "manual" ? "grid" : "none";
        autoSettings.style.display = mode === "auto" ? "block" : "none";
        document.getElementById("jumpProbability").disabled = mode === "auto";
        document.getElementById("avgJumpPnL").disabled = mode === "auto";
      }

      // Initialize Flatpickr
      flatpickr("#tradeDate", {
          enableTime: true,
          dateFormat: "d/m/Y H:i",
          defaultDate: new Date(),
          altInput: true,
          altFormat: "d/m/Y H:i",
          time_24hr: true,
      });

      // Function to update initial balance with running balance after adding trades
      function updateInitialBalanceAfterTrade() {
        if (trades.length === 0) {
          // If no trades, reset to original initial balance from settings
          document.getElementById("initialBalance").value = (settings.initialBalance || 0).toFixed(2);
          return;
        }
        
        // Calculate cumulative P&L from all trades
        const totalPnL = trades.reduce((sum, trade) => sum + trade.pnL, 0);
        
        // Calculate running balance: original initial balance + cumulative P&L
        const originalInitialBalance = settings.initialBalance || 0;
        const currentRunningBalance = originalInitialBalance + totalPnL;
        
        // Update the initial balance field to show current running balance
        document.getElementById("initialBalance").value = currentRunningBalance.toFixed(2);
      }

      function calculateStatistics(tradesToAnalyze) {
        if (!tradesToAnalyze || tradesToAnalyze.length === 0) {
          currentStats = {}; // Reset stats
          return;
        }

        const tailMode = document.querySelector("#tailModeSelector .active")
          .dataset.mode;
        const lossThreshold = parseFloat(
          document.getElementById("tailLossThreshold").value
        );
        const winThreshold = parseFloat(
          document.getElementById("tailWinThreshold").value
        );

        const wins = tradesToAnalyze.filter((t) => t.outcome === "Win");
        const losses = tradesToAnalyze.filter((t) => t.outcome === "Loss");
        const allPnLs = tradesToAnalyze.map((t) => t.pnL);
        const totalTrades = tradesToAnalyze.length;
        const winningTradesCount = wins.length;
        const losingTradesCount = losses.length;
        const winRate = totalTrades > 0 ? winningTradesCount / totalTrades : 0;
        const totalProfit = wins.reduce((sum, t) => sum + t.pnL, 0);
        const totalLoss = losses.reduce((sum, t) => sum + Math.abs(t.pnL), 0);
        let netPnL = tradesToAnalyze.reduce((sum, t) => sum + t.pnL, 0);
        let currentBalance = settings.initialBalance + netPnL;
        const totalR = tradesToAnalyze.reduce((sum, t) => sum + t.rMultiple, 0);
        const avgProfitPerWin =
          winningTradesCount > 0 ? totalProfit / winningTradesCount : 0;
        const avgLossPerLoss =
          losingTradesCount > 0 ? totalLoss / losingTradesCount : 0;
        const totalRinWins = wins.reduce((sum, t) => sum + t.rMultiple, 0);
        const totalRinLosses = losses.reduce(
          (sum, t) => sum + Math.abs(t.rMultiple),
          0
        );
        const avgRPerWin =
          winningTradesCount > 0 ? totalRinWins / winningTradesCount : 0;
        const avgRPerLoss =
          losingTradesCount > 0 ? totalRinLosses / losingTradesCount : 0;
        const riskRewardRatio = avgRPerLoss > 0 ? avgRPerWin / avgRPerLoss : 0;

        const evRPerTrade = winRate * avgRPerWin - (1 - winRate) * avgRPerLoss;
        const evPerTrade =
          winRate * avgProfitPerWin - (1 - winRate) * avgLossPerLoss;

        const meanPnL = totalTrades > 0 ? netPnL / totalTrades : 0;
        const stdDevPnL =
          totalTrades > 1
            ? Math.sqrt(
                allPnLs.reduce((sum, p) => sum + Math.pow(p - meanPnL, 2), 0) /
                  (totalTrades - 1)
              )
            : 0;
        const downsideDev = () => {
          if (totalTrades === 0) return 0;
          let sum = 0,
            count = 0;
          allPnLs.forEach((pnl) => {
            if (pnl < meanPnL) {
              sum += Math.pow(pnl - meanPnL, 2);
              count++;
            }
          });
          return count > 0 ? Math.sqrt(sum / count) : 0;
        };
        const downsideDeviationPnL = downsideDev();

        // Expanded Drawdown Calculation Loop
        let cumulativePnl = settings.initialBalance;
        let peakEquity = cumulativePnl;
        let maxDrawdown = 0;
        let peakDate =
          tradesToAnalyze.length > 0
            ? new Date(tradesToAnalyze[0].date)
            : new Date();
        let maxDrawdownDuration = 0;
        let currentWinStreak = 0,
          currentLossStreak = 0,
          longestWinStreak = 0,
          longestLossStreak = 0;
        let runs = 0,
          lastOutcome = "";

        tradesToAnalyze.forEach((trade, index) => {
          const currentDate = new Date(trade.date);
          cumulativePnl += trade.pnL;

          if (cumulativePnl > peakEquity) {
            peakEquity = cumulativePnl;
            peakDate = currentDate;
          } else {
            const currentDuration =
              (currentDate - peakDate) / (1000 * 60 * 60 * 24);
            if (currentDuration > maxDrawdownDuration) {
              maxDrawdownDuration = currentDuration;
            }
          }

          const drawdown = peakEquity - cumulativePnl;
          if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
          }

          if (trade.outcome === "Win") {
            currentWinStreak++;
            currentLossStreak = 0;
          } else {
            currentLossStreak++;
            currentWinStreak = 0;
          }
          longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
          longestLossStreak = Math.max(longestLossStreak, currentLossStreak);

          if (index === 0) {
            runs = 1;
          } else if (trade.outcome !== tradesToAnalyze[index - 1].outcome) {
            runs++;
          }
        });

        const currentDrawdown = peakEquity - currentBalance;

        const fatTailTrades = tradesToAnalyze.filter(
          (t) => t.rMultiple <= lossThreshold || t.rMultiple >= winThreshold
        );
        const tailPnl =
          fatTailTrades.length > 0
            ? fatTailTrades.reduce((sum, t) => sum + t.pnL, 0) /
              fatTailTrades.length
            : 0;

        if (tailMode === "auto") {
          const fatTailProb =
            totalTrades > 0 ? fatTailTrades.length / totalTrades : 0;
          document.getElementById("jumpProbability").value = (
            fatTailProb * 100
          ).toFixed(2);
          document.getElementById("avgJumpPnL").value = tailPnl.toFixed(2);
        }

        const allRMultiples = tradesToAnalyze.map((t) => t.rMultiple);
        const meanR = totalTrades > 0 ? totalR / totalTrades : 0;
        const stdDevR =
          totalTrades > 1
            ? Math.sqrt(
                allRMultiples.reduce(
                  (sum, r) => sum + Math.pow(r - meanR, 2),
                  0
                ) /
                  (totalTrades - 1)
              )
            : 0;

        const sqn =
          stdDevR > 0 ? (evRPerTrade / stdDevR) * Math.sqrt(totalTrades) : 0;
        const recoveryFactor = maxDrawdown > 0 ? netPnL / maxDrawdown : 0;

        // Z-Score for Runs Calculation
        let zScore = 0;
        const n1 = winningTradesCount;
        const n2 = losingTradesCount;
        const R = runs;
        if (totalTrades > 1) {
          const meanR = (2 * n1 * n2) / totalTrades + 1;
          const stdDevR_runs = Math.sqrt(
            (2 * n1 * n2 * (2 * n1 * n2 - totalTrades)) /
              (Math.pow(totalTrades, 2) * (totalTrades - 1))
          );
          if (stdDevR_runs > 0) {
            zScore = (R - meanR) / stdDevR_runs;
          }
        }

        currentStats = {
          totalTrades,
          winningTrades: winningTradesCount,
          losingTrades: losingTradesCount,
          winRate,
          totalProfit,
          totalLoss,
          netPnL,
          currentBalance,
          totalR,
          avgProfitPerWin,
          avgLossPerLoss,
          avgRPerWin,
          avgRPerLoss,
          riskRewardRatio,
          evPerTrade,
          evRPerTrade,
          breakEvenWinRate:
            avgRPerLoss + avgRPerWin > 0
              ? avgRPerLoss / (avgRPerLoss + avgRPerWin)
              : 0,
          profitFactor:
            totalLoss > 0
              ? totalProfit / totalLoss
              : totalProfit > 0
              ? Infinity
              : 0,
          stdDevPnL,
          sharpeRatio: stdDevPnL > 0 ? meanPnL / stdDevPnL : 0,
          downsideDeviationPnL,
          sortinoRatio:
            downsideDeviationPnL > 0 ? meanPnL / downsideDeviationPnL : 0,
          historicalMaxDrawdown: maxDrawdown,
          currentDrawdown,
          calmarRatio: maxDrawdown > 0 ? netPnL / maxDrawdown : 0,
          longestWinStreak,
          longestLossStreak,
          recoveryFactor,
          sqn,
          zScore, // Added
          maxDrawdownDurationDays: maxDrawdownDuration,
          fatTailInfo: {
            count: fatTailTrades.length,
            probability:
              totalTrades > 0 ? fatTailTrades.length / totalTrades : 0,
            averagePnl: tailPnl,
            lossThreshold,
            winThreshold,
          },
        };
      }

      function renderTradeList() {
        const body = document.getElementById("tradeList");
        body.innerHTML =
          trades.length === 0
            ? `<tr><td colspan="5" class="px-6 py-4 text-center text-slate-500 italic">No trades yet.</td></tr>`
            : trades
                .map((trade) => {
                  const tradeDate = new Date(trade.date);
                  const formattedDate = !isNaN(tradeDate)
                    ? tradeDate.toLocaleString()
                    : "Invalid Date";
                  const tagsHTML =
                    trade.tags && trade.tags.length > 0
                      ? `<div class="mt-1">${trade.tags
                          .map((tag) => `<span class="trade-tag">${tag}</span>`)
                          .join("")}</div>`
                      : "";
                  return `
            <tr class="hover:bg-slate-700/50 transition-colors">
                <td class="px-4 py-3 text-sm text-slate-300 align-top">
                    ${formattedDate}
                    ${tagsHTML}
                </td>
                <td class="px-4 py-3 text-sm text-slate-300 align-top">${
                  trade.asset
                }</td>
                <td class="px-4 py-3 text-sm font-semibold ${
                  trade.pnL >= 0 ? "text-green-400" : "text-red-400"
                } align-top">£${trade.pnL.toFixed(2)}</td>
                <td class="px-4 py-3 text-sm ${
                  trade.rMultiple >= 0 ? "text-green-400" : "text-red-400"
                } align-top">${
                    isFinite(trade.rMultiple)
                      ? trade.rMultiple.toFixed(2)
                      : "0.00"
                  }R</td>
                <td class="px-4 py-3 text-right align-top">
                    <button onclick="showEditModal('${
                      trade.id
                    }')" class="text-slate-500 hover:text-blue-400 mr-4" title="Edit Trade"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteTrade('${
                      trade.id
                    }')" class="text-slate-500 hover:text-red-400" title="Delete Trade"><i class="fas fa-trash-alt"></i></button>
                </td>
            </tr>`;
                })
                .join("");
      }

      const addTrade = () => {
        const date = document.getElementById("tradeDate").value;
        const asset = document.getElementById("tradeAsset").value.trim();
        const pnL = parseFloat(document.getElementById("tradePnL").value);
        const riskAmount = parseFloat(
          document.getElementById("tradeRiskAmount").value
        );
        const outcome = document.getElementById("tradeOutcome").value;
        const tagsString = document.getElementById("tradeTags").value.trim();

        if (
          !date ||
          !asset ||
          isNaN(pnL) ||
          isNaN(riskAmount) ||
          riskAmount <= 0
        ) {
          showMessageBox(
            "Please fill all fields. Risk must be positive.",
            "error"
          );
          return;
        }
        if (
          (outcome === "Win" && pnL <= 0) ||
          (outcome === "Loss" && pnL >= 0) ||
          pnL === 0
        ) {
          showMessageBox(
            "P&L must match the outcome and not be zero.",
            "error"
          );
          return;
        }

        const tags = tagsString
          ? tagsString
              .split(/[,;]/) // Accept both comma and semicolon separators
              .map((tag) => tag.trim())
              .filter((tag) => tag)
          : [];

        trades.push({
          id: crypto.randomUUID(),
          date: new Date(date).toISOString(),
          asset,
          pnL,
          riskAmount,
          rMultiple: pnL / riskAmount,
          outcome,
          tags,
        });

        trades.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Update initial balance to reflect new running balance
        updateInitialBalanceAfterTrade();

        saveAppData();
        updateUI();
        showMessageBox("Trade added successfully!", "success");
        document.getElementById("tradeAsset").value = "";
        document.getElementById("tradePnL").value = "";
        document.getElementById("tradeTags").value = "";
      };

      function showEditModal(tradeId) {
        const trade = trades.find((t) => t.id === tradeId);
        if (!trade) return;
        document.getElementById("editTradeId").value = trade.id;
        document.getElementById("editTradeDate").value = formatISODate(
          trade.date
        );
        document.getElementById("editTradeAsset").value = trade.asset;
        document.getElementById("editTradePnL").value = trade.pnL.toFixed(2);
        document.getElementById("editTradeRiskAmount").value =
          trade.riskAmount.toFixed(2);
        document.getElementById("editTradeOutcome").value = trade.outcome;
        document.getElementById("editTradeTags").value = (
          trade.tags || []
        ).join(", ");
        document.getElementById("editModal").classList.add("active");
      }

      function saveTradeChanges() {
        const id = document.getElementById("editTradeId").value;
        const newDate = document.getElementById("editTradeDate").value;
        const newAsset = document.getElementById("editTradeAsset").value.trim();
        const newPnL = parseFloat(
          document.getElementById("editTradePnL").value
        );
        const newRiskAmount = parseFloat(
          document.getElementById("editTradeRiskAmount").value
        );
        const newOutcome = document.getElementById("editTradeOutcome").value;
        const newTagsString = document
          .getElementById("editTradeTags")
          .value.trim();

        if (
          !newDate ||
          !newAsset ||
          isNaN(newPnL) ||
          isNaN(newRiskAmount) ||
          newRiskAmount < 0
        ) {
          showMessageBox("Please fill all fields correctly.", "error");
          return;
        }
        if (
          (newOutcome === "Win" && newPnL <= 0) ||
          (newOutcome === "Loss" && newPnL >= 0) ||
          newPnL === 0
        ) {
          showMessageBox(
            "P&L must match the outcome and not be zero.",
            "error"
          );
          return;
        }

        const newTags = newTagsString
          ? newTagsString
              .split(",")
              .map((tag) => tag.trim())
              .filter((tag) => tag)
          : [];

        const tradeIndex = trades.findIndex((t) => t.id === id);
        if (tradeIndex !== -1) {
          trades[tradeIndex] = {
            ...trades[tradeIndex],
            date: new Date(newDate).toISOString(),
            asset: newAsset,
            pnL: newPnL,
            riskAmount: newRiskAmount,
            rMultiple: newRiskAmount > 0 ? newPnL / newRiskAmount : 0,
            outcome: newOutcome,
            tags: newTags,
          };
        }
        trades.sort((a, b) => new Date(a.date) - new Date(b.date));

        saveAppData();
        updateUI();
        showMessageBox("Trade updated successfully!", "success");
        document.getElementById("editModal").classList.remove("active");
      }

      function updateStatisticsDisplay() {
        if (Object.keys(currentStats).length === 0) {
          const statElements = document.querySelectorAll('[id^="stat"]');
          statElements.forEach((el) => {
            if (el.id.includes("Rate") || el.id.includes("Criterion"))
              el.textContent = "0.00%";
            else if (
              el.id.includes("Ratio") ||
              el.id.includes("Factor") ||
              el.id.includes("Sqn") ||
              el.id.includes("ZScore")
            )
              el.textContent = "0.00";
            else if (el.id.includes("R")) el.textContent = "0.00R";
            else if (
              el.id.includes("PnL") ||
              el.id.includes("Balance") ||
              el.id.includes("Win") ||
              el.id.includes("Loss") ||
              el.id.includes("Drawdown")
            )
              el.textContent = "£0.00";
            else el.textContent = "0";
          });
          document.getElementById("statCurrentBalance").textContent = `£${(
            settings.initialBalance || 0
          ).toFixed(2)}`;
          document.getElementById("db-statNetPnL").textContent = "£0.00";
          document.getElementById("db-statProfitFactor").textContent = "0.00";
          document.getElementById("db-statWinRate").textContent = "0%";
          document.getElementById("db-statEvRPerTrade").textContent = "0.00R";
          document.getElementById("statRecoveryFactor").textContent = "0.00";
          document.getElementById(
            "statSqn"
          ).innerHTML = `0.00 <span id="statSqnGrade" class="text-sm font-medium text-slate-400 ml-2">(N/A)</span>`;
          document.getElementById("statMaxDrawdownDurationDays").textContent =
            "0 days";

          return;
        }

        Object.keys(currentStats).forEach((key) => {
          const el = document.getElementById(
            `stat${key.charAt(0).toUpperCase() + key.slice(1)}`
          );
          if (el) {
            const value = currentStats[key];
            const formatNumber = (num, defaultValue, options = {}) => {
              if (!isFinite(num)) return defaultValue;
              const prefix = options.prefix || "";
              const suffix = options.suffix || "";
              const decimals =
                options.decimals !== undefined ? options.decimals : 2;
              return `${prefix}${num.toFixed(decimals)}${suffix}`;
            };

            let formattedValue;
            switch (key) {
              case "winRate":
              case "breakEvenWinRate":
              case "kellyCriterion":
                formattedValue = formatNumber(value * 100, "0.00%", {
                  suffix: "%",
                });
                break;
              case "netPnL":
              case "currentBalance":
              case "avgProfitPerWin":
              case "avgLossPerLoss":
              case "stdDevPnL":
              case "downsideDeviationPnL":
              case "historicalMaxDrawdown":
              case "evPerTrade":
                formattedValue = formatNumber(value, "£0.00", { prefix: "£" });
                break;
              case "totalR":
              case "avgRPerWin":
              case "avgRPerLoss":
              case "evRPerTrade":
                formattedValue = formatNumber(value, "0.00R", { suffix: "R" });
                break;
              case "riskRewardRatio":
                formattedValue = formatNumber(value, "0.00:1", {
                  suffix: ":1",
                });
                break;
              case "maxDrawdownDurationDays":
                formattedValue = `${Math.round(value)} days`;
                break;
              case "profitFactor":
              case "sharpeRatio":
              case "sortinoRatio":
              case "calmarRatio":
              case "recoveryFactor":
                formattedValue = formatNumber(value, "0.00");
                break;
              case "zScore":
                formattedValue = formatNumber(value, "0.00");
                // CORRECTED CODE
                if (value < -1.96 || value > 1.96) {
                  el.classList.remove("text-blue-400");
                  el.classList.add("text-orange-400");
                } else {
                  el.classList.remove("text-orange-400");
                  el.classList.add("text-blue-400");
                }
                break;
              case "sqn":
                formattedValue = formatNumber(value, "0.00");
                const gradeEl = document.getElementById("statSqnGrade");
                if (gradeEl) {
                  let grade = "N/A";
                  let color = "text-slate-400";
                  if (currentStats.totalTrades >= 10) {
                    if (value < 1.6) {
                      grade = "Junk";
                      color = "text-red-400";
                    } else if (value < 2.0) {
                      grade = "Average";
                      color = "text-orange-400";
                    } else if (value < 2.5) {
                      grade = "Good";
                      color = "text-yellow-400";
                    } else if (value < 3.0) {
                      grade = "Excellent";
                      color = "text-green-400";
                    } else if (value >= 3.0) {
                      grade = "Holy Grail";
                      color = "text-teal-400";
                    }
                  }
                  gradeEl.textContent = `(${grade})`;
                  gradeEl.className = `text-sm font-medium ml-2 ${color}`;
                }
                el.innerHTML = `${formattedValue} <span id="statSqnGrade" class="${gradeEl.className} text-sm font-medium ml-2">${gradeEl.textContent}</span>`;
                return;
              case "winningTrades":
              case "losingTrades":
                const totalForRate =
                  currentStats.winningTrades + currentStats.losingTrades;
                const perc =
                  totalForRate > 0 ? (value / totalForRate) * 100 : 0;
                formattedValue = `${value} (${formatNumber(perc, "0.00%", {
                  suffix: "%",
                })})`;
                break;
              default:
                formattedValue =
                  typeof value === "number" ? value.toString() : value || "0";
                break;
            }
            el.textContent = formattedValue;
          }
        });
      }

      function createChart(instance, ctx, config) {
        if (instance) instance.destroy();
        try {
          return new Chart(ctx, config);
        } catch (e) {
          console.error("Chart creation failed: ", e);
          return null;
        }
      }

      function calculateMarkovProbabilities(tradesToAnalyze) {
        if (!tradesToAnalyze || tradesToAnalyze.length < 2) {
          return { hasData: false };
        }

        let win_after_win = 0,
          loss_after_win = 0,
          win_after_loss = 0,
          loss_after_loss = 0;

        for (let i = 1; i < tradesToAnalyze.length; i++) {
          const prevOutcome = tradesToAnalyze[i - 1].outcome;
          const currOutcome = tradesToAnalyze[i].outcome;

          if (prevOutcome === "Win") {
            if (currOutcome === "Win") win_after_win++;
            else loss_after_win++;
          } else {
            if (currOutcome === "Win") win_after_loss++;
            else loss_after_loss++;
          }
        }

        const totalPrevWins = win_after_win + loss_after_win;
        const totalPrevLosses = win_after_loss + loss_after_loss;

        return {
          probWinAfterWin:
            totalPrevWins > 0 ? win_after_win / totalPrevWins : 0,
          probLossAfterWin:
            totalPrevWins > 0 ? loss_after_win / totalPrevWins : 0,
          probWinAfterLoss:
            totalPrevLosses > 0 ? win_after_loss / totalPrevLosses : 0,
          probLossAfterLoss:
            totalPrevLosses > 0 ? loss_after_loss / totalPrevLosses : 0,
          hasData: true,
        };
      }

      function renderMarkovCharts(probabilities) {
        if (markovAfterWinChartInstance) markovAfterWinChartInstance.destroy();
        if (markovAfterLossChartInstance)
          markovAfterLossChartInstance.destroy();

        if (!probabilities || !probabilities.hasData) return;

        const ctxWin = document
          .getElementById("markovAfterWinChart")
          .getContext("2d");
        markovAfterWinChartInstance = new Chart(ctxWin, {
          type: "bar",
          data: {
            labels: ["Next is Win", "Next is Loss"],
            datasets: [
              {
                label: "Probability",
                data: [
                  probabilities.probWinAfterWin,
                  probabilities.probLossAfterWin,
                ],
                backgroundColor: [
                  "rgba(34, 197, 94, 0.6)",
                  "rgba(239, 68, 68, 0.6)",
                ],
                borderColor: ["rgb(34, 197, 94)", "rgb(239, 68, 68)"],
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              title: {
                display: true,
                text: "Outcome After a WIN",
                color: "#e2e8f0",
              },
              tooltip: {
                callbacks: {
                  label: (c) => `Prob: ${(c.raw * 100).toFixed(1)}%`,
                },
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                max: 1,
                ticks: { callback: (v) => `${v * 100}%` },
              },
            },
          },
        });

        const ctxLoss = document
          .getElementById("markovAfterLossChart")
          .getContext("2d");
        markovAfterLossChartInstance = new Chart(ctxLoss, {
          type: "bar",
          data: {
            labels: ["Next is Win", "Next is Loss"],
            datasets: [
              {
                label: "Probability",
                data: [
                  probabilities.probWinAfterLoss,
                  probabilities.probLossAfterLoss,
                ],
                backgroundColor: [
                  "rgba(34, 197, 94, 0.6)",
                  "rgba(239, 68, 68, 0.6)",
                ],
                borderColor: ["rgb(34, 197, 94)", "rgb(239, 68, 68)"],
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              title: {
                display: true,
                text: "Outcome After a LOSS",
                color: "#e2e8f0",
              },
              tooltip: {
                callbacks: {
                  label: (c) => `Prob: ${(c.raw * 100).toFixed(1)}%`,
                },
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                max: 1,
                ticks: { callback: (v) => `${v * 100}%` },
              },
            },
          },
        });
      }

      function calculateDayOfWeekStats(tradesToAnalyze) {
        if (!tradesToAnalyze || tradesToAnalyze.length === 0) return null;

        const dayNames = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
        const stats = {};
        dayNames.forEach((day) => {
          stats[day] = { wins: 0, losses: 0, total: 0 };
        });

        tradesToAnalyze.forEach((trade) => {
          const dayIndex = new Date(trade.date).getDay();
          const dayName = dayNames[dayIndex];
          if (trade.outcome === "Win") stats[dayName].wins++;
          else stats[dayName].losses++;
          stats[dayName].total++;
        });

        return stats;
      }

      function renderDayOfWeekCharts(stats) {
        if (dayOfWeekWinsChartInstance) dayOfWeekWinsChartInstance.destroy();
        if (dayOfWeekLossesChartInstance)
          dayOfWeekLossesChartInstance.destroy();

        if (!stats) return;

        const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const dayFullNames = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];

        const winData = dayFullNames.map((day) => stats[day].wins);
        const lossData = dayFullNames.map((day) => stats[day].losses);

        const ctxWins = document
          .getElementById("dayOfWeekWinsChart")
          .getContext("2d");
        dayOfWeekWinsChartInstance = new Chart(ctxWins, {
          type: "bar",
          data: {
            labels: dayLabels,
            datasets: [
              {
                label: "Wins",
                data: winData,
                backgroundColor: "rgba(34, 197, 94, 0.6)",
                borderColor: "rgb(34, 197, 94)",
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              title: {
                display: true,
                text: "Wins by Day of Week",
                color: "#e2e8f0",
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: { stepSize: 1 },
                title: { display: true, text: "Number of Wins" },
              },
            },
          },
        });

        const ctxLosses = document
          .getElementById("dayOfWeekLossesChart")
          .getContext("2d");
        dayOfWeekLossesChartInstance = new Chart(ctxLosses, {
          type: "bar",
          data: {
            labels: dayLabels,
            datasets: [
              {
                label: "Losses",
                data: lossData,
                backgroundColor: "rgba(239, 68, 68, 0.6)",
                borderColor: "rgb(239, 68, 68)",
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              title: {
                display: true,
                text: "Losses by Day of Week",
                color: "#e2e8f0",
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: { stepSize: 1 },
                title: { display: true, text: "Number of Losses" },
              },
            },
          },
        });
      }

      function calculateAdvancedSequenceStats(tradesToAnalyze) {
        if (!tradesToAnalyze || tradesToAnalyze.length < 2) return null;

        const dayNames = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
        const createDayObject = () =>
          dayNames.reduce((acc, day) => {
            acc[day] = 0;
            return acc;
          }, {});

        const stats = {
          winAfterWin: createDayObject(),
          winAfterLoss: createDayObject(),
          lossAfterWin: createDayObject(),
          lossAfterLoss: createDayObject(),
        };

        for (let i = 1; i < tradesToAnalyze.length; i++) {
          const prevOutcome = tradesToAnalyze[i - 1].outcome;
          const currOutcome = tradesToAnalyze[i].outcome;
          const currDayName =
            dayNames[new Date(tradesToAnalyze[i].date).getDay()];

          if (prevOutcome === "Win") {
            if (currOutcome === "Win") stats.winAfterWin[currDayName]++;
            else stats.lossAfterWin[currDayName]++;
          } else {
            // prevOutcome was 'Loss'
            if (currOutcome === "Win") stats.winAfterLoss[currDayName]++;
            else stats.lossAfterLoss[currDayName]++;
          }
        }
        return stats;
      }

      function renderAdvancedSequenceCharts(stats) {
        if (nextWinPredictionChartInstance)
          nextWinPredictionChartInstance.destroy();
        if (nextLossPredictionChartInstance)
          nextLossPredictionChartInstance.destroy();

        if (!stats) return;

        const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const dayFullNames = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];

        const winsAfterWinData = dayFullNames.map(
          (day) => stats.winAfterWin[day]
        );
        const winsAfterLossData = dayFullNames.map(
          (day) => stats.winAfterLoss[day]
        );

        const lossesAfterWinData = dayFullNames.map(
          (day) => stats.lossAfterWin[day]
        );
        const lossesAfterLossData = dayFullNames.map(
          (day) => stats.lossAfterLoss[day]
        );

        const ctxWin = document
          .getElementById("nextWinPredictionChart")
          .getContext("2d");
        nextWinPredictionChartInstance = new Chart(ctxWin, {
          type: "bar",
          data: {
            labels: dayLabels,
            datasets: [
              {
                label: "Win After a Win",
                data: winsAfterWinData,
                backgroundColor: "rgba(34, 197, 94, 0.7)",
              },
              {
                label: "Win After a Loss",
                data: winsAfterLossData,
                backgroundColor: "rgba(59, 130, 246, 0.7)",
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: "top" },
              title: {
                display: true,
                text: "Next Win Prediction by Day",
                color: "#e2e8f0",
              },
            },
            scales: {
              x: { stacked: true },
              y: {
                stacked: true,
                beginAtZero: true,
                ticks: { stepSize: 1 },
                title: { display: true, text: "Count of Next Wins" },
              },
            },
          },
        });

        const ctxLoss = document
          .getElementById("nextLossPredictionChart")
          .getContext("2d");
        nextLossPredictionChartInstance = new Chart(ctxLoss, {
          type: "bar",
          data: {
            labels: dayLabels,
            datasets: [
              {
                label: "Loss After a Loss",
                data: lossesAfterLossData,
                backgroundColor: "rgba(239, 68, 68, 0.7)",
              },
              {
                label: "Loss After a Win",
                data: lossesAfterWinData,
                backgroundColor: "rgba(249, 115, 22, 0.7)",
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: "top" },
              title: {
                display: true,
                text: "Next Loss Prediction by Day",
                color: "#e2e8f0",
              },
            },
            scales: {
              x: { stacked: true },
              y: {
                stacked: true,
                beginAtZero: true,
                ticks: { stepSize: 1 },
                title: { display: true, text: "Count of Next Losses" },
              },
            },
          },
        });
      }

      function calculateDailyWinRates(dayOfWeekStats) {
        if (!dayOfWeekStats) return null;

        const dayNames = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
        const winRates = [],
          lossRates = [];

        dayNames.forEach((day) => {
          const { wins, losses } = dayOfWeekStats[day];
          const total = wins + losses;
          winRates.push(total > 0 ? wins / total : 0);
          lossRates.push(total > 0 ? losses / total : 0);
        });
        return { winRates, lossRates };
      }

      function renderDailyWinRateCharts(rates) {
        if (dailyWinRateChartInstance) dailyWinRateChartInstance.destroy();
        if (dailyLossRateChartInstance) dailyLossRateChartInstance.destroy();

        if (!rates) return;

        const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

        const ctxWin = document
          .getElementById("dailyWinRateChart")
          .getContext("2d");
        dailyWinRateChartInstance = new Chart(ctxWin, {
          type: "bar",
          data: {
            labels: dayLabels,
            datasets: [
              {
                label: "Win Rate",
                data: rates.winRates,
                backgroundColor: "rgba(34, 197, 94, 0.6)",
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              title: {
                display: true,
                text: "Win Probability by Day",
                color: "#e2e8f0",
              },
              tooltip: {
                callbacks: { label: (c) => `${(c.raw * 100).toFixed(1)}%` },
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                max: 1,
                ticks: { callback: (v) => `${v * 100}%` },
                title: { display: true, text: "Probability" },
              },
            },
          },
        });

        const ctxLoss = document
          .getElementById("dailyLossRateChart")
          .getContext("2d");
        dailyLossRateChartInstance = new Chart(ctxLoss, {
          type: "bar",
          data: {
            labels: dayLabels,
            datasets: [
              {
                label: "Loss Rate",
                data: rates.lossRates,
                backgroundColor: "rgba(239, 68, 68, 0.6)",
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              title: {
                display: true,
                text: "Loss Probability by Day",
                color: "#e2e8f0",
              },
              tooltip: {
                callbacks: { label: (c) => `${(c.raw * 100).toFixed(1)}%` },
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                max: 1,
                ticks: { callback: (v) => `${v * 100}%` },
                title: { display: true, text: "Probability" },
              },
            },
          },
        });
      }

      // --- SIMULATION FUNCTIONS ---
      function runSimulation(
        numTrades,
        numSims,
        winRate,
        avgWin,
        avgLoss,
        jumpP,
        jumpPnL
      ) {
        const pnlResults = [];
        const simulationPaths = [];

        if (
          numTrades === 0 ||
          numSims === 0 ||
          !isFinite(winRate) ||
          !isFinite(avgWin) ||
          !isFinite(avgLoss) ||
          !isFinite(jumpP) ||
          !isFinite(jumpPnL)
        ) {
          return { pnlResults, simulationPaths };
        }

        for (let i = 0; i < numSims; i++) {
          let pnl = 0,
            currentPeak = 0,
            maxDD = 0;
          const path = [0];

          for (let j = 0; j < numTrades; j++) {
            if (Math.random() < jumpP) pnl += jumpPnL;
            else {
              if (Math.random() < winRate) pnl += Math.abs(avgWin);
              else pnl -= Math.abs(avgLoss);
            }
            path.push(pnl);
            if (pnl > currentPeak) currentPeak = pnl;
            maxDD = Math.max(maxDD, currentPeak - pnl);
          }
          pnlResults.push({ pnl, maxDD });
          simulationPaths.push(path);
        }
        return { pnlResults, simulationPaths };
      }

      function processSimulationPaths(paths, numTrades) {
        const percentile = (arr, p) => {
          if (!arr || arr.length === 0) return 0;
          const sorted = arr.slice().sort((a, b) => a - b);
          const pos = (sorted.length - 1) * p;
          const base = Math.floor(pos);
          const rest = pos - base;
          if (sorted[base + 1] !== undefined) {
            return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
          } else {
            return sorted[base];
          }
        };

        const p10 = [],
          p50 = [],
          p90 = [];
        for (let i = 0; i <= numTrades; i++) {
          const stepValues = paths.map((path) => path[i]);
          p10.push(percentile(stepValues, 0.1));
          p50.push(percentile(stepValues, 0.5));
          p90.push(percentile(stepValues, 0.9));
        }
        return { p10, p50, p90 };
      }

      function renderJumpDiffusionPnLChart(pnlData) {
        const ctx = document
          .getElementById("jumpDiffusionPnLChart")
          .getContext("2d");
        if (!pnlData || pnlData.length === 0) {
          if (jumpDiffusionPnLChartInstance)
            jumpDiffusionPnLChartInstance.destroy();
          jumpDiffusionPnLChartInstance = undefined;
          return;
        }
        const numBins = 30,
          min = Math.min(...pnlData),
          max = Math.max(...pnlData);
        const binSize = (max - min) / numBins || 1,
          bins = new Array(numBins).fill(0);
        const labels = Array.from(
          { length: numBins },
          (_, i) => `£${(min + i * binSize).toFixed(0)}`
        );
        pnlData.forEach((pnl) => {
          let i = Math.floor((pnl - min) / binSize);
          i = Math.min(i, numBins - 1);
          i = Math.max(i, 0);
          bins[i]++;
        });
        jumpDiffusionPnLChartInstance = createChart(
          jumpDiffusionPnLChartInstance,
          ctx,
          {
            type: "bar",
            data: {
              labels,
              datasets: [
                {
                  label: "Frequency",
                  data: bins,
                  backgroundColor: "rgba(34, 211, 238, 0.6)",
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                title: {
                  display: true,
                  text: "Simulated P&L Distribution",
                  color: "#cbd5e1",
                },
              },
              scales: {
                x: {
                  title: { display: true, text: "P&L per Series (£)" },
                  ticks: {
                    maxRotation: 0,
                    minRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: 6,
                  },
                },
                y: { title: { display: true, text: "Frequency" } },
              },
            },
          }
        );
      }

      function renderEquityConeChart(canvasId, percentileData, numTrades) {
        const ctx = document.getElementById(canvasId).getContext("2d");
        const { p10, p50, p90 } = percentileData;
        const labels = Array.from({ length: numTrades + 1 }, (_, i) => `${i}`);

        let chartInstance;
        if (canvasId === "equityCurveChart")
          chartInstance = equityCurveChartInstance;
        else chartInstance = dashboardEquityChartInstance;

        const newChartInstance = createChart(chartInstance, ctx, {
          type: "line",
          data: {
            labels: labels,
            datasets: [
              {
                label: "90th Percentile (Best Case)",
                data: p90,
                borderColor: "rgba(34, 197, 94, 0.9)", // Bright green, high opacity
                backgroundColor: "rgba(34, 197, 94, 0.1)", // Light green fill
                borderWidth: 1.5, // Thin line
                pointRadius: 0,
                fill: "+1",
                tension: 0.1,
              },
              {
                label: "10th Percentile (Worst Case)",
                data: p10,
                borderColor: "rgba(239, 68, 68, 0.9)", // Bright red, high opacity
                backgroundColor: "rgba(71, 85, 105, 0.3)", // Darker fill for contrast
                borderWidth: 1.5, // Thin line
                pointRadius: 0,
                fill: false,
                tension: 0.1,
              },
              {
                label: "Median (Most Likely)",
                data: p50,
                borderColor: "rgba(59, 130, 246, 1)", // Bright blue, full opacity
                borderWidth: 2, // Slightly thicker than others but still thin
                pointRadius: 0,
                tension: 0.1,
                fill: false,
                borderDash: [], // Solid line
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
              legend: { 
                display: true,
                position: 'top',
                labels: {
                  color: '#e2e8f0', // Light color for dark theme
                  font: {
                    size: 12
                  },
                  usePointStyle: true,
                  pointStyle: 'line'
                }
              }, 
              title: { display: false } 
            },
            scales: {
              x: {
                title: { 
                  display: true, 
                  text: "Trade Number",
                  color: '#94a3b8'
                },
                grid: { 
                  drawOnChartArea: false,
                  color: 'rgba(148, 163, 184, 0.1)'
                },
                ticks: {
                  color: '#94a3b8'
                }
              },
              y: { 
                title: { 
                  display: true, 
                  text: "P&L (£)",
                  color: '#94a3b8'
                },
                grid: {
                  color: 'rgba(148, 163, 184, 0.1)'
                },
                ticks: {
                  color: '#94a3b8'
                }
              },
            },
          },
        });

        if (canvasId === "equityCurveChart")
          equityCurveChartInstance = newChartInstance;
        else dashboardEquityChartInstance = newChartInstance;
      }

      // --- AI COACH FUNCTIONS ---
      function addMessageToChatLog(message, sender) {
        const chatLog = document.getElementById("aiChatLog");
        const messageEl = document.createElement("div");
        const sanitizedMessage = message
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          .replace(/\n/g, "<br>");
        messageEl.innerHTML = sanitizedMessage;
        messageEl.className =
          sender === "user"
            ? "user-message"
            : sender === "ai"
            ? "ai-message"
            : "ai-message text-center text-slate-400 italic";
        chatLog.appendChild(messageEl);
        chatLog.scrollTop = chatLog.scrollHeight;
      }

      function generateComprehensiveAnalysisPrompt() {
        if (!currentStats || Object.keys(currentStats).length === 0) {
          return "INSUFFICIENT_DATA";
        }
        const replacer = (key, value) => {
          if (typeof value === "number") {
            return parseFloat(value.toFixed(4));
          }
          return value;
        };

        const prompt = `
You are a professional trading coach and data scientist named Gemini. Your task is to provide a deep, insightful, and actionable analysis of my trading performance based on the comprehensive data set provided below. Do not just list the data back to me; you MUST interpret it, find correlations between the different data sets, identify strengths, weaknesses, and provide concrete suggestions for improvement. Structure your response with clear Markdown headings.

Here is the full data dump from my trading journal application:

### 1. Overall Performance Metrics (from 'Full Statistics' tab)
This is the main summary of my performance. Pay special attention to the **SQN (System Quality Number)** and **Recovery Factor**. An SQN below 1.6 indicates a poor system, while a high Recovery Factor (>2.0) shows resilience after drawdowns. Also check the **Max Drawdown Duration** and the **Z-Score**. A Z-Score outside of -1.96 to +1.96 indicates statistically significant streaking (negative Z) or choppiness (positive Z).
\`\`\`json
${JSON.stringify(currentStats, replacer, 2)}
\`\`\`

### 2. Monte Carlo Simulation Results (from 'Simulation' tab)
This projects my current performance forward to estimate future possibilities. 'VaR_5_percent' is the Value at Risk, meaning there's a 5% chance of losing at least this amount over the simulated period.
\`\`\`json
${JSON.stringify(currentSimulationResults, replacer, 2)}
\`\`\`

### 3. Outcome Predictability (Markov Analysis)
This shows the probability of my next trade's outcome based on the result of my previous trade. It is key to identifying psychological patterns like winning/losing streaks.
\`\`\`json
${JSON.stringify(markovStats, replacer, 2)}
\`\`\`

### 4. Performance by Day of the Week (Raw Counts)
This shows the raw win/loss counts for each day.
\`\`\`json
${JSON.stringify(dayOfWeekStats, replacer, 2)}
\`\`\`

### 5. Daily Outcome Probability (Win/Loss Rate by Day)
This shows my historical win/loss RATE for each day, which is more useful than raw counts for identifying my best and worst trading days.
\`\`\`json
${JSON.stringify(dailyRateStats, replacer, 2)}
\`\`\`

### 6. Advanced Sequential Analysis (Next Outcome by Day)
This predicts the most likely day for my next win or loss, based on my last outcome. It helps identify complex patterns like "after a loss on Monday, I tend to have a revenge-trading loss on Tuesday".
\`\`\`json
${JSON.stringify(advancedSequenceStats, replacer, 2)}
\`\`\`

---

**Your Analysis Task:**

Based on ALL the data above, please provide a comprehensive analysis covering:
1.  **Executive Summary:** A brief overview of my trading personality and edge. Am I profitable? Consistent? A gambler? Are there any obvious red flags?
2.  **Strengths:** What am I doing well? What patterns in the data support this? (e.g., "You have a strong profit factor, and the Markov analysis (section 3) shows a high probability of winning again after a win, indicating you're good at pressing your advantage.")
3.  **Weaknesses & Contradictions:** Where are the biggest problems? **You must look for contradictions or connections between the datasets.** (e.g., "Your overall win rate is decent, but the 'Daily Outcome Probability' chart (section 5) shows you have a sub-40% win rate on Fridays. This suggests end-of-week fatigue or FOMO is severely damaging your otherwise profitable strategy.")
4.  **Actionable Advice:** Provide 2-3 specific, data-driven recommendations. Each recommendation must refer to the specific data that justifies it. (e.g., "Recommendation 1: **Stop trading on Fridays entirely for one month.** The data in section 4 and 5 clearly shows this is your worst day. Recommendation 2: **After any losing trade, take a mandatory 1-hour break.** Your Markov data (section 3) shows a high 'probLossAfterLoss' of ${markovStats.probLossAfterLoss?.toFixed(
          2
        )}, and this might break the negative psychological loop.")
`;
        return prompt;
      }

      async function callGeminiAPI(history) {
        const token = localStorage.getItem("token");
        const resp = await fetch("http://localhost:5000/api/ai/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-auth-token": token || ""
          },
          body: JSON.stringify({ history })
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(data.error || `AI proxy error ${resp.status}`);
        return data.text || "(No content returned)";
      }

      async function startAiChatSession() {
        const errorEl = document.getElementById("aiInitialError");
        const startBtn = document.getElementById("startAiChatBtn");
        const aiIcon = document.getElementById("aiIcon");
        const aiButtonText = document.getElementById("aiButtonText");

        errorEl.classList.add("hidden");
        // Backend holds key now; no need to check client field

        startBtn.disabled = true;
        aiIcon.className = "fas fa-spinner fa-spin mr-2";
        aiButtonText.textContent = "Analyzing...";
        document.getElementById("aiChatLog").innerHTML = "";
        addMessageToChatLog(
          "Gathering all performance data and generating initial analysis...",
          "loading"
        );

        const initialPrompt = generateComprehensiveAnalysisPrompt();

        if (initialPrompt === "INSUFFICIENT_DATA") {
          errorEl.textContent =
            "Please add at least 5-10 trades to generate a meaningful analysis.";
          errorEl.classList.remove("hidden");
          startBtn.disabled = false;
          aiIcon.className = "fas fa-play-circle mr-2";
          aiButtonText.textContent = "Start AI Analysis";
          document.getElementById("aiChatLog").innerHTML = "";
          return;
        }

        aiChatHistory = [{ role: "user", parts: [{ text: initialPrompt }] }];
        try {
          const responseText = await callGeminiAPI(aiChatHistory);
          aiChatHistory.push({
            role: "model",
            parts: [{ text: responseText }],
          });
          document.getElementById("aiChatLog").innerHTML = ""; // Clear "loading" message
          addMessageToChatLog(responseText, "ai");
          document.getElementById("aiInitialState").classList.add("hidden");
          document.getElementById("aiChatForm").classList.remove("hidden");
        } catch (err) {
          document.getElementById("aiChatLog").innerHTML = "";
          errorEl.textContent = `Analysis failed: ${err.message}`;
          errorEl.classList.remove("hidden");
        } finally {
          startBtn.disabled = false;
          aiIcon.className = "fas fa-microchip mr-2";
          aiButtonText.textContent = "Start AI Analysis";
        }
      }

      async function handleAiChatSubmit(event) {
        event.preventDefault();
        const input = document.getElementById("aiChatInput");
        const sendBtn = document.getElementById("aiChatSendBtn");
        const userMessage = input.value.trim();
  if (!userMessage) return;

        addMessageToChatLog(userMessage, "user");
        aiChatHistory.push({ role: "user", parts: [{ text: userMessage }] });
        input.value = "";
        sendBtn.disabled = true;
        addMessageToChatLog("Thinking...", "loading");

        try {
          const responseText = await callGeminiAPI(aiChatHistory);
          aiChatHistory.push({
            role: "model",
            parts: [{ text: responseText }],
          });

          document.querySelector("#aiChatLog div:last-child").remove();
          addMessageToChatLog(responseText, "ai");
        } catch (err) {
          document.querySelector("#aiChatLog div:last-child").remove();
          addMessageToChatLog(`Sorry, an error occurred: ${err.message}`, "ai");
        } finally {
          sendBtn.disabled = false;
        }
      }

      function parseDateString(dateStr) {
        let date = new Date(dateStr);
        if (!isNaN(date)) return date;

        const parts = dateStr.match(
          /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})[,\sT]*(\d{1,2})?:?(\d{1,2})?/
        );
        if (parts) {
          const day = parseInt(parts[1], 10);
          const month = parseInt(parts[2], 10) - 1; // Month is 0-indexed in JS
          const year = parseInt(parts[3], 10);
          const hour = parseInt(parts[4], 10) || 0;
          const minute = parseInt(parts[5], 10) || 0;
          if (
            year > 1970 &&
            month >= 0 &&
            month <= 11 &&
            day > 0 &&
            day <= 31
          ) {
            return new Date(year, month, day, hour, minute);
          }
        }
        return null; // Return null if parsing fails
      }

      function importTradesFromCSV(csvText) {
        const newTrades = [];
        let errors = 0;
        const lines = csvText.split(/\r?\n/).slice(1); // Skip header row

        lines.forEach((line, index) => {
          if (!line.trim()) return;
          const columns = line
            .split(",")
            .map((c) => c.trim().replace(/"/g, ""));

          if (columns.length < 3) {
            errors++;
            console.warn(`Skipping row ${index + 2}: Not enough columns.`);
            return;
          }
          const [dateStr, asset, pnLStr, riskAmountStr] = columns;

          const pnL = parseFloat(pnLStr);
          const riskAmount = parseFloat(riskAmountStr);
          const date = parseDateString(dateStr);

          if (!date || !asset || isNaN(pnL) || pnL === 0) {
            errors++;
            console.warn(
              `Skipping row ${
                index + 2
              }: Invalid data. Date: '${dateStr}', P&L: '${pnLStr}'`
            );
            return;
          }

          const finalRiskAmount =
            isFinite(riskAmount) && riskAmount > 0
              ? riskAmount
              : settings.initialBalance * 0.01;
          const finalRMultiple =
            finalRiskAmount > 0 ? pnL / finalRiskAmount : 0;

          const tags =
            columns.length > 4 && columns[4]
              ? columns[4].split(";").map((t) => t.trim())
              : [];

          newTrades.push({
            id: crypto.randomUUID(),
            date: date.toISOString(),
            asset,
            pnL,
            riskAmount: finalRiskAmount,
            rMultiple: finalRMultiple,
            outcome: pnL > 0 ? "Win" : "Loss",
            tags: tags,
          });
        });

        if (newTrades.length > 0) {
          trades.push(...newTrades);
          trades.sort((a, b) => new Date(a.date) - new Date(b.date));
          updateInitialBalanceAfterTrade();
          saveAppData();
          updateUI();
          showMessageBox(
            `Import complete. Added ${newTrades.length} trades. Skipped ${errors} rows.`,
            "success",
            5000
          );
        } else {
          showMessageBox(
            `Import failed. Added 0 trades. Skipped ${errors} rows. Please check CSV format.`,
            "error",
            5000
          );
        }
      }

      const deleteTrade = async (id) => {
        if (await showConfirmModal("Delete this trade permanently?")) {
          trades = trades.filter((t) => t.id !== id);
          updateInitialBalanceAfterTrade();
          saveAppData();
          updateUI();
          showMessageBox("Trade deleted.", "info");
        }
      };

      const clearAllTrades = async () => {
        if (trades.length === 0) return;
        if (
          await showConfirmModal("Clear ALL trades? This cannot be undone.")
        ) {
          trades = [];
          updateInitialBalanceAfterTrade();
          saveAppData();
          loadAppData();
          updateUI();
          showMessageBox("All trades cleared!", "info");
        }
      };

      function renderTagFilters() {
        const tagPillsContainer = document.getElementById("tagPills");
        const clearBtn = document.getElementById("clearTagFilterBtn");
        const container = document.getElementById("tagFilterContainer");
        const allTags = new Set(trades.flatMap((t) => t.tags || []));
        if (allTags.size === 0) {
          container.classList.add("hidden");
          return;
        }
        container.classList.remove("hidden");
        tagPillsContainer.innerHTML = "";
        allTags.forEach((tag) => {
          const isActive = activeFilters.includes(tag);
          const pill = document.createElement("span");
          pill.className = `trade-tag tag-pill ${isActive ? "active" : ""}`;
          pill.textContent = tag;
          pill.dataset.tag = tag;
          tagPillsContainer.appendChild(pill);
        });
        if (activeFilters.length > 0) clearBtn.classList.remove("hidden");
        else clearBtn.classList.add("hidden");
      }

      function calculatePositionSize() {
        const accountBalance =
          parseFloat(document.getElementById("pscAccountBalance").value) || 0;
        const riskPercent =
          parseFloat(document.getElementById("pscRiskPercent").value) || 0;
        const stopLossPips =
          parseFloat(document.getElementById("pscStopLossPips").value) || 0;
        const valuePerPip =
          parseFloat(document.getElementById("pscValuePerPip").value) || 0;
        const amountToRisk = accountBalance * (riskPercent / 100);
        const totalStopValue = stopLossPips * valuePerPip;
        let positionSize = 0;
        if (totalStopValue > 0) positionSize = amountToRisk / totalStopValue;
        document.getElementById(
          "pscResultAmount"
        ).textContent = `£${amountToRisk.toFixed(2)}`;
        document.getElementById("pscResultSize").textContent =
          positionSize.toFixed(2);
      }

      function calculateRiskOfRuin() {
        const drawdown =
          parseFloat(document.getElementById("rorDrawdown").value) || 0;
        const riskPerTrade =
          parseFloat(document.getElementById("rorRiskPerTrade").value) || 0;
        const edge = currentStats.evRPerTrade || 0;
        const winRate = currentStats.winRate || 0;
        const avgRPerWin = currentStats.avgRPerWin || 0;
        const avgRPerLoss = currentStats.avgRPerLoss || 0;
        
        document.getElementById("rorSourceWinRate").textContent = `${(
          winRate * 100
        ).toFixed(2)}%`;
        document.getElementById("rorSourceAvgR").textContent = `${edge.toFixed(
          2
        )}R`;
        
        let ror = 0,
          tradesToRuin = 0;
        
        if (riskPerTrade > 0 && drawdown > 0 && currentStats.totalTrades > 0) {
          tradesToRuin = Math.ceil(drawdown / riskPerTrade);
          
          if (edge > 0 && winRate > 0 && winRate < 1 && avgRPerWin > 0 && avgRPerLoss > 0) {
            // Standard Risk of Ruin formula with practical adjustments
            const p = winRate; // win probability
            const q = 1 - winRate; // loss probability
            const a = avgRPerWin; // average win in R
            const b = Math.abs(avgRPerLoss); // average loss in R (positive)
            
            // Calculate advantage ratio
            const advantageRatio = (p * a - q * b) / (p * a + q * b);
            
            if (advantageRatio > 0) {
              // Use modified Kelly-based Risk of Ruin
              const f = riskPerTrade / 100; // risk fraction
              const kelly = (p * (1 + a) - 1) / a; // optimal Kelly fraction
              const kellyRatio = f / kelly; // how much of Kelly we're using
              
              // Risk of ruin increases exponentially with position size relative to Kelly
              const capitalUnits = drawdown / riskPerTrade;
              
              if (kellyRatio <= 1) {
                // Conservative: using less than or equal to Kelly
                ror = Math.pow((q/p) * (b/a), capitalUnits) * 100;
                
                // Add practical adjustment for real-world factors
                const realWorldMultiplier = 1 + (kellyRatio * 0.5); // account for slippage, emotions, etc.
                ror *= realWorldMultiplier;
              } else {
                // Aggressive: using more than Kelly - much higher risk
                const excessRisk = Math.pow(kellyRatio, 2);
                ror = Math.pow((q/p) * (b/a), capitalUnits / excessRisk) * 100;
                ror = Math.min(ror * excessRisk * 5, 100);
              }
              
            } else {
              ror = 100; // No edge = certain ruin
            }
          } else if (edge <= 0) {
            ror = 100; // Negative edge = certain ruin
          } else {
            ror = 50; // Invalid data fallback
          }
          
          // Ensure reasonable bounds (minimum 0.01% for display, maximum 100%)
          if (ror > 0 && ror < 0.01) {
            ror = 0.01; // Show very small but non-zero risk
          }
          ror = Math.min(ror, 100);
        }
        
        document.getElementById("rorResultTrades").textContent = tradesToRuin;
        document.getElementById(
          "rorResultPercent"
        ).textContent = `${ror.toFixed(2)}%`;
      }

      function renderDashboard() {
        if (Object.keys(currentStats).length === 0) {
          const netPnlEl = document.getElementById("db-statNetPnL");
          netPnlEl.textContent = "£0.00";
          netPnlEl.className = "text-2xl font-bold text-white";
          document.getElementById("db-statProfitFactor").textContent = "0.00";
          document.getElementById("db-statWinRate").textContent = "0%";
          const evEl = document.getElementById("db-statEvRPerTrade");
          evEl.textContent = "0.00R";
          evEl.className = "text-2xl font-bold text-white";
          document.getElementById("db-drawdown-bar").style.width = `0%`;
          document.getElementById(
            "db-drawdown-label"
          ).textContent = `£0.00 / £0.00`;
          return;
        }

        const {
          netPnL,
          profitFactor,
          winRate,
          evRPerTrade,
          currentDrawdown,
          historicalMaxDrawdown,
        } = currentStats;
        const netPnlEl = document.getElementById("db-statNetPnL");
        netPnlEl.textContent = `£${(netPnL || 0).toFixed(2)}`;
        netPnlEl.className = `text-2xl font-bold ${
          netPnL >= 0 ? "text-green-400" : "text-red-400"
        }`;
        document.getElementById("db-statProfitFactor").textContent = isFinite(
          profitFactor
        )
          ? profitFactor.toFixed(2)
          : "∞";
        document.getElementById("db-statWinRate").textContent = `${(
          (winRate || 0) * 100
        ).toFixed(1)}%`;
        const evEl = document.getElementById("db-statEvRPerTrade");
        evEl.textContent = `${(evRPerTrade || 0).toFixed(2)}R`;
        evEl.className = `text-2xl font-bold ${
          evRPerTrade >= 0 ? "text-blue-400" : "text-purple-400"
        }`;
        const drawdownPercent =
          historicalMaxDrawdown > 0
            ? (currentDrawdown / historicalMaxDrawdown) * 100
            : 0;
        document.getElementById("db-drawdown-bar").style.width = `${Math.min(
          drawdownPercent,
          100
        )}%`;
        document.getElementById("db-drawdown-label").textContent = `£${(
          currentDrawdown || 0
        ).toFixed(2)} / £${(historicalMaxDrawdown || 0).toFixed(2)}`;
      }

      async function updateUI() {
        const simBtn = document.getElementById("runSimulationBtn"),
          simIcon = document.getElementById("simIcon"),
          simText = document.getElementById("simButtonText");
        simBtn.disabled = true;
        simIcon.className = "fas fa-spinner fa-spin mr-2";
        simText.textContent = "Calculating...";
        try {
          await new Promise((r) => setTimeout(r, 20));
          renderTagFilters();
          renderTradeList();
          const tradesToAnalyze =
            activeFilters.length > 0
              ? trades.filter(
                  (t) => {
                    const hasAnyRequiredTag = t.tags && activeFilters.some((f) => t.tags.includes(f));
                    return hasAnyRequiredTag;
                  }
                )
              : trades;

          console.log(`Active filters: ${activeFilters.join(', ')}`);
          console.log(`Total trades: ${trades.length}, Filtered trades: ${tradesToAnalyze.length}`);
          if (tradesToAnalyze.length > 0) {
            console.log('Sample filtered trade tags:', tradesToAnalyze[0].tags);
          }

          calculateStatistics(tradesToAnalyze);
          markovStats = calculateMarkovProbabilities(tradesToAnalyze);
          dayOfWeekStats = calculateDayOfWeekStats(tradesToAnalyze);
          advancedSequenceStats =
            calculateAdvancedSequenceStats(tradesToAnalyze);
          dailyRateStats = calculateDailyWinRates(dayOfWeekStats);

          updateStatisticsDisplay();
          calculateRiskOfRuin();
          renderDashboard();
          renderMarkovCharts(markovStats);
          renderDayOfWeekCharts(dayOfWeekStats);
          renderAdvancedSequenceCharts(advancedSequenceStats);
          renderDailyWinRateCharts(dailyRateStats);

          const tradesPerSeriesMode = document.querySelector(
            "#tradesPerSeriesModeSelector .active"
          ).dataset.mode;
          let numTrades;
          if (tradesPerSeriesMode === "auto") {
            numTrades =
              tradesToAnalyze.length > 0 ? tradesToAnalyze.length : 10;
            document.getElementById("numTradesPerSet").value = numTrades;
          } else {
            numTrades =
              parseInt(document.getElementById("numTradesPerSet").value) || 10;
          }

          const numSims =
            parseInt(document.getElementById("numSimulationSets").value) || 0;

          if (currentStats.totalTrades > 0 && numTrades > 0 && numSims > 0) {
            const { winRate, avgProfitPerWin, avgLossPerLoss } = currentStats;
            const jumpP =
              parseFloat(document.getElementById("jumpProbability").value) /
                100 || 0;
            const jumpPnL =
              parseFloat(document.getElementById("avgJumpPnL").value) || 0;

            simText.textContent = "Simulating...";
            await new Promise((r) => setTimeout(r, 20));

            const { pnlResults, simulationPaths } = runSimulation(
              numTrades,
              numSims,
              winRate,
              avgProfitPerWin,
              avgLossPerLoss,
              jumpP,
              jumpPnL
            );
            const allSimPnLs = pnlResults
              .map((r) => r.pnl)
              .sort((a, b) => a - b);
            const avgSimPnL =
              numSims > 0 ? allSimPnLs.reduce((a, b) => a + b, 0) / numSims : 0;
            const varIndex = Math.floor(allSimPnLs.length * 0.05);
            const calculatedVaR = allSimPnLs[varIndex] || 0;
            const simMaxDD =
              pnlResults.length > 0
                ? Math.max(...pnlResults.map((r) => r.maxDD))
                : 0;

            currentSimulationResults = {
              numSimulations: numSims,
              tradesPerSeries: numTrades,
              averagePnl: avgSimPnL,
              VaR_5_percent: calculatedVaR,
              median_pnl: processSimulationPaths(
                simulationPaths,
                numTrades
              ).p50.slice(-1)[0],
              maxDrawdown: simMaxDD,
            };

            document.getElementById(
              "simVaR"
            ).textContent = `£${calculatedVaR.toFixed(2)}`;

            const varMode = document.querySelector("#varModeSelector .active")
              .dataset.mode;
            if (varMode === "limit") {
              const manualVaRLimit =
                parseFloat(document.getElementById("manualVaRInput").value) ||
                0;
              const breachCount = allSimPnLs.filter(
                (pnl) => pnl < manualVaRLimit
              ).length;
              const breachPercent = (breachCount / numSims) * 100;
              document.getElementById(
                "varBreachInfo"
              ).textContent = `Breaches limit in: ${breachPercent.toFixed(
                1
              )}% of sims`;
            } else {
              document.getElementById("varBreachInfo").textContent = "";
            }

            document.getElementById("simulatedSets").textContent = numSims;
            document.getElementById("simulatedN").textContent = numTrades;
            document.getElementById("simAvgPnL").textContent = `£${(
              avgSimPnL || 0
            ).toFixed(2)}`;
            document.getElementById(
              "simMaxDrawdown"
            ).textContent = `£${simMaxDD.toFixed(2)}`;

            const percentileData = processSimulationPaths(
              simulationPaths,
              numTrades
            );
            renderEquityConeChart(
              "equityCurveChart",
              percentileData,
              numTrades
            );
            renderEquityConeChart(
              "dashboardEquityChart",
              percentileData,
              numTrades
            );
            renderJumpDiffusionPnLChart(allSimPnLs);
          } else {
            [
              equityCurveChartInstance,
              jumpDiffusionPnLChartInstance,
              dashboardEquityChartInstance,
            ].forEach((c) => {
              if (c) c.destroy();
            });
            equityCurveChartInstance =
              jumpDiffusionPnLChartInstance =
              dashboardEquityChartInstance =
                undefined;
            currentSimulationResults = {};
            aiChatHistory = [];
            document.getElementById("aiChatLog").innerHTML = "";
            document.getElementById("aiChatForm").classList.add("hidden");
            document
              .getElementById("aiInitialState")
              .classList.remove("hidden");
            document.getElementById("aiInitialError").classList.add("hidden");
            document.getElementById("simulatedSets").textContent = "0";
            document.getElementById("simulatedN").textContent = "0";
            document.getElementById("simAvgPnL").textContent = "£0.00";
            document.getElementById("simVaR").textContent = "£0.00";
            document.getElementById("simMaxDrawdown").textContent = "£0.00";
            document.getElementById("varBreachInfo").textContent = "";
          }
        } catch (error) {
          console.error("An error occurred during UI update:", error);
          showMessageBox(
            "An error occurred. Check console for details.",
            "error"
          );
        } finally {
          simIcon.className = "fas fa-play-circle mr-2";
          simText.textContent = "Recalculate & Run Simulation";
          simBtn.disabled = false;
        }
      }

      document.addEventListener("DOMContentLoaded", () => {
        loadAppData();
        setVarModeUI(settings.varMode);
        setTradesPerSeriesModeUI(settings.tradesPerSeriesMode);
        setTailModeUI(settings.tailMode);
        document.getElementById("tradeDate").value = formatISODate(new Date());
        
        // Update initial balance to show current running balance on page load
        updateInitialBalanceAfterTrade();

        document
          .getElementById("addTradeBtn")
          .addEventListener("click", addTrade);
        document
          .getElementById("clearAllTradesBtn")
          .addEventListener("click", clearAllTrades);
        document
          .getElementById("runSimulationBtn")
          .addEventListener("click", () => {
            saveAppData();
            updateUI();
          });

        document
          .getElementById("importCsvBtn")
          .addEventListener("click", () =>
            document.getElementById("csvFileInput").click()
          );
        document
          .getElementById("csvFileInput")
          .addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (event) =>
                importTradesFromCSV(event.target.result);
              reader.readAsText(file);
              e.target.value = "";
            }
          });

        document
          .getElementById("initialBalance")
          .addEventListener("change", () => {
            settings.initialBalance = parseFloat(
              document.getElementById("initialBalance").value
            );
            saveAppData();
            updateUI();
          });

        document
          .getElementById("editSave")
          .addEventListener("click", saveTradeChanges);
        document
          .getElementById("editCancel")
          .addEventListener("click", () =>
            document.getElementById("editModal").classList.remove("active")
          );

        const settingsInputs = [
          "numTradesPerSet",
          "numSimulationSets",
          "tailLossThreshold",
          "tailWinThreshold",
          "jumpProbability",
          "avgJumpPnL",
          "manualVaRInput"
          // googleAiKey intentionally excluded: now sourced from backend only
        ];
        settingsInputs.forEach((id) =>
          document.getElementById(id)?.addEventListener("change", saveAppData)
        );

        document
          .getElementById("pscUseCurrentBalance")
          .addEventListener("click", () => {
            document.getElementById("pscAccountBalance").value = (
              currentStats.currentBalance || settings.initialBalance
            ).toFixed(2);
            calculatePositionSize();
          });

        document
          .querySelectorAll(
            "#tradesPerSeriesModeSelector .tail-mode-btn, #varModeSelector .var-mode-btn, #tailModeSelector .tail-mode-btn"
          )
          .forEach((btn) => {
            btn.addEventListener("click", (e) => {
              const parent = e.target.closest("div");
              parent
                .querySelectorAll(".active")
                .forEach((b) => b.classList.remove("active"));
              e.target.classList.add("active");

              const newMode = e.target.dataset.mode;
              if (parent.id === "tradesPerSeriesModeSelector") {
                setTradesPerSeriesModeUI(newMode);
                if (newMode === "manual") {
                  document.getElementById("numTradesPerSet").value =
                    settings.numTradesPerSet;
                }
              }
              if (parent.id === "varModeSelector") setVarModeUI(newMode);
              if (parent.id === "tailModeSelector") setTailModeUI(newMode);

              saveAppData();
              updateUI();
            });
          });

        const tabButtons = document.getElementById("tab-buttons");
        tabButtons.addEventListener("click", (e) => {
          if (e.target.tagName === "BUTTON") {
            const tabId = e.target.dataset.tab;
            tabButtons.querySelector(".active").classList.remove("active");
            e.target.classList.add("active");
            document
              .querySelector(".tab-panel.active")
              .classList.remove("active");
            document.getElementById(tabId).classList.add("active");
          }
        });

        const tagPillsContainer = document.getElementById("tagPills"),
          clearTagFilterBtn = document.getElementById("clearTagFilterBtn");
        tagPillsContainer.addEventListener("click", (e) => {
          if (e.target.classList.contains("tag-pill")) {
            const tag = e.target.dataset.tag,
              index = activeFilters.indexOf(tag);
            if (index > -1) activeFilters.splice(index, 1);
            else activeFilters.push(tag);
            saveAppData();
            updateUI();
          }
        });
        clearTagFilterBtn.addEventListener("click", () => {
          activeFilters = [];
          saveAppData();
          updateUI();
        });

        const pscInputs = [
          "pscAccountBalance",
          "pscRiskPercent",
          "pscStopLossPips",
          "pscValuePerPip",
        ];
        pscInputs.forEach((id) =>
          document
            .getElementById(id)
            .addEventListener("input", calculatePositionSize)
        );
        document
          .getElementById("pscUseCurrentBalance")
          .addEventListener("click", () => {
            document.getElementById("pscAccountBalance").value = (
              currentStats.currentBalance || settings.initialBalance
            ).toFixed(2);
            calculatePositionSize();
          });
        const rorInputs = ["rorDrawdown", "rorRiskPerTrade"];
        rorInputs.forEach((id) =>
          document
            .getElementById(id)
            .addEventListener("input", calculateRiskOfRuin)
        );
        document
          .getElementById("clearCalculatorsBtn")
          .addEventListener("click", () => {
            pscInputs.forEach((id) => (document.getElementById(id).value = ""));
            document.getElementById("pscRiskPercent").value = "1.0";
            document.getElementById("rorDrawdown").value = "20";
            document.getElementById("rorRiskPerTrade").value = "1";
            calculatePositionSize();
            calculateRiskOfRuin();
          });

        document
          .getElementById("startAiChatBtn")
          .addEventListener("click", startAiChatSession);
        document
          .getElementById("aiChatForm")
          .addEventListener("submit", handleAiChatSubmit);

        // API Key visibility toggle
        const toggleBtn = document.getElementById("toggleApiKeyVisibility");
        const apiKeyInput = document.getElementById("googleAiKey");
        toggleBtn?.addEventListener("click", () => {
          if (!apiKeyInput) return;
            const isHidden = apiKeyInput.type === "password";
            apiKeyInput.type = isHidden ? "text" : "password";
            toggleBtn.innerHTML = `<i class="far ${isHidden ? "fa-eye-slash" : "fa-eye"}"></i>`;
        });

        // Security notice if key present (user exposed key earlier)
        if (apiKeyInput) {
          apiKeyInput.setAttribute("readonly", "readonly");
          apiKeyInput.classList.add("cursor-not-allowed", "opacity-80");
        }

        // Hook to receive user data (auth.js triggers window.onUserDataLoaded)
        window.onUserDataLoaded = (user) => {
          try {
            if (user && user.googleAiKey && apiKeyInput) {
              apiKeyInput.value = user.googleAiKey;
              // No local caching for AI key.
            }
          } catch (e) {
            console.warn("Failed to sync googleAiKey:", e);
          }
        };

        if (apiKeyInput?.value) {
          console.warn(
            "Security: API key present in DOM. Consider proxying AI calls server-side to conceal it."
          );
        }

        updateUI();
      });
