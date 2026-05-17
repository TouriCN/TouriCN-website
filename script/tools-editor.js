// 全局变量
let editor;
let files = JSON.parse(localStorage.getItem('tourtides_files')) || {};
let currentFile = null;
let renameOldName = null;
let settings = JSON.parse(localStorage.getItem('tourtides_settings')) || {
    fontSize: 16,
    wordWrap: false,
    autoSave: true,
    autoCloseBrackets: true,
    showLineNumbers: true,
    highlightCurrentLine: true
};

const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const container = document.getElementById('container');

// 设置容器高度
function setContainerHeight() {
    const navHeight = 60;
    container.style.height = (window.innerHeight - navHeight) + 'px';
}

// 初始化
window.addEventListener('load', () => {
    setContainerHeight();
    overlay.style.left = sidebar.offsetWidth + 'px';
    
    if (!window.__MONACO_LOADED__) {
        window.__MONACO_LOADED__ = true;
        
        require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });
        require(['vs/editor/editor.main'], () => {
            editor = monaco.editor.create(document.getElementById('editor-container'), {
                value: '',
                language: 'plaintext',
                theme: 'vs-dark',
                automaticLayout: true,
                minimap: { enabled: false },
                fontSize: settings.fontSize,
                tabSize: 2,
                autoIndent: true,
                wordWrap: settings.wordWrap ? 'on' : 'off',
                lineNumbers: settings.showLineNumbers ? 'on' : 'off',
                renderLineHighlight: settings.highlightCurrentLine ? 'all' : 'none',
                fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace",
                fontLigatures: false
            });
            
            // 自动补全括号
            if (settings.autoCloseBrackets) {
                editor.onDidType((text) => {
                    const matching = { '(': ')', '{': '}', '[': ']', '"': '"', "'": "'" };
                    if (matching[text]) {
                        editor.trigger('keyboard', 'type', { text: matching[text] });
                        editor.trigger('keyboard', 'cursorLeft');
                    }
                });
            }
            
            // 自动保存
            if (settings.autoSave) {
                editor.onDidChangeModelContent(() => {
                    if (currentFile) {
                        setTimeout(() => {
                            files[currentFile] = editor.getValue();
                            localStorage.setItem('tourtides_files', JSON.stringify(files));
                        }, 1000);
                    }
                });
            }
            
            renderFiles();
            updateOverlay();
            setTimeout(() => editor.layout(), 300);
        });
    }
});

// 窗口大小变化
window.addEventListener('resize', () => {
    setContainerHeight();
    overlay.style.left = sidebar.offsetWidth + 'px';
});

// 屏幕旋转
window.addEventListener('orientationchange', () => {
    setTimeout(setContainerHeight, 100);
});

// 拖拽逻辑
let isDragging = false;
const resizer = document.getElementById('resizer');

resizer.addEventListener('mousedown', () => {
    isDragging = true;
    document.body.classList.add('no-select');
});

resizer.addEventListener('touchstart', (e) => {
    isDragging = true;
    document.body.classList.add('no-select');
    e.preventDefault();
}, { passive: false });

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    let newWidth = e.clientX;
    if (newWidth >= 200 && newWidth <= 600) {
        sidebar.style.width = newWidth + 'px';
        overlay.style.left = newWidth + 'px';
    }
});

document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    let newWidth = e.touches[0].clientX;
    if (newWidth >= 200 && newWidth <= 600) {
        sidebar.style.width = newWidth + 'px';
        overlay.style.left = newWidth + 'px';
    }
}, { passive: false });

document.addEventListener('mouseup', () => {
    isDragging = false;
    document.body.classList.remove('no-select');
});

document.addEventListener('touchend', () => {
    isDragging = false;
    document.body.classList.remove('no-select');
});

// 文件操作函数
function getLanguageFromFileName(name) {
    if (name.endsWith('.js')) return 'javascript';
    if (name.endsWith('.html') || name.endsWith('.htm')) return 'html';
    if (name.endsWith('.css')) return 'css';
    if (name.endsWith('.json')) return 'json';
    if (name.endsWith('.md')) return 'markdown';
    return 'plaintext';
}

