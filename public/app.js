const createBtn = document.getElementById('create-btn');
const logoutBtn = document.getElementById('logout-btn');
const createFormSection = document.getElementById('create-form');
const widgetForm = document.getElementById('widget-form');
const formError = document.getElementById('form-error');
const widgetsEl = document.getElementById('widgets');

createBtn.addEventListener('click', () => {
	createFormSection.classList.toggle('hidden');
});

logoutBtn.addEventListener('click', async () => {
	await fetch('/api/logout', { method: 'POST', credentials: 'include' });
	window.location.replace('/');
});

widgetForm.addEventListener('submit', async (e) => {
	e.preventDefault();
	formError.textContent = '';
	const name = widgetForm.name.value.trim();
	const url = widgetForm.url.value.trim();
	const description = widgetForm.description.value.trim();

	if (!name || !url) {
		formError.textContent = 'Both fields are required.';
		return;
	}

	const data = { name, url };
	if (description) data.description = description;

	try {
		const res = await fetch('/api/widgets', {
			method: 'POST',
			credentials: 'include',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});
		if (!res.ok) {
			const j = await res.json().catch(() => ({}));
			throw new Error(j.error || 'Failed to save');
		}
		widgetForm.reset();
		createFormSection.classList.add('hidden');
		await loadWidgets();
	} catch (err) {
		formError.textContent = err.message || 'Failed to save';
	}
});

async function loadWidgets() {
	widgetsEl.innerHTML = 'Loading...';
	const res = await fetch('/api/widgets', { credentials: 'include' });
	if (!res.ok) {
		if (res.status === 401) {
			window.location.replace('/index.html');
			return;
		}
		widgetsEl.textContent = 'Failed to load widgets.';
		return;
	}
	const { widgets } = await res.json();
	widgetsEl.innerHTML = '';
	if (!widgets || widgets.length === 0) {
		widgetsEl.innerHTML = '<p class="muted">No widgets yet. Click Create to add one.</p>';
		return;
	}
	for (const w of widgets) {
		const card = document.createElement('div');
		card.className = 'widget';
		card.dataset.id = w._id;
		const description = w.description ? String(w.description).trim() : '';
		card.innerHTML = `
			<div class="row">
				<h3>${escapeHtml(w.name)}</h3>
				<div class="row-actions">
					<a class="btn primary" href="${encodeURI(w.url)}" target="_blank" rel="noopener">Go</a>
					<button class="btn danger btn-delete" type="button" aria-label="Delete ${escapeHtml(w.name)}">Delete</button>
				</div>
			</div>
			${description ? `<div class="description">${escapeHtml(description)}</div>` : ''}
			<div class="url">${escapeHtml(w.url)}</div>
		`;
		card.querySelector('.btn-delete').addEventListener('click', () => handleDelete(w._id, w.name, w.url));
		widgetsEl.appendChild(card);
	}
}

function escapeHtml(str) {
	return String(str)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

async function handleDelete(id, name, url) {
	if (!confirm(`Delete "${name}"?`)) return;
	const res = await fetch(`/api/widgets/${encodeURIComponent(id)}`, {
		method: 'DELETE',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ name, url })
	});
	if (!res.ok) {
		const j = await res.json().catch(() => ({}));
		alert(j.error || 'Failed to delete');
		return;
	}
	await loadWidgets();
}

loadWidgets();
