function loadSessions() {
    let sessions = [];
    try {
        sessions = JSON.parse(localStorage.getItem('treadmill_sessions') || '[]');
    } catch {}
    return Array.isArray(sessions) ? sessions : [];
}

function saveSessions(sessions) {
    localStorage.setItem('treadmill_sessions', JSON.stringify(sessions));
}

function clearSessions() {
    saveSessions([]);
    renderSessionTable();
}

function deleteSession(idx) {
    const sessions = loadSessions();
    sessions.splice(idx, 1);
    saveSessions(sessions);
    renderSessionTable();
}

function renderSessionTable() {
    const sessions = loadSessions();
    historyTableBody.innerHTML = '';
    const isTableBody = historyTableBody.tagName === 'TBODY';

    if (sessions.length === 0) {
        if (isTableBody) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="7" class="empty-history">No saved sessions yet. Connect the treadmill and start your first workout to build a history here.</td>`;
            historyTableBody.appendChild(tr);
        } else {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-history';
            emptyState.textContent = 'No saved sessions yet. Connect the treadmill and start your first workout to build a history here.';
            historyTableBody.appendChild(emptyState);
        }
        return;
    }

    sessions.forEach((s, i) => {
        let avgSpeedDisplay = '-';
        if (typeof s.avgSpeed === 'number' && !isNaN(s.avgSpeed)) {
            avgSpeedDisplay = s.avgSpeed.toFixed(2) + ' ' + (s.speedUnit || '');
        } else if (typeof s.avgSpeed === 'string' && !isNaN(parseFloat(s.avgSpeed))) {
            avgSpeedDisplay = parseFloat(s.avgSpeed).toFixed(2) + ' ' + (s.speedUnit || '');
        }

        let dateStr = '-';
        if (typeof s.date === 'number' || typeof s.date === 'string') {
            dateStr = dateFns.formatRelative(new Date(s.date), new Date());
        }

        if (isTableBody) {
            const tr = document.createElement('tr');
            let stepsDisplay = '-';
            if (typeof s.steps === 'number' && !isNaN(s.steps)) {
                stepsDisplay = s.steps;
            }
            let elevationDisplay = '-';
            if (typeof s.elevation === 'number' && !isNaN(s.elevation)) {
                elevationDisplay = s.elevation + ' m';
            }
            tr.innerHTML = `
                <td>${dateStr}</td>
                <td>${formatDuration(s.duration)}</td>
                <td>${s.calories}</td>
                <td>${avgSpeedDisplay}</td>
                <td>${stepsDisplay}</td>
                <td>${elevationDisplay}</td>
                <td><button class="mdl-button mdl-js-button mdl-button--icon" title="Delete" onclick="window.deleteSessionFromTable(${i})"><i class="material-icons">delete</i></button></td>
            `;
            historyTableBody.appendChild(tr);
        } else {
            let distanceDisplay = '-';
            if (typeof s.distance === 'number' && !isNaN(s.distance)) {
                distanceDisplay = (s.distance / 1000).toFixed(2) + ' km';
            } else if (typeof s.distance === 'string' && s.distance.trim()) {
                distanceDisplay = s.distance;
            }
            let stepsDisplay = '-';
            if (typeof s.steps === 'number' && !isNaN(s.steps)) {
                stepsDisplay = s.steps + ' steps';
            }
            let elevationDisplay = '-';
            if (typeof s.elevation === 'number' && !isNaN(s.elevation)) {
                elevationDisplay = s.elevation + ' m';
            }
            const card = document.createElement('article');
            card.className = 'history-entry';
            card.innerHTML = `
                <div class="history-entry-top">
                    <div class="history-date">${dateStr}</div>
                    <button class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect app-button button-soft history-delete" title="Delete" onclick="window.deleteSessionFromTable(${i})">
                        <i class="material-icons">delete</i>
                    </button>
                </div>
                <div class="history-stats">
                    <div class="history-stat">
                        <span class="history-stat-label">Duration</span>
                        <span class="history-stat-value">${formatDuration(s.duration)}</span>
                    </div>
                    <div class="history-stat">
                        <span class="history-stat-label">Calories</span>
                        <span class="history-stat-value">${s.calories}</span>
                    </div>
                    <div class="history-stat">
                        <span class="history-stat-label">Distance</span>
                        <span class="history-stat-value">${distanceDisplay}</span>
                    </div>
                    <div class="history-stat">
                        <span class="history-stat-label">Steps</span>
                        <span class="history-stat-value">${stepsDisplay}</span>
                    </div>
                    <div class="history-stat">
                        <span class="history-stat-label">Elevation</span>
                        <span class="history-stat-value">${elevationDisplay}</span>
                    </div>
                </div>
            `;
            historyTableBody.appendChild(card);
        }
    });
}

function upsertLiveSession(session) {
    const sessions = loadSessions();
    if (sessions.length > 0 && sessions[0] && sessions[0].date === session.date) {
        sessions[0] = session;
    } else {
        sessions.unshift(session);
    }
    saveSessions(sessions);
    renderSessionTable();
}

function finishSession() {
    sessionActive = false;
    sessionStartData = null;
}

window.deleteSessionFromTable = deleteSession;