function renderFiles() {
    const listEl = document.getElementById('fileList');
    listEl.innerHTML = '';
    const names = Object.keys(files);
    
    if (names.length === 0) {
        listEl.innerHTML = '<div class="empty-tip">暂无文件<br>点击 + 创建</div>';
        return;
    }
    
    names.forEach(name => {
        const div = document.createElement('div');
        div.className = 'file-item' + (name === currentFile ? ' active' : '');
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'file-name';
        nameSpan.textContent = name;
        nameSpan.onclick = () => selectFile(name);
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'file-actions';
        
        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';
        saveBtn.className = 'save-btn';
        saveBtn.onclick = (e) => { e.stopPropagation(); saveFile(name); };
        
        const dlBtn = document.createElement('button');
        dlBtn.textContent = 'DL';
        dlBtn.onclick = (e) => { e.stopPropagation(); downloadFile(name); };
        
        const renameBtn = document.createElement('button');
        renameBtn.textContent = 'ReN';
        renameBtn.className = 'rename-btn';
        renameBtn.onclick = (e) => { e.stopPropagation(); showModal('renameModal'); document.getElementById('newFileNameInput').value = name; renameOldName = name; };
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Del';
        deleteBtn.className = 'delete-btn';
        deleteBtn.onclick = (e) => { e.stopPropagation(); deleteFile(name); };
        
        actionsDiv.appendChild(saveBtn);
        actionsDiv.appendChild(dlBtn);
        actionsDiv.appendChild(renameBtn);
        actionsDiv.appendChild(deleteBtn);
        
        div.appendChild(nameSpan);
        div.appendChild(actionsDiv);
        listEl.appendChild(div);
    });
}

function selectFile(name) {
    currentFile = name;
    editor.setValue(files[name]);
    
    const model = editor.getModel();
    if (model) {
        monaco.editor.setModelLanguage(model, getLanguageFromFileName(name));
    }
    
    updateOverlay();
    renderFiles();
}

function saveFile(name) {
    if (!name) return;
    files[name] = editor.getValue();
    localStorage.setItem('tourtides_files', JSON.stringify(files));
    showMessage(`"${name}" 已保存`);
}

function downloadFile(name) {
    const content = files[name] || '';
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
}

function deleteFile(name) {
    if (!confirm(`确定要删除文件 "${name}" 吗？`)) {
        return;
    }
    
    if (currentFile === name) {
        currentFile = null;
        editor.setValue('');
        updateOverlay();
    }
    
    delete files[name];
    localStorage.setItem('tourtides_files', JSON.stringify(files));
    renderFiles();
    showMessage(`"${name}" 已删除`);
}

function confirmRename() {
    const newName = document.getElementById('newFileNameInput').value.trim();
    
    if (!newName) {
        alert('文件名不能为空');
        return;
    }
    
    if (newName === renameOldName) {
        closeModal('renameModal');
        return;
    }
    
    if (files[newName]) {
        alert('文件已存在');
        return;
    }
    
    files[newName] = files[renameOldName];
    delete files[renameOldName];
    
    if (currentFile === renameOldName) {
        currentFile = newName;
    }
    
    localStorage.setItem('tourtides_files', JSON.stringify(files));
    renderFiles();
    closeModal('renameModal');
    showMessage(`已重命名为 "${newName}"`);
}

function createFile() {
    const name = document.getElementById('fileNameInput').value.trim();
    
    if (!name) {
        alert('文件名不能为空');
        return;
    }
    
    if (files[name]) {
        alert('文件已存在');
        return;
    }
    
    // 根据后缀给个默认内容
    let defaultContent = '// Hello TourTi\n';
    if (name.endsWith('.html')) {
        defaultContent = '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n<title>Document</title>\n</head>\n<body>\n\n</body>\n</html>';
    }
    
    files[name] = defaultContent;
    localStorage.setItem('tourtides_files', JSON.stringify(files));
    closeModal('createModal');
    selectFile(name);
    renderFiles();
}

// UI 辅助函数
function showMessage(text) {
    const originalText = overlay.textContent;
    overlay.textContent = text;
    overlay.style.display = 'flex';
    setTimeout(() => {
        overlay.textContent = originalText;
        updateOverlay();
    }, 800);
}

function updateOverlay() {
    overlay.style.display = currentFile ? 'none' : 'flex';
}

function showModal(id) {
    document.getElementById(id).style.display = 'flex';
    if (id === 'settingsModal') loadSettings();
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

function loadSettings() {
    document.getElementById('settingsContent').innerHTML = `
        <div class="setting-row">
            <span class="setting-label">字体大小</span>
            <div class="setting-control">
                <input type="range" id="fontSizeSlider" min="10" max="24" value="${settings.fontSize}">
                <span class="slider-value">${settings.fontSize}px</span>
            </div>
        </div>
        <div class="setting-row">
            <span class="setting-label">自动换行</span>
            <div class="setting-control">
                <input type="checkbox" id="wordWrapCheckbox" ${settings.wordWrap ? 'checked' : ''}>
            </div>
        </div>
        <div class="setting-row">
            <span class="setting-label">自动保存</span>
            <div class="setting-control">
                <input type="checkbox" id="autoSaveCheckbox" ${settings.autoSave ? 'checked' : ''}>
            </div>
        </div>
        <div class="setting-row">
            <span class="setting-label">自动补全括号</span>
            <div class="setting-control">
                <input type="checkbox" id="autoCloseBrackets" ${settings.autoCloseBrackets ? 'checked' : ''}>
            </div>
        </div>
        <div class="setting-row">
            <span class="setting-label">显示行号</span>
            <div class="setting-control">
                <input type="checkbox" id="showLineNumbers" ${settings.showLineNumbers ? 'checked' : ''}>
            </div>
        </div>
        <div class="setting-row">
            <span class="setting-label">高亮当前行</span>
            <div class="setting-control">
                <input type="checkbox" id="highlightCurrentLine" ${settings.highlightCurrentLine ? 'checked' : ''}>
            </div>
        </div>
    `;
    
    document.getElementById('fontSizeSlider').addEventListener('input', function() {
        document.querySelector('#settingsContent .slider-value').textContent = this.value + 'px';
    });
}

function applySettings() {
    settings.fontSize = parseInt(document.getElementById('fontSizeSlider').value);
    settings.wordWrap = document.getElementById('wordWrapCheckbox').checked;
    settings.autoSave = document.getElementById('autoSaveCheckbox').checked;
    settings.autoCloseBrackets = document.getElementById('autoCloseBrackets').checked;
    settings.showLineNumbers = document.getElementById('showLineNumbers').checked;
    settings.highlightCurrentLine = document.getElementById('highlightCurrentLine').checked;
    
    localStorage.setItem('tourtides_settings', JSON.stringify(settings));
    
    editor.updateOptions({
        fontSize: settings.fontSize,
        wordWrap: settings.wordWrap ? 'on' : 'off',
        lineNumbers: settings.showLineNumbers ? 'on' : 'off',
        renderLineHighlight: settings.highlightCurrentLine ? 'all' : 'none',
        fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace"
    });
    
    // 重新绑定自动补全括号
    editor.onDidType = null;
    if (settings.autoCloseBrackets) {
        editor.onDidType((text) => {
            const matching = { '(': ')', '{': '}', '[': ']', '"': '"', "'": "'" };
            if (matching[text]) {
                editor.trigger('keyboard', 'type', { text: matching[text] });
                editor.trigger('keyboard', 'cursorLeft');
            }
        });
    }
    
    // 重新绑定自动保存
    editor.onDidChangeModelContent = null;
    if (settings.autoSave && currentFile) {
        editor.onDidChangeModelContent(() => {
            if (currentFile) {
                setTimeout(() => {
                    files[currentFile] = editor.getValue();
                    localStorage.setItem('tourtides_files', JSON.stringify(files));
                }, 1000);
            }
        });
    }
    
    closeModal('settingsModal');
}
