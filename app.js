// Global state
let currentStep = 1;
let systemContext = {
    techStack: {},
    requirements: {},
    businessContext: {},
    nfrs: {},
    existingSystems: []
};

let components = [];
let connections = [];
let selectedComponent = null;
let draggedComponent = null;
let componentIdCounter = 0;
let connectionMode = false;
let connectionStart = null;

// Component definitions with costs, latencies, and scaling characteristics
const componentDefinitions = {
    'api-gateway': { 
        name: 'API Gateway', 
        icon: '🌐', 
        baseLatency: 10, 
        baseCost: 3.5, 
        baseCapacity: 10000,
        costPerRequest: 0.000001, // $1 per million requests
        latencyUnderLoad: 0.002, // +2ms per 1000 concurrent users
        scalable: true,
        connectionCost: 0.01 // per concurrent connection
    },
    'load-balancer': { 
        name: 'Load Balancer', 
        icon: '⚖️', 
        baseLatency: 5, 
        baseCost: 20, 
        baseCapacity: 50000,
        costPerGB: 0.008, // data transfer cost
        latencyUnderLoad: 0.001,
        scalable: true,
        connectionCost: 0.005
    },
    'Lambda': { 
        name: 'Lambda', 
        icon: '⚡', 
        baseLatency: 50, 
        baseCost: 0.2, 
        baseCapacity: 1000,
        costPerInvocation: 0.0000002, // per invocation
        costPerGBSecond: 0.0000166667, // memory cost
        latencyUnderLoad: 0.005, // cold starts increase with load
        scalable: true,
        autoScales: true
    },
    'EC2': { 
        name: 'EC2', 
        icon: '🖥️', 
        baseLatency: 20, 
        baseCost: 70, 
        baseCapacity: 5000,
        costPerInstance: 70, // per additional instance
        latencyUnderLoad: 0.003,
        scalable: true,
        instancesNeeded: (users) => Math.ceil(users / 5000) // 1 instance per 5000 users
    },
    'ECS': { 
        name: 'ECS', 
        icon: '📦', 
        baseLatency: 30, 
        baseCost: 50, 
        baseCapacity: 3000,
        costPerTask: 15,
        latencyUnderLoad: 0.004,
        scalable: true,
        tasksNeeded: (users) => Math.ceil(users / 3000)
    },
    'Kubernetes': { 
        name: 'Kubernetes', 
        icon: '☸️', 
        baseLatency: 35, 
        baseCost: 100, 
        baseCapacity: 10000,
        costPerNode: 80,
        latencyUnderLoad: 0.003,
        scalable: true,
        nodesNeeded: (users) => Math.ceil(users / 10000)
    },
    'RDS-PostgreSQL': { 
        name: 'RDS PostgreSQL', 
        icon: '🗄️', 
        baseLatency: 15, 
        baseCost: 100, 
        baseCapacity: 2000,
        costPerIOPS: 0.10, // per 1000 IOPS
        latencyUnderLoad: 0.008, // DB queries slow down significantly
        scalable: true,
        readReplicaCost: 100,
        connectionsNeeded: (users) => Math.ceil(users / 100) // connection pool
    },
    'RDS-MySQL': { 
        name: 'RDS MySQL', 
        icon: '🗄️', 
        baseLatency: 15, 
        baseCost: 90, 
        baseCapacity: 2000,
        costPerIOPS: 0.10,
        latencyUnderLoad: 0.008,
        scalable: true,
        readReplicaCost: 90,
        connectionsNeeded: (users) => Math.ceil(users / 100)
    },
    'DynamoDB': { 
        name: 'DynamoDB', 
        icon: '⚡', 
        baseLatency: 5, 
        baseCost: 25, 
        baseCapacity: 10000,
        costPerReadUnit: 0.00013, // per RCU
        costPerWriteUnit: 0.00065, // per WCU
        latencyUnderLoad: 0.001, // scales well
        scalable: true,
        autoScales: true
    },
    'MongoDB': { 
        name: 'MongoDB', 
        icon: '🍃', 
        baseLatency: 20, 
        baseCost: 80, 
        baseCapacity: 3000,
        costPerShard: 80,
        latencyUnderLoad: 0.006,
        scalable: true,
        shardsNeeded: (users) => Math.ceil(users / 3000)
    },
    'Redis': { 
        name: 'Redis', 
        icon: '⚡', 
        baseLatency: 2, 
        baseCost: 15, 
        baseCapacity: 50000,
        costPerGB: 0.05, // memory cost
        latencyUnderLoad: 0.0005, // very efficient
        scalable: true,
        cacheHitRatio: 0.8 // 80% cache hit reduces DB load
    },
    'Memcached': { 
        name: 'Memcached', 
        icon: '💾', 
        baseLatency: 3, 
        baseCost: 10, 
        baseCapacity: 40000,
        costPerGB: 0.04,
        latencyUnderLoad: 0.0006,
        scalable: true,
        cacheHitRatio: 0.75
    },
    'SQS': { 
        name: 'SQS', 
        icon: '📬', 
        baseLatency: 20, 
        baseCost: 5, 
        baseCapacity: 100000,
        costPerRequest: 0.0000004, // per request
        latencyUnderLoad: 0.002,
        scalable: true,
        autoScales: true
    },
    'Kafka': { 
        name: 'Kafka', 
        icon: '📨', 
        baseLatency: 10, 
        baseCost: 50, 
        baseCapacity: 100000,
        costPerBroker: 50,
        latencyUnderLoad: 0.003,
        scalable: true,
        brokersNeeded: (users) => Math.ceil(users / 50000)
    }
};

// Step navigation
function nextStep() {
    if (currentStep < 4) {
        // Save current step data
        saveStepData(currentStep);
        
        // Move to next step
        document.getElementById(`step${currentStep}`).classList.remove('active');
        document.querySelector(`.step[data-step="${currentStep}"]`).classList.remove('active');
        document.querySelector(`.step[data-step="${currentStep}"]`).classList.add('completed');
        
        currentStep++;
        
        document.getElementById(`step${currentStep}`).classList.add('active');
        document.querySelector(`.step[data-step="${currentStep}"]`).classList.add('active');
    }
}

function prevStep() {
    if (currentStep > 1) {
        document.getElementById(`step${currentStep}`).classList.remove('active');
        document.querySelector(`.step[data-step="${currentStep}"]`).classList.remove('active');
        
        currentStep--;
        
        document.getElementById(`step${currentStep}`).classList.add('active');
        document.querySelector(`.step[data-step="${currentStep}"]`).classList.add('active');
        document.querySelector(`.step[data-step="${currentStep}"]`).classList.remove('completed');
    }
}

function saveStepData(step) {
    switch(step) {
        case 1:
            systemContext.techStack = {
                cloud: getCheckedValues('cloud'),
                compute: getCheckedValues('compute'),
                database: getCheckedValues('database'),
                cache: getCheckedValues('cache'),
                messaging: getCheckedValues('messaging')
            };
            break;
        case 2:
            systemContext.requirements = {
                traffic: parseInt(document.getElementById('traffic').value),
                users: parseInt(document.getElementById('users').value),
                dataVolume: parseInt(document.getElementById('dataVolume').value),
                peakHours: document.getElementById('peakHours').value,
                regions: getCheckedValues('region')
            };
            break;
        case 3:
            systemContext.businessContext = {
                industry: document.getElementById('industry').value,
                budget: parseInt(document.getElementById('budget').value),
                compliance: getCheckedValues('compliance')
            };
            // Get existing systems
            const systemItems = document.querySelectorAll('.system-item');
            systemContext.existingSystems = Array.from(systemItems).map(item => ({
                name: item.querySelector('input').value,
                integration: item.querySelector('select').value
            }));
            break;
        case 4:
            systemContext.nfrs = {
                latency: parseInt(document.getElementById('latency').value),
                availability: parseFloat(document.getElementById('availability').value),
                rto: parseInt(document.getElementById('rto').value),
                rpo: parseInt(document.getElementById('rpo').value)
            };
            break;
    }
}

