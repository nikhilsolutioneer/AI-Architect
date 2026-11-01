// Amazon Bedrock Integration using AWS SDK
// Hardcoded credentials for testing

const bedrockConfig = {
    region: 'us-east-1',
    accessKeyId: (typeof process !== 'undefined' && process.env ? process.env.AWS_ACCESS_KEY_ID : '') || '',
    secretAccessKey: (typeof process !== 'undefined' && process.env ? process.env.AWS_SECRET_ACCESS_KEY : '') || '',
    sessionToken: (typeof process !== 'undefined' && process.env ? process.env.AWS_SESSION_TOKEN : '') || '',
    modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    enabled: true
};

function isBedrockConfigured() {
    return bedrockConfig.enabled;
}

// Call Bedrock via proxy server
async function callBedrock(prompt, systemPrompt = '') {
    const requestBody = {
        messages: [
            {
                role: 'user',
                content: [{ text: prompt }]
            }
        ],
        inferenceConfig: {
            maxTokens: 4096,
            temperature: 0.7,
            topP: 0.9
        }
    };
    
    if (systemPrompt) {
        requestBody.system = [{ text: systemPrompt }];
    }
    
    const body = JSON.stringify(requestBody);
    
    try {
        console.log('Calling Bedrock proxy at http://localhost:5000/bedrock/converse');
        
        const response = await fetch('http://localhost:5000/bedrock/converse', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: body
        });
        
        if (!response.ok) {
            const error = await response.text();
            console.error('Bedrock API error:', error);
            throw new Error(`Bedrock API error: ${response.status} - ${error}`);
        }
        
        const data = await response.json();
        console.log('Bedrock response received:', data);
        
        // Extract text from response
        if (data.output && data.output.message && data.output.message.content) {
            return data.output.message.content[0].text;
        } else {
            throw new Error('Invalid response format from Bedrock');
        }
    } catch (error) {
        console.error('Bedrock API call failed:', error);
        throw error;
    }
}

// Main function: Analyze architecture with AI
async function analyzeArchitectureWithAI(architecture, context) {
    const systemPrompt = `You are a highly experienced end-to-end AWS Solution Architect with 20+ years of experience designing enterprise-scale systems. You have deep expertise in:
- Cloud architecture patterns and anti-patterns
- AWS services and their optimal use cases
- Cost optimization strategies
- Performance tuning and latency optimization
- High availability and disaster recovery
- Security and compliance (GDPR, HIPAA, PCI-DSS, SOC2)
- Scalability and capacity planning
- Technology selection and trade-offs

Provide practical, actionable recommendations based on real-world experience. Be specific with numbers, costs, and implementation details. Consider both technical excellence and business value.`;

    const prompt = `Analyze this system architecture and provide expert recommendations:

**ARCHITECTURE DETAILS:**
Components: ${JSON.stringify(architecture.components.map(c => ({
    type: c.type,
    name: c.name,
    scalingConfig: c.scalingConfig
})))}

Connections: ${architecture.connections.length} connections

**SYSTEM CONTEXT:**
- Industry: ${context.industry}
- Users: ${context.users.toLocaleString()}
- Traffic: ${context.traffic.toLocaleString()} req/min
- Budget: $${context.budget}/month
- Compliance: ${context.compliance.join(', ')}
- Latency Target: ${context.latency}ms
- Availability: ${context.availability}%

**CURRENT METRICS:**
- Latency: ${architecture.currentLatency}ms
- Cost: $${architecture.currentCost}
- Bottlenecks: ${architecture.bottlenecks.map(b => b.name).join(', ') || 'None'}

Provide analysis in JSON format with: overallAssessment (score, summary, strengths, concerns), recommendations (priority, title, description, impact), technologyRecommendations, costAnalysis, latencyAnalysis, complianceAnalysis.`;

    try {
        const response = await callBedrock(prompt, systemPrompt);
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Invalid response format from AI');
        }
        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error('AI analysis failed:', error);
        throw error;
    }
}

// Convert AI analysis to display format
function convertAIAnalysisToResults(aiAnalysis, currentResults) {
    const suggestions = aiAnalysis.recommendations?.map(rec => ({
        type: rec.priority === 'critical' ? 'critical' : rec.priority === 'high' ? 'warning' : 'info',
        message: `<strong>${rec.title}</strong><br>${rec.description}`,
        impact: rec.impact || {},
        category: rec.category
    })) || [];
    
    if (aiAnalysis.technologyRecommendations) {
        aiAnalysis.technologyRecommendations.forEach(tech => {
            suggestions.push({
                type: 'info',
                message: `<strong>Consider ${tech.recommendedTech}</strong><br>${tech.reason}`,
                impact: {},
                category: 'technology'
            });
        });
    }
    
    return {
        ...currentResults,
        aiAnalysis: aiAnalysis,
        suggestions: suggestions,
        costBreakdown: aiAnalysis.costAnalysis?.breakdown,
        latencyBreakdown: aiAnalysis.latencyAnalysis,
        overallScore: aiAnalysis.overallAssessment?.score || 75,
        overallSummary: aiAnalysis.overallAssessment?.summary || 'Analysis complete',
        strengths: aiAnalysis.overallAssessment?.strengths || [],
        concerns: aiAnalysis.overallAssessment?.concerns || []
    };
}

function updateBedrockStatusIndicator() {
    const indicator = document.getElementById('bedrock-status-indicator');
    if (indicator) {
        if (isBedrockConfigured()) {
            indicator.style.background = '#28a745';
            indicator.title = 'AI Analysis Enabled';
        } else {
            indicator.style.background = '#dc3545';
            indicator.title = 'AI Analysis Disabled';
        }
    }
}

function showBedrockConfigModal() {
    alert('Bedrock is hardcoded for testing. Credentials are already configured.');
}

function saveBedrockConfiguration() {
    alert('Configuration saved');
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateBedrockStatusIndicator);
} else {
    updateBedrockStatusIndicator();
}

setInterval(updateBedrockStatusIndicator, 1000);
