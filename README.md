# Clash Rule Manager

高效管理 Clash 规则分组并自动同步至 GitHub 的浏览器扩展。

## 功能特性

✨ **规则分组管理**
- 创建和管理多个 Clash 规则分组
- 快速切换当前网站的归属分组
- 支持自定义分组名称和文件名

🔄 **自动 GitHub 同步**
- 规则变更实时同步到 GitHub Repository
- 支持自定义同步路径
- 安全的 Token 认证

🌐 **智能域名识别**
- 自动识别当前网页的根域名
- 支持多级域名和特殊后缀识别（如 .com.cn、.github.io）
- 智能 IP 地址识别

## 安装指南

### 开发者模式安装

1. 打开 Chrome 浏览器，访问 `chrome://extensions/`
2. 启用右上角的"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择本项目文件夹

### 前置要求

- Chrome 浏览器（版本 88+）
- GitHub 账户和 Personal Access Token
- 用于同步规则的 GitHub Repository

## 使用方法

### 初始配置

1. **打开扩展选项页面**
   - 点击扩展图标，选择"选项"
   - 或右键扩展 → 选项

2. **配置 GitHub 信息**
   - 输入 GitHub Personal Access Token
   - 指定目标 Repository 所有者
   - 指定 Repository 名称
   - （可选）输入同步路径前缀

3. **创建规则分组**
   - 添加新的规则分组
   - 设置分组名称和对应的 YAML 文件名
   - 保存配置

### 日常使用

1. 在浏览器中访问任何网站
2. 点击 Clash Rule Manager 扩展图标
3. 即时查看当前网站的根域名
4. 点击"切换"按钮添加或移除该域名至所选规则分组
5. 规则自动同步到 GitHub

## 项目结构

```
clash-rule-manager/
├── manifest.json       # 扩展配置文件
├── background.js       # 后台脚本（处理同步逻辑）
├── popup.html          # 扩展弹窗页面
├── popup.js            # 弹窗逻辑
├── popup.css           # 弹窗样式
├── options.html        # 选项页面
├── options.js          # 选项页面逻辑
├── options.css         # 选项页面样式
├── index.umd.min.js    # 第三方库（tldts - 域名解析）
└── icons/              # 扩展图标资源
    ├── icon48.png
    └── icon128.png
```

## 核心功能说明

### Background Service Worker
- 监听消息请求，处理域名添加/移除操作
- 与 GitHub API 通信进行文件同步
- Base64 编码 YAML 内容并提交更新

### Popup 弹窗
- 显示当前网页的根域名
- 列出所有配置的规则分组
- 快速切换域名所属分组

### Options 选项页
- GitHub 账户信息配置
- 规则分组的创建和管理
- 配置信息的持久化存储

## 权限说明

- **storage**: 本地数据存储（规则分组和 GitHub 配置）
- **tabs**: 获取当前活动标签页信息（用于识别域名）
- **activeTab**: 访问活动标签页
- **clipboardWrite**: 支持复制到剪贴板
- **https://api.github.com/***: 调用 GitHub API 进行文件同步

## 配置示例

### Clash 规则文件格式

扩展生成的 YAML 文件格式如下：

```yaml
payload:
  - '+.example.com'
  - '+.example.org'
  - '+.test.com'
```

### GitHub 配置

需要创建 GitHub Personal Access Token：
1. 访问 https://github.com/settings/tokens
2. 创建新的 Token
3. 选择 `repo` 或 `public_repo` 权限范围
4. 在扩展选项页填入 Token

## 常见问题

**Q: 为什么同步失败？**
- 检查 GitHub Token 是否有效
- 确认 Repository 名称和所有者正确
- 验证 Token 有写入权限

**Q: 支持哪些域名格式？**
- 标准域名（example.com）
- 子域名（sub.example.com）
- 多级后缀（example.com.cn）
- IP 地址（自动识别）

**Q: 如何更新已有的规则？**
- 在相同分组中添加新域名会自动更新
- 移除域名需要在选项页面手动操作

## 版本历史

- **v1.4.0** - 当前版本
  - 支持规则分组管理
  - GitHub 自动同步功能
  - 智能域名识别

## 技术栈

- **Manifest V3**: 最新的 Chrome 扩展标准
- **tldts**: 域名解析库，用于准确识别根域名
- **Chrome Storage API**: 本地数据存储
- **GitHub API**: 文件同步

## 开发建议

### 调试技巧

1. 打开 `chrome://extensions/` 查看扩展状态
2. 点击扩展卡片上的"检查背景页面"调试 Service Worker
3. 右键弹窗 → 检查，调试弹窗脚本
4. 浏览器控制台查看详细错误信息

### 本地测试

```bash
# 修改文件后，点击扩展卡片上的刷新按钮
# 或使用 F5 刷新浏览器标签页测试功能
```
