const STORAGE_KEY = 'clashRuleSettings';

function getRootDomain(hostname) {
  try {
    // tldts 会自动识别 IP 地址、多级后缀（.com.cn）以及特殊后缀（.github.io）
    // 如果解析失败，它会返回 null，此时我们回退到原始 hostname
    return tldts.getDomain(hostname) || hostname;
  } catch (e) {
    console.error('域名解析出错:', e);
    return hostname;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const $ = id => document.getElementById(id);

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let domain = null;
  
  try {
    if (tab?.url) {
      const urlObj = new URL(tab.url);
      // 只对 http 和 https 协议进行解析
      if (urlObj.protocol.startsWith('http')) {
        domain = getRootDomain(urlObj.hostname);
      }
    }
  } catch (e) {
    console.error('获取当前标签页信息失败:', e);
  }

  $('open-options-button').onclick = () =>
    chrome.runtime.openOptionsPage?.() || window.open(chrome.runtime.getURL('options.html'));

  if (!domain) {
    $('current-domain').textContent = '无法识别域名';
    $('status-text').textContent = '请在正常网页中使用此扩展。';
    return;
  }

  $('current-domain').textContent = domain;

  const settings = (await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY] || { ruleGroups: [] };

  if (!settings.ruleGroups?.length) {
    $('status-text').textContent = '📌 尚未配置规则分组';
    $('no-groups-hint').style.display = 'block';
    return;
  }

  renderButtons(domain, settings, $('status-text'), $('rule-buttons'), $('sync-status'));
});

// renderButtons 函数保持不变，它只负责 UI 逻辑
function renderButtons(domain, settings, statusEl, container, syncEl) {
  container.innerHTML = '';
  const groups = settings.ruleGroups || [];
  const active = groups.filter(g => g.domains?.includes(domain));

  statusEl.textContent = active.length
    ? '✅ 已添加到：' + active.map(g => g.displayName).join(', ')
    : '📌 当前域名不在任何规则中';

  for (const group of groups) {
    const inGroup = group.domains?.includes(domain);
    const btn = document.createElement('button');
    btn.textContent = inGroup ? `从 ${group.displayName} 删除` : `添加到 ${group.displayName}`;
    btn.className = inGroup ? 'primary-button-remove' : 'primary-button-add';

    btn.onclick = () => {
      container.querySelectorAll('button').forEach(b => b.disabled = true);
      syncEl.textContent = '同步指令已发出，正在后台处理...';
      syncEl.style.color = '#6b7280';

      chrome.runtime.sendMessage({ type: 'TOGGLE_AND_SYNC', domain, groupId: group.id }, async res => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            return;
        }
        if (res?.success) {
          syncEl.textContent = '🚀 同步成功';
          syncEl.style.color = '#10b981';
          const updated = (await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY];
          renderButtons(domain, updated, statusEl, container, syncEl);
        } else {
          syncEl.textContent = '❌ 同步失败: ' + (res?.error || '未知错误');
          syncEl.style.color = '#ef4444';
          container.querySelectorAll('button').forEach(b => b.disabled = false);
        }
      });
    };
    container.appendChild(btn);
  }
}