// Real-world compliance requirements by region
const complianceData = {
    regions: {
        'us-east-1': {
            name: 'US East (N. Virginia)',
            country: 'United States',
            compliance: ['SOC 1', 'SOC 2', 'SOC 3', 'PCI DSS', 'HIPAA', 'FedRAMP', 'FISMA', 'ITAR'],
            dataResidency: 'United States',
            latency: { 'us-west-2': 60, 'eu-west-1': 80, 'ap-south-1': 200 }
        },
        'us-west-2': {
            name: 'US West (Oregon)',
            country: 'United States',
            compliance: ['SOC 1', 'SOC 2', 'SOC 3', 'PCI DSS', 'HIPAA', 'FedRAMP'],
            dataResidency: 'United States',
            latency: { 'us-east-1': 60, 'eu-west-1': 120, 'ap-south-1': 150 }
        },
        'eu-west-1': {
            name: 'EU (Ireland)',
            country: 'Ireland',
            compliance: ['GDPR', 'SOC 1', 'SOC 2', 'SOC 3', 'PCI DSS', 'ISO 27001', 'ISO 27017', 'ISO 27018'],
            dataResidency: 'European Union',
            latency: { 'us-east-1': 80, 'us-west-2': 120, 'ap-south-1': 140 }
        },
        'eu-central-1': {
            name: 'EU (Frankfurt)',
            country: 'Germany',
            compliance: ['GDPR', 'SOC 1', 'SOC 2', 'PCI DSS', 'ISO 27001', 'C5', 'BSI'],
            dataResidency: 'European Union',
            latency: { 'us-east-1': 90, 'eu-west-1': 20, 'ap-south-1': 130 }
        },
        'ap-south-1': {
            name: 'Asia Pacific (Mumbai)',
            country: 'India',
            compliance: ['SOC 1', 'SOC 2', 'PCI DSS', 'ISO 27001', 'MTCS'],
            dataResidency: 'India',
            latency: { 'us-east-1': 200, 'eu-west-1': 140, 'us-west-2': 150 }
        },
        'ap-southeast-1': {
            name: 'Asia Pacific (Singapore)',
            country: 'Singapore',
            compliance: ['SOC 1', 'SOC 2', 'PCI DSS', 'ISO 27001', 'MTCS'],
            dataResidency: 'Singapore',
            latency: { 'us-east-1': 220, 'eu-west-1': 160, 'ap-south-1': 60 }
        },
        'ap-northeast-1': {
            name: 'Asia Pacific (Tokyo)',
            country: 'Japan',
            compliance: ['SOC 1', 'SOC 2', 'PCI DSS', 'ISO 27001', 'FISC'],
            dataResidency: 'Japan',
            latency: { 'us-east-1': 150, 'eu-west-1': 200, 'ap-south-1': 100 }
        }
    },
    
    complianceRequirements: {
        'GDPR': {
            name: 'General Data Protection Regulation',
            description: 'EU data protection and privacy regulation',
            requiredRegions: ['eu-west-1', 'eu-central-1'],
            restrictions: 'Data must remain in EU',
            penalty: 'Up to €20M or 4% of global revenue'
        },
        'HIPAA': {
            name: 'Health Insurance Portability and Accountability Act',
            description: 'US healthcare data protection',
            requiredRegions: ['us-east-1', 'us-west-2'],
            restrictions: 'PHI must be encrypted and access-controlled',
            penalty: 'Up to $1.5M per violation'
        },
        'PCI-DSS': {
            name: 'Payment Card Industry Data Security Standard',
            description: 'Credit card data protection',
            requiredRegions: 'Any with PCI DSS certification',
            restrictions: 'Cardholder data must be encrypted',
            penalty: 'Fines up to $500K per incident'
        },
        'SOC 2': {
            name: 'Service Organization Control 2',
            description: 'Security, availability, and confidentiality controls',
            requiredRegions: 'Any SOC 2 certified region',
            restrictions: 'Annual audits required',
            penalty: 'Loss of certification'
        },
        'FedRAMP': {
            name: 'Federal Risk and Authorization Management Program',
            description: 'US government cloud security',
            requiredRegions: ['us-east-1', 'us-west-2'],
            restrictions: 'Government data only in authorized regions',
            penalty: 'Loss of government contracts'
        },
        'ISO 27001': {
            name: 'Information Security Management',
            description: 'International security standard',
            requiredRegions: 'Any ISO 27001 certified region',
            restrictions: 'ISMS implementation required',
            penalty: 'Loss of certification'
        }
    },
    
    getComplianceForRegions(selectedRegions) {
        if (!selectedRegions || selectedRegions.length === 0) {
            return { supported: [], missing: [], warnings: [] };
        }
        
        // Get all compliance standards supported by ALL selected regions
        const allCompliance = selectedRegions.map(region => 
            this.regions[region]?.compliance || []
        );
        
        const supported = allCompliance.reduce((acc, curr) => 
            acc.filter(item => curr.includes(item))
        );
        
        // Check for common compliance requirements
        const warnings = [];
        const missing = [];
        
        // GDPR check
        const hasEURegion = selectedRegions.some(r => r.startsWith('eu-'));
        const hasNonEURegion = selectedRegions.some(r => !r.startsWith('eu-'));
        if (hasEURegion && hasNonEURegion) {
            warnings.push({
                type: 'GDPR',
                message: 'GDPR Warning: EU and non-EU regions selected. Ensure data residency compliance.',
                severity: 'high'
            });
        }
        
        // Multi-region latency
        if (selectedRegions.length > 1) {
            const maxLatency = this.getMaxLatencyBetweenRegions(selectedRegions);
            if (maxLatency > 100) {
                warnings.push({
                    type: 'Latency',
                    message: `High inter-region latency detected: ${maxLatency}ms. Consider data replication strategy.`,
                    severity: 'medium'
                });
            }
        }
        
        return { supported, missing, warnings };
    },
    
    getMaxLatencyBetweenRegions(regions) {
        let maxLatency = 0;
        for (let i = 0; i < regions.length; i++) {
            for (let j = i + 1; j < regions.length; j++) {
                const latency = this.regions[regions[i]]?.latency[regions[j]] || 0;
                maxLatency = Math.max(maxLatency, latency);
            }
        }
        return maxLatency;
    },
    
    getRegionInfo(regionId) {
        return this.regions[regionId] || null;
    }
};

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = complianceData;
}
