# AI Architect | AI Powered System Solution Designer Studio

A real-time system architecture design and simulation tool that helps architects visualize, analyze, and optimize their solutions powered by AI.

## Features

### 🎯 Context-Aware Design
- Input your organization's tech stack constraints
- Define system requirements and business context
- Set non-functional requirements (NFRs)
- Specify existing systems for integration

### 🎨 Visual Architecture Designer
- Drag-and-drop component palette
- Only shows components available in your tech stack
- Real-time visual feedback
- Connection management

### 📊 Live Simulation
- **Latency Analysis**: Calculate end-to-end latency
- **Cost Projection**: Monthly cost estimates
- **Throughput**: Capacity planning
- **Availability**: SLA compliance checking
- **Bottleneck Detection**: Identify performance issues
- **SPOF Detection**: Find single points of failure

### 💡 Smart Suggestions
- Context-aware recommendations
- Respects your tech stack constraints
- Cost optimization ideas
- Performance improvements
- High availability suggestions

### 🔮 What-If Scenarios
- Database crash simulation
- Traffic spike testing (10x load)
- Multi-region deployment analysis
- Real-time impact assessment

## Quick Start

1. Open `index.html` in a modern web browser
2. Follow the 5-step wizard:
   - **Step 1**: Select your organization's tech stack
   - **Step 2**: Define system requirements
   - **Step 3**: Provide business context
   - **Step 4**: Set NFRs (latency, availability, RTO, RPO)
   - **Step 5**: Design your architecture visually

3. Drag components onto the canvas
4. Click "Simulate" to see real-time metrics
5. Review suggestions and test what-if scenarios

## Example Use Case

**E-commerce Platform**
- Traffic: 10,000 req/min
- Budget: $5,000/month
- Latency Target: 200ms
- Availability: 99.9%

The tool will:
- ✅ Validate your design against requirements
- ⚠️ Highlight bottlenecks and SPOFs
- 💡 Suggest Redis cache for 40% latency reduction
- 🔮 Show impact of database failure
- 💰 Optimize costs within budget

## Technology Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Visualization**: SVG for connections
- **Simulation**: Rule-based engine
- **No dependencies**: Runs entirely in browser

## Hackathon Ready

Built for rapid prototyping and impressive demos:
- ⚡ Fast setup (no build tools)
- 🎨 Beautiful UI with smooth animations
- 📱 Responsive design
- 🚀 Instant feedback
- 💾 No backend required

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     START_HERE.html                         │
│                    (Landing Page)                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      index.html                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Step 1-4: Input Wizard                              │  │
│  │  • Tech Stack Selection                              │  │
│  │  • Requirements Definition                           │  │
│  │  • Business Context                                  │  │
│  │  • Non-Functional Requirements                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                   │
│                         ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Step 5: Visual Designer                             │  │
│  │  ┌────────────┬──────────────┬─────────────────┐    │  │
│  │  │ Component  │   Canvas     │  Metrics Panel  │    │  │
│  │  │  Palette   │  (Drag-Drop) │  (Live Results) │    │  │
│  │  └────────────┴──────────────┴─────────────────┘    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                       app.js                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Simulation Engine                                   │  │
│  │  • Latency Calculator                                │  │
│  │  • Cost Estimator                                    │  │
│  │  • Bottleneck Detector                               │  │
│  │  • SPOF Analyzer                                     │  │
│  │  • Suggestion Generator                              │  │
│  │  • What-If Scenario Runner                           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     styles.css                              │
│  • Gradient backgrounds                                     │
│  • Smooth animations                                        │
│  • Responsive layout                                        │
│  • Visual feedback                                          │
└─────────────────────────────────────────────────────────────┘

Files:
  index.html          # Main UI with 5-step wizard
  styles.css          # Modern, gradient-based design
  app.js              # Simulation engine & drag-drop logic
  START_HERE.html     # Landing page
```

## Simulation Rules

- **Latency** = Σ(component latencies) + network hops × 5ms
- **Cost** = Σ(component monthly costs)
- **Throughput** = min(component capacities)
- **Availability** = 99.95% (with redundancy) or 99.5% (SPOFs)
- **Bottleneck** = component.capacity < required traffic
- **SPOF** = only one instance of critical component

## Future Enhancements

- [ ] Export architecture diagrams
- [ ] Save/load designs
- [ ] More cloud providers (Azure, GCP)
- [ ] Advanced cost models
- [ ] Security analysis
- [ ] Compliance checking
- [ ] Team collaboration
- [ ] AI-powered suggestions
