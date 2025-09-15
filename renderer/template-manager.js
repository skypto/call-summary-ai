/**
 * Template Management System
 * Handles CRUD operations, categories, import/export, and template processing
 */
class TemplateManager {
    constructor() {
        console.log('TemplateManager constructor called');
        this.templates = {};
        this.categories = ['summary', 'contacts', 'actions', 'analysis', 'custom'];
        this.storageKey = 'promptTemplates';
        this.init();
        console.log('TemplateManager initialized');
    }

    init() {
        this.loadTemplates();
        this.setupEventListeners();
    }

    /**
     * Load templates from localStorage or initialize with defaults
     */
    loadTemplates() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                this.templates = JSON.parse(saved);
                // Ensure all categories exist
                this.categories.forEach(category => {
                    if (!this.templates[category]) {
                        this.templates[category] = [];
                    }
                });
            } else {
                this.templates = this.getDefaultTemplates();
            }
        } catch (error) {
            console.error('Error loading templates:', error);
            this.templates = this.getDefaultTemplates();
        }
    }

    /**
     * Save templates to localStorage
     */
    saveTemplates() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.templates));
            return { success: true };
        } catch (error) {
            console.error('Error saving templates:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get default template library
     */
    getDefaultTemplates() {
        return {
            summary: [
                {
                    id: 'meeting-summary',
                    name: 'Meeting Summary',
                    description: 'Comprehensive meeting summary with key points',
                    prompt: 'Please analyze this meeting transcript and provide a comprehensive summary including:\n\n1. **Main Topics Discussed**\n2. **Key Decisions Made**\n3. **Action Items** (who, what, when)\n4. **Important Dates/Deadlines**\n5. **Next Steps**\n\nTranscript:\n{transcript}',
                    variables: ['transcript', 'date', 'duration', 'filename'],
                    metadata: {
                        created: new Date().toISOString(),
                        modified: new Date().toISOString(),
                        author: 'system',
                        version: '1.0'
                    }
                },
                {
                    id: 'executive-summary',
                    name: 'Executive Summary',
                    description: 'High-level executive summary for leadership',
                    prompt: 'Create an executive summary of this meeting for senior leadership. Focus on:\n\n- **Strategic decisions and their business impact**\n- **Resource requirements and budget implications**\n- **Timeline and milestones**\n- **Risks and mitigation strategies**\n- **Recommendations for leadership action**\n\nKeep it concise and business-focused.\n\nTranscript:\n{transcript}',
                    variables: ['transcript', 'date', 'duration', 'filename'],
                    metadata: {
                        created: new Date().toISOString(),
                        modified: new Date().toISOString(),
                        author: 'system',
                        version: '1.0'
                    }
                },
                {
                    id: 'quick-summary',
                    name: 'Quick Summary',
                    description: 'Brief 3-point summary for quick reference',
                    prompt: 'Provide a concise 3-point summary of this meeting:\n\n1. **Main Topic/Purpose**\n2. **Key Decision or Outcome**\n3. **Next Action Required**\n\nKeep each point to 1-2 sentences maximum.\n\nTranscript:\n{transcript}',
                    variables: ['transcript'],
                    metadata: {
                        created: new Date().toISOString(),
                        modified: new Date().toISOString(),
                        author: 'system',
                        version: '1.0'
                    }
                },
                {
                    id: 'detailed-summary',
                    name: 'Detailed Summary',
                    description: 'Comprehensive summary with all key details',
                    prompt: 'Create a detailed summary of this meeting transcript:\n\n## 📋 Meeting Overview\n- **Date:** {date}\n- **Duration:** {duration}\n- **Recording:** {filename}\n\n## 👥 Participants\n[List all participants and their roles]\n\n## 🎯 Meeting Purpose\n[Main objective and agenda]\n\n## 📝 Discussion Points\n[Detailed breakdown of topics discussed]\n\n## ✅ Decisions Made\n[Key decisions and rationale]\n\n## 📋 Action Items\n[Specific tasks with owners and deadlines]\n\n## 🔄 Follow-up Required\n[Next steps and future meetings]\n\n## 📊 Key Metrics/Numbers\n[Important figures, dates, or measurements mentioned]\n\nTranscript:\n{transcript}',
                    variables: ['transcript', 'date', 'duration', 'filename'],
                    metadata: {
                        created: new Date().toISOString(),
                        modified: new Date().toISOString(),
                        author: 'system',
                        version: '1.0'
                    }
                },
                {
                    id: 'client-summary',
                    name: 'Client Meeting Summary',
                    description: 'Professional summary for client communications',
                    prompt: 'Create a professional client meeting summary:\n\n## Meeting Summary - {date}\n\n**Attendees:** [List participants]\n\n**Meeting Objectives:**\n[Primary goals and agenda items]\n\n**Key Discussion Points:**\n- [Main topics covered]\n- [Client requirements and concerns]\n- [Solutions proposed]\n\n**Agreements Reached:**\n- [Decisions made during the meeting]\n- [Terms agreed upon]\n\n**Next Steps:**\n- [Action items with responsible parties]\n- [Timeline and deliverables]\n- [Follow-up meetings scheduled]\n\n**Questions/Concerns to Address:**\n[Outstanding items requiring follow-up]\n\nTranscript:\n{transcript}',
                    variables: ['transcript', 'date'],
                    metadata: {
                        created: new Date().toISOString(),
                        modified: new Date().toISOString(),
                        author: 'system',
                        version: '1.0'
                    }
                }
            ],
            contacts: [
                {
                    id: 'participant-list',
                    name: 'Participant List',
                    description: 'Extract participant names and roles',
                    prompt: 'Extract all participants from this meeting transcript. For each person, provide:\n\n- **Name**\n- **Role/Title** (if mentioned)\n- **Company/Organization** (if mentioned)\n- **Key contributions to the discussion**\n\nFormat as a structured list.\n\nTranscript:\n{transcript}',
                    variables: ['transcript'],
                    metadata: {
                        created: new Date().toISOString(),
                        modified: new Date().toISOString(),
                        author: 'system',
                        version: '1.0'
                    }
                },
                {
                    id: 'contact-info',
                    name: 'Contact Information',
                    description: 'Extract contact details mentioned',
                    prompt: 'Extract any contact information mentioned in this transcript:\n\n- **Email addresses**\n- **Phone numbers**\n- **Company names and addresses**\n- **Website URLs**\n- **Social media handles**\n\nOrganize by person if possible.\n\nTranscript:\n{transcript}',
                    variables: ['transcript'],
                    metadata: {
                        created: new Date().toISOString(),
                        modified: new Date().toISOString(),
                        author: 'system',
                        version: '1.0'
                    }
                },
                {
                    id: 'networking-opportunities',
                    name: 'Networking Opportunities',
                    description: 'Identify potential networking connections',
                    prompt: 'Identify networking opportunities from this meeting:\n\n- **Key contacts to follow up with**\n- **Mutual connections mentioned**\n- **Business opportunities discussed**\n- **Collaboration possibilities**\n- **Recommended introductions**\n\nTranscript:\n{transcript}',
                    variables: ['transcript'],
                    metadata: {
                        created: new Date().toISOString(),
                        modified: new Date().toISOString(),
                        author: 'system',
                        version: '1.0'
                    }
                },
                {
                    id: 'crm-update',
                    name: 'CRM Update',
                    description: 'Extract information for CRM system updates',
                    prompt: 'Extract CRM-relevant information from this meeting:\n\n## Contact Updates\n- **New contacts mentioned**\n- **Updated contact information**\n- **Role/title changes**\n\n## Relationship Status\n- **Current relationship stage**\n- **Engagement level**\n- **Decision-making authority**\n\n## Business Intelligence\n- **Company updates**\n- **Budget information**\n- **Timeline/urgency**\n- **Competitors mentioned**\n\n## Opportunity Tracking\n- **Deal size/value**\n- **Probability assessment**\n- **Next steps in sales process**\n\n## Follow-up Actions\n- **Immediate follow-up required**\n- **Information to send**\n- **Meetings to schedule**\n\nTranscript:\n{transcript}',
                    variables: ['transcript'],
                    metadata: {
                        created: new Date().toISOString(),
                        modified: new Date().toISOString(),
                        author: 'system',
                        version: '1.0'
                    }
                }
            ],
            actions: [
                {
                    id: 'action-items',
                    name: 'Action Items',
                    description: 'Extract all action items and assignments',
                    prompt: 'Extract all action items from this meeting transcript. For each action item, provide:\n\n- **Task Description**\n- **Assigned To** (person responsible)\n- **Due Date** (if mentioned)\n- **Priority Level** (if indicated)\n- **Dependencies** (if any)\n\nFormat as a checklist that can be easily tracked.\n\nTranscript:\n{transcript}',
                    variables: ['transcript'],
                    metadata: {
                        created: new Date().toISOString(),
                        modified: new Date().toISOString(),
                        author: 'system',
                        version: '1.0'
                    }
                },
                {
                    id: 'follow-up-tasks',
                    name: 'Follow-up Tasks',
                    description: 'Identify follow-up tasks and next steps',
                    prompt: 'Identify all follow-up tasks and next steps from this meeting:\n\n1. **Immediate Actions** (within 24-48 hours)\n2. **Short-term Tasks** (within 1-2 weeks)\n3. **Long-term Objectives** (beyond 2 weeks)\n4. **Recurring Tasks** (ongoing responsibilities)\n\nInclude who should handle each task and any mentioned deadlines.\n\nTranscript:\n{transcript}',
                    variables: ['transcript'],
                    metadata: {
                        created: new Date().toISOString(),
                        modified: new Date().toISOString(),
                        author: 'system',
                        version: '1.0'
                    }
                },
                {
                    id: 'decision-tracker',
                    name: 'Decision Tracker',
                    description: 'Track decisions made and their implications',
                    prompt: 'Track all decisions made in this meeting:\n\n- **Decision Made**\n- **Who Made the Decision**\n- **Rationale/Reasoning**\n- **Impact/Implications**\n- **Implementation Steps**\n- **Success Metrics**\n\nTranscript:\n{transcript}',
                    variables: ['transcript'],
                    metadata: {
                        created: new Date().toISOString(),
                        modified: new Date().toISOString(),
                        author: 'system',
                        version: '1.0'
                    }
                },
                {
                    id: 'project-tasks',
                    name: 'Project Tasks',
                    description: 'Extract project-specific tasks and deliverables',
                    prompt: 'Extract project tasks and deliverables from this meeting:\n\n## Project Overview\n- **Project name/identifier**\n- **Current phase/milestone**\n- **Overall progress status**\n\n## Tasks Identified\n### Immediate Tasks (Next 1-2 days)\n- [Task] - [Owner] - [Due date]\n\n### Short-term Tasks (This week)\n- [Task] - [Owner] - [Due date]\n\n### Medium-term Tasks (Next 2-4 weeks)\n- [Task] - [Owner] - [Due date]\n\n## Deliverables\n- **Deliverable name** - Due: [date] - Owner: [person]\n\n## Dependencies\n- **What we\'re waiting for**\n- **Blocking other tasks**\n\n## Resource Requirements\n- **Additional resources needed**\n- **Budget implications**\n- **Skill gaps to address**\n\n## Risks and Issues\n- **Current blockers**\n- **Potential risks identified**\n- **Mitigation strategies**\n\nTranscript:\n{transcript}',
                    variables: ['transcript'],
                    metadata: {
                        created: new Date().toISOString(),
                        modified: new Date().toISOString(),
                        author: 'system',
                        version: '1.0'
                    }
                },
                {
                    id: 'meeting-minutes',
                    name: 'Formal Meeting Minutes',
                    description: 'Generate formal meeting minutes format',
                    prompt: '# Meeting Minutes - {date}\n\n## Meeting Information\n- **Date:** {date}\n- **Duration:** {duration}\n- **Recording:** {filename}\n- **Meeting Type:** [Determine from context]\n\n## Attendees\n- [List all participants with roles]\n\n## Agenda Items\n1. [Extract agenda items discussed]\n\n## Discussion Summary\n### [Topic 1]\n- Key points discussed\n- Decisions made\n- Action items\n\n### [Topic 2]\n- Key points discussed\n- Decisions made\n- Action items\n\n## Decisions Made\n1. **Decision:** [Description]\n   - **Rationale:** [Why this decision was made]\n   - **Impact:** [Expected outcomes]\n   - **Effective Date:** [When it takes effect]\n\n## Action Items\n| Task | Assigned To | Due Date | Status |\n|------|-------------|----------|--------|\n| [Task description] | [Person] | [Date] | Pending |\n\n## Next Meeting\n- **Date:** [If scheduled]\n- **Agenda:** [Preliminary items]\n\n## Additional Notes\n[Any other relevant information]\n\nTranscript:\n{transcript}',
                    variables: ['transcript', 'date', 'duration', 'filename'],
                    metadata: {
                        created: new Date().toISOString(),
                        modified: new Date().toISOString(),
                        author: 'system',
                        version: '1.0'
                    }
                }
            ],
            analysis: [
                {
                    id: 'sentiment-analysis',
                    name: 'Sentiment Analysis',
                    description: 'Analyze the tone and sentiment of the meeting',
                    prompt: 'Analyze the sentiment and tone of this meeting transcript:\n\n- **Overall Meeting Tone** (positive, neutral, negative, mixed)\n- **Individual Participant Sentiment**\n- **Tension Points** (if any conflicts or disagreements)\n- **Engagement Level** (high, medium, low participation)\n- **Decision-making Dynamics**\n- **Recommendations** for improving future meetings\n\nTranscript:\n{transcript}',
                    variables: ['transcript'],
                    metadata: {
                        created: new Date().toISOString(),
                        modified: new Date().toISOString(),
                        author: 'system',
                        version: '1.0'
                    }
                },
                {
                    id: 'topic-analysis',
                    name: 'Topic Analysis',
                    description: 'Break down topics and time allocation',
                    prompt: 'Analyze the topics discussed in this meeting:\n\n- **Main Topics** (list in order of discussion)\n- **Time Allocation** (estimate time spent on each topic)\n- **Topic Priorities** (which topics received most attention)\n- **Unresolved Topics** (items that need follow-up)\n- **Off-topic Discussions** (tangents or side conversations)\n\nProvide insights on meeting efficiency and focus.\n\nTranscript:\n{transcript}',
                    variables: ['transcript'],
                    metadata: {
                        created: new Date().toISOString(),
                        modified: new Date().toISOString(),
                        author: 'system',
                        version: '1.0'
                    }
                },
                {
                    id: 'risk-assessment',
                    name: 'Risk Assessment',
                    description: 'Identify potential risks and mitigation strategies',
                    prompt: 'Identify risks and challenges discussed in this meeting:\n\n- **Identified Risks** (technical, business, timeline, resource)\n- **Risk Severity** (high, medium, low)\n- **Mitigation Strategies** (proposed or discussed)\n- **Risk Owners** (who is responsible)\n- **Contingency Plans** (backup options)\n- **Monitoring Requirements**\n\nTranscript:\n{transcript}',
                    variables: ['transcript'],
                    metadata: {
                        created: new Date().toISOString(),
                        modified: new Date().toISOString(),
                        author: 'system',
                        version: '1.0'
                    }
                },
                {
                    id: 'competitive-analysis',
                    name: 'Competitive Analysis',
                    description: 'Extract competitive intelligence and market insights',
                    prompt: 'Extract competitive and market intelligence from this meeting:\n\n## Competitors Mentioned\n- **Company Name:** [Competitor]\n  - **Strengths:** [What they do well]\n  - **Weaknesses:** [Areas where they fall short]\n  - **Market Position:** [Their standing in the market]\n  - **Pricing:** [If mentioned]\n\n## Market Insights\n- **Market trends discussed**\n- **Customer preferences mentioned**\n- **Industry challenges identified**\n- **Opportunities in the market**\n\n## Competitive Positioning\n- **Our advantages mentioned**\n- **Areas where we need improvement**\n- **Differentiation strategies discussed**\n\n## Strategic Implications\n- **How this affects our strategy**\n- **Actions needed to stay competitive**\n- **Market opportunities to pursue**\n\nTranscript:\n{transcript}',
                    variables: ['transcript'],
                    metadata: {
                        created: new Date().toISOString(),
                        modified: new Date().toISOString(),
                        author: 'system',
                        version: '1.0'
                    }
                },
                {
                    id: 'financial-analysis',
                    name: 'Financial Analysis',
                    description: 'Extract financial information and budget discussions',
                    prompt: 'Extract financial information from this meeting:\n\n## Budget Information\n- **Total budget discussed:** [Amount]\n- **Budget allocation:** [How funds are distributed]\n- **Budget constraints:** [Limitations mentioned]\n\n## Financial Metrics\n- **Revenue figures:** [If mentioned]\n- **Cost estimates:** [Project/initiative costs]\n- **ROI projections:** [Return on investment]\n- **Financial targets:** [Goals and objectives]\n\n## Investment Decisions\n- **Approved investments:** [What was approved]\n- **Pending decisions:** [What needs approval]\n- **Rejected proposals:** [What was declined and why]\n\n## Cost Considerations\n- **Cost-saving opportunities:** [Ways to reduce expenses]\n- **Additional funding needs:** [Extra budget required]\n- **Financial risks:** [Potential cost overruns]\n\n## Financial Timeline\n- **Payment schedules:** [When payments are due]\n- **Budget review dates:** [When to reassess]\n- **Financial milestones:** [Key financial checkpoints]\n\nTranscript:\n{transcript}',
                    variables: ['transcript'],
                    metadata: {
                        created: new Date().toISOString(),
                        modified: new Date().toISOString(),
                        author: 'system',
                        version: '1.0'
                    }
                }
            ],
            custom: [
                {
                    id: 'sales-call-analysis',
                    name: 'Sales Call Analysis',
                    description: 'Comprehensive analysis for sales calls',
                    prompt: '# Sales Call Analysis - {date}\n\n## Call Overview\n- **Prospect/Client:** [Company/Person]\n- **Call Type:** [Discovery, Demo, Negotiation, etc.]\n- **Duration:** {duration}\n- **Sales Stage:** [Current stage in pipeline]\n\n## Prospect Information\n### Company Details\n- **Industry:** [Business sector]\n- **Company Size:** [Number of employees/revenue]\n- **Current Solutions:** [What they use now]\n- **Pain Points:** [Problems they need solved]\n\n### Decision Makers\n- **Primary Contact:** [Name and role]\n- **Decision Authority:** [Can they make the decision?]\n- **Influencers:** [Others involved in decision]\n- **Budget Authority:** [Who controls the budget?]\n\n## Needs Assessment\n### Business Requirements\n- [List specific needs mentioned]\n\n### Technical Requirements\n- [Technical specifications or constraints]\n\n### Timeline\n- **Decision Timeline:** [When they need to decide]\n- **Implementation Timeline:** [When they need it live]\n- **Budget Cycle:** [When budget is available]\n\n## Opportunity Assessment\n### Deal Size\n- **Estimated Value:** [Potential contract value]\n- **Probability:** [Likelihood of closing]\n- **Competition:** [Other vendors being considered]\n\n### Next Steps\n- **Immediate Actions:** [What to do next]\n- **Follow-up Required:** [Information to send]\n- **Next Meeting:** [When and what to discuss]\n\n## Call Quality\n- **Engagement Level:** [How engaged were they?]\n- **Objections Raised:** [Concerns or pushback]\n- **Positive Signals:** [Signs of interest]\n- **Red Flags:** [Warning signs]\n\n## Action Items\n- [ ] [Specific task] - Due: [Date]\n- [ ] [Specific task] - Due: [Date]\n\nTranscript:\n{transcript}',
                    variables: ['transcript', 'date', 'duration'],
                    metadata: {
                        created: new Date().toISOString(),
                        modified: new Date().toISOString(),
                        author: 'system',
                        version: '1.0'
                    }
                },
                {
                    id: 'technical-discussion',
                    name: 'Technical Discussion Summary',
                    description: 'Summary focused on technical details and decisions',
                    prompt: '# Technical Discussion Summary\n\n## Technical Overview\n- **System/Project:** [What system was discussed]\n- **Technical Scope:** [Areas covered]\n- **Complexity Level:** [High/Medium/Low]\n\n## Architecture Decisions\n### Technology Stack\n- **Languages/Frameworks:** [Technologies chosen]\n- **Infrastructure:** [Hosting, databases, etc.]\n- **Third-party Services:** [External services/APIs]\n\n### Design Patterns\n- **Architectural Patterns:** [MVC, microservices, etc.]\n- **Design Principles:** [SOLID, DRY, etc.]\n- **Best Practices:** [Coding standards, conventions]\n\n## Technical Requirements\n### Functional Requirements\n- [What the system must do]\n\n### Non-functional Requirements\n- **Performance:** [Speed, throughput requirements]\n- **Scalability:** [Growth expectations]\n- **Security:** [Security requirements]\n- **Reliability:** [Uptime, backup requirements]\n\n## Implementation Plan\n### Development Phases\n1. **Phase 1:** [Description and timeline]\n2. **Phase 2:** [Description and timeline]\n3. **Phase 3:** [Description and timeline]\n\n### Technical Risks\n- **Risk:** [Description] - **Mitigation:** [How to address]\n\n### Dependencies\n- **External Dependencies:** [Third-party services, APIs]\n- **Internal Dependencies:** [Other teams, systems]\n\n## Technical Decisions Made\n1. **Decision:** [What was decided]\n   - **Rationale:** [Why this choice]\n   - **Alternatives Considered:** [Other options]\n   - **Impact:** [How this affects the project]\n\n## Outstanding Technical Questions\n- [Questions that need research/answers]\n\n## Next Technical Steps\n- [ ] [Technical task] - Owner: [Person] - Due: [Date]\n\nTranscript:\n{transcript}',
                    variables: ['transcript'],
                    metadata: {
                        created: new Date().toISOString(),
                        modified: new Date().toISOString(),
                        author: 'system',
                        version: '1.0'
                    }
                },
                {
                    id: 'interview-summary',
                    name: 'Interview Summary',
                    description: 'Structured summary for job interviews',
                    prompt: '# Interview Summary - {date}\n\n## Candidate Information\n- **Name:** [Candidate name]\n- **Position:** [Role being interviewed for]\n- **Interview Type:** [Phone, video, in-person]\n- **Duration:** {duration}\n- **Interviewer(s):** [Who conducted the interview]\n\n## Candidate Background\n### Experience\n- **Current Role:** [Current position and company]\n- **Years of Experience:** [Total and relevant experience]\n- **Key Skills:** [Technical and soft skills demonstrated]\n- **Notable Achievements:** [Accomplishments mentioned]\n\n### Education\n- **Degree(s):** [Educational background]\n- **Certifications:** [Relevant certifications]\n- **Continuous Learning:** [Recent training, courses]\n\n## Interview Assessment\n### Technical Competency\n- **Strengths:** [Technical skills demonstrated]\n- **Areas of Concern:** [Technical gaps or weaknesses]\n- **Problem-Solving:** [How they approach challenges]\n\n### Soft Skills\n- **Communication:** [How well they communicate]\n- **Leadership:** [Leadership experience and style]\n- **Teamwork:** [Collaboration skills]\n- **Cultural Fit:** [Alignment with company culture]\n\n### Motivation and Interest\n- **Why This Role:** [Their interest in the position]\n- **Career Goals:** [Where they want to go]\n- **Company Knowledge:** [How much they know about us]\n\n## Specific Questions and Responses\n### [Question Category]\n- **Q:** [Question asked]\n- **A:** [Summary of their response]\n- **Assessment:** [Your evaluation]\n\n## Red Flags / Concerns\n- [Any concerns or warning signs]\n\n## Positive Indicators\n- [Strong points and positive signals]\n\n## Overall Assessment\n- **Technical Rating:** [1-5 scale]\n- **Cultural Fit:** [1-5 scale]\n- **Communication:** [1-5 scale]\n- **Overall Impression:** [Summary]\n\n## Recommendation\n- **Next Steps:** [Advance, decline, additional interviews]\n- **Rationale:** [Why this recommendation]\n- **Additional Notes:** [Other considerations]\n\n## Follow-up Actions\n- [ ] [Action item] - Due: [Date]\n- [ ] [Action item] - Due: [Date]\n\nTranscript:\n{transcript}',
                    variables: ['transcript', 'date', 'duration'],
                    metadata: {
                        created: new Date().toISOString(),
                        modified: new Date().toISOString(),
                        author: 'system',
                        version: '1.0'
                    }
                }
            ]
        };
    }

    /**
     * Create a new template
     */
    createTemplate(templateData) {
        try {
            const template = {
                id: this.generateTemplateId(),
                name: templateData.name,
                description: templateData.description || '',
                category: templateData.category || 'custom',
                prompt: templateData.prompt,
                variables: this.extractVariables(templateData.prompt),
                metadata: {
                    created: new Date().toISOString(),
                    modified: new Date().toISOString(),
                    author: 'user',
                    version: '1.0'
                }
            };

            // Validate template
            const validation = this.validateTemplate(template);
            if (!validation.valid) {
                return { success: false, error: validation.error };
            }

            // Add to category
            if (!this.templates[template.category]) {
                this.templates[template.category] = [];
            }
            this.templates[template.category].push(template);

            // Save to storage
            const saveResult = this.saveTemplates();
            if (!saveResult.success) {
                return saveResult;
            }

            return { success: true, template };
        } catch (error) {
            console.error('Error creating template:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update an existing template
     */
    updateTemplate(category, templateId, updates) {
        try {
            const templateIndex = this.templates[category]?.findIndex(t => t.id === templateId);
            if (templateIndex === -1) {
                return { success: false, error: 'Template not found' };
            }

            const template = { ...this.templates[category][templateIndex], ...updates };
            template.variables = this.extractVariables(template.prompt);
            template.metadata.modified = new Date().toISOString();

            // Validate updated template
            const validation = this.validateTemplate(template);
            if (!validation.valid) {
                return { success: false, error: validation.error };
            }

            this.templates[category][templateIndex] = template;

            const saveResult = this.saveTemplates();
            if (!saveResult.success) {
                return saveResult;
            }

            return { success: true, template };
        } catch (error) {
            console.error('Error updating template:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete a template
     */
    deleteTemplate(category, templateId) {
        try {
            if (!this.templates[category]) {
                return { success: false, error: 'Category not found' };
            }

            const initialLength = this.templates[category].length;
            this.templates[category] = this.templates[category].filter(t => t.id !== templateId);

            if (this.templates[category].length === initialLength) {
                return { success: false, error: 'Template not found' };
            }

            const saveResult = this.saveTemplates();
            if (!saveResult.success) {
                return saveResult;
            }

            return { success: true };
        } catch (error) {
            console.error('Error deleting template:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get template by category and ID
     */
    getTemplate(category, templateId) {
        return this.templates[category]?.find(t => t.id === templateId) || null;
    }

    /**
     * Get all templates in a category
     */
    getTemplatesByCategory(category) {
        return this.templates[category] || [];
    }

    /**
     * Get all templates
     */
    getAllTemplates() {
        return this.templates;
    }

    /**
     * Process template with variable substitution
     */
    processTemplate(template, variables = {}) {
        try {
            let processedPrompt = template.prompt;

            // Default variables
            const defaultVars = {
                transcript: variables.transcript || '',
                date: variables.date || new Date().toLocaleDateString(),
                duration: variables.duration || 'Unknown',
                filename: variables.filename || 'Unknown'
            };

            // Merge with provided variables
            const allVars = { ...defaultVars, ...variables };

            // Replace variables in prompt
            Object.keys(allVars).forEach(key => {
                const regex = new RegExp(`\\{${key}\\}`, 'g');
                processedPrompt = processedPrompt.replace(regex, allVars[key]);
            });

            return {
                success: true,
                processedPrompt,
                variables: allVars
            };
        } catch (error) {
            console.error('Error processing template:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Validate template structure and content
     */
    validateTemplate(template) {
        if (!template.name || template.name.trim().length === 0) {
            return { valid: false, error: 'Template name is required' };
        }

        if (!template.prompt || template.prompt.trim().length === 0) {
            return { valid: false, error: 'Template prompt is required' };
        }

        if (!template.category || !this.categories.includes(template.category)) {
            return { valid: false, error: 'Valid category is required' };
        }

        if (template.name.length > 100) {
            return { valid: false, error: 'Template name must be 100 characters or less' };
        }

        if (template.prompt.length > 10000) {
            return { valid: false, error: 'Template prompt must be 10,000 characters or less' };
        }

        return { valid: true };
    }

    /**
     * Extract variables from template prompt
     */
    extractVariables(prompt) {
        const variableRegex = /\{([^}]+)\}/g;
        const variables = [];
        let match;

        while ((match = variableRegex.exec(prompt)) !== null) {
            if (!variables.includes(match[1])) {
                variables.push(match[1]);
            }
        }

        return variables;
    }

    /**
     * Generate unique template ID
     */
    generateTemplateId() {
        return 'template_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Export templates to JSON
     */
    exportTemplates() {
        try {
            const exportData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                templates: this.templates
            };

            return {
                success: true,
                data: JSON.stringify(exportData, null, 2),
                filename: `call-summary-templates-${new Date().toISOString().split('T')[0]}.json`
            };
        } catch (error) {
            console.error('Error exporting templates:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Import templates from JSON
     */
    importTemplates(jsonData, options = {}) {
        try {
            const importData = JSON.parse(jsonData);
            
            if (!importData.templates) {
                return { success: false, error: 'Invalid template file format' };
            }

            const { merge = true, overwrite = false } = options;
            let importedCount = 0;
            let skippedCount = 0;
            let errors = [];

            Object.keys(importData.templates).forEach(category => {
                if (!this.categories.includes(category)) {
                    errors.push(`Unknown category: ${category}`);
                    return;
                }

                if (!this.templates[category]) {
                    this.templates[category] = [];
                }

                importData.templates[category].forEach(template => {
                    // Validate template
                    const validation = this.validateTemplate(template);
                    if (!validation.valid) {
                        errors.push(`Invalid template "${template.name}": ${validation.error}`);
                        return;
                    }

                    // Check for existing template
                    const existingIndex = this.templates[category].findIndex(t => t.id === template.id);
                    
                    if (existingIndex !== -1) {
                        if (overwrite) {
                            this.templates[category][existingIndex] = template;
                            importedCount++;
                        } else {
                            skippedCount++;
                        }
                    } else {
                        this.templates[category].push(template);
                        importedCount++;
                    }
                });
            });

            const saveResult = this.saveTemplates();
            if (!saveResult.success) {
                return saveResult;
            }

            return {
                success: true,
                imported: importedCount,
                skipped: skippedCount,
                errors
            };
        } catch (error) {
            console.error('Error importing templates:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Reset to default templates
     */
    resetToDefaults() {
        try {
            this.templates = this.getDefaultTemplates();
            const saveResult = this.saveTemplates();
            return saveResult;
        } catch (error) {
            console.error('Error resetting templates:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Setup event listeners for template management
     */
    setupEventListeners() {
        // Template form submission
        const templateForm = document.getElementById('templateForm');
        if (templateForm) {
            templateForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleTemplateFormSubmit();
            });
        }

        // Template management tabs
        document.querySelectorAll('.template-management-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchManagementTab(btn.dataset.tab);
            });
        });

        // Import/Export buttons
        const exportBtn = document.getElementById('exportTemplates');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.handleExportTemplates());
        }

        const importInput = document.getElementById('importTemplates');
        if (importInput) {
            importInput.addEventListener('change', (e) => this.handleImportTemplates(e));
        }

        const resetBtn = document.getElementById('resetTemplates');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.handleResetTemplates());
        }

        // Template preview
        const previewBtn = document.getElementById('previewTemplate');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => this.handleTemplatePreview());
        }

        // Close modal
        const closeBtn = document.getElementById('closeTemplateModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeTemplateManagement());
        }
    }

    /**
     * Handle template form submission
     */
    handleTemplateFormSubmit() {
        const form = document.getElementById('templateForm');
        const formData = new FormData(form);
        
        const templateData = {
            name: document.getElementById('templateName').value.trim(),
            category: document.getElementById('templateCategory').value,
            description: document.getElementById('templateDescription').value.trim(),
            prompt: document.getElementById('templatePrompt').value.trim()
        };

        // Check if editing existing template
        const editingId = form.dataset.editingId;
        const editingCategory = form.dataset.editingCategory;

        let result;
        if (editingId && editingCategory) {
            result = this.updateTemplate(editingCategory, editingId, templateData);
        } else {
            result = this.createTemplate(templateData);
        }

        if (result.success) {
            this.showNotification(
                editingId ? 'Template updated successfully!' : 'Template created successfully!',
                'success'
            );
            this.clearTemplateForm();
            this.populateTemplateList();
            // Refresh main template grid if app instance exists
            if (window.app && window.app.populateTemplateGrid) {
                window.app.populateTemplateGrid();
            }
        } else {
            this.showNotification('Error: ' + result.error, 'error');
        }
    }

    /**
     * Handle template export
     */
    async handleExportTemplates() {
        const result = this.exportTemplates();
        if (result.success) {
            try {
                // Use Electron's save dialog
                const saveResult = await ipcRenderer.invoke('save-file-dialog', {
                    title: 'Export Templates',
                    defaultPath: result.filename,
                    filters: [
                        { name: 'JSON Files', extensions: ['json'] },
                        { name: 'All Files', extensions: ['*'] }
                    ]
                });

                if (!saveResult.canceled) {
                    const writeResult = await ipcRenderer.invoke('save-file', saveResult.filePath, result.data);
                    if (writeResult.success) {
                        this.showNotification('Templates exported successfully!', 'success');
                    } else {
                        this.showNotification('Error saving file: ' + writeResult.error, 'error');
                    }
                }
            } catch (error) {
                console.error('Export error:', error);
                this.showNotification('Export failed: ' + error.message, 'error');
            }
        } else {
            this.showNotification('Export failed: ' + result.error, 'error');
        }
    }

    /**
     * Handle template import
     */
    async handleImportTemplates(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const result = this.importTemplates(text, { merge: true, overwrite: false });

            if (result.success) {
                let message = `Imported ${result.imported} templates`;
                if (result.skipped > 0) {
                    message += `, skipped ${result.skipped} duplicates`;
                }
                if (result.errors.length > 0) {
                    message += `. ${result.errors.length} errors occurred.`;
                }
                this.showNotification(message, result.errors.length > 0 ? 'warning' : 'success');
                
                this.populateTemplateList();
                if (window.app && window.app.populateTemplateGrid) {
                    window.app.populateTemplateGrid();
                }
            } else {
                this.showNotification('Import failed: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Import error:', error);
            this.showNotification('Import failed: ' + error.message, 'error');
        }

        // Clear file input
        event.target.value = '';
    }

    /**
     * Handle template reset
     */
    handleResetTemplates() {
        if (!confirm('This will delete all custom templates and restore defaults. Continue?')) {
            return;
        }

        const result = this.resetToDefaults();
        if (result.success) {
            this.showNotification('Templates reset to defaults successfully!', 'success');
            this.populateTemplateList();
            if (window.app && window.app.populateTemplateGrid) {
                window.app.populateTemplateGrid();
            }
        } else {
            this.showNotification('Reset failed: ' + result.error, 'error');
        }
    }

    /**
     * Handle template preview
     */
    handleTemplatePreview() {
        const prompt = document.getElementById('templatePrompt').value.trim();
        if (!prompt) {
            this.showNotification('Enter a prompt to preview', 'warning');
            return;
        }

        const sampleVariables = {
            transcript: 'This is a sample meeting transcript where John Smith from ABC Corp discussed the Q4 budget planning with Sarah Johnson from our finance team. They covered three main topics: budget allocation for marketing campaigns, cost reduction strategies, and timeline for budget approval. John mentioned they need to finalize the budget by December 15th and are looking at a 10% increase in marketing spend. Sarah explained our new cost tracking system and suggested a phased approach to implementation.',
            date: new Date().toLocaleDateString(),
            duration: '15:30',
            filename: 'sample-meeting.wav'
        };

        const result = this.processTemplate({ prompt }, sampleVariables);
        if (result.success) {
            this.showPreviewModal(result.processedPrompt);
        } else {
            this.showNotification('Preview failed: ' + result.error, 'error');
        }
    }

    /**
     * Show template preview in a modal
     */
    showPreviewModal(processedPrompt) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay template-preview-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-eye"></i> Template Preview</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="preview-content">
                        <h4>Processed Prompt (with sample data):</h4>
                        <div class="preview-text">${processedPrompt.replace(/\n/g, '<br>')}</div>
                    </div>
                    <div class="preview-note">
                        <i class="fas fa-info-circle"></i>
                        This preview shows how your template will look with sample data. 
                        Actual results will use real transcript content and metadata.
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">
                        Close Preview
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    /**
     * Switch management tab
     */
    switchManagementTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.template-management-tabs .tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.template-management .tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Map tab names to correct IDs
        const tabIdMap = {
            'browse': 'browseTemplatesTab',
            'create': 'createTemplateTab',
            'import': 'importTemplatesTab'
        };
        
        const tabElement = document.getElementById(tabIdMap[tabName]);
        if (tabElement) {
            tabElement.classList.add('active');
        } else {
            console.error('Tab element not found for:', tabName, 'Expected ID:', tabIdMap[tabName]);
        }

        // Load content for specific tabs
        if (tabName === 'browse') {
            this.populateTemplateList();
        }
    }

    /**
     * Populate template list for management
     */
    populateTemplateList() {
        const listContainer = document.getElementById('templateManagementList');
        if (!listContainer) return;

        listContainer.innerHTML = '';

        this.categories.forEach(category => {
            const templates = this.templates[category] || [];
            if (templates.length === 0) return;

            const categorySection = document.createElement('div');
            categorySection.className = 'template-category-section';
            categorySection.innerHTML = `
                <h4 class="category-title">
                    <i class="fas fa-${this.getCategoryIcon(category)}"></i>
                    ${this.getCategoryName(category)} (${templates.length})
                </h4>
                <div class="template-list-items" id="templateList_${category}"></div>
            `;

            const listItems = categorySection.querySelector('.template-list-items');
            templates.forEach(template => {
                const templateItem = document.createElement('div');
                templateItem.className = 'template-list-item';
                templateItem.innerHTML = `
                    <div class="template-item-info">
                        <div class="template-item-name">${template.name}</div>
                        <div class="template-item-description">${template.description}</div>
                        <div class="template-item-meta">
                            Created: ${new Date(template.metadata.created).toLocaleDateString()}
                            ${template.metadata.modified !== template.metadata.created ? 
                                `• Modified: ${new Date(template.metadata.modified).toLocaleDateString()}` : ''}
                        </div>
                    </div>
                    <div class="template-item-actions">
                        <button class="btn btn-sm btn-secondary" onclick="templateManager.editTemplate('${category}', '${template.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="templateManager.deleteTemplateFromList('${category}', '${template.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                `;
                listItems.appendChild(templateItem);
            });

            listContainer.appendChild(categorySection);
        });

        if (listContainer.children.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-alt"></i>
                    <p>No templates found</p>
                    <button class="btn btn-primary" onclick="templateManager.switchManagementTab('create')">
                        <i class="fas fa-plus"></i> Create Your First Template
                    </button>
                </div>
            `;
        }
    }

    /**
     * Edit template
     */
    editTemplate(category, templateId) {
        console.log('TemplateManager.editTemplate called with:', category, templateId);
        
        const template = this.getTemplate(category, templateId);
        console.log('Template found:', !!template);
        
        if (!template) {
            this.showNotification('Template not found', 'error');
            return;
        }

        // Open template management modal
        const modal = document.getElementById('templateManagementModal');
        console.log('Modal found:', !!modal);
        
        if (modal) {
            modal.classList.add('active');
            console.log('Modal opened');
        }

        // Switch to create tab
        this.switchManagementTab('create');

        // Populate form with template data
        document.getElementById('templateName').value = template.name;
        document.getElementById('templateCategory').value = template.category;
        document.getElementById('templateDescription').value = template.description;
        document.getElementById('templatePrompt').value = template.prompt;

        // Mark form as editing
        const form = document.getElementById('templateForm');
        form.dataset.editingId = templateId;
        form.dataset.editingCategory = category;

        // Update form button text
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Template';
        }
    }

    /**
     * Delete template from list
     */
    deleteTemplateFromList(category, templateId) {
        const template = this.getTemplate(category, templateId);
        if (!template) {
            this.showNotification('Template not found', 'error');
            return;
        }

        if (!confirm(`Delete template "${template.name}"?`)) {
            return;
        }

        const result = this.deleteTemplate(category, templateId);
        if (result.success) {
            this.showNotification('Template deleted successfully!', 'success');
            this.populateTemplateList();
            if (window.app && window.app.populateTemplateGrid) {
                window.app.populateTemplateGrid();
            }
        } else {
            this.showNotification('Delete failed: ' + result.error, 'error');
        }
    }

    /**
     * Clear template form
     */
    clearTemplateForm() {
        const form = document.getElementById('templateForm');
        if (form) {
            form.reset();
            delete form.dataset.editingId;
            delete form.dataset.editingCategory;

            // Reset button text
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Template';
            }
        }
    }

    /**
     * Open template management modal for creating new template
     */
    openForNewTemplate() {
        const modal = document.getElementById('templateManagementModal');
        if (modal) {
            modal.classList.add('active');
        }
        this.switchManagementTab('create');
        this.clearTemplateForm();
    }

    /**
     * Close template management modal
     */
    closeTemplateManagement() {
        const modal = document.getElementById('templateManagementModal');
        if (modal) {
            modal.classList.remove('active');
        }
        this.clearTemplateForm();
    }

    /**
     * Get category display name
     */
    getCategoryName(category) {
        const names = {
            summary: 'Summary',
            contacts: 'Contacts',
            actions: 'Actions',
            analysis: 'Analysis',
            custom: 'Custom'
        };
        return names[category] || category;
    }

    /**
     * Get category icon
     */
    getCategoryIcon(category) {
        const icons = {
            summary: 'file-alt',
            contacts: 'address-book',
            actions: 'tasks',
            analysis: 'chart-line',
            custom: 'user-edit'
        };
        return icons[category] || 'file-alt';
    }

    /**
     * Show notification (uses app's notification system if available)
     */
    showNotification(message, type = 'info') {
        if (window.app && window.app.showNotification) {
            window.app.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
}

// Initialize template manager when DOM is loaded
if (typeof window !== 'undefined') {
    console.log('Creating TemplateManager instance...');
    window.templateManager = new TemplateManager();
    console.log('TemplateManager created and assigned to window.templateManager');
}