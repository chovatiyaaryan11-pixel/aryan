const $ = (s) => document.querySelector(s);
const api = async (url, options = {}) => {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
};

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
}

function addMessage(role, text) {
  const welcome = $('#welcome');
  if (welcome) welcome.remove();
  const row = document.createElement('div');
  row.className = 'message';
  const isAi = role === 'assistant';
  row.innerHTML = `<div class="avatar ${isAi ? 'ai' : ''}">${isAi ? 'A' : 'You'}</div><div><div class="message-label">${isAi ? 'Aryan AI' : 'You'}</div><div class="message-content">${escapeHtml(text)}</div></div>`;
  $('#chatArea').appendChild(row);
  $('#chatArea').scrollTop = $('#chatArea').scrollHeight;
}

async function sendMessage(message) {
  if (!message.trim()) return;
  addMessage('user', message);
  $('#messageInput').value = '';
  $('#sendButton').disabled = true;
  try {
    const result = await api('/agent/chat', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({message})
    });
    let reply = result.response || 'I received your message.';
    if (result.pending_tasks?.length) reply += `\n\nPending tasks: ${result.pending_tasks.join(', ')}`;
    addMessage('assistant', reply);
  } catch (error) {
    addMessage('assistant', 'The assistant server could not process your request. Please check that the FastAPI server is running.');
  } finally { $('#sendButton').disabled = false; }
}

$('#chatForm').addEventListener('submit', e => { e.preventDefault(); sendMessage($('#messageInput').value); });
$('#messageInput').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#chatForm').requestSubmit(); } });
document.querySelectorAll('.suggestion').forEach(button => button.addEventListener('click', () => sendMessage(button.textContent)));
$('#newChat').addEventListener('click', () => { $('#chatArea').innerHTML = ''; $('#chatArea').appendChild(Object.assign(document.createElement('div'), {className:'welcome', id:'welcome', innerHTML:'<div class="welcome-logo">A</div><h2>New conversation</h2><p>Ask your personal AI assistant anything.</p>'})); });

const panels = {chat:'chatPanel', tasks:'tasksPanel', memories:'memoriesPanel'};
document.querySelectorAll('.nav-item').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active-panel'));
  button.classList.add('active');
  $('#' + panels[button.dataset.panel]).classList.add('active-panel');
  $('#pageTitle').textContent = button.dataset.panel === 'chat' ? 'Aryan AI' : button.dataset.panel[0].toUpperCase() + button.dataset.panel.slice(1);
  if (button.dataset.panel === 'tasks') loadTasks();
  if (button.dataset.panel === 'memories') loadMemories();
}));

$('#showTaskForm').addEventListener('click', () => $('#taskForm').classList.toggle('hidden'));
$('#showMemoryForm').addEventListener('click', () => $('#memoryForm').classList.toggle('hidden'));

async function loadTasks() {
  const list = $('#taskList'); list.innerHTML = '<p>Loading tasks...</p>';
  try {
    const tasks = await api('/tasks');
    list.innerHTML = tasks.length ? tasks.map(t => `<div class="data-item"><div><h3>${escapeHtml(t.title)}</h3><p>${escapeHtml(t.description || 'No description')}</p></div><div class="badge">${escapeHtml(t.priority)} · ${escapeHtml(t.status)}</div>${t.status === 'pending' ? `<button class="complete" onclick="completeTask(${t.id})">Complete</button>` : ''}</div>`).join('') : '<p>No tasks yet. Add your first task.</p>';
  } catch { list.innerHTML = '<p>Could not load tasks.</p>'; }
}

window.completeTask = async (id) => { await api(`/tasks/${id}/complete`, {method:'POST'}); loadTasks(); };
$('#taskForm').addEventListener('submit', async e => { e.preventDefault(); try { await api('/tasks', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:$('#taskTitle').value,description:$('#taskDescription').value || null,priority:$('#taskPriority').value})}); e.target.reset(); e.target.classList.add('hidden'); loadTasks(); } catch { alert('Could not save task.'); } });

async function loadMemories() {
  const list = $('#memoryList'); list.innerHTML = '<p>Loading memories...</p>';
  try { const memories = await api('/memories'); list.innerHTML = memories.length ? memories.map(m => `<div class="data-item"><div><h3>${escapeHtml(m.category)}</h3><p>${escapeHtml(m.content)}</p></div><div class="badge">Importance ${m.importance}/10</div></div>`).join('') : '<p>No memories saved yet.</p>'; } catch { list.innerHTML = '<p>Could not load memories.</p>'; }
}
$('#memoryForm').addEventListener('submit', async e => { e.preventDefault(); try { await api('/memories', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({category:$('#memoryCategory').value,content:$('#memoryContent').value,importance:Number($('#memoryImportance').value)})}); e.target.reset(); e.target.classList.add('hidden'); loadMemories(); } catch { alert('Could not save memory.'); } });
$('#refreshData').addEventListener('click', () => { loadTasks(); loadMemories(); });