function getCheckedValues(name) {
    return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`))
        .map(cb => cb.value);
}

function addSystem() {
    const container = document.getElementById('existing-systems');
    const div = document.createElement('div');
    div.className = 'system-item';
    div.innerHTML = `
        <input type="text" placeholder="System name">
        <select>
            <option>REST API</option>
            <option>SOAP</option>
            <option>Database</option>
        </select>
    `;
    container.appendChild(div);
}

function startDesign() {
    saveStepData(4);
    
    // Hide input container
    document.getElementById('input-container').style.display = 'none';
    
    // Show design container
    document.getElementById('design-container').style.display = 'flex';
    
    // Update step indicator
    document.querySelector(`.step[data-step="4"]`).classList.add('completed');
    document.querySelector(`.step[data-step="5"]`).classList.add('active');
    
    // Show keyboard shortcuts hint
    document.getElementById('footer-hints').style.display = 'block';
    
    // Update user count display
    document.getElementById('user-count-display').textContent = systemContext.requirements.users.toLocaleString();
    
    // Populate component palette based on tech stack
    populateComponentPalette();
}

function backToInputs() {
    document.getElementById('design-container').style.display = 'none';
    document.getElementById('input-container').style.display = 'block';
    document.getElementById('footer-hints').style.display = 'none';
    currentStep = 4;
    document.getElementById('step4').classList.add('active');
    document.querySelector(`.step[data-step="5"]`).classList.remove('active');
}

function populateComponentPalette() {
    const computeContainer = document.getElementById('compute-components');
    const databaseContainer = document.getElementById('database-components');
    const cacheContainer = document.getElementById('cache-components');
    
    computeContainer.innerHTML = '';
    databaseContainer.innerHTML = '';
    cacheContainer.innerHTML = '';
    
    // Add compute components
    systemContext.techStack.compute.forEach(type => {
        if (componentDefinitions[type]) {
            const def = componentDefinitions[type];
            computeContainer.innerHTML += `
                <div class="component-item" draggable="true" data-type="${type}">
                    <div class="component-icon">${def.icon}</div>
                    <div class="component-name">${def.name}</div>
                </div>
            `;
        }
    });
    
    // Add database components
    systemContext.techStack.database.forEach(type => {
        if (componentDefinitions[type]) {
            const def = componentDefinitions[type];
            databaseContainer.innerHTML += `
                <div class="component-item" draggable="true" data-type="${type}">
                    <div class="component-icon">${def.icon}</div>
                    <div class="component-name">${def.name}</div>
                </div>
            `;
        }
    });
    
    // Add cache components
    systemContext.techStack.cache.forEach(type => {
        if (componentDefinitions[type]) {
            const def = componentDefinitions[type];
            cacheContainer.innerHTML += `
                <div class="component-item" draggable="true" data-type="${type}">
                    <div class="component-icon">${def.icon}</div>
                    <div class="component-name">${def.name}</div>
                </div>
            `;
        }
    });
    
    // Add existing systems to palette
    if (systemContext.existingSystems && systemContext.existingSystems.length > 0) {
        // Create a section for existing systems if it doesn't exist
        let existingSystemsSection = document.querySelector('.palette-section.existing-systems');
        if (!existingSystemsSection) {
            const palette = document.querySelector('.component-palette');
            existingSystemsSection = document.createElement('div');
            existingSystemsSection.className = 'palette-section existing-systems';
            existingSystemsSection.innerHTML = '<h4>Existing Systems</h4><div id="existing-systems-components"></div>';
            palette.appendChild(existingSystemsSection);
        }
        
        const existingSystemsContainer = document.getElementById('existing-systems-components');
        existingSystemsContainer.innerHTML = '';
        
        systemContext.existingSystems.forEach((system, index) => {
            if (system.name && system.name.trim()) {
                // Create component definition for existing system dynamically
                const systemType = `existing-system-${index}`;
                
                // Determine icon and base metrics based on integration type
                let icon = '🔌';
                let baseLatency = 50;
                let baseCost = 30;
                
                if (system.integration === 'REST API') {
                    icon = '🌐';
                    baseLatency = 100; // External API calls are slower
                    baseCost = 50;
                } else if (system.integration === 'SOAP') {
                    icon = '📡';
                    baseLatency = 150; // SOAP is typically slower
                    baseCost = 40;
                } else if (system.integration === 'Database') {
                    icon = '🗄️';
                    baseLatency = 80;
                    baseCost = 60;
                }
                
                // Add to component definitions
                componentDefinitions[systemType] = {
                    name: system.name,
                    icon: icon,
                    baseLatency: baseLatency,
                    baseCost: baseCost,
                    baseCapacity: 5000,
                    costPerRequest: 0.000005, // Higher cost for external systems
                    latencyUnderLoad: 0.01, // External systems may be less scalable
                    scalable: false, // Existing systems typically don't auto-scale
                    isExternalSystem: true,
                    integrationType: system.integration
                };
                
                // Add to palette
                existingSystemsContainer.innerHTML += `
                    <div class="component-item" draggable="true" data-type="${systemType}">
                        <div class="component-icon">${icon}</div>
                        <div class="component-name">${system.name}</div>
                        <div style="font-size: 9px; color: #6c757d; margin-top: 2px;">${system.integration}</div>
                    </div>
                `;
            }
        });
    }
    
    // Setup drag and drop
    setupDragAndDrop();
}

function setupDragAndDrop() {
    const paletteItems = document.querySelectorAll('.component-item[draggable="true"]');
    const canvas = document.getElementById('components-layer');
    
    paletteItems.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            draggedComponent = e.target.dataset.type;
        });
    });
    
    canvas.addEventListener('dragover', (e) => {
        e.preventDefault();
    });
    
    canvas.addEventListener('drop', (e) => {
        e.preventDefault();
        if (draggedComponent) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            addComponentToCanvas(draggedComponent, x, y);
            draggedComponent = null;
        }
    });
}

function addComponentToCanvas(type, x, y) {
    const def = componentDefinitions[type];
    if (!def) return;
    
    const id = componentIdCounter++;
    const component = {
        id,
        type,
        x,
        y,
        name: def.name,
        icon: def.icon,
        // Scaling configuration (user can modify)
        scalingConfig: {
            instances: 1,
            autoScale: def.autoScales || false,
            minInstances: 1,
            maxInstances: 10
        }
    };
    
    components.push(component);
    renderComponent(component);
    
    // Hide hint after first component
    const hint = document.getElementById('canvas-hint');
    if (hint) hint.style.display = 'none';
}

function renderComponent(component) {
    const layer = document.getElementById('components-layer');
    const div = document.createElement('div');
    div.className = 'canvas-component';
    div.id = `component-${component.id}`;
    div.style.left = `${component.x}px`;
    div.style.top = `${component.y}px`;
    
    // Set data attributes for redundancy styling - ONLY if actually in a group
    if (component.redundancyGroup) {
        div.setAttribute('data-redundancy-group', component.redundancyGroup);
        if (component.isPrimary) {
            div.setAttribute('data-primary', 'true');
        }
    }
    
    const def = componentDefinitions[component.type];
    const isExternalSystem = def.isExternalSystem || false;
    
    div.innerHTML = `
        <div class="component-header">
            <div class="icon">${component.icon}</div>
            <div class="name">${component.name}</div>
        </div>
        <div class="component-meta">
            <div style="font-size: 11px; margin-bottom: 4px;">
                <strong>Base:</strong> ${componentDefinitions[component.type].baseLatency}ms | $${componentDefinitions[component.type].baseCost}/mo${componentDefinitions[component.type].isExternalSystem ? ' (External)' : ''}
            </div>
            <div style="font-size: 10px; color: #6c757d;">
                ${isExternalSystem ? `🔌 ${def.integrationType}` : (component.scalingConfig?.autoScale ? '⚡ Auto-scale' : component.scalingConfig?.instances > 1 ? `� ${component.scalingConfig.instances} instances` : '📈 1 instance')}
            </div>
        </div>
        ${!isExternalSystem ? `<button class="component-settings" onclick="openScalingConfig(${component.id}); event.stopPropagation();" title="Configure Scaling">⚙️</button>` : ''}
        <button class="component-delete" onclick="deleteComponent(${component.id})">×</button>
    `;
    
    // Make draggable
    div.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('component-delete')) return;
        startDrag(component.id, e);
    });
    
    // Click to select
    div.addEventListener('click', (e) => {
        if (e.target.classList.contains('component-delete')) return;
        selectComponent(component.id);
    });
    
    layer.appendChild(div);
    
    // Add redundancy indicator if in group
    if (component.redundancyGroup) {
        const indicator = document.createElement('div');
        indicator.className = 'redundancy-indicator';
        indicator.style.cssText = `
            position: absolute;
            top: -8px;
            left: 50%;
            transform: translateX(-50%);
            background: ${component.isPrimary ? '#28a745' : '#667eea'};
            color: white;
            padding: 2px 8px;
            border-radius: 8px;
            font-size: 9px;
            font-weight: 700;
            letter-spacing: 0.5px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            z-index: 20;
        `;
        indicator.textContent = component.isPrimary ? '👑 PRIMARY' : '📦 REPLICA';
        div.appendChild(indicator);
        
        // Make settings button always visible for redundancy components
        const settingsBtn = div.querySelector('.component-settings');
        if (settingsBtn) {
            settingsBtn.classList.add('always-visible');
        }
    }
    
    // Add pop-in animation
    div.classList.add('just-added');
    setTimeout(() => div.classList.remove('just-added'), 300);
}

function deleteComponent(id) {
    components = components.filter(c => c.id !== id);
    document.getElementById(`component-${id}`).remove();
    connections = connections.filter(conn => conn.from !== id && conn.to !== id);
    renderConnections();
}

function selectComponent(id) {
    // If in connection mode, handle connection
    if (connectionMode) {
        if (connectionStart === null) {
            connectionStart = id;
            document.getElementById(`component-${id}`).classList.add('connection-source');
        } else if (connectionStart !== id) {
            // Create connection
            connections.push({ from: connectionStart, to: id });
            document.getElementById(`component-${connectionStart}`).classList.remove('connection-source');
            connectionStart = null;
            renderConnections();
        }
        return;
    }
    
    // Deselect all
    document.querySelectorAll('.canvas-component').forEach(el => {
        el.classList.remove('selected');
    });
    
    // Select this one
    document.getElementById(`component-${id}`).classList.add('selected');
    selectedComponent = id;
}

let dragState = null;
let groupDragState = null;
let canvasZoom = 1;

function startDrag(id, e) {
    const component = components.find(c => c.id === id);
    const element = document.getElementById(`component-${id}`);
    const rect = element.getBoundingClientRect();
    
    // Check if component is part of a redundancy group
    const groupComponents = component.redundancyGroup 
        ? components.filter(c => c.redundancyGroup === component.redundancyGroup)
        : [component];
    
    dragState = {
        id,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
        groupComponents: groupComponents,
        initialPositions: groupComponents.map(c => ({ id: c.id, x: c.x, y: c.y }))
    };
    
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
}

function onDrag(e) {
    if (!dragState) return;
    
    const canvas = document.getElementById('components-layer');
    const rect = canvas.getBoundingClientRect();
    
    const x = e.clientX - rect.left - dragState.offsetX;
    const y = e.clientY - rect.top - dragState.offsetY;
    
    const component = components.find(c => c.id === dragState.id);
    const deltaX = x - component.x;
    const deltaY = y - component.y;
    
    // Move all components in the group together
    dragState.groupComponents.forEach(comp => {
        const newX = comp.x + deltaX;
        const newY = comp.y + deltaY;
        
        comp.x = Math.max(0, Math.min(newX, rect.width - 140));
        comp.y = Math.max(0, Math.min(newY, rect.height - 100));
        
        const element = document.getElementById(`component-${comp.id}`);
        if (element) {
            element.style.left = `${comp.x}px`;
            element.style.top = `${comp.y}px`;
        }
    });
    
    renderConnections();
    updateRedundancyGroupBox(component.redundancyGroup);
}

function stopDrag() {
    dragState = null;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
}

// Group drag functions
function startGroupDrag(groupId, e) {
    const groupComponents = components.filter(c => c.redundancyGroup === groupId);
    if (groupComponents.length === 0) return;
    
    const canvas = document.getElementById('components-layer');
    const rect = canvas.getBoundingClientRect();
    
    groupDragState = {
        groupId,
        startX: e.clientX,
        startY: e.clientY,
        initialPositions: groupComponents.map(c => ({ id: c.id, x: c.x, y: c.y }))
    };
    
    document.addEventListener('mousemove', onGroupDrag);
    document.addEventListener('mouseup', stopGroupDrag);
    
    // Change cursor
    document.body.style.cursor = 'move';
}

function onGroupDrag(e) {
    if (!groupDragState) return;
    
    const canvas = document.getElementById('components-layer');
    const rect = canvas.getBoundingClientRect();
    
    const deltaX = e.clientX - groupDragState.startX;
    const deltaY = e.clientY - groupDragState.startY;
    
    // Move all components in the group
    groupDragState.initialPositions.forEach(initial => {
        const comp = components.find(c => c.id === initial.id);
        if (comp) {
            const newX = initial.x + deltaX;
            const newY = initial.y + deltaY;
            
            comp.x = Math.max(0, Math.min(newX, rect.width - 140));
            comp.y = Math.max(0, Math.min(newY, rect.height - 100));
            
            const element = document.getElementById(`component-${comp.id}`);
            if (element) {
                element.style.left = `${comp.x}px`;
                element.style.top = `${comp.y}px`;
            }
        }
    });
    
    renderConnections();
    updateRedundancyGroupBox(groupDragState.groupId);
}

function stopGroupDrag() {
    groupDragState = null;
    document.removeEventListener('mousemove', onGroupDrag);
    document.removeEventListener('mouseup', stopGroupDrag);
    document.body.style.cursor = 'default';
}

function updateRedundancyGroupBox(groupId) {
    if (!groupId) return;
    
    // Remove old group box
    const oldBox = document.querySelector(`.redundancy-group-box[data-group-id="${groupId}"]`);
    if (oldBox) oldBox.remove();
    
    // Recreate group box with new positions
    const groupComponents = components.filter(c => c.redundancyGroup === groupId);
    if (groupComponents.length === 0) return;
    
    const minX = Math.min(...groupComponents.map(c => c.x)) - 20;
    const minY = Math.min(...groupComponents.map(c => c.y)) - 40;
    const maxX = Math.max(...groupComponents.map(c => c.x + 140)) + 20;
    const maxY = Math.max(...groupComponents.map(c => c.y + 100)) + 20;
    
    const comp = groupComponents[0];
    const strategy = comp.redundancyStrategy || 'redundancy';
    
    // Get strategy color and icon
    const strategyInfo = {
        'multi-az': { color: '#28a745', icon: '🏢', name: 'MULTI-AZ' },
        'multi-region': { color: '#667eea', icon: '🌍', name: 'MULTI-REGION' },
        'active-passive': { color: '#ffc107', icon: '⚡', name: 'ACTIVE-PASSIVE' },
        'active-active': { color: '#17a2b8', icon: '⚡⚡', name: 'ACTIVE-ACTIVE' }
    };
    const info = strategyInfo[strategy] || { color: '#667eea', icon: '🔄', name: 'REDUNDANCY' };
    
    const groupBox = document.createElement('div');
    groupBox.className = 'redundancy-group-box';
    groupBox.setAttribute('data-group-id', groupId);
    groupBox.style.cssText = `
        position: absolute;
        left: ${minX}px;
        top: ${minY}px;
        width: ${maxX - minX}px;
        height: ${maxY - minY}px;
        border: 3px solid ${info.color};
        border-radius: 16px;
        background: linear-gradient(135deg, ${info.color}08 0%, ${info.color}15 100%);
        box-shadow: 0 0 0 1px ${info.color}40, inset 0 0 20px ${info.color}10;
        pointer-events: auto;
        z-index: 0;
        cursor: move;
        transition: all 0.3s ease;
    `;
    
    // Add hover effect
    groupBox.addEventListener('mouseenter', () => {
        groupBox.style.background = `linear-gradient(135deg, ${info.color}20 0%, ${info.color}30 100%)`;
        groupBox.style.borderWidth = '4px';
        groupBox.style.boxShadow = `0 0 0 2px ${info.color}60, inset 0 0 30px ${info.color}20, 0 8px 24px ${info.color}30`;
    });
    groupBox.addEventListener('mouseleave', () => {
        groupBox.style.background = `linear-gradient(135deg, ${info.color}08 0%, ${info.color}15 100%)`;
        groupBox.style.borderWidth = '3px';
        groupBox.style.boxShadow = `0 0 0 1px ${info.color}40, inset 0 0 20px ${info.color}10`;
    });
    
    // Add right-click context menu
    groupBox.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showRedundancyGroupMenu(e, groupId);
    });
    
    // Make group box draggable
    groupBox.addEventListener('mousedown', (e) => {
        // Only drag if clicking on the box itself, not buttons
        if (e.target === groupBox || e.target.classList.contains('group-header') || e.target.closest('.group-header')) {
            e.stopPropagation();
            startGroupDrag(groupId, e);
        }
    });
    
    // Add click to highlight all components
    groupBox.addEventListener('click', (e) => {
        if (e.target === groupBox || e.target.classList.contains('group-header') || e.target.closest('.group-header')) {
            e.stopPropagation();
            highlightRedundancyGroup(groupId);
        }
    });
    
    // Create header with strategy info
    const header = document.createElement('div');
    header.className = 'group-header';
    header.style.cssText = `
        position: absolute;
        top: -16px;
        left: 50%;
        transform: translateX(-50%);
        background: ${info.color};
        color: white;
        padding: 6px 16px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 700;
        pointer-events: auto;
        cursor: move;
        z-index: 1;
        box-shadow: 0 4px 12px ${info.color}60;
        display: flex;
        align-items: center;
        gap: 6px;
        letter-spacing: 0.5px;
        border: 2px solid white;
    `;
    header.innerHTML = `
        <span style="font-size: 14px;">${info.icon}</span>
        <span>${info.name}</span>
        <span style="opacity: 0.8; font-weight: 500;">•</span>
        <span style="font-weight: 500;">${groupComponents.length} Components</span>
    `;
    groupBox.appendChild(header);
    
    // Add strategy badge at bottom
    const strategyBadge = document.createElement('div');
    strategyBadge.style.cssText = `
        position: absolute;
        bottom: 8px;
        left: 50%;
        transform: translateX(-50%);
        background: ${info.color}20;
        color: ${info.color};
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 10px;
        font-weight: 600;
        pointer-events: none;
        border: 1px solid ${info.color}40;
    `;
    const regions = [...new Set(groupComponents.map(c => c.region).filter(r => r))];
    strategyBadge.textContent = `${regions.length} Region${regions.length > 1 ? 's' : ''} • ${strategy.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`;
    groupBox.appendChild(strategyBadge);
    
    // Add action buttons
    const actionsDiv = document.createElement('div');
    actionsDiv.style.cssText = `
        position: absolute;
        top: -16px;
        right: 10px;
        display: flex;
        gap: 6px;
        pointer-events: auto;
        z-index: 2;
    `;
    
    const editBtn = document.createElement('button');
    editBtn.innerHTML = '✏️';
    editBtn.title = 'Edit Redundancy';
    editBtn.style.cssText = `
        background: white;
        color: #28a745;
        border: 2px solid #28a745;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(40, 167, 69, 0.3);
    `;
    editBtn.addEventListener('mouseenter', () => {
        editBtn.style.background = '#28a745';
        editBtn.style.transform = 'scale(1.1)';
        editBtn.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.5)';
    });
    editBtn.addEventListener('mouseleave', () => {
        editBtn.style.background = 'white';
        editBtn.style.transform = 'scale(1)';
        editBtn.style.boxShadow = '0 2px 8px rgba(40, 167, 69, 0.3)';
    });
    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        editRedundancyGroup(groupId);
    });
    
    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.title = 'Delete Redundancy Group';
    deleteBtn.style.cssText = `
        background: white;
        color: #dc3545;
        border: 2px solid #dc3545;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(220, 53, 69, 0.3);
    `;
    deleteBtn.addEventListener('mouseenter', () => {
        deleteBtn.style.background = '#dc3545';
        deleteBtn.style.transform = 'scale(1.1)';
        deleteBtn.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.5)';
    });
    deleteBtn.addEventListener('mouseleave', () => {
        deleteBtn.style.background = 'white';
        deleteBtn.style.transform = 'scale(1)';
        deleteBtn.style.boxShadow = '0 2px 8px rgba(220, 53, 69, 0.3)';
    });
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteRedundancyGroup(groupId);
    });
    
    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(deleteBtn);
    groupBox.appendChild(actionsDiv);
    
    document.getElementById('components-layer').appendChild(groupBox);
}

function highlightRedundancyGroup(groupId) {
    const groupComponents = components.filter(c => c.redundancyGroup === groupId);
    groupComponents.forEach(c => {
        const el = document.getElementById(`component-${c.id}`);
        if (el) {
            el.style.animation = 'pulse 1s 3';
            setTimeout(() => el.style.animation = '', 3000);
        }
    });
}

function showRedundancyGroupMenu(event, groupId) {
    // Remove existing menu
    const existingMenu = document.getElementById('redundancy-group-menu');
    if (existingMenu) existingMenu.remove();
    
    const menu = document.createElement('div');
    menu.id = 'redundancy-group-menu';
    menu.style.cssText = `
        position: fixed;
        left: ${event.clientX}px;
        top: ${event.clientY}px;
        background: white;
        border: 2px solid #667eea;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        padding: 8px;
        min-width: 200px;
    `;
    
    const groupComponents = components.filter(c => c.redundancyGroup === groupId);
    const comp = groupComponents[0];
    
    menu.innerHTML = `
        <div style="padding: 8px; font-weight: 600; border-bottom: 1px solid #e9ecef; margin-bottom: 8px;">
            ${comp.redundancyStrategy?.toUpperCase() || 'REDUNDANCY'} Group
        </div>
        <div style="padding: 8px; cursor: pointer; border-radius: 4px; font-size: 13px;" onmouseover="this.style.background='#f8f9fa'" onmouseout="this.style.background='white'" onclick="editRedundancyGroup('${groupId}')">
            ✏️ Edit Redundancy
        </div>
        <div style="padding: 8px; cursor: pointer; border-radius: 4px; font-size: 13px;" onmouseover="this.style.background='#f8f9fa'" onmouseout="this.style.background='white'" onclick="highlightRedundancyGroup('${groupId}')">
            👁️ Highlight Components
        </div>
        <div style="padding: 8px; cursor: pointer; border-radius: 4px; font-size: 13px; color: #dc3545;" onmouseover="this.style.background='#f8d7da'" onmouseout="this.style.background='white'" onclick="deleteRedundancyGroup('${groupId}')">
            🗑️ Delete Group
        </div>
    `;
    
    document.body.appendChild(menu);
    
    // Close menu on click outside
    setTimeout(() => {
        document.addEventListener('click', function closeMenu() {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        });
    }, 100);
}

function editRedundancyGroup(groupId) {
    const groupComponents = components.filter(c => c.redundancyGroup === groupId);
    if (groupComponents.length === 0) {
        alert('Redundancy group not found!');
        return;
    }
    
    const primaryComp = groupComponents.find(c => c.isPrimary) || groupComponents[0];
    const regions = groupComponents.map(c => c.region).filter(r => r);
    
    // Store current group info
    currentRedundancyComponent = primaryComp;
    currentRedundancyType = primaryComp.type;
    selectedRegionsForRedundancy = regions;
    
    // Open redundancy modal in edit mode
    document.getElementById('redundancy-modal').style.display = 'flex';
    
    // Populate component info
    const def = componentDefinitions[primaryComp.type];
    document.getElementById('redundancy-component-info').innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 32px;">${primaryComp.icon}</span>
            <div>
                <div style="font-weight: 600; font-size: 16px;">${primaryComp.name}</div>
                <div style="font-size: 12px; color: #6c757d;">
                    Editing redundancy configuration
                </div>
            </div>
        </div>
    `;
    
    // Set current strategy
    const strategySelect = document.getElementById('redundancy-strategy');
    if (strategySelect && primaryComp.redundancyStrategy) {
        strategySelect.value = primaryComp.redundancyStrategy;
    }
    
    // Populate regions
    populateRegionSelection();
    updateRedundancyPreview();
    
    // Change button text to "Update"
    const applyBtn = document.querySelector('#redundancy-modal .btn-primary');
    if (applyBtn) {
        applyBtn.textContent = 'Update Redundancy';
        applyBtn.onclick = () => updateRedundancyGroup(groupId);
    }
}

function updateRedundancyGroup(groupId) {
    const strategy = document.getElementById('redundancy-strategy').value;
    const oldGroupComponents = components.filter(c => c.redundancyGroup === groupId);
    
    if (oldGroupComponents.length === 0) {
        alert('Group not found!');
        return;
    }
    
    // Get primary component
    const primaryComp = oldGroupComponents.find(c => c.isPrimary) || oldGroupComponents[0];
    
    // Delete old replicas (keep primary)
    oldGroupComponents.forEach(comp => {
        if (!comp.isPrimary) {
            deleteComponent(comp.id);
        }
    });
    
    // Update primary component region
    primaryComp.region = selectedRegionsForRedundancy[0];
    primaryComp.redundancyStrategy = strategy;
    
    // Create new replicas
    const layout = calculateRedundancyLayout(primaryComp, selectedRegionsForRedundancy.length, strategy);
    
    selectedRegionsForRedundancy.forEach((region, index) => {
        if (index === 0) return; // Skip primary
        
        const position = layout.positions[index];
        const newComponentId = componentIdCounter;
        addComponentToCanvas(primaryComp.type, position.x, position.y);
        
        const newComponent = components.find(c => c.id === newComponentId);
        if (newComponent) {
            newComponent.region = region;
            newComponent.redundancyStrategy = strategy;
            newComponent.redundancyGroup = groupId;
            newComponent.isPrimary = false;
            addRegionBadge(newComponent);
        }
    });
    
    // Recreate connections
    connections = connections.filter(c => c.redundancyGroup !== groupId);
    createRedundancyConnections({ id: groupId, components: components.filter(c => c.redundancyGroup === groupId).map(c => c.id) }, strategy);
    
    // Update visual
    updateRedundancyGroupBox(groupId);
    
    closeRedundancyModal();
    
    alert(`✅ Redundancy group updated!\n\nStrategy: ${strategy}\nRegions: ${selectedRegionsForRedundancy.length}\n\nRe-running simulation...`);
    
    setTimeout(() => {
        renderConnections();
        simulate();
    }, 500);
}

function deleteRedundancyGroup(groupId) {
    const groupComponents = components.filter(c => c.redundancyGroup === groupId);
    
    if (groupComponents.length === 0) {
        alert('Group not found!');
        return;
    }
    
    const confirmMsg = `Delete entire redundancy group?\n\nThis will remove ${groupComponents.length} components:\n${groupComponents.map(c => `• ${c.name} (${c.region || 'Unknown'})`).join('\n')}\n\nThis action cannot be undone.`;
    
    if (!confirm(confirmMsg)) {
        return;
    }
    
    // Delete all components in the group
    groupComponents.forEach(comp => {
        deleteComponent(comp.id);
    });
    
    // Remove group box
    const groupBox = document.querySelector(`.redundancy-group-box[data-group-id="${groupId}"]`);
    if (groupBox) groupBox.remove();
    
    // Remove connections
    connections = connections.filter(c => c.redundancyGroup !== groupId);
    renderConnections();
    
    alert('✅ Redundancy group deleted successfully!');
}

// Zoom functionality
function zoomCanvas(direction) {
    const canvasContainer = document.querySelector('.canvas-container');
    const componentsLayer = document.getElementById('components-layer');
    const svg = document.getElementById('canvas');
    
    if (direction === 'in') {
        canvasZoom = Math.min(canvasZoom + 0.1, 2); // Max 200%
    } else if (direction === 'out') {
        canvasZoom = Math.max(canvasZoom - 0.1, 0.5); // Min 50%
    } else if (direction === 'reset') {
        canvasZoom = 1;
    }
    
    // Apply zoom to both layers
    if (componentsLayer) {
        componentsLayer.style.transform = `scale(${canvasZoom})`;
        componentsLayer.style.transformOrigin = 'top left';
    }
    if (svg) {
        svg.style.transform = `scale(${canvasZoom})`;
        svg.style.transformOrigin = 'top left';
    }
    
    // Update zoom display
    const zoomDisplay = document.getElementById('zoom-display');
    if (zoomDisplay) {
        zoomDisplay.textContent = `${Math.round(canvasZoom * 100)}%`;
    }
}

function renderConnections() {
    const svg = document.getElementById('canvas');
    // Clear existing lines and paths
    const lines = svg.querySelectorAll('line, path, text');
    lines.forEach(line => line.remove());
    
    connections.forEach((conn, index) => {
        const from = components.find(c => c.id === conn.from);
        const to = components.find(c => c.id === conn.to);
        
        if (from && to) {
            // Calculate connection points (center of components)
            const x1 = from.x + 70;
            const y1 = from.y + 50;
            const x2 = to.x + 70;
            const y2 = to.y + 50;
            
            // Create curved path for better visualization
            const dx = x2 - x1;
            const dy = y2 - y1;
            const curve = Math.abs(dx) * 0.3;
            
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const pathData = `M ${x1} ${y1} C ${x1 + curve} ${y1}, ${x2 - curve} ${y2}, ${x2} ${y2}`;
            
            path.setAttribute('d', pathData);
            path.setAttribute('stroke', '#667eea');
            path.setAttribute('stroke-width', '3');
            path.setAttribute('fill', 'none');
            path.setAttribute('marker-end', 'url(#arrowhead)');
            path.setAttribute('class', 'connection-line');
            path.setAttribute('data-connection-index', index);
            
            // Add animation
            path.style.strokeDasharray = '10 5';
            path.style.animation = 'dash 1s linear infinite';
            
            // Add click handler to delete connection
            path.style.pointerEvents = 'stroke';
            path.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Delete this connection?')) {
                    connections.splice(index, 1);
                    renderConnections();
                }
            });
            
            svg.appendChild(path);
            
            // Add flow indicator (small circle moving along path)
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('r', '4');
            circle.setAttribute('fill', '#28a745');
            circle.setAttribute('class', 'flow-indicator');
            
            // Animate circle along path
            const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animateMotion');
            animate.setAttribute('dur', '2s');
            animate.setAttribute('repeatCount', 'indefinite');
            animate.innerHTML = `<mpath href="#path-${index}"/>`;
            
            path.setAttribute('id', `path-${index}`);
            circle.appendChild(animate);
            svg.appendChild(circle);
        }
    });
}

