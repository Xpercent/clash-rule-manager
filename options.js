const STORAGE_KEY = 'clashRuleSettings';
const $ = id => document.getElementById(id);
const DOMAIN_RE = /-\s*'\+\.([^']+)'/g;

const loadSettings = async () =>
  (await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY] || { ruleGroups: [], github: {} };

const getNowTime = () => {
  const n = new Date();
  return `${n.getMonth() + 1}/${n.getDate()} ${n.getHours()}:${String(n.getMinutes()).padStart(2, '0')}`;
};

const getGithubInputs = () => ({
  token: $('gh-token').value.trim(),
  owner: $('gh-owner').value.trim(),
  repo:  $('gh-repo').value.trim(),
  path:  $('gh-path').value.trim()
});

document.addEventListener('DOMContentLoaded', async () => {
  initUI(await loadSettings());
  $('add-group-button').onclick = () =>
    addGroupRow({ id: Date.now().toString(36), displayName: '', fileName: '', domains: [], lastSync: '从未同步' });
  $('save-button').onclick = saveAllConfigs;
  $('pull-all-groups').onclick = handlePullAll;
});

async function pullFromGithub(github, fileName) {
  const pathPrefix = github.path ? github.path.replace(/\/?$/, '/') : '';
  const apiUrl = `https://api.github.com/repos/${github.owner}/${github.repo}/contents/${pathPrefix}${fileName}`;
  try {
    const res = await fetch(apiUrl, { headers: { Authorization: `token ${github.token}` } });
    if (!res.ok) throw new Error(`文件 ${fileName} 不存在`);
    const raw = decodeURIComponent(escape(atob((await res.json()).content.replace(/\s/g, ''))));
    return { success: true, domains: [...raw.matchAll(DOMAIN_RE)].map(m => m[1]) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function handlePullAll() {
  const github = getGithubInputs();
  if (!github.token || !github.owner || !github.repo) return alert('请先填写 GitHub 基础配置');

  const btn = $('pull-all-groups');
  const originalText = btn.textContent;
  btn.disabled = true;

  try {
    github.path = github.path.replace(/^\/|\/$/g, '');
    btn.textContent = '🔍 正在获取文件列表...';

    const res = await fetch(
      `https://api.github.com/repos/${github.owner}/${github.repo}/contents/${github.path}`,
      { headers: { Authorization: `token ${github.token}` } }
    );
    if (!res.ok) throw new Error('无法读取目录，请检查路径和权限');

    const yamlFiles = (await res.json()).filter(f => f.type === 'file' && f.name.endsWith('.yaml'));
    if (!yamlFiles.length) return alert('该目录下未找到 .yaml 文件');

    const settings = await loadSettings();
    let successCount = 0;

    for (let i = 0; i < yamlFiles.length; i++) {
      const file = yamlFiles[i];
      btn.textContent = `📥 同步 (${i + 1}/${yamlFiles.length}): ${file.name}`;

      let group = settings.ruleGroups.find(g => g.fileName === file.name);
      if (!group) {
        group = { id: Math.random().toString(36).slice(2), displayName: file.name.replace('.yaml', ''), fileName: file.name, domains: [], lastSync: '从未同步' };
        settings.ruleGroups.push(group);
      }

      const result = await pullFromGithub(github, file.name);
      if (result.success) {
        group.domains = result.domains;
        group.lastSync = getNowTime();
        successCount++;
      }
    }

    await chrome.storage.local.set({ [STORAGE_KEY]: settings });
    initUI(settings);
    alert(`扫描完成！成功拉取并同步了 ${successCount} 个规则文件。`);
  } catch (e) {
    alert('错误: ' + e.message);
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

function initUI(settings) {
  const gh = settings.github || {};
  $('gh-token').value = gh.token || '';
  $('gh-owner').value = gh.owner || '';
  $('gh-repo').value  = gh.repo  || '';
  $('gh-path').value  = gh.path  || '';

  const container = $('groups-container');
  container.innerHTML = '';
  (settings.ruleGroups || []).forEach(g => addGroupRow(g));
}

function addGroupRow(group) {
  const card = $('group-card-template').content.cloneNode(true).querySelector('.group-card');
  card.dataset.id = group.id;
  card.querySelector('.display-name-input').value = group.displayName || '';
  card.querySelector('.file-name-input').value = group.fileName || '';

  const timeSpan = card.querySelector('.last-sync-time');
  const badge = card.querySelector('.sync-badge');
  const lastSync = group.lastSync || '从未同步';
  const isSynced = lastSync !== '从未同步';

  timeSpan.textContent = lastSync;
  badge.classList.toggle('synced', isSynced);
  badge.classList.toggle('unsynced', !isSynced);

  card.querySelector('.btn-delete').onclick = () => card.remove();

  const pullBtn = card.querySelector('.btn-pull');
  pullBtn.onclick = async () => {
    const github = getGithubInputs();
    const fileName = card.querySelector('.file-name-input').value.trim();
    if (!github.token || !fileName) return alert('请先配置 GitHub 信息并填写文件名');

    pullBtn.disabled = true;
    pullBtn.textContent = '同步中...';

    const result = await pullFromGithub(github, fileName);
    if (result.success) {
      const timeStr = getNowTime();
      await updateSingleGroupData(group.id, result.domains, timeStr);
      timeSpan.textContent = timeStr;
      badge.classList.toggle('synced', true);
      badge.classList.toggle('unsynced', false);
    } else {
      alert('同步失败: ' + result.error);
    }
    pullBtn.disabled = false;
    pullBtn.textContent = '同步 Sync';
  };

  $('groups-container').appendChild(card);
}

async function updateSingleGroupData(id, domains, timeStr) {
  const settings = await loadSettings();
  const group = settings.ruleGroups.find(g => g.id === id);
  if (group) {
    Object.assign(group, { domains, lastSync: timeStr });
    await chrome.storage.local.set({ [STORAGE_KEY]: settings });
  }
}

async function saveAllConfigs() {
  const settings = await loadSettings();
  const newSettings = {
    github: getGithubInputs(),
    ruleGroups: [...document.querySelectorAll('.group-card')].map(card => {
      const id = card.dataset.id;
      const old = settings.ruleGroups?.find(g => g.id === id);
      return {
        id,
        displayName: card.querySelector('.display-name-input').value.trim(),
        fileName: card.querySelector('.file-name-input').value.trim(),
        domains: old?.domains || [],
        lastSync: card.querySelector('.last-sync-time').textContent
      };
    })
  };

  await chrome.storage.local.set({ [STORAGE_KEY]: newSettings });
  const status = $('save-status');
  status.textContent = '✅ 配置已保存';
  status.style.color = '#10b981';
  setTimeout(() => status.textContent = '', 2000);
}