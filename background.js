const STORAGE_KEY = 'clashRuleSettings';

chrome.runtime.onMessage.addListener((req, _, sendResponse) => {
  if (req.type === 'TOGGLE_AND_SYNC') {
    handleToggleAndSync(req.domain, req.groupId)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function handleToggleAndSync(domain, groupId) {
  const { [STORAGE_KEY]: settings } = await chrome.storage.local.get(STORAGE_KEY);
  if (!settings) throw new Error('未找到配置信息');

  const group = settings.ruleGroups.find(g => g.id === groupId);
  if (!group) throw new Error('未找到对应的规则分组');

  const domains = group.domains ||= [];
  const idx = domains.indexOf(domain);
  idx === -1 ? domains.push(domain) : domains.splice(idx, 1);

  const { github } = settings;
  if (!github?.token || !github?.owner || !github?.repo) {
    await chrome.storage.local.set({ [STORAGE_KEY]: settings });
    throw new Error('GitHub 配置不完整');
  }

  const headers = { Authorization: `token ${github.token}` };
  const pathPrefix = github.path ? github.path.replace(/\/?$/, '/') : '';
  const apiUrl = `https://api.github.com/repos/${github.owner}/${github.repo}/contents/${pathPrefix}${group.fileName}`;
  const yamlContent = `payload:\n${domains.length ? domains.sort().map(d => `  - '+.${d}'`).join('\n') : '  # empty'}`;

  let sha;
  try {
    const res = await fetch(apiUrl, { headers });
    if (res.ok) sha = (await res.json()).sha;
  } catch {}

  const putRes = await fetch(apiUrl, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `Update ${group.fileName} via Extension`,
      content: btoa(unescape(encodeURIComponent(yamlContent))),
      sha
    })
  });
  if (!putRes.ok) throw new Error('GitHub API 同步失败');

  const now = new Date();
  group.lastSync = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
  await chrome.storage.local.set({ [STORAGE_KEY]: settings });
}