// Toggle connection mode
function toggleConnectionMode() {
    connectionMode = !connectionMode;
    const btn = document.getElementById('connection-btn');
    
    if (connectionMode) {
        btn.style.background = '#28a745';
        btn.textContent = '✓ Connecting...';
        connectionStart = null;
        document.body.classList.add('connection-mode-active');
        // Clear any existing selection
        document.querySelectorAll('.canvas-component').forEach(el => {
            el.classList.remove('selected', 'connection-source');
        });
    } else {
        btn.style.background = 'transparent';
        btn.textContent = '🔗 Connect';
        connectionStart = null;
        document.body.classList.remove('connection-mode-active');
        document.querySelectorAll('.canvas-component').forEach(el => {
            el.classList.remove('connection-source');
        });
    }
}

// Edit user count
function editUserCount() {
    const currentCount = systemContext.requirements.users || 5000;
    const newCount = prompt('Enter concurrent user count:', currentCount);
    
    if (newCount && !isNaN(newCount) && parseInt(newCount) > 0) {
        systemContext.requirements.users = parseInt(newCount);
        document.getElementById('user-count-display').textContent = parseInt(newCount).toLocaleString();
    }
}

// Simulation Engine
async function simulate() {
    if (components.length === 0) {
        alert('Please add components to your architecture first!');
        return;
    }
    
    // Show loading state
    const metricsContent = document.getElementById('metrics-content');
    const useAI = isBedrockConfigured();
    metricsContent.innerHTML = `<p class="placeholder">🔄 Running ${useAI ? 'AI-powered ' : ''}simulation...</p>`;
    
    // Run basic simulation
    const results = runSimulation();
    
    // If Bedrock is configured, enhance with AI analysis
    if (useAI) {
        try {
            metricsContent.innerHTML = '<p class="placeholder">🤖 AI Solution Architect analyzing your architecture...</p>';
            
            const architecture = {
                components: components,
                connections: connections,
                currentLatency: results.latency,
                currentCost: results.cost,
                throughput: results.throughput,
                bottlenecks: results.bottlenecks,
                spofs: results.spofs
            };
            
            const context = {
                industry: systemContext.businessContext.industry,
                users: systemContext.requirements.users,
                traffic: systemContext.requirements.traffic,
                dataVolume: systemContext.requirements.dataVolume,
                regions: systemContext.requirements.regions,
                budget: systemContext.businessContext.budget,
                compliance: systemContext.businessContext.compliance,
                latency: systemContext.nfrs.latency,
                availability: systemContext.nfrs.availability,
                rto: systemContext.nfrs.rto,
                rpo: systemContext.nfrs.rpo,
                techStack: systemContext.techStack
            };
            
            const aiAnalysis = await analyzeArchitectureWithAI(architecture, context);
            const enhancedResults = convertAIAnalysisToResults(aiAnalysis, results);
            displayResults(enhancedResults);
        } catch (error) {
            console.error('AI analysis failed:', error);
            alert(`AI analysis failed: ${error.message}\n\nShowing basic simulation results instead.`);
            displayResults(results);
        }
    } else {
        // Show basic results after delay
        setTimeout(() => {
            displayResults(results);
        }, 500);
    }
}

function runSimulation() {
    const users = systemContext.requirements.users || 5000;
    const traffic = systemContext.requirements.traffic || 10000; // requests per minute
    const requestsPerUser = traffic / users; // requests per user per minute
    
    // Calculate load factor (how stressed the system is)
    const loadFactor = users / 5000; // baseline is 5000 users
    
    // Calculate component-specific metrics based on user load
    const componentMetrics = components.map(comp => {
        const def = componentDefinitions[comp.type];
        
        // Calculate actual latency under load
        const loadLatency = def.baseLatency + (def.latencyUnderLoad * users);
        
        // Calculate scaling cost based on user configuration
        let scalingCost = def.baseCost;
        let actualInstances = 1;
        
        // Check if user configured scaling
        if (comp.scalingConfig?.autoScale) {
            // Auto-scaling: calculate based on load
            if (def.instancesNeeded) {
                actualInstances = def.instancesNeeded(users);
                scalingCost = def.baseCost + (def.costPerInstance * (actualInstances - 1));
            } else if (def.tasksNeeded) {
                actualInstances = def.tasksNeeded(users);
                scalingCost = def.baseCost + (def.costPerTask * (actualInstances - 1));
            } else if (def.nodesNeeded) {
                actualInstances = def.nodesNeeded(users);
                scalingCost = def.baseCost + (def.costPerNode * (actualInstances - 1));
            } else if (def.shardsNeeded) {
                actualInstances = def.shardsNeeded(users);
                scalingCost = def.baseCost + (def.costPerShard * (actualInstances - 1));
            } else if (def.brokersNeeded) {
                actualInstances = def.brokersNeeded(users);
                scalingCost = def.baseCost + (def.costPerBroker * (actualInstances - 1));
            }
        } else if (comp.scalingConfig?.instances > 1) {
            // Manual scaling: use configured instances
            actualInstances = comp.scalingConfig.instances;
            if (def.costPerInstance) {
                scalingCost = def.baseCost + (def.costPerInstance * (actualInstances - 1));
            } else if (def.costPerTask) {
                scalingCost = def.baseCost + (def.costPerTask * (actualInstances - 1));
            } else if (def.costPerNode) {
                scalingCost = def.baseCost + (def.costPerNode * (actualInstances - 1));
            } else {
                scalingCost = def.baseCost * actualInstances;
            }
        } else {
            // Default: calculate based on load
            if (def.instancesNeeded) {
                actualInstances = def.instancesNeeded(users);
                scalingCost = def.baseCost + (def.costPerInstance * (actualInstances - 1));
            } else if (def.tasksNeeded) {
                actualInstances = def.tasksNeeded(users);
                scalingCost = def.baseCost + (def.costPerTask * (actualInstances - 1));
            } else if (def.nodesNeeded) {
                actualInstances = def.nodesNeeded(users);
                scalingCost = def.baseCost + (def.costPerNode * (actualInstances - 1));
            } else if (def.shardsNeeded) {
                actualInstances = def.shardsNeeded(users);
                scalingCost = def.baseCost + (def.costPerShard * (actualInstances - 1));
            } else if (def.brokersNeeded) {
                actualInstances = def.brokersNeeded(users);
                scalingCost = def.baseCost + (def.costPerBroker * (actualInstances - 1));
            } else if (def.connectionsNeeded) {
                const connections = def.connectionsNeeded(users);
                scalingCost = def.baseCost + (connections * 0.01);
            }
        }
        
        // Add usage-based costs
        if (def.costPerRequest) {
            scalingCost += (traffic * 60 * 24 * 30 * def.costPerRequest); // monthly
        }
        if (def.costPerInvocation) {
            scalingCost += (traffic * 60 * 24 * 30 * def.costPerInvocation);
        }
        if (def.connectionCost) {
            scalingCost += (users * def.connectionCost);
        }
        
        // Calculate effective capacity under load
        let capacityMultiplier = 1;
        if (comp.scalingConfig?.autoScale || def.autoScales) {
            capacityMultiplier = 10; // auto-scaling
        } else if (actualInstances > 1) {
            capacityMultiplier = actualInstances; // manual horizontal scaling
        }
        const effectiveCapacity = def.baseCapacity * capacityMultiplier;
        
        return {
            ...comp,
            actualLatency: Math.round(loadLatency),
            actualCost: Math.round(scalingCost * 100) / 100,
            effectiveCapacity,
            isBottleneck: effectiveCapacity < traffic,
            loadPercentage: Math.round((traffic / effectiveCapacity) * 100)
        };
    });
    
    // Calculate latency based on connected flow with load consideration
    let totalLatency = 0;
    if (connections.length > 0) {
        const visited = new Set();
        const calculatePathLatency = (compId, depth = 0) => {
            if (visited.has(compId)) return 0;
            visited.add(compId);
            
            const compMetric = componentMetrics.find(c => c.id === compId);
            if (!compMetric) return 0;
            
            let latency = compMetric.actualLatency;
            
            // Add queueing delay if component is overloaded
            if (compMetric.loadPercentage > 80) {
                const queueingDelay = (compMetric.loadPercentage - 80) * 2; // 2ms per % over 80%
                latency += queueingDelay;
            }
            
            const outgoing = connections.filter(c => c.from === compId);
            
            if (outgoing.length > 0) {
                // Network latency increases with load
                const networkLatency = 5 + (loadFactor * 2);
                latency += networkLatency;
                
                // Add max latency of downstream components
                const downstreamLatencies = outgoing.map(conn => calculatePathLatency(conn.to, depth + 1));
                latency += Math.max(...downstreamLatencies, 0);
            }
            
            return latency;
        };
        
        const entryPoints = componentMetrics.filter(c => 
            !connections.some(conn => conn.to === c.id)
        );
        
        if (entryPoints.length > 0) {
            totalLatency = Math.max(...entryPoints.map(c => calculatePathLatency(c.id)));
        } else {
            totalLatency = componentMetrics.reduce((sum, c) => sum + c.actualLatency, 0) + (connections.length * 5);
        }
    } else {
        totalLatency = componentMetrics.reduce((sum, c) => sum + c.actualLatency, 0) + (componentMetrics.length * 5);
    }
    
    // Check for cache and reduce DB latency
    const hasCache = componentMetrics.some(c => c.type === 'Redis' || c.type === 'Memcached');
    const cacheComponent = componentMetrics.find(c => c.type === 'Redis' || c.type === 'Memcached');
    if (hasCache && cacheComponent) {
        const def = componentDefinitions[cacheComponent.type];
        const cacheHitRatio = def.cacheHitRatio || 0.8;
        const dbComponents = componentMetrics.filter(c => 
            c.type.includes('RDS') || c.type.includes('Dynamo') || c.type.includes('Mongo')
        );
        if (dbComponents.length > 0) {
            // Reduce latency by cache hit ratio
            const dbLatencyReduction = dbComponents[0].actualLatency * cacheHitRatio * 0.5;
            totalLatency -= dbLatencyReduction;
        }
    }
    
    totalLatency = Math.round(totalLatency);
    
    // Calculate total monthly cost
    const monthlyCost = Math.round(componentMetrics.reduce((sum, c) => sum + c.actualCost, 0));
    
    // Calculate throughput
    const bottleneckCapacity = Math.min(...componentMetrics.map(c => c.effectiveCapacity));
    const throughput = Math.min(bottleneckCapacity, traffic);
    
    // Detect bottlenecks
    const bottlenecks = componentMetrics.filter(c => c.isBottleneck);
    
    // Detect single points of failure
    const componentTypes = {};
    componentMetrics.forEach(c => {
        componentTypes[c.type] = (componentTypes[c.type] || 0) + 1;
    });
    const spofs = Object.entries(componentTypes)
        .filter(([type, count]) => count === 1)
        .map(([type]) => type);
    
    // Calculate availability based on redundancy and load
    let availability = 99.5;
    if (spofs.length === 0) {
        availability = 99.95;
    }
    // Reduce availability if system is overloaded
    const overloadedComponents = componentMetrics.filter(c => c.loadPercentage > 90);
    if (overloadedComponents.length > 0) {
        availability -= (overloadedComponents.length * 0.1);
    }
    availability = Math.max(95, Math.round(availability * 100) / 100);
    
    // Generate suggestions
    const suggestions = generateSuggestions(bottlenecks, spofs, monthlyCost, totalLatency, componentMetrics, users);
    
    // Add connection-related suggestions
    if (connections.length === 0 && components.length > 1) {
        suggestions.unshift({
            type: 'optimization',
            message: 'No connections defined. Click "🔗 Connect" to define data flow between components for accurate latency calculation.',
            impact: {}
        });
    }
    
    return {
        latency: totalLatency,
        cost: monthlyCost,
        throughput,
        availability,
        bottlenecks,
        spofs,
        suggestions,
        connectionCount: connections.length,
        componentMetrics,
        loadFactor: Math.round(loadFactor * 100) / 100,
        meetsRequirements: {
            latency: totalLatency <= systemContext.nfrs.latency,
            cost: monthlyCost <= systemContext.businessContext.budget,
            availability: availability >= systemContext.nfrs.availability
        }
    };
}

function generateSuggestions(bottlenecks, spofs, cost, latency, componentMetrics, users) {
    const suggestions = [];
    const traffic = systemContext.requirements.traffic || 10000;
    
    // Bottleneck suggestions with specific scaling recommendations
    if (bottlenecks.length > 0) {
        bottlenecks.forEach(b => {
            const def = componentDefinitions[b.type];
            let scalingAdvice = '';
            let costImpact = 50;
            let action = null;
            
            if (def.instancesNeeded) {
                const currentInstances = b.scalingConfig?.instances || def.instancesNeeded(users);
                const neededInstances = Math.ceil(currentInstances * 1.5);
                scalingAdvice = `Scale from ${currentInstances} to ${neededInstances} instances`;
                costImpact = (neededInstances - currentInstances) * def.costPerInstance;
            } else if (def.autoScales) {
                scalingAdvice = 'Enable auto-scaling to handle load spikes';
                costImpact = Math.round(def.baseCost * 0.3);
            } else {
                scalingAdvice = 'Add horizontal scaling or upgrade instance size';
                costImpact = Math.round(def.baseCost * 0.5);
            }
            
            const neededInstances = def.instancesNeeded ? Math.ceil(def.instancesNeeded(users) * 1.5) : Math.ceil((b.scalingConfig?.instances || 1) * 1.5);
            
            suggestions.push({
                type: 'critical',
                message: `${b.name} is at ${b.loadPercentage}% capacity (bottleneck). ${scalingAdvice}.`,
                impact: { latency: -20, cost: costImpact },
                action: {
                    type: 'scale-component',
                    componentId: b.id,
                    instances: neededInstances,
                    label: `Scale to ${neededInstances} instances`
                }
            });
        });
    }
    
    // High load warnings
    const highLoadComponents = componentMetrics.filter(c => c.loadPercentage > 70 && c.loadPercentage <= 90);
    if (highLoadComponents.length > 0) {
        highLoadComponents.forEach(c => {
            const def = componentDefinitions[c.type];
            const currentInstances = c.scalingConfig?.instances || 1;
            const suggestedInstances = Math.ceil(currentInstances * 1.3);
            
            suggestions.push({
                type: 'optimization',
                message: `${c.name} is at ${c.loadPercentage}% capacity. Consider scaling before it becomes a bottleneck.`,
                impact: { cost: Math.round(c.actualCost * 0.3) },
                action: {
                    type: 'scale-component',
                    componentId: c.id,
                    instances: suggestedInstances,
                    label: `Scale to ${suggestedInstances} instances`
                }
            });
        });
    }
    
    // SPOF suggestions with specific redundancy recommendations
    if (spofs.length > 0) {
        spofs.forEach(type => {
            const def = componentDefinitions[type];
            const comp = componentMetrics.find(c => c.type === type);
            let redundancyAdvice = '';
            let costImpact = def.baseCost;
            
            if (type.includes('RDS')) {
                redundancyAdvice = 'Add Multi-AZ deployment and read replica';
                costImpact = def.readReplicaCost + 20;
            } else if (type.includes('EC2')) {
                redundancyAdvice = 'Deploy across multiple availability zones';
                costImpact = def.costPerInstance;
            } else {
                redundancyAdvice = 'Add redundant instance for high availability';
            }
            
            suggestions.push({
                type: 'critical',
                message: `${def.name} is a single point of failure. ${redundancyAdvice}.`,
                impact: { availability: 0.45, cost: costImpact },
                action: {
                    type: 'add-redundancy',
                    componentId: comp.id,
                    componentType: type,
                    label: 'Add Redundancy'
                }
            });
        });
    }
    
    // Cache suggestion with impact calculation
    const hasCache = componentMetrics.some(c => c.type === 'Redis' || c.type === 'Memcached');
    const hasDB = componentMetrics.some(c => c.type.includes('RDS') || c.type.includes('Dynamo') || c.type.includes('Mongo'));
    
    if (!hasCache && hasDB && systemContext.techStack.cache.length > 0) {
        const dbComponent = componentMetrics.find(c => c.type.includes('RDS') || c.type.includes('Dynamo') || c.type.includes('Mongo'));
        const latencyReduction = Math.round(dbComponent.actualLatency * 0.4);
        
        suggestions.push({
            type: 'optimization',
            message: `Add Redis cache to reduce database load by 80% and improve latency by ~${latencyReduction}ms. Especially beneficial with ${users.toLocaleString()} concurrent users.`,
            impact: { latency: -latencyReduction, cost: 15 + Math.round(users / 1000) },
            action: {
                type: 'add-component',
                componentType: 'Redis',
                position: 'near-database',
                label: 'Add Redis Cache'
            }
        });
    }
    
    // Cost optimization based on user count
    if (cost > systemContext.businessContext.budget) {
        const overage = cost - systemContext.businessContext.budget;
        const percentOver = Math.round((overage / systemContext.businessContext.budget) * 100);
        
        suggestions.push({
            type: 'critical',
            message: `Cost ($${cost}) exceeds budget by ${percentOver}% ($${overage}). With ${users.toLocaleString()} users, consider: 1) Serverless (Lambda) for compute, 2) DynamoDB for database, 3) CloudFront CDN.`,
            impact: { cost: -Math.round(overage * 0.6) }
        });
    }
    
    // Latency optimization with user-aware suggestions
    if (latency > systemContext.nfrs.latency) {
        const latencyExcess = latency - systemContext.nfrs.latency;
        
        suggestions.push({
            type: 'optimization',
            message: `Latency (${latency}ms) exceeds target by ${latencyExcess}ms. With ${users.toLocaleString()} users: 1) Add CDN/edge locations, 2) Implement caching, 3) Optimize database queries.`,
            impact: { latency: -Math.round(latencyExcess * 0.6), cost: 20 + Math.round(users / 5000) * 10 }
        });
    }
    
    // User scaling recommendations
    if (users > 50000) {
        const hasLoadBalancer = componentMetrics.some(c => c.type === 'load-balancer');
        if (!hasLoadBalancer) {
            suggestions.push({
                type: 'critical',
                message: `With ${users.toLocaleString()} concurrent users, you need a load balancer for traffic distribution and high availability.`,
                impact: { availability: 0.3, cost: 20 },
                action: {
                    type: 'add-component',
                    componentType: 'load-balancer',
                    position: 'front',
                    label: 'Add Load Balancer'
                }
            });
        }
    }
    
    if (users > 100000) {
        const regions = systemContext.requirements.regions.length;
        if (regions < 2) {
            suggestions.push({
                type: 'optimization',
                message: `With ${users.toLocaleString()} users, consider multi-region deployment for better performance and disaster recovery.`,
                impact: { latency: -30, availability: 0.5, cost: Math.round(cost * 0.8) }
            });
        }
    }
    
    // Database connection pool warning
    const dbComponents = componentMetrics.filter(c => c.type.includes('RDS') || c.type.includes('Mongo'));
    if (dbComponents.length > 0 && users > 10000) {
        const connectionsNeeded = Math.ceil(users / 100);
        suggestions.push({
            type: 'optimization',
            message: `With ${users.toLocaleString()} users, ensure database connection pooling (need ~${connectionsNeeded} connections). Consider RDS Proxy or connection pooler.`,
            impact: { latency: -10, cost: 10 }
        });
    }
    
    return suggestions;
}

function displayResults(results) {
    const metricsContent = document.getElementById('metrics-content');
    
    let html = '<div class="metrics-display">';
    
    // AI Overall Assessment (if available)
    if (results.aiAnalysis) {
        const scoreColor = results.overallScore >= 80 ? '#28a745' : results.overallScore >= 60 ? '#ffc107' : '#dc3545';
        html += `
            <div class="metric-card" style="grid-column: 1 / -1; border-left-color: ${scoreColor};">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <div class="metric-label">🤖 AI Solution Architect Assessment</div>
                    <div style="font-size: 32px; font-weight: 700; color: ${scoreColor};">${results.overallScore}/100</div>
                </div>
                <div style="font-size: 14px; color: #495057; margin-bottom: 12px;">
                    ${results.overallSummary}
                </div>
                ${results.strengths.length > 0 ? `
                    <div style="margin-bottom: 8px;">
                        <strong style="color: #28a745;">✅ Strengths:</strong>
                        <ul style="margin: 4px 0 0 20px; font-size: 13px;">
                            ${results.strengths.map(s => `<li>${s}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                ${results.concerns.length > 0 ? `
                    <div>
                        <strong style="color: #dc3545;">⚠️ Concerns:</strong>
                        <ul style="margin: 4px 0 0 20px; font-size: 13px;">
                            ${results.concerns.map(c => `<li>${c}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    // Latency with AI breakdown
    html += `
        <div class="metric-card ${results.meetsRequirements.latency ? 'success' : 'error'}">
            <div class="metric-label">Latency (p95)</div>
            <div class="metric-value">${results.latency}ms</div>
            ${results.latencyBreakdown ? `
                <div style="font-size: 11px; color: #6c757d; margin-top: 4px;">
                    p50: ${results.latencyBreakdown.p50}ms | p99: ${results.latencyBreakdown.p99}ms
                </div>
            ` : ''}
            <div class="metric-target">Target: ${systemContext.nfrs.latency}ms</div>
            <span class="metric-status ${results.meetsRequirements.latency ? 'pass' : 'fail'}">
                ${results.meetsRequirements.latency ? '✓ PASS' : '✗ FAIL'}
            </span>
        </div>
    `;
    
    // Cost
    html += `
        <div class="metric-card ${results.meetsRequirements.cost ? 'success' : 'error'}">
            <div class="metric-label">Monthly Cost</div>
            <div class="metric-value">$${results.cost}</div>
            ${results.costBreakdown ? `
                <div style="font-size: 10px; color: #6c757d; margin-top: 4px;">
                    Compute: $${results.costBreakdown.compute} | DB: $${results.costBreakdown.database}<br>
                    Network: $${results.costBreakdown.networking} | Storage: $${results.costBreakdown.storage}
                </div>
            ` : ''}
            <div class="metric-target">Budget: $${systemContext.businessContext.budget}</div>
            <span class="metric-status ${results.meetsRequirements.cost ? 'pass' : 'fail'}">
                ${results.meetsRequirements.cost ? '✓ PASS' : '✗ FAIL'}
            </span>
        </div>
    `;
    
    // Throughput
    html += `
        <div class="metric-card">
            <div class="metric-label">Max Throughput</div>
            <div class="metric-value">${results.throughput.toLocaleString()}</div>
            <div class="metric-target">Required: ${systemContext.requirements.traffic.toLocaleString()} req/min</div>
        </div>
    `;
    
    // Availability
    html += `
        <div class="metric-card ${results.meetsRequirements.availability ? 'success' : 'warning'}">
            <div class="metric-label">Availability</div>
            <div class="metric-value">${results.availability}%</div>
            <div class="metric-target">Target: ${systemContext.nfrs.availability}%</div>
            <span class="metric-status ${results.meetsRequirements.availability ? 'pass' : 'fail'}">
                ${results.meetsRequirements.availability ? '✓ PASS' : '✗ FAIL'}
            </span>
        </div>
    `;
    
    // Architecture Info
    html += `
        <div class="metric-card" style="border-left-color: #6c757d;">
            <div class="metric-label">Architecture</div>
            <div style="font-size: 14px; color: #495057; margin-top: 8px;">
                <div>📦 ${components.length} Components</div>
                <div>🔗 ${results.connectionCount} Connections</div>
                <div>👥 ${systemContext.requirements.users.toLocaleString()} Users</div>
                <div>📊 Load Factor: ${results.loadFactor}x</div>
            </div>
        </div>
    `;
    
    // Compliance Info
    const deployedRegions = [...new Set(components.filter(c => c.region).map(c => c.region))];
    if (deployedRegions.length > 0) {
        const complianceInfo = complianceData.getComplianceForRegions(deployedRegions);
        
        html += `
            <div class="metric-card" style="border-left-color: #667eea;">
                <div class="metric-label">📋 Compliance Status</div>
                <div style="font-size: 13px; color: #495057; margin-top: 8px;">
                    <div style="margin-bottom: 8px;">
                        <strong>Deployed Regions:</strong> ${deployedRegions.length}
                    </div>
                    ${complianceInfo.supported.length > 0 ? `
                        <div style="margin-bottom: 8px;">
                            <strong style="color: #155724;">✅ Supported:</strong><br>
                            ${complianceInfo.supported.map(c => `<span class="compliance-badge" style="margin: 2px;">${c}</span>`).join('')}
                        </div>
                    ` : ''}
                    ${complianceInfo.warnings.length > 0 ? `
                        <div style="margin-top: 12px;">
                            ${complianceInfo.warnings.map(w => `
                                <div class="compliance-warning ${w.severity}" style="margin-bottom: 8px; padding: 8px; font-size: 11px;">
                                    <div style="font-weight: 600; margin-bottom: 4px;">⚠️ ${w.type}</div>
                                    <div>${w.message}</div>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                    ${deployedRegions.length > 1 ? `
                        <div style="margin-top: 8px; font-size: 11px; color: #6c757d;">
                            <strong>Max Inter-Region Latency:</strong> ${complianceData.getMaxLatencyBetweenRegions(deployedRegions)}ms
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    // Component Load Details
    if (results.componentMetrics && results.componentMetrics.length > 0) {
        html += '<div class="component-loads-section"><h4>⚡ Component Load</h4>';
        results.componentMetrics.forEach(comp => {
            const loadClass = comp.loadPercentage > 90 ? 'critical' : comp.loadPercentage > 70 ? 'warning' : 'normal';
            const loadColor = comp.loadPercentage > 90 ? '#dc3545' : comp.loadPercentage > 70 ? '#ffc107' : '#28a745';
            
            html += `
                <div class="load-item">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span style="font-size: 12px; font-weight: 600;">${comp.icon} ${comp.name}</span>
                        <span style="font-size: 11px; font-weight: 600; color: ${loadColor};">${comp.loadPercentage}%</span>
                    </div>
                    <div class="load-bar">
                        <div class="load-fill ${loadClass}" style="width: ${Math.min(comp.loadPercentage, 100)}%; background: ${loadColor};"></div>
                    </div>
                    <div style="font-size: 10px; color: #6c757d; margin-top: 2px;">
                        Latency: ${comp.actualLatency}ms | Cost: $${comp.actualCost}/mo
                    </div>
                </div>
            `;
        });
        html += '</div>';
    }
    
    html += '</div>';
    
    // Suggestions
    if (results.suggestions.length > 0) {
        html += '<div class="suggestions-section"><h4>💡 Suggestions</h4>';
        results.suggestions.forEach((s, index) => {
            html += `
                <div class="suggestion-item ${s.type}">
                    <div class="suggestion-content">
                        ${s.message}
                        <div class="suggestion-impact">
                            ${s.impact.latency ? `<span class="impact-badge ${s.impact.latency < 0 ? 'positive' : 'negative'}">${s.impact.latency}ms</span>` : ''}
                            ${s.impact.cost ? `<span class="impact-badge ${s.impact.cost < 0 ? 'positive' : 'negative'}">$${Math.abs(s.impact.cost)}/mo</span>` : ''}
                            ${s.impact.availability ? `<span class="impact-badge positive">+${s.impact.availability}%</span>` : ''}
                        </div>
                    </div>
                    ${s.action ? `
                        <button class="suggestion-action-btn" onclick='applySuggestion(${JSON.stringify(s.action)})' title="Click to apply this suggestion">
                            ✨ ${s.action.label}
                        </button>
                    ` : ''}
                </div>
            `;
        });
        html += '</div>';
    }
    
    // What-if scenarios
    html += `
        <div class="what-if-section">
            <h4>🔮 What-If Scenarios</h4>
            <button class="scenario-button" onclick="runScenario('db-crash')">
                Database Crash<br>
                <small>Estimated downtime: ${systemContext.nfrs.rto}min</small>
            </button>
            <button class="scenario-button" onclick="runScenario('traffic-spike')">
                10x Traffic Spike<br>
                <small>Test capacity limits</small>
            </button>
            <button class="scenario-button" onclick="runScenario('multi-region')">
                Add Multi-Region<br>
                <small>Cost: +$${Math.round(results.cost * 0.8)}/mo</small>
            </button>
        </div>
    `;
    
    metricsContent.innerHTML = html;
    
    // Highlight components with issues
    results.bottlenecks.forEach(b => {
        const el = document.getElementById(`component-${b.id}`);
        if (el) el.classList.add('warning');
    });
    
    results.spofs.forEach(type => {
        const comp = components.find(c => c.type === type);
        if (comp) {
            const el = document.getElementById(`component-${comp.id}`);
            if (el) el.classList.add('error');
        }
    });
}

function runScenario(scenario) {
    let message = '';
    
    switch(scenario) {
        case 'db-crash':
            const hasDbRedundancy = components.filter(c => c.type.includes('RDS') || c.type.includes('Dynamo') || c.type.includes('Mongo')).length > 1;
            if (hasDbRedundancy) {
                message = `✅ Database Crash Scenario:\n\nWith redundant databases, automatic failover occurs.\nDowntime: ~2 minutes\nData loss: None (within RPO of ${systemContext.nfrs.rpo}min)`;
            } else {
                message = `⚠️ Database Crash Scenario:\n\nSingle database detected!\nDowntime: ${systemContext.nfrs.rto} minutes (manual recovery)\nPotential data loss: Up to ${systemContext.nfrs.rpo} minutes\n\nRecommendation: Add read replica or multi-AZ deployment`;
            }
            break;
            
        case 'traffic-spike':
            const currentCapacity = Math.min(...components.map(c => c.capacity));
            const requiredCapacity = systemContext.requirements.traffic * 10;
            if (currentCapacity >= requiredCapacity) {
                message = `✅ 10x Traffic Spike:\n\nSystem can handle ${currentCapacity.toLocaleString()} req/min\nRequired: ${requiredCapacity.toLocaleString()} req/min\n\nStatus: PASS\nLatency increase: ~20%`;
            } else {
                message = `⚠️ 10x Traffic Spike:\n\nSystem capacity: ${currentCapacity.toLocaleString()} req/min\nRequired: ${requiredCapacity.toLocaleString()} req/min\n\nStatus: FAIL\nExpected: Service degradation, timeouts\n\nRecommendation: Add auto-scaling or increase capacity`;
            }
            break;
            
        case 'multi-region':
            const currentCost = components.reduce((sum, c) => sum + c.cost, 0);
            const multiRegionCost = currentCost * 1.8;
            const regions = systemContext.requirements.regions.length;
            message = `🌍 Multi-Region Deployment:\n\nCurrent regions: ${regions}\nProposed: ${regions + 1} regions\n\nCost impact: $${currentCost} → $${Math.round(multiRegionCost)}/mo\nLatency improvement: -30ms (global users)\nAvailability: 99.9% → 99.99%\n\nBenefits:\n• Disaster recovery\n• Lower latency for global users\n• Compliance with data residency`;
            break;
    }
    
    alert(message);
}

// Clear canvas
function clearCanvas() {
    if (components.length > 0 && !confirm('Clear all components and connections?')) {
        return;
    }
    components = [];
    connections = [];
    connectionMode = false;
    connectionStart = null;
    
    // Reset connection button
    const btn = document.getElementById('connection-btn');
    if (btn) {
        btn.style.background = 'transparent';
        btn.textContent = '🔗 Connect';
    }
    
    document.getElementById('components-layer').innerHTML = `
        <div id="canvas-hint" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: #6c757d; pointer-events: none;">
            <div style="font-size: 48px; margin-bottom: 16px;">👈</div>
            <div style="font-size: 18px; font-weight: 600;">Drag components here</div>
            <div style="font-size: 14px; margin-top: 8px;">or click "Load Sample" above</div>
        </div>
    `;
    document.getElementById('metrics-content').innerHTML = '<p class="placeholder">Design your architecture and click Simulate</p>';
    renderConnections();
}

// Load sample architecture on canvas
function loadSampleArchitecture() {
    // Clear existing
    components = [];
    connections = [];
    document.getElementById('components-layer').innerHTML = '';
    
    // Add sample components with IDs
    const apiGatewayId = componentIdCounter;
    addComponentToCanvas('api-gateway', 100, 100);
    
    const lbId = componentIdCounter;
    addComponentToCanvas('load-balancer', 300, 100);
    
    const lambdaId = componentIdCounter;
    addComponentToCanvas('Lambda', 500, 100);
    
    const dbId = componentIdCounter;
    addComponentToCanvas('RDS-PostgreSQL', 500, 300);
    
    let cacheId = null;
    // Check if Redis is available
    if (systemContext.techStack.cache.includes('Redis')) {
        cacheId = componentIdCounter;
        addComponentToCanvas('Redis', 300, 300);
    }
    
    // Create sample connections (flow)
    connections.push({ from: apiGatewayId, to: lbId });
    connections.push({ from: lbId, to: lambdaId });
    connections.push({ from: lambdaId, to: dbId });
    
    if (cacheId !== null) {
        connections.push({ from: lambdaId, to: cacheId });
    }
    
    renderConnections();
    
    alert('✅ Sample architecture loaded with connections! Click "Simulate" to see metrics.');
}

// Sample data loader
function loadSampleData() {
    // Set tech stack
    document.querySelectorAll('input[name="cloud"]').forEach(cb => {
        cb.checked = cb.value === 'AWS';
    });
    document.querySelectorAll('input[name="compute"]').forEach(cb => {
        cb.checked = cb.value === 'Lambda' || cb.value === 'EC2';
    });
    document.querySelectorAll('input[name="database"]').forEach(cb => {
        cb.checked = cb.value === 'RDS-PostgreSQL' || cb.value === 'DynamoDB';
    });
    document.querySelectorAll('input[name="cache"]').forEach(cb => {
        cb.checked = cb.value === 'Redis';
    });
    document.querySelectorAll('input[name="messaging"]').forEach(cb => {
        cb.checked = cb.value === 'SQS';
    });
    
    // Set requirements
    document.getElementById('traffic').value = 10000;
    document.getElementById('users').value = 5000;
    document.getElementById('dataVolume').value = 500;
    document.getElementById('peakHours').value = '9AM-11PM EST';
    document.querySelectorAll('input[name="region"]').forEach(cb => {
        cb.checked = cb.value === 'us-east-1';
    });
    
    // Set business context
    document.getElementById('industry').value = 'E-commerce';
    document.getElementById('budget').value = 5000;
    document.querySelectorAll('input[name="compliance"]').forEach(cb => {
        cb.checked = cb.value === 'PCI-DSS' || cb.value === 'GDPR';
    });
    
    // Set NFRs
    document.getElementById('latency').value = 200;
    document.getElementById('availability').value = 99.9;
    document.getElementById('rto').value = 15;
    document.getElementById('rpo').value = 5;
    
    alert('✅ Sample e-commerce data loaded! Click through the steps to see the pre-filled values.');
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to simulate
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (document.getElementById('design-container').style.display !== 'none') {
            e.preventDefault();
            simulate();
        }
    }
    
    // Delete key to remove selected component
    if (e.key === 'Delete' && selectedComponent !== null) {
        e.preventDefault();
        deleteComponent(selectedComponent);
        selectedComponent = null;
    }
    
    // Escape to deselect
    if (e.key === 'Escape') {
        document.querySelectorAll('.canvas-component').forEach(el => {
            el.classList.remove('selected');
        });
        selectedComponent = null;
    }
    
    // Zoom shortcuts (Ctrl/Cmd + Plus/Minus/0)
    if (document.getElementById('design-container').style.display !== 'none') {
        if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
            e.preventDefault();
            zoomCanvas('in');
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === '-' || e.key === '_')) {
            e.preventDefault();
            zoomCanvas('out');
        }
        if ((e.ctrlKey || e.metaKey) && e.key === '0') {
            e.preventDefault();
            zoomCanvas('reset');
        }
    }
});

// Apply Suggestion Actions
function applySuggestion(action) {
    if (!action) return;
    
    switch (action.type) {
        case 'scale-component':
            scaleComponentAction(action);
            break;
        case 'add-redundancy':
            addRedundancyAction(action);
            break;
        case 'add-component':
            addComponentAction(action);
            break;
        default:
            console.log('Unknown action type:', action.type);
    }
}

function scaleComponentAction(action) {
    const component = components.find(c => c.id === action.componentId);
    if (!component) {
        alert('Component not found!');
        return;
    }
    
    // Update scaling configuration
    if (!component.scalingConfig) {
        component.scalingConfig = {
            instances: 1,
            autoScale: false,
            minInstances: 1,
            maxInstances: 10
        };
    }
    
    component.scalingConfig.instances = action.instances;
    
    // Re-render component
    const element = document.getElementById(`component-${component.id}`);
    if (element) {
        element.remove();
        renderComponent(component);
    }
    
    // Show success message and re-simulate
    alert(`✅ Scaled ${component.name} to ${action.instances} instances!\n\nRe-running simulation...`);
    setTimeout(() => simulate(), 500);
}

function addRedundancyAction(action) {
    const originalComponent = components.find(c => c.id === action.componentId);
    if (!originalComponent) {
        alert('Component not found!');
        return;
    }
    
    // Open redundancy configuration modal
    openRedundancyModal(originalComponent, action.componentType);
}

function addComponentAction(action) {
    let x = 300;
    let y = 200;
    
    // Smart positioning based on type
    if (action.position === 'near-database') {
        // Find database component
        const dbComponent = components.find(c => 
            c.type.includes('RDS') || c.type.includes('Dynamo') || c.type.includes('Mongo')
        );
        if (dbComponent) {
            x = dbComponent.x - 150;
            y = dbComponent.y + 100;
        }
    } else if (action.position === 'front') {
        // Add at the front (left side)
        x = 100;
        y = 100;
    }
    
    // Check if component type is available in tech stack
    const def = componentDefinitions[action.componentType];
    if (!def) {
        alert(`${action.componentType} is not available in your tech stack!`);
        return;
    }
    
    // Add the component
    addComponentToCanvas(action.componentType, x, y);
    
    // Show success message
    alert(`✅ Added ${def.name} to your architecture!\n\nDon't forget to connect it using the 🔗 Connect button.\n\nRe-running simulation...`);
    setTimeout(() => simulate(), 500);
}

// Scaling Configuration
let currentConfigComponentId = null;

function openScalingConfig(componentId) {
    const component = components.find(c => c.id === componentId);
    if (!component) return;
    
    currentConfigComponentId = componentId;
    const def = componentDefinitions[component.type];
    
    // Show modal with tabs
    document.getElementById('scaling-modal').style.display = 'flex';
    
    // Populate component info
    const regionInfo = component.region ? complianceData.getRegionInfo(component.region) : null;
    document.getElementById('scaling-component-info').innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 32px;">${component.icon}</span>
            <div style="flex: 1;">
                <div style="font-weight: 600; font-size: 16px;">${component.name}</div>
                <div style="font-size: 12px; color: #6c757d;">
                    Base: ${def.baseLatency}ms latency | $${def.baseCost}/mo
                </div>
                ${regionInfo ? `
                    <div style="font-size: 11px; color: #667eea; margin-top: 4px;">
                        ${getRegionFlag(component.region)} ${regionInfo.name}
                        ${component.isPrimary ? ' • <strong>Primary</strong>' : ' • Replica'}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    // Add tabs for scaling and redundancy
    const modalBody = document.querySelector('#scaling-modal .modal-body');
    const existingTabs = modalBody.querySelector('.config-tabs');
    if (!existingTabs) {
        const tabs = document.createElement('div');
        tabs.className = 'config-tabs';
        tabs.innerHTML = `
            <button class="config-tab active" onclick="switchConfigTab('scaling')">⚙️ Scaling</button>
            <button class="config-tab" onclick="switchConfigTab('redundancy')">🔄 Redundancy</button>
        `;
        // Insert tabs after component info
        const componentInfo = document.getElementById('scaling-component-info');
        if (componentInfo && componentInfo.nextSibling) {
            modalBody.insertBefore(tabs, componentInfo.nextSibling);
        } else {
            modalBody.insertBefore(tabs, modalBody.firstChild);
        }
    } else {
        // Reset tabs to scaling
        document.querySelectorAll('.config-tab').forEach(btn => {
            btn.classList.remove('active');
            if (btn.textContent.includes('Scaling')) {
                btn.classList.add('active');
            }
        });
    }
    
    // Set current values
    const autoScale = component.scalingConfig?.autoScale || false;
    const instances = component.scalingConfig?.instances || 1;
    const minInstances = component.scalingConfig?.minInstances || 1;
    const maxInstances = component.scalingConfig?.maxInstances || 10;
    
    document.getElementById('auto-scale-toggle').checked = autoScale;
    document.getElementById('instances-input').value = instances;
    document.getElementById('min-instances').value = minInstances;
    document.getElementById('max-instances').value = maxInstances;
    
    toggleAutoScale();
    updateScalingImpact();
    
    // Populate redundancy info if component is part of a group
    populateRedundancyTab(component);
    
    // Ensure scaling tab is shown by default
    switchConfigTab('scaling');
}

function switchConfigTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.config-tab').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.includes(tab === 'scaling' ? 'Scaling' : 'Redundancy')) {
            btn.classList.add('active');
        }
    });
    
    // Show/hide content - find all scaling-related elements
    const autoScaleGroup = document.querySelector('#auto-scale-toggle')?.closest('.form-group');
    const manualInstanceControls = document.getElementById('manual-instance-controls');
    const autoScaleRangeControls = document.getElementById('auto-scale-range-controls');
    const redundancyContent = document.getElementById('redundancy-tab-content');
    
    if (tab === 'scaling') {
        if (autoScaleGroup) autoScaleGroup.style.display = 'block';
        if (manualInstanceControls) manualInstanceControls.style.display = 'block';
        if (autoScaleRangeControls) autoScaleRangeControls.style.display = 'block';
        if (redundancyContent) redundancyContent.style.display = 'none';
    } else {
        if (autoScaleGroup) autoScaleGroup.style.display = 'none';
        if (manualInstanceControls) manualInstanceControls.style.display = 'none';
        if (autoScaleRangeControls) autoScaleRangeControls.style.display = 'none';
        if (redundancyContent) redundancyContent.style.display = 'block';
    }
}

function populateRedundancyTab(component) {
    const modalBody = document.querySelector('#scaling-modal .modal-body');
    let redundancyTab = document.getElementById('redundancy-tab-content');
    
    if (!redundancyTab) {
        redundancyTab = document.createElement('div');
        redundancyTab.id = 'redundancy-tab-content';
        redundancyTab.style.display = 'none';
        modalBody.appendChild(redundancyTab);
    }
    
    if (component.redundancyGroup) {
        // Component is part of a redundancy group
        const groupComponents = components.filter(c => c.redundancyGroup === component.redundancyGroup);
        const regions = groupComponents.map(c => c.region).filter(r => r);
        
        redundancyTab.innerHTML = `
            <div style="padding: 16px; background: #e7f3ff; border-radius: 8px; margin-bottom: 16px;">
                <h4 style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">📊 Current Redundancy</h4>
                <div style="font-size: 13px; line-height: 1.6;">
                    <div><strong>Strategy:</strong> ${component.redundancyStrategy || 'Multi-Region'}</div>
                    <div><strong>Regions:</strong> ${regions.length}</div>
                    <div><strong>Components:</strong> ${groupComponents.length}</div>
                    <div><strong>Role:</strong> ${component.isPrimary ? 'Primary' : 'Replica'}</div>
                </div>
            </div>
            
            <div style="padding: 16px; background: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
                <h4 style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">⚠️ Manage Redundancy Group</h4>
                <p style="font-size: 12px; margin-bottom: 12px;">
                    This component is part of a redundancy group. Changes affect the entire group.
                </p>
                <button class="btn-primary" onclick="editRedundancyGroup('${component.redundancyGroup}')" style="width: 100%; margin-bottom: 8px;">
                    ✏️ Edit Redundancy
                </button>
                <button class="btn-secondary" onclick="viewRedundancyGroup('${component.redundancyGroup}')" style="width: 100%; margin-bottom: 8px;">
                    �️️ View All Components
                </button>
                <button class="btn-secondary" onclick="removeFromRedundancyGroup(${component.id})" style="width: 100%; background: #dc3545; color: white;">
                    🗑️ Remove from Group
                </button>
            </div>
        `;
    } else {
        // Component is not redundant
        redundancyTab.innerHTML = `
            <div style="padding: 16px; background: #f8d7da; border-radius: 8px; border-left: 4px solid #dc3545; margin-bottom: 16px;">
                <h4 style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">⚠️ No Redundancy</h4>
                <p style="font-size: 13px; margin-bottom: 0;">
                    This component is a single point of failure. Add redundancy for high availability.
                </p>
            </div>
            
            <button class="btn-primary" onclick="addRedundancyFromSettings(${component.id})" style="width: 100%;">
                ✨ Add Redundancy
            </button>
            
            <div style="margin-top: 16px; padding: 12px; background: #e7f3ff; border-radius: 8px;">
                <h4 style="font-size: 12px; font-weight: 600; margin-bottom: 8px;">💡 Benefits of Redundancy:</h4>
                <ul style="font-size: 11px; margin: 0; padding-left: 20px; line-height: 1.6;">
                    <li>Eliminates single point of failure</li>
                    <li>Improves availability (99.5% → 99.95%+)</li>
                    <li>Enables disaster recovery</li>
                    <li>Supports global distribution</li>
                </ul>
            </div>
        `;
    }
}

function addRedundancyFromSettings(componentId) {
    closeScalingConfig();
    const component = components.find(c => c.id === componentId);
    if (component) {
        openRedundancyModal(component, component.type);
    }
}

function viewRedundancyGroup(groupId) {
    const groupComponents = components.filter(c => c.redundancyGroup === groupId);
    const componentNames = groupComponents.map(c => 
        `${c.isPrimary ? '👑' : '📦'} ${c.name} (${c.region ? complianceData.getRegionInfo(c.region).name : 'Unknown'})`
    ).join('\n');
    
    alert(`Redundancy Group Components:\n\n${componentNames}\n\nAll components are highlighted on the canvas.`);
    
    // Highlight all components in the group
    groupComponents.forEach(c => {
        const el = document.getElementById(`component-${c.id}`);
        if (el) {
            el.style.animation = 'pulse 1s 3';
        }
    });
}

function removeFromRedundancyGroup(componentId) {
    const component = components.find(c => c.id === componentId);
    if (!component || !component.redundancyGroup) {
        alert('Component is not part of a redundancy group!');
        return;
    }
    
    // Check how many components are in the group
    const groupComponents = components.filter(c => c.redundancyGroup === component.redundancyGroup);
    
    if (groupComponents.length <= 1) {
        alert('❌ Cannot remove the last component from a redundancy group!\n\nThis would break the entire redundancy setup.\n\nIf you want to remove redundancy, delete all components in the group manually.');
        return;
    }
    
    if (!confirm(`Remove this component from the redundancy group?\n\nGroup currently has ${groupComponents.length} components.\nAfter removal: ${groupComponents.length - 1} components remaining.\n\nThis will delete the component and its connections.`)) {
        return;
    }
    
    deleteComponent(componentId);
    closeScalingConfig();
}

function closeScalingConfig() {
    document.getElementById('scaling-modal').style.display = 'none';
    currentConfigComponentId = null;
}

function toggleAutoScale() {
    const autoScale = document.getElementById('auto-scale-toggle').checked;
    const manualControls = document.getElementById('manual-instance-controls');
    const autoScaleRangeControls = document.getElementById('auto-scale-range-controls');
    
    if (autoScale) {
        // Auto-scaling enabled: disable manual controls, enable auto-scale range
        if (manualControls) {
            manualControls.style.opacity = '0.5';
            manualControls.style.pointerEvents = 'none';
        }
        if (autoScaleRangeControls) {
            autoScaleRangeControls.style.opacity = '1';
            autoScaleRangeControls.style.pointerEvents = 'auto';
        }
    } else {
        // Manual scaling: enable manual controls, disable auto-scale range
        if (manualControls) {
            manualControls.style.opacity = '1';
            manualControls.style.pointerEvents = 'auto';
        }
        if (autoScaleRangeControls) {
            autoScaleRangeControls.style.opacity = '0.5';
            autoScaleRangeControls.style.pointerEvents = 'none';
        }
    }
    
    updateScalingImpact();
}

function adjustInstances(delta) {
    const input = document.getElementById('instances-input');
    let value = parseInt(input.value) + delta;
    value = Math.max(1, Math.min(50, value));
    input.value = value;
    updateScalingImpact();
}

function updateScalingImpact() {
    const component = components.find(c => c.id === currentConfigComponentId);
    if (!component) return;
    
    const def = componentDefinitions[component.type];
    const autoScale = document.getElementById('auto-scale-toggle').checked;
    const instances = parseInt(document.getElementById('instances-input').value);
    
    let costImpact = def.baseCost;
    let latencyImpact = def.baseLatency;
    
    if (!autoScale && instances > 1) {
        if (def.costPerInstance) {
            costImpact = def.baseCost + (def.costPerInstance * (instances - 1));
        } else if (def.costPerTask) {
            costImpact = def.baseCost + (def.costPerTask * (instances - 1));
        } else if (def.costPerNode) {
            costImpact = def.baseCost + (def.costPerNode * (instances - 1));
        } else {
            costImpact = def.baseCost * instances;
        }
        
        // Latency improves with horizontal scaling (load distribution)
        latencyImpact = Math.round(def.baseLatency / Math.sqrt(instances));
    }
    
    const costDiff = costImpact - def.baseCost;
    const latencyDiff = latencyImpact - def.baseLatency;
    
    document.getElementById('scaling-impact').innerHTML = `
        <div style="display: flex; gap: 16px; flex-wrap: wrap;">
            <div>
                <strong>Cost:</strong> $${Math.round(costImpact)}/mo 
                ${costDiff > 0 ? `<span style="color: #dc3545;">(+$${Math.round(costDiff)})</span>` : ''}
            </div>
            <div>
                <strong>Latency:</strong> ~${latencyImpact}ms 
                ${latencyDiff < 0 ? `<span style="color: #28a745;">(${latencyDiff}ms)</span>` : ''}
            </div>
        </div>
        ${autoScale ? '<div style="margin-top: 8px; color: #667eea;">⚡ Will scale automatically based on load</div>' : ''}
    `;
}

function saveScalingConfig() {
    const component = components.find(c => c.id === currentConfigComponentId);
    if (!component) return;
    
    component.scalingConfig = {
        autoScale: document.getElementById('auto-scale-toggle').checked,
        instances: parseInt(document.getElementById('instances-input').value),
        minInstances: parseInt(document.getElementById('min-instances').value),
        maxInstances: parseInt(document.getElementById('max-instances').value)
    };
    
    // Re-render the component to show updated config
    const element = document.getElementById(`component-${component.id}`);
    if (element) {
        const x = component.x;
        const y = component.y;
        element.remove();
        renderComponent(component);
    }
    
    closeScalingConfig();
    
    // Show success message
    alert(`✅ Scaling configuration updated for ${component.name}!\n\nClick "Simulate" to see the impact on metrics.`);
}

// Redundancy Modal Functions
let currentRedundancyComponent = null;
let currentRedundancyType = null;
let selectedRegionsForRedundancy = [];

function openRedundancyModal(component, componentType) {
    currentRedundancyComponent = component;
    currentRedundancyType = componentType;
    selectedRegionsForRedundancy = [systemContext.requirements.regions[0] || 'us-east-1'];
    
    document.getElementById('redundancy-modal').style.display = 'flex';
    
    // Populate component info
    const def = componentDefinitions[componentType];
    document.getElementById('redundancy-component-info').innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 32px;">${component.icon}</span>
            <div>
                <div style="font-weight: 600; font-size: 16px;">${component.name}</div>
                <div style="font-size: 12px; color: #6c757d;">
                    Adding redundancy for high availability
                </div>
            </div>
        </div>
    `;
    
    // Populate regions
    populateRegionSelection();
    updateRedundancyPreview();
}

function closeRedundancyModal() {
    document.getElementById('redundancy-modal').style.display = 'none';
    currentRedundancyComponent = null;
    currentRedundancyType = null;
    selectedRegionsForRedundancy = [];
    
    // Reset button text and onclick
    const applyBtn = document.querySelector('#redundancy-modal .btn-primary');
    if (applyBtn) {
        applyBtn.textContent = 'Deploy Redundancy';
        applyBtn.onclick = applyRedundancy;
    }
}

function populateRegionSelection() {
    const regionGrid = document.getElementById('region-selection');
    const availableRegions = ['us-east-1', 'us-west-2', 'eu-west-1', 'eu-central-1', 'ap-south-1', 'ap-southeast-1', 'ap-northeast-1'];
    
    regionGrid.innerHTML = availableRegions.map(regionId => {
        const region = complianceData.getRegionInfo(regionId);
        const isSelected = selectedRegionsForRedundancy.includes(regionId);
        
        return `
            <div class="region-item ${isSelected ? 'selected' : ''}" onclick="toggleRegionSelection('${regionId}')">
                <div class="region-name">${region.name}</div>
                <div class="region-country">📍 ${region.country}</div>
            </div>
        `;
    }).join('');
}

function toggleRegionSelection(regionId) {
    const index = selectedRegionsForRedundancy.indexOf(regionId);
    if (index > -1) {
        if (selectedRegionsForRedundancy.length > 1) {
            selectedRegionsForRedundancy.splice(index, 1);
        } else {
            alert('At least one region must be selected!');
            return;
        }
    } else {
        selectedRegionsForRedundancy.push(regionId);
    }
    
    populateRegionSelection();
    updateComplianceInfo();
    updateRedundancyPreview();
}

function updateComplianceInfo() {
    const complianceInfo = complianceData.getComplianceForRegions(selectedRegionsForRedundancy);
    const complianceDetails = document.getElementById('compliance-details');
    
    let html = '';
    
    // Supported compliance
    if (complianceInfo.supported.length > 0) {
        html += '<div style="margin-bottom: 12px;">';
        html += '<div style="font-size: 12px; font-weight: 600; margin-bottom: 6px; color: #155724;">✅ Supported Compliance:</div>';
        complianceInfo.supported.forEach(comp => {
            html += `<span class="compliance-badge">${comp}</span>`;
        });
        html += '</div>';
    }
    
    // Warnings
    if (complianceInfo.warnings.length > 0) {
        complianceInfo.warnings.forEach(warning => {
            html += `
                <div class="compliance-warning ${warning.severity}">
                    <div class="compliance-warning-title">⚠️ ${warning.type}</div>
                    <div class="compliance-warning-message">${warning.message}</div>
                </div>
            `;
        });
    }
    
    // Region details
    html += '<div style="margin-top: 12px; font-size: 11px; color: #6c757d;">';
    html += `<strong>Selected Regions:</strong> ${selectedRegionsForRedundancy.length}<br>`;
    if (selectedRegionsForRedundancy.length > 1) {
        const maxLatency = complianceData.getMaxLatencyBetweenRegions(selectedRegionsForRedundancy);
        html += `<strong>Max Inter-Region Latency:</strong> ${maxLatency}ms`;
    }
    html += '</div>';
    
    complianceDetails.innerHTML = html || 'Select regions to see compliance information';
}

function updateRedundancyPreview() {
    const strategy = document.getElementById('redundancy-strategy').value;
    const def = componentDefinitions[currentRedundancyType];
    const previewDetails = document.getElementById('preview-details');
    
    let costMultiplier = selectedRegionsForRedundancy.length;
    let availabilityIncrease = 0.45;
    let latencyImpact = 0;
    
    switch (strategy) {
        case 'multi-az':
            costMultiplier = 1.2; // 20% overhead for multi-AZ
            availabilityIncrease = 0.3;
            latencyImpact = 2;
            break;
        case 'multi-region':
            costMultiplier = selectedRegionsForRedundancy.length;
            availabilityIncrease = 0.5;
            latencyImpact = -20; // CDN-like benefits
            break;
        case 'active-passive':
            costMultiplier = selectedRegionsForRedundancy.length * 0.8; // Passive is cheaper
            availabilityIncrease = 0.4;
            latencyImpact = 5;
            break;
        case 'active-active':
            costMultiplier = selectedRegionsForRedundancy.length;
            availabilityIncrease = 0.5;
            latencyImpact = -30; // Load distribution
            break;
    }
    
    const totalCost = Math.round(def.baseCost * costMultiplier);
    const costIncrease = Math.round(def.baseCost * (costMultiplier - 1));
    
    previewDetails.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; font-size: 13px;">
            <div>
                <strong>Strategy:</strong> ${strategy.replace('-', ' ').toUpperCase()}
            </div>
            <div>
                <strong>Regions:</strong> ${selectedRegionsForRedundancy.length}
            </div>
            <div>
                <strong>Cost Impact:</strong> <span style="color: #dc3545;">+$${costIncrease}/mo</span>
            </div>
            <div>
                <strong>Total Cost:</strong> $${totalCost}/mo
            </div>
            <div>
                <strong>Availability:</strong> <span style="color: #28a745;">+${availabilityIncrease}%</span>
            </div>
            <div>
                <strong>Latency:</strong> <span style="color: ${latencyImpact < 0 ? '#28a745' : '#dc3545'}">${latencyImpact > 0 ? '+' : ''}${latencyImpact}ms</span>
            </div>
        </div>
        <div style="margin-top: 12px; padding: 8px; background: #e7f3ff; border-radius: 4px; font-size: 11px;">
            💡 <strong>Recommendation:</strong> ${getStrategyRecommendation(strategy, selectedRegionsForRedundancy.length)}
        </div>
    `;
    
    updateComplianceInfo();
}

function getStrategyRecommendation(strategy, regionCount) {
    switch (strategy) {
        case 'multi-az':
            return 'Best for cost-effective high availability within a single region. RTO: ~2 minutes.';
        case 'multi-region':
            return 'Best for disaster recovery and global users. RTO: ~5 minutes. Highest availability.';
        case 'active-passive':
            return 'Cost-effective DR solution. Passive region only activates on failure. RTO: ~10 minutes.';
        case 'active-active':
            return 'Best performance and availability. Both regions serve traffic. RTO: ~0 minutes (automatic).';
        default:
            return 'Select a strategy for recommendations.';
    }
}

function applyRedundancy() {
    if (!currentRedundancyComponent || selectedRegionsForRedundancy.length === 0) {
        alert('Please select at least one region!');
        return;
    }
    
    const strategy = document.getElementById('redundancy-strategy').value;
    const originalComp = currentRedundancyComponent;
    
    // Create redundancy group container
    const redundancyGroup = {
        id: `redundancy-group-${Date.now()}`,
        originalComponentId: originalComp.id,
        strategy: strategy,
        regions: selectedRegionsForRedundancy,
        components: [originalComp.id]
    };
    
    // Calculate smart layout based on strategy
    const layout = calculateRedundancyLayout(originalComp, selectedRegionsForRedundancy.length, strategy);
    
    // Update original component with region info
    originalComp.region = selectedRegionsForRedundancy[0];
    originalComp.redundancyGroup = redundancyGroup.id;
    originalComp.isPrimary = true;
    
    // Add visual region badge to original
    addRegionBadge(originalComp);
    
    // Add redundant components with smart positioning
    const newComponents = [];
    selectedRegionsForRedundancy.forEach((region, index) => {
        if (index === 0) return; // Skip first region (original component)
        
        const position = layout.positions[index];
        const newComponentId = componentIdCounter;
        addComponentToCanvas(currentRedundancyType, position.x, position.y);
        
        // Add region metadata to the new component
        const newComponent = components.find(c => c.id === newComponentId);
        if (newComponent) {
            newComponent.region = region;
            newComponent.redundancyStrategy = strategy;
            newComponent.redundancyGroup = redundancyGroup.id;
            newComponent.isPrimary = false;
            redundancyGroup.components.push(newComponentId);
            newComponents.push(newComponent);
            
            // Add visual region badge
            addRegionBadge(newComponent);
        }
    });
    
    // Create redundancy connections based on strategy
    createRedundancyConnections(redundancyGroup, strategy);
    
    // Add visual grouping
    addRedundancyGroupVisual(redundancyGroup, layout);
    
    closeRedundancyModal();
    
    const regionNames = selectedRegionsForRedundancy.map(r => complianceData.getRegionInfo(r).name).join(', ');
    alert(`✅ Deployed redundancy across ${selectedRegionsForRedundancy.length} regions!\n\nRegions: ${regionNames}\nStrategy: ${strategy}\n\nComponents are visually grouped and connected.\n\nRe-running simulation...`);
    
    setTimeout(() => {
        renderConnections();
        simulate();
    }, 500);
}

function calculateRedundancyLayout(originalComp, regionCount, strategy) {
    const positions = [];
    const spacing = 200; // Horizontal spacing between components
    const verticalOffset = 150; // Vertical offset for multi-row layout
    
    // Calculate canvas bounds
    const canvasWidth = 1000;
    const canvasHeight = 600;
    
    switch (strategy) {
        case 'multi-az':
            // Horizontal line layout (same region, different AZs)
            for (let i = 0; i < regionCount; i++) {
                positions.push({
                    x: Math.min(originalComp.x + (spacing * i), canvasWidth - 160),
                    y: originalComp.y
                });
            }
            break;
            
        case 'multi-region':
            // Grid layout for multiple regions
            const cols = Math.ceil(Math.sqrt(regionCount));
            for (let i = 0; i < regionCount; i++) {
                const row = Math.floor(i / cols);
                const col = i % cols;
                positions.push({
                    x: Math.min(originalComp.x + (spacing * col), canvasWidth - 160),
                    y: Math.min(originalComp.y + (verticalOffset * row), canvasHeight - 120)
                });
            }
            break;
            
        case 'active-passive':
            // Primary on left, passive on right
            for (let i = 0; i < regionCount; i++) {
                positions.push({
                    x: Math.min(originalComp.x + (spacing * i), canvasWidth - 160),
                    y: originalComp.y + (i > 0 ? 50 : 0) // Slight offset for passive
                });
            }
            break;
            
        case 'active-active':
            // Circular/balanced layout
            const radius = 120;
            const centerX = originalComp.x + radius;
            const centerY = originalComp.y + radius;
            for (let i = 0; i < regionCount; i++) {
                const angle = (i / regionCount) * 2 * Math.PI;
                positions.push({
                    x: Math.min(Math.max(centerX + radius * Math.cos(angle), 20), canvasWidth - 160),
                    y: Math.min(Math.max(centerY + radius * Math.sin(angle), 20), canvasHeight - 120)
                });
            }
            break;
    }
    
    return { positions, strategy };
}

function addRegionBadge(component) {
    // Add region badge to component display
    setTimeout(() => {
        const element = document.getElementById(`component-${component.id}`);
        if (element && component.region) {
            const regionInfo = complianceData.getRegionInfo(component.region);
            const badge = document.createElement('div');
            badge.className = 'region-badge';
            badge.innerHTML = `
                <span class="region-flag">${getRegionFlag(component.region)}</span>
                <span class="region-code">${component.region.split('-')[0].toUpperCase()}</span>
            `;
            badge.style.cssText = `
                position: absolute;
                top: -12px;
                left: 50%;
                transform: translateX(-50%);
                background: ${component.isPrimary ? '#28a745' : '#667eea'};
                color: white;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 10px;
                font-weight: 600;
                white-space: nowrap;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                z-index: 10;
            `;
            element.appendChild(badge);
            
            // Add primary indicator ONLY if component is actually part of a redundancy group
            // Don't show green border just because redundancy tab was opened
            if (component.isPrimary && component.redundancyGroup) {
                element.style.borderColor = '#28a745';
                element.style.borderWidth = '4px';
                element.style.boxShadow = '0 0 0 3px rgba(40, 167, 69, 0.2)';
            } else if (component.redundancyGroup && !component.isPrimary) {
                // Replica components get blue border
                element.style.borderColor = '#667eea';
                element.style.borderWidth = '3px';
            }
        }
    }, 100);
}

function getRegionFlag(regionId) {
    const flags = {
        'us-east-1': '🇺🇸',
        'us-west-2': '🇺🇸',
        'eu-west-1': '🇮🇪',
        'eu-central-1': '🇩🇪',
        'ap-south-1': '🇮🇳',
        'ap-southeast-1': '🇸🇬',
        'ap-northeast-1': '🇯🇵'
    };
    return flags[regionId] || '🌐';
}

function createRedundancyConnections(redundancyGroup, strategy) {
    const compIds = redundancyGroup.components;
    
    switch (strategy) {
        case 'multi-az':
        case 'multi-region':
            // Mesh connections between all components (data replication)
            for (let i = 0; i < compIds.length; i++) {
                for (let j = i + 1; j < compIds.length; j++) {
                    connections.push({
                        from: compIds[i],
                        to: compIds[j],
                        bidirectional: true,
                        type: 'replication',
                        redundancyGroup: redundancyGroup.id
                    });
                }
            }
            break;
            
        case 'active-passive':
            // Primary to passive connections
            const primary = compIds[0];
            for (let i = 1; i < compIds.length; i++) {
                connections.push({
                    from: primary,
                    to: compIds[i],
                    bidirectional: false,
                    type: 'failover',
                    redundancyGroup: redundancyGroup.id
                });
            }
            break;
            
        case 'active-active':
            // Full mesh with load balancing
            for (let i = 0; i < compIds.length; i++) {
                for (let j = i + 1; j < compIds.length; j++) {
                    connections.push({
                        from: compIds[i],
                        to: compIds[j],
                        bidirectional: true,
                        type: 'load-balance',
                        redundancyGroup: redundancyGroup.id
                    });
                }
            }
            break;
    }
}

function addRedundancyGroupVisual(redundancyGroup, layout) {
    // Use the interactive updateRedundancyGroupBox function
    setTimeout(() => {
        updateRedundancyGroupBox(redundancyGroup.id);
    }, 200);
}

// Enhanced Connection Management
function renderConnections() {
    const svg = document.getElementById('canvas');
    const layer = document.getElementById('components-layer');
    
    // Clear existing lines, paths, and delete buttons
    svg.querySelectorAll('line, path, text').forEach(el => el.remove());
    layer.querySelectorAll('.connection-delete-btn').forEach(el => el.remove());
    
    connections.forEach((conn, index) => {
        const from = components.find(c => c.id === conn.from);
        const to = components.find(c => c.id === conn.to);
        
        if (from && to) {
            const x1 = from.x + 70;
            const y1 = from.y + 50;
            const x2 = to.x + 70;
            const y2 = to.y + 50;
            
            // Create curved path
            const dx = x2 - x1;
            const dy = y2 - y1;
            const curve = Math.abs(dx) * 0.3;
            
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const pathData = `M ${x1} ${y1} C ${x1 + curve} ${y1}, ${x2 - curve} ${y2}, ${x2} ${y2}`;
            
            path.setAttribute('d', pathData);
            // Set color based on connection type
            let strokeColor = '#667eea';
            if (conn.type === 'replication') strokeColor = '#17a2b8';
            else if (conn.type === 'failover') strokeColor = '#ffc107';
            else if (conn.type === 'load-balance') strokeColor = '#28a745';
            else if (conn.bidirectional) strokeColor = '#28a745';
            
            path.setAttribute('stroke', strokeColor);
            if (conn.type) {
                path.setAttribute('data-type', conn.type);
            }
            path.setAttribute('stroke-width', '3');
            path.setAttribute('fill', 'none');
            path.setAttribute('marker-end', 'url(#arrowhead)');
            path.setAttribute('class', 'connection-line');
            path.setAttribute('data-connection-index', index);
            path.setAttribute('id', `path-${index}`);
            
            // Add animation
            path.style.strokeDasharray = '10 5';
            path.style.animation = 'dash 1s linear infinite';
            path.style.pointerEvents = 'stroke';
            
            // Add click handler for context menu
            path.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                showConnectionContextMenu(e, index);
            });
            
            // Add hover effect
            path.addEventListener('mouseenter', () => {
                path.setAttribute('stroke-width', '5');
            });
            
            path.addEventListener('mouseleave', () => {
                path.setAttribute('stroke-width', '3');
            });
            
            svg.appendChild(path);
            
            // Add flow indicator with matching color
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('r', '4');
            circle.setAttribute('fill', strokeColor);
            circle.setAttribute('class', 'flow-indicator');
            
            const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animateMotion');
            animate.setAttribute('dur', '2s');
            animate.setAttribute('repeatCount', 'indefinite');
            animate.innerHTML = `<mpath href="#path-${index}"/>`;
            
            circle.appendChild(animate);
            svg.appendChild(circle);
            
            // Add bidirectional indicator if needed
            if (conn.bidirectional) {
                const backPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                const backPathData = `M ${x2} ${y2} C ${x2 - curve} ${y2}, ${x1 + curve} ${y1}, ${x1} ${y1}`;
                backPath.setAttribute('d', backPathData);
                backPath.setAttribute('stroke', '#28a745');
                backPath.setAttribute('stroke-width', '2');
                backPath.setAttribute('fill', 'none');
                backPath.setAttribute('marker-end', 'url(#arrowhead-green)');
                backPath.setAttribute('opacity', '0.6');
                backPath.style.strokeDasharray = '5 5';
                svg.appendChild(backPath);
            }
        }
    });
}

function showConnectionContextMenu(event, connectionIndex) {
    // Remove existing context menu
    const existingMenu = document.getElementById('connection-context-menu');
    if (existingMenu) existingMenu.remove();
    
    const menu = document.createElement('div');
    menu.id = 'connection-context-menu';
    menu.style.cssText = `
        position: fixed;
        left: ${event.clientX}px;
        top: ${event.clientY}px;
        background: white;
        border: 2px solid #667eea;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        padding: 8px;
        min-width: 180px;
    `;
    
    const conn = connections[connectionIndex];
    
    menu.innerHTML = `
        <div style="padding: 8px; cursor: pointer; border-radius: 4px; font-size: 13px;" onmouseover="this.style.background='#f8f9fa'" onmouseout="this.style.background='white'" onclick="toggleBidirectional(${connectionIndex})">
            ${conn.bidirectional ? '🔄 Make Unidirectional' : '🔄 Make Bidirectional'}
        </div>
        <div style="padding: 8px; cursor: pointer; border-radius: 4px; font-size: 13px; color: #dc3545;" onmouseover="this.style.background='#f8d7da'" onmouseout="this.style.background='white'" onclick="deleteConnection(${connectionIndex})">
            🗑️ Delete Connection
        </div>
    `;
    
    document.body.appendChild(menu);
    
    // Close menu on click outside
    setTimeout(() => {
        document.addEventListener('click', function closeMenu() {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        });
    }, 100);
}

function toggleBidirectional(index) {
    if (connections[index]) {
        connections[index].bidirectional = !connections[index].bidirectional;
        renderConnections();
    }
}

function deleteConnection(index) {
    if (confirm('Delete this connection?')) {
        connections.splice(index, 1);
        renderConnections();
    }
}

// Add green arrowhead for bidirectional connections
document.addEventListener('DOMContentLoaded', () => {
    const svg = document.getElementById('canvas');
    if (svg) {
        const defs = svg.querySelector('defs');
        const greenArrow = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        greenArrow.setAttribute('id', 'arrowhead-green');
        greenArrow.setAttribute('markerWidth', '10');
        greenArrow.setAttribute('markerHeight', '10');
        greenArrow.setAttribute('refX', '9');
        greenArrow.setAttribute('refY', '3');
        greenArrow.setAttribute('orient', 'auto');
        greenArrow.innerHTML = '<polygon points="0 0, 10 3, 0 6" fill="#28a745" />';
        defs.appendChild(greenArrow);
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('AI Architect - AI Powered System Solution Designer Studio initialized');
    console.log('Keyboard shortcuts:');
    console.log('  Ctrl/Cmd + Enter: Run simulation');
    console.log('  Delete: Remove selected component');
    console.log('  Escape: Deselect component');
    
    // Close modal on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.getElementById('scaling-modal').style.display === 'flex') {
            closeScalingConfig();
        }
    });
    
    // Close modal on background click
    document.getElementById('scaling-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'scaling-modal') {
            closeScalingConfig();
        }
    });
});


// Export functionality
let exportMenuOpen = false;

function showExportMenu(event) {
    if (components.length === 0) {
        alert('Please add components to your architecture first!');
        return;
    }
    
    event.stopPropagation();
    
    const menu = document.getElementById('export-menu');
    
    if (exportMenuOpen) {
        menu.style.display = 'none';
        exportMenuOpen = false;
        document.removeEventListener('click', closeExportMenu);
    } else {
        menu.style.display = 'block';
        exportMenuOpen = true;
        
        // Close menu when clicking outside
        setTimeout(() => {
            document.addEventListener('click', closeExportMenu);
        }, 100);
    }
}

function closeExportMenu(event) {
    const menu = document.getElementById('export-menu');
    if (menu && !menu.contains(event.target)) {
        menu.style.display = 'none';
        exportMenuOpen = false;
        document.removeEventListener('click', closeExportMenu);
    }
}

function showExportProgress(message) {
    const progress = document.createElement('div');
    progress.className = 'export-progress';
    progress.id = 'export-progress';
    progress.innerHTML = `
        <div class="export-spinner"></div>
        <div style="font-weight: 600; font-size: 16px; color: #2c3e50;">${message}</div>
    `;
    document.body.appendChild(progress);
}

function hideExportProgress() {
    const progress = document.getElementById('export-progress');
    if (progress) progress.remove();
}

// Export as PNG Image
async function exportAsImage() {
    const menu = document.getElementById('export-menu');
    menu.style.display = 'none';
    exportMenuOpen = false;
    document.removeEventListener('click', closeExportMenu);
    showExportProgress('Generating image...');
    
    try {
        // Use html2canvas library
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = async () => {
            const canvas = document.querySelector('.canvas-container');
            const screenshot = await html2canvas(canvas, {
                backgroundColor: '#ffffff',
                scale: 2,
                logging: false
            });
            
            screenshot.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `architecture-${Date.now()}.png`;
                a.click();
                URL.revokeObjectURL(url);
                hideExportProgress();
            });
        };
        document.head.appendChild(script);
    } catch (error) {
        console.error('Export failed:', error);
        hideExportProgress();
        alert('Export failed: ' + error.message);
    }
}

// Export as PDF
async function exportAsPDF() {
    const menu = document.getElementById('export-menu');
    menu.style.display = 'none';
    exportMenuOpen = false;
    document.removeEventListener('click', closeExportMenu);
    showExportProgress('Generating PDF...');
    
    try {
        // Load jsPDF library
        const script1 = document.createElement('script');
        script1.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script1.onload = () => {
            const script2 = document.createElement('script');
            script2.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            script2.onload = async () => {
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF('l', 'mm', 'a4');
                
                // Add title
                pdf.setFontSize(20);
                pdf.text('System Architecture Design', 20, 20);
                
                // Add metadata
                pdf.setFontSize(10);
                pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);
                pdf.text(`Components: ${components.length}`, 20, 35);
                pdf.text(`Connections: ${connections.length}`, 20, 40);
                pdf.text(`Users: ${systemContext.requirements.users.toLocaleString()}`, 20, 45);
                
                // Capture canvas
                const canvas = document.querySelector('.canvas-container');
                const screenshot = await html2canvas(canvas, {
                    backgroundColor: '#ffffff',
                    scale: 1.5
                });
                
                const imgData = screenshot.toDataURL('image/png');
                pdf.addImage(imgData, 'PNG', 20, 55, 250, 140);
                
                // Add metrics if available
                const metricsContent = document.getElementById('metrics-content');
                if (metricsContent && metricsContent.textContent.trim() !== '') {
                    pdf.addPage();
                    pdf.setFontSize(16);
                    pdf.text('Simulation Results', 20, 20);
                    
                    // Add basic metrics text
                    pdf.setFontSize(10);
                    let y = 30;
                    const lines = metricsContent.textContent.split('\n').filter(l => l.trim());
                    lines.slice(0, 30).forEach(line => {
                        if (y > 280) return;
                        pdf.text(line.substring(0, 100), 20, y);
                        y += 5;
                    });
                }
                
                pdf.save(`architecture-${Date.now()}.pdf`);
                hideExportProgress();
            };
            document.head.appendChild(script2);
        };
        document.head.appendChild(script1);
    } catch (error) {
        console.error('Export failed:', error);
        hideExportProgress();
        alert('Export failed: ' + error.message);
    }
}

// Export as JSON
function exportAsJSON() {
    const menu = document.getElementById('export-menu');
    menu.style.display = 'none';
    exportMenuOpen = false;
    document.removeEventListener('click', closeExportMenu);
    showExportProgress('Generating JSON...');
    
    try {
        // Get all unique component types used in the architecture
        const usedTypes = [...new Set(components.map(c => c.type))];
        const usedDefinitions = {};
        usedTypes.forEach(type => {
            if (componentDefinitions[type]) {
                usedDefinitions[type] = componentDefinitions[type];
            }
        });
        
        const exportData = {
            metadata: {
                version: '1.0',
                exportDate: new Date().toISOString(),
                appName: 'AI Architect - AI Powered System Solution Designer Studio'
            },
            systemContext: systemContext,
            architecture: {
                components: components.map(c => ({
                    id: c.id,
                    type: c.type,
                    name: c.name,
                    icon: c.icon,
                    x: c.x,
                    y: c.y,
                    scalingConfig: c.scalingConfig,
                    redundancyGroup: c.redundancyGroup,
                    redundancyStrategy: c.redundancyStrategy,
                    isPrimary: c.isPrimary,
                    region: c.region
                })),
                connections: connections
            },
            componentDefinitions: usedDefinitions
        };
        
        const json = JSON.stringify(exportData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `architecture-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        hideExportProgress();
    } catch (error) {
        console.error('Export failed:', error);
        hideExportProgress();
        alert('Export failed: ' + error.message);
    }
}

// Export as SVG
function exportAsSVG() {
    const menu = document.getElementById('export-menu');
    menu.style.display = 'none';
    exportMenuOpen = false;
    document.removeEventListener('click', closeExportMenu);
    showExportProgress('Generating SVG...');
    
    try {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '1200');
        svg.setAttribute('height', '800');
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        
        // Add white background
        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.setAttribute('width', '100%');
        bg.setAttribute('height', '100%');
        bg.setAttribute('fill', 'white');
        svg.appendChild(bg);
        
        // Draw connections
        connections.forEach(conn => {
            const fromComp = components.find(c => c.id === conn.from);
            const toComp = components.find(c => c.id === conn.to);
            if (fromComp && toComp) {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', fromComp.x + 70);
                line.setAttribute('y1', fromComp.y + 50);
                line.setAttribute('x2', toComp.x + 70);
                line.setAttribute('y2', toComp.y + 50);
                line.setAttribute('stroke', '#667eea');
                line.setAttribute('stroke-width', '2');
                line.setAttribute('marker-end', 'url(#arrowhead)');
                svg.appendChild(line);
            }
        });
        
        // Add arrow marker
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'arrowhead');
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '10');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '3');
        marker.setAttribute('orient', 'auto');
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '0 0, 10 3, 0 6');
        polygon.setAttribute('fill', '#667eea');
        marker.appendChild(polygon);
        defs.appendChild(marker);
        svg.appendChild(defs);
        
        // Draw components
        components.forEach(comp => {
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            
            // Component box
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', comp.x);
            rect.setAttribute('y', comp.y);
            rect.setAttribute('width', '140');
            rect.setAttribute('height', '100');
            rect.setAttribute('fill', 'white');
            rect.setAttribute('stroke', '#667eea');
            rect.setAttribute('stroke-width', '2');
            rect.setAttribute('rx', '8');
            g.appendChild(rect);
            
            // Icon
            const icon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            icon.setAttribute('x', comp.x + 20);
            icon.setAttribute('y', comp.y + 35);
            icon.setAttribute('font-size', '24');
            icon.textContent = comp.icon;
            g.appendChild(icon);
            
            // Name
            const name = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            name.setAttribute('x', comp.x + 50);
            name.setAttribute('y', comp.y + 35);
            name.setAttribute('font-size', '12');
            name.setAttribute('font-weight', 'bold');
            name.textContent = comp.name;
            g.appendChild(name);
            
            // Metrics
            const def = componentDefinitions[comp.type];
            if (def) {
                const metrics = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                metrics.setAttribute('x', comp.x + 10);
                metrics.setAttribute('y', comp.y + 60);
                metrics.setAttribute('font-size', '10');
                metrics.setAttribute('fill', '#6c757d');
                metrics.textContent = `${def.baseLatency}ms | $${def.baseCost}/mo`;
                g.appendChild(metrics);
            }
            
            svg.appendChild(g);
        });
        
        // Convert to string and download
        const svgData = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `architecture-${Date.now()}.svg`;
        a.click();
        URL.revokeObjectURL(url);
        
        hideExportProgress();
    } catch (error) {
        console.error('Export failed:', error);
        hideExportProgress();
        alert('Export failed: ' + error.message);
    }
}

// Import JSON
function importFromJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                
                // Restore system context
                if (data.systemContext) {
                    systemContext = data.systemContext;
                }
                
                // Restore component definitions if they were exported
                if (data.componentDefinitions) {
                    Object.keys(data.componentDefinitions).forEach(key => {
                        if (!componentDefinitions[key]) {
                            componentDefinitions[key] = data.componentDefinitions[key];
                        }
                    });
                }
                
                // Restore architecture
                if (data.architecture) {
                    components = data.architecture.components.map(comp => {
                        // Ensure name and icon are set from component definitions
                        const def = componentDefinitions[comp.type];
                        return {
                            ...comp,
                            name: comp.name || (def ? def.name : comp.type),
                            icon: comp.icon || (def ? def.icon : '📦')
                        };
                    });
                    connections = data.architecture.connections;
                    componentIdCounter = Math.max(...components.map(c => c.id), 0) + 1;
                    
                    // Clear and re-render
                    document.getElementById('components-layer').innerHTML = '';
                    const svg = document.getElementById('canvas');
                    svg.innerHTML = '<defs><marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><polygon points="0 0, 10 3, 0 6" fill="#667eea" /></marker></defs>';
                    
                    components.forEach(comp => renderComponent(comp));
                    renderConnections();
                }
                
                alert('Architecture imported successfully!');
            } catch (error) {
                console.error('Import error:', error);
                alert('Failed to import: ' + error.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}
