/**
 * Cloudflare Worker 用于管理和提供 MCP 配置
 */

// 初始 MCP 数据结构
let mcpData = {
  data: []
};

// 从请求中获取 JSON 数据
async function getJSONData(request) {
  try {
    return await request.json();
  } catch (e) {
    return null;
  }
}

// 生成 HTML 界面
function generateHTML() {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MCP 配置管理</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 {
      text-align: center;
      margin-bottom: 30px;
    }
    .mcp-list {
      margin-bottom: 30px;
      border: 1px solid #ddd;
      border-radius: 5px;
      padding: 15px;
    }
    .mcp-item {
      background-color: #f9f9f9;
      border: 1px solid #eee;
      border-radius: 5px;
      padding: 15px;
      margin-bottom: 15px;
      position: relative;
    }
    .mcp-item button.delete {
      position: absolute;
      top: 10px;
      right: 10px;
      background-color: #ff4d4d;
      color: white;
      border: none;
      border-radius: 3px;
      padding: 5px 10px;
      cursor: pointer;
    }
    .add-form {
      background-color: #f0f8ff;
      border: 1px solid #ddd;
      border-radius: 5px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .form-group {
      margin-bottom: 15px;
    }
    label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }
    input, textarea, select {
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-sizing: border-box;
    }
    button {
      background-color: #4CAF50;
      color: white;
      padding: 10px 15px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
    }
    button:hover {
      background-color: #45a049;
    }
    .actions {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
    }
    .json-display {
      background-color: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 5px;
      padding: 15px;
      margin-top: 20px;
      overflow: auto;
    }
    pre {
      margin: 0;
      white-space: pre-wrap;
    }
    #notification {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px;
      background-color: #4CAF50;
      color: white;
      border-radius: 5px;
      display: none;
      z-index: 1000;
    }
    .config-schema {
      margin-top: 15px;
      padding: 10px;
      border: 1px dashed #ccc;
      background-color: #f9f9f9;
    }
    .config-schema-item {
      margin-bottom: 10px;
      padding: 8px;
      border: 1px solid #eee;
      border-radius: 4px;
    }
    .config-prop-actions {
      text-align: right;
      margin-top: 5px;
    }
    .config-prop-actions button {
      padding: 3px 8px;
      font-size: 12px;
      margin-left: 5px;
    }
    .add-config-prop {
      margin-top: 10px;
    }
    .toggle-section {
      cursor: pointer;
      user-select: none;
    }
    .toggle-section:after {
      content: " ▼";
      font-size: 0.8em;
    }
    .toggle-section.collapsed:after {
      content: " ►";
    }
    .collapsible {
      overflow: hidden;
      transition: max-height 0.3s ease;
    }
    .collapsible.collapsed {
      max-height: 0;
    }
    .argsMapping-section {
      margin-top: 15px;
      padding: 10px;
      border: 1px dashed #ccc;
      background-color: #f9f9f9;
    }
    .args-mapping-item {
      margin-bottom: 10px;
      padding: 8px;
      border: 1px solid #eee;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div id="notification"></div>
  <h1>MCP 配置管理</h1>
  
  <div class="add-form">
    <h2>添加新 MCP</h2>
    <form id="add-mcp-form">
      <div class="form-group">
        <label for="id">ID</label>
        <input type="text" id="id" name="id" required>
      </div>
      <div class="form-group">
        <label for="name">名称</label>
        <input type="text" id="name" name="name" required>
      </div>
      <div class="form-group">
        <label for="description">描述</label>
        <textarea id="description" name="description" rows="3" required></textarea>
      </div>
      <div class="form-group">
        <label for="tags">标签 (逗号分隔)</label>
        <input type="text" id="tags" name="tags">
      </div>
      <div class="form-group">
        <label for="repo">仓库 URL</label>
        <input type="text" id="repo" name="repo" required>
      </div>
      <div class="form-group">
        <label for="command">命令</label>
        <input type="text" id="command" name="command" required>
      </div>
      <div class="form-group">
        <label for="baseArgs">基础参数 (JSON 数组)</label>
        <input type="text" id="baseArgs" name="baseArgs" value="[]">
      </div>
      <div class="form-group">
        <label for="configurable">可配置</label>
        <select id="configurable" name="configurable">
          <option value="true">是</option>
          <option value="false">否</option>
        </select>
      </div>
      
      <!-- configSchema 配置区域 -->
      <div id="configSchema-container" class="form-group">
        <h3 class="toggle-section" data-target="configSchema-editor">配置模式 (configSchema)</h3>
        <div id="configSchema-editor" class="collapsible">
          <div class="config-schema">
            <div id="config-properties"></div>
            <div class="add-config-prop">
              <button type="button" id="add-config-prop">添加配置属性</button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- argsMapping 配置区域 -->
      <div id="argsMapping-container" class="form-group">
        <h3 class="toggle-section" data-target="argsMapping-editor">参数映射 (argsMapping)</h3>
        <div id="argsMapping-editor" class="collapsible">
          <div class="argsMapping-section">
            <div id="args-mappings"></div>
            <div class="add-config-prop">
              <button type="button" id="add-args-mapping">添加参数映射</button>
            </div>
          </div>
        </div>
      </div>
      
      <button type="submit">添加 MCP</button>
    </form>
  </div>

  <div class="mcp-list">
    <h2>当前 MCP 列表</h2>
    <div id="mcp-items"></div>
  </div>

  <div class="actions">
    <button id="download-json">下载 mcp.json</button>
    <button id="refresh-list">刷新列表</button>
  </div>

  <div class="json-display">
    <h3>当前 JSON:</h3>
    <pre id="json-content"></pre>
  </div>

  <script>
    // 初始化加载 MCP 数据
    async function loadMCPs() {
      try {
        const response = await fetch('/api/mcp');
        const data = await response.json();
        displayMCPs(data);
        updateJSONDisplay(data);
      } catch (error) {
        showNotification('加载 MCP 数据失败', 'error');
      }
    }

    // 显示 MCP 列表
    function displayMCPs(data) {
      const container = document.getElementById('mcp-items');
      container.innerHTML = '';
      
      if (!data.data || data.data.length === 0) {
        container.innerHTML = '<p>暂无 MCP 数据</p>';
        return;
      }
      
      data.data.forEach((mcp, index) => {
        const mcpElement = document.createElement('div');
        mcpElement.className = 'mcp-item';
        
        let configSchemaDisplay = '';
        if (mcp.configSchema && mcp.configSchema.properties) {
          configSchemaDisplay = '<p><strong>配置模式:</strong></p><ul>';
          for (const prop in mcp.configSchema.properties) {
            const property = mcp.configSchema.properties[prop];
            configSchemaDisplay += \`<li>\${prop}: \${property.type} (\${property.required ? '必填' : '可选'}) - \${property.description || '无描述'}</li>\`;
          }
          configSchemaDisplay += '</ul>';
        }
        
        let argsMappingDisplay = '';
        if (mcp.argsMapping) {
          argsMappingDisplay = '<p><strong>参数映射:</strong></p><ul>';
          for (const key in mcp.argsMapping) {
            const mapping = mcp.argsMapping[key];
            argsMappingDisplay += \`<li>\${key}: 类型: \${mapping.type}</li>\`;
          }
          argsMappingDisplay += '</ul>';
        }
        
        mcpElement.innerHTML = \`
          <h3>\${mcp.name} <small>(\${mcp.id})</small></h3>
          <p>\${mcp.description}</p>
          <p><strong>标签:</strong> \${Array.isArray(mcp.tags) ? mcp.tags.join(', ') : '无'}</p>
          <p><strong>仓库:</strong> <a href="\${mcp.repo}" target="_blank">\${mcp.repo}</a></p>
          <p><strong>命令:</strong> \${mcp.command}</p>
          <p><strong>基础参数:</strong> \${JSON.stringify(mcp.baseArgs)}</p>
          <p><strong>可配置:</strong> \${mcp.configurable ? '是' : '否'}</p>
          \${configSchemaDisplay}
          \${argsMappingDisplay}
          <button class="delete" data-index="\${index}">删除</button>
        \`;
        container.appendChild(mcpElement);
      });
      
      // 添加删除事件监听
      document.querySelectorAll('.delete').forEach(button => {
        button.addEventListener('click', async () => {
          const index = button.getAttribute('data-index');
          await deleteMCP(index);
        });
      });
    }

    // 添加新 MCP
    async function addMCP(mcp) {
      try {
        const response = await fetch('/api/mcp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mcp),
        });
        
        if (!response.ok) {
          throw new Error('添加 MCP 失败');
        }
        
        const data = await response.json();
        displayMCPs(data);
        updateJSONDisplay(data);
        showNotification('MCP 添加成功');
        
        // 重置表单
        document.getElementById('add-mcp-form').reset();
        document.getElementById('config-properties').innerHTML = '';
        document.getElementById('args-mappings').innerHTML = '';
      } catch (error) {
        showNotification('添加失败: ' + error.message, 'error');
      }
    }

    // 删除 MCP
    async function deleteMCP(index) {
      try {
        const response = await fetch(\`/api/mcp/\${index}\`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          throw new Error('删除 MCP 失败');
        }
        
        const data = await response.json();
        displayMCPs(data);
        updateJSONDisplay(data);
        showNotification('MCP 删除成功');
      } catch (error) {
        showNotification('删除失败: ' + error.message, 'error');
      }
    }

    // 更新 JSON 显示
    function updateJSONDisplay(data) {
      document.getElementById('json-content').textContent = JSON.stringify(data, null, 2);
    }

    // 显示通知
    function showNotification(message, type = 'success') {
      const notification = document.getElementById('notification');
      notification.textContent = message;
      notification.style.backgroundColor = type === 'success' ? '#4CAF50' : '#ff4d4d';
      notification.style.display = 'block';
      
      setTimeout(() => {
        notification.style.display = 'none';
      }, 3000);
    }

    // 下载 JSON 文件
    function downloadJSON(data) {
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mcp.json';
      a.click();
      URL.revokeObjectURL(url);
    }
    
    // 添加配置属性
    function addConfigProperty() {
      const container = document.getElementById('config-properties');
      const propId = Date.now(); // 使用时间戳作为唯一ID
      
      const propElement = document.createElement('div');
      propElement.className = 'config-schema-item';
      propElement.dataset.propId = propId;
      
      propElement.innerHTML = \`
        <div class="form-group">
          <label>属性名称</label>
          <input type="text" class="prop-name" required>
        </div>
        <div class="form-group">
          <label>数据类型</label>
          <select class="prop-type">
            <option value="string">字符串</option>
            <option value="number">数字</option>
            <option value="boolean">布尔值</option>
            <option value="array">数组</option>
            <option value="object">对象</option>
          </select>
        </div>
        <div class="form-group">
          <label>描述</label>
          <input type="text" class="prop-description">
        </div>
        <div class="form-group">
          <label>是否必填</label>
          <select class="prop-required">
            <option value="true">是</option>
            <option value="false">否</option>
          </select>
        </div>
        <div class="config-prop-actions">
          <button type="button" class="delete-prop" data-prop-id="\${propId}">删除</button>
        </div>
      \`;
      
      container.appendChild(propElement);
      
      // 添加删除属性事件监听
      propElement.querySelector('.delete-prop').addEventListener('click', function() {
        const propId = this.dataset.propId;
        document.querySelector(\`.config-schema-item[data-prop-id="\${propId}"]\`).remove();
      });
    }
    
    // 添加参数映射
    function addArgsMapping() {
      const container = document.getElementById('args-mappings');
      const mappingId = Date.now(); // 使用时间戳作为唯一ID
      
      const mappingElement = document.createElement('div');
      mappingElement.className = 'args-mapping-item';
      mappingElement.dataset.mappingId = mappingId;
      
      mappingElement.innerHTML = \`
        <div class="form-group">
          <label>参数名称</label>
          <input type="text" class="mapping-key" required>
        </div>
        <div class="form-group">
          <label>映射类型</label>
          <select class="mapping-type">
            <option value="env">环境变量</option>
            <option value="flag">标志</option>
            <option value="param">参数</option>
            <option value="spread">展开</option>
          </select>
        </div>
        <div class="form-group mapping-detail env-detail">
          <label>环境变量名</label>
          <input type="text" class="mapping-env-key">
        </div>
        <div class="form-group mapping-detail flag-detail" style="display:none">
          <label>标志名</label>
          <input type="text" class="mapping-flag">
        </div>
        <div class="form-group mapping-detail flag-detail" style="display:none">
          <label>条件</label>
          <select class="mapping-flag-condition">
            <option value="true">为真时</option>
            <option value="false">为假时</option>
          </select>
        </div>
        <div class="form-group mapping-detail param-detail" style="display:none">
          <label>参数名</label>
          <input type="text" class="mapping-param">
        </div>
        <div class="form-group mapping-detail position-detail">
          <label>位置</label>
          <input type="number" class="mapping-position" min="0">
        </div>
        <div class="config-prop-actions">
          <button type="button" class="delete-mapping" data-mapping-id="\${mappingId}">删除</button>
        </div>
      \`;
      
      container.appendChild(mappingElement);
      
      // 添加删除映射事件监听
      mappingElement.querySelector('.delete-mapping').addEventListener('click', function() {
        const mappingId = this.dataset.mappingId;
        document.querySelector(\`.args-mapping-item[data-mapping-id="\${mappingId}"]\`).remove();
      });
      
      // 添加映射类型切换事件
      const typeSelect = mappingElement.querySelector('.mapping-type');
      typeSelect.addEventListener('change', function() {
        const type = this.value;
        
        // 隐藏所有详情区域
        mappingElement.querySelectorAll('.mapping-detail').forEach(el => {
          el.style.display = 'none';
        });
        
        // 显示相应的详情区域
        if (type === 'env') {
          mappingElement.querySelector('.env-detail').style.display = 'block';
          mappingElement.querySelector('.position-detail').style.display = 'block';
        } else if (type === 'flag') {
          mappingElement.querySelectorAll('.flag-detail').forEach(el => {
            el.style.display = 'block';
          });
          mappingElement.querySelector('.position-detail').style.display = 'block';
        } else if (type === 'param') {
          mappingElement.querySelector('.param-detail').style.display = 'block';
          mappingElement.querySelector('.position-detail').style.display = 'block';
        } else if (type === 'spread') {
          mappingElement.querySelector('.position-detail').style.display = 'block';
        }
      });
    }
    
    // 收集配置模式数据
    function collectConfigSchema() {
      const properties = {};
      const required = [];
      
      document.querySelectorAll('.config-schema-item').forEach(item => {
        const name = item.querySelector('.prop-name').value.trim();
        if (!name) return;
        
        const type = item.querySelector('.prop-type').value;
        const description = item.querySelector('.prop-description').value.trim();
        const isRequired = item.querySelector('.prop-required').value === 'true';
        
        properties[name] = {
          type: type,
          description: description
        };
        
        if (isRequired) {
          required.push(name);
        }
      });
      
      if (Object.keys(properties).length === 0) {
        return null;
      }
      
      return {
        properties: properties,
        required: required.length > 0 ? required : undefined
      };
    }
    
    // 收集参数映射数据
    function collectArgsMapping() {
      const mapping = {};
      
      document.querySelectorAll('.args-mapping-item').forEach(item => {
        const key = item.querySelector('.mapping-key').value.trim();
        if (!key) return;
        
        const type = item.querySelector('.mapping-type').value;
        const result = { type: type };
        
        if (type === 'env') {
          result.key = item.querySelector('.mapping-env-key').value.trim();
        } else if (type === 'flag') {
          result.flag = item.querySelector('.mapping-flag').value.trim();
          result.condition = item.querySelector('.mapping-flag-condition').value === 'true';
        } else if (type === 'param') {
          result.param = item.querySelector('.mapping-param').value.trim();
        }
        
        const position = parseInt(item.querySelector('.mapping-position').value);
        if (!isNaN(position)) {
          result.position = position;
        }
        
        mapping[key] = result;
      });
      
      if (Object.keys(mapping).length === 0) {
        return null;
      }
      
      return mapping;
    }

    // 事件监听
    document.addEventListener('DOMContentLoaded', () => {
      // 加载初始数据
      loadMCPs();
      
      // 添加配置属性按钮
      document.getElementById('add-config-prop').addEventListener('click', addConfigProperty);
      
      // 添加参数映射按钮
      document.getElementById('add-args-mapping').addEventListener('click', addArgsMapping);
      
      // 处理折叠面板
      document.querySelectorAll('.toggle-section').forEach(toggle => {
        toggle.addEventListener('click', function() {
          const targetId = this.dataset.target;
          const target = document.getElementById(targetId);
          
          this.classList.toggle('collapsed');
          target.classList.toggle('collapsed');
        });
      });
      
      // 添加 MCP 表单提交
      document.getElementById('add-mcp-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        // 收集基本信息
        const mcp = {
          id: formData.get('id'),
          name: formData.get('name'),
          description: formData.get('description'),
          tags: formData.get('tags').split(',').map(tag => tag.trim()).filter(tag => tag),
          repo: formData.get('repo'),
          command: formData.get('command'),
          baseArgs: JSON.parse(formData.get('baseArgs') || '[]'),
          configurable: formData.get('configurable') === 'true'
        };
        
        // 收集配置模式
        const configSchema = collectConfigSchema();
        if (configSchema) {
          mcp.configSchema = configSchema;
        }
        
        // 收集参数映射
        const argsMapping = collectArgsMapping();
        if (argsMapping) {
          mcp.argsMapping = argsMapping;
        }
        
        addMCP(mcp);
      });
      
      // 下载 JSON
      document.getElementById('download-json').addEventListener('click', async () => {
        try {
          const response = await fetch('/api/mcp');
          const data = await response.json();
          downloadJSON(data);
        } catch (error) {
          showNotification('下载失败', 'error');
        }
      });
      
      // 刷新列表
      document.getElementById('refresh-list').addEventListener('click', () => {
        loadMCPs();
      });
    });
  </script>
</body>
</html>
  `;
}

// 处理请求
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // API 端点
  if (path.startsWith('/api/mcp')) {
    // 获取所有 MCP
    if (path === '/api/mcp' && request.method === 'GET') {
      return new Response(JSON.stringify(mcpData), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 添加新 MCP
    if (path === '/api/mcp' && request.method === 'POST') {
      const newMcp = await getJSONData(request);
      
      if (!newMcp) {
        return new Response(JSON.stringify({ error: '无效的 JSON 数据' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      mcpData.data.push(newMcp);
      return new Response(JSON.stringify(mcpData), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 删除 MCP
    const deleteMatch = path.match(/^\/api\/mcp\/(\d+)$/);
    if (deleteMatch && request.method === 'DELETE') {
      const index = parseInt(deleteMatch[1]);
      
      if (index >= 0 && index < mcpData.data.length) {
        mcpData.data.splice(index, 1);
        return new Response(JSON.stringify(mcpData), {
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        return new Response(JSON.stringify({ error: '索引超出范围' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // 导入 MCP 数据
    if (path === '/api/mcp/import' && request.method === 'POST') {
      const importData = await getJSONData(request);
      
      if (!importData || !importData.data || !Array.isArray(importData.data)) {
        return new Response(JSON.stringify({ error: '无效的 MCP 数据格式' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      mcpData = importData;
      return new Response(JSON.stringify(mcpData), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ error: '无效的 API 请求' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 管理界面
  if (path === '/' || path === '/index.html') {
    return new Response(generateHTML(), {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' }
    });
  }
  
  // 404 页面
  return new Response('Not Found', { status: 404 });
}

// Worker 入口点
export default {
  async fetch(request, env, ctx) {
    return await handleRequest(request, env);
  }
}; 