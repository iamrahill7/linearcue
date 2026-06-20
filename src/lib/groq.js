
// LinearCue — Smart LLM Router
// 4 modes: coding, sales, interview, general
// 3 providers: Groq, Gemini, Mistral with smart fallback

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MISTRAL_KEY = import.meta.env.VITE_MISTRAL_API_KEY;

// ─── KEYWORD LISTS ───────────────────────────────────────────────────────────

const CODING_KEYWORDS = [
  // languages
  "python", "javascript", "typescript", "java", "kotlin", "swift", "rust",
  "golang", "go", "c++", "cpp", "c#", "csharp", "php", "ruby", "scala",
  "r language", "matlab", "bash", "shell", "powershell", "perl", "lua",
  "dart", "flutter", "elixir", "haskell", "fortran", "cobol", "assembly",
  // web
  "html", "css", "react", "vue", "angular", "nextjs", "nuxt", "svelte",
  "tailwind", "bootstrap", "webpack", "vite", "node", "nodejs", "express",
  "fastapi", "django", "flask", "rails", "laravel", "spring", "dotnet",
  // databases
  "sql", "mysql", "postgresql", "postgres", "mongodb", "redis", "firebase",
  "sqlite", "dynamodb", "cassandra", "elasticsearch", "supabase", "prisma",
  "orm", "query", "database", "schema", "migration", "join", "select",
  // coding concepts
  "code", "coding", "function", "method", "class", "object", "variable",
  "array", "list", "dictionary", "hashmap", "loop", "iteration", "recursion",
  "algorithm", "data structure", "sorting", "searching", "binary", "tree",
  "graph", "stack", "queue", "linked list", "pointer", "memory", "heap",
  // debugging
  "error", "bug", "debug", "exception", "traceback", "stacktrace", "fix",
  "issue", "problem", "crash", "null", "undefined", "syntax", "runtime",
  "compile", "import", "export", "module", "package", "library", "framework",
  "dependency", "npm", "pip", "yarn", "cargo", "maven", "gradle",
  // devops / tools
  "git", "github", "gitlab", "docker", "kubernetes", "aws", "azure", "gcp",
  "ci", "cd", "pipeline", "deploy", "build", "test", "jest", "pytest",
  "api", "rest", "graphql", "webhook", "endpoint", "request", "response",
  "json", "xml", "yaml", "env", "config", "regex", "terminal", "cli"
];

const SALES_KEYWORDS = [
  // people / roles
  "client", "customer", "prospect", "lead", "buyer", "decision maker",
  "stakeholder", "ceo", "cto", "manager", "director", "founder",
  // deal stages
  "demo", "pitch", "proposal", "presentation", "follow up", "follow-up",
  "discovery", "qualification", "negotiation", "closing", "close the deal",
  "cold call", "warm lead", "inbound", "outbound", "pipeline", "funnel",
  // objections
  "objection", "pushback", "too expensive", "not interested", "think about it",
  "competitor", "alternative", "comparison", "why should i", "convince",
  "not sure", "maybe later", "budget", "no budget", "cost too much",
  // pricing
  "price", "pricing", "discount", "offer", "package", "plan", "subscription",
  "monthly", "annual", "roi", "value", "worth it", "justify", "investment",
  // sales actions
  "sell", "selling", "upsell", "cross sell", "retain", "churn", "renewal",
  "contract", "agreement", "sign", "onboard", "convert", "revenue",
  "quota", "target", "commission", "crm", "salesforce", "hubspot",
  // communication
  "email", "call", "meeting", "zoom", "teams", "meet", "schedule",
  "follow up", "reminder", "next steps", "action items", "summary"
];

const INTERVIEW_KEYWORDS = [
  // question types
  "tell me about yourself", "introduce yourself", "walk me through",
  "why should we hire", "strength", "weakness", "strength and weakness",
  "greatest achievement", "biggest failure", "challenging situation",
  "conflict", "team", "leadership", "initiative", "pressure", "deadline",
  // career
  "experience", "background", "role", "position", "job", "career",
  "previous company", "last job", "internship", "fresher", "entry level",
  "promotion", "growth", "goal", "ambition", "5 years", "10 years",
  // interview stages
  "hr round", "technical round", "managerial round", "final round",
  "screening", "aptitude", "assignment", "take home", "case study",
  // compensation
  "salary", "ctc", "package", "hike", "notice period", "joining",
  "negotiate", "expectation", "current salary", "expected salary",
  // companies
  "why this company", "why us", "culture", "values", "mission", "vision",
  "research", "know about us", "product", "competitors", "industry",
  // soft skills
  "communication", "teamwork", "collaboration", "adaptability", "flexibility",
  "time management", "multitask", "prioritize", "organized", "detail oriented"
];

// ─── SYSTEM PROMPTS ───────────────────────────────────────────────────────────

const CODING_PROMPT = `You are LinearCue, an expert coding assistant running on the user desktop.
You can see what is on their screen including their code editor, terminal, and browser.
Rules:
- Always give complete, working, runnable code
- Use proper markdown code blocks with language specified
- Add brief comments in the code
- Explain what the code does in 2-3 lines after the code block
- If you see an error on screen, fix it directly
- Do not truncate or cut off code`;

const SALES_PROMPT = `You are LinearCue, an AI sales copilot running on the user desktop during live sales calls.
You can see their CRM, emails, and call notes on screen.
Always respond in this exact format:

**Say this:** [exact script the sales rep should say right now, natural and conversational]

**Key points to cover:**
- [point 1]
- [point 2]  
- [point 3]

**Objection to watch for:** [likely pushback and how to handle it in one line]

Keep total response under 250 words. Be specific, confident, and actionable.`;

const INTERVIEW_PROMPT = `You are LinearCue, an AI interview coach running on the user desktop during a live interview.
You can see the interview questions on their screen.
Always respond in this exact format:

**Answer this:** [complete answer the candidate should say, using STAR method where relevant]

**Key points to emphasize:**
- [strength or achievement to highlight]
- [relevant experience or skill]
- [closing line to end strong]

**Avoid saying:** [one thing that could hurt their answer]

Keep total response under 300 words. Sound natural, confident, and human.`;

const GENERAL_PROMPT = `You are LinearCue, an AI copilot running on the user desktop.
You can see what is on their screen and hear what they are saying.
Give clear, direct, helpful answers with proper markdown formatting.
Be concise but complete. Use bullet points and headers where helpful.`;

// ─── DETECT MODE ─────────────────────────────────────────────────────────────

function detectMode(question) {
  const q = question.toLowerCase();
  
  const codingScore = CODING_KEYWORDS.filter(k => q.includes(k)).length;
  const salesScore = SALES_KEYWORDS.filter(k => q.includes(k)).length;
  const interviewScore = INTERVIEW_KEYWORDS.filter(k => q.includes(k)).length;

  console.log("Scores — coding:", codingScore, "sales:", salesScore, "interview:", interviewScore);

  // need at least 2 matches to trigger a specific mode
  // this prevents single generic words like "code" from triggering coding mode
  const THRESHOLD = 2;
  
  if (codingScore < THRESHOLD && salesScore < THRESHOLD && interviewScore < THRESHOLD) {
    // check for explicit code request words
    const explicitCode = ["write code", "give code", "show code", "write a", "give me code",
      "function for", "program for", "script for", "algorithm", "implement"];
    const isExplicitCode = explicitCode.some(k => q.includes(k));
    if (isExplicitCode) return "coding";
    return "general";
  }
  
  const max = Math.max(codingScore, salesScore, interviewScore);
  if (max === codingScore && codingScore >= THRESHOLD) return "coding";
  if (max === salesScore && salesScore >= THRESHOLD) return "sales";
  if (max === interviewScore && interviewScore >= THRESHOLD) return "interview";
  return "general";
}

function getSystemPrompt(mode) {
  if (mode === "coding") return CODING_PROMPT;
  if (mode === "sales") return SALES_PROMPT;
  if (mode === "interview") return INTERVIEW_PROMPT;
  return GENERAL_PROMPT;
}

function buildUserMessage(question, screenText, transcript) {
  const parts = [];
  if (screenText) parts.push("What is currently on screen:\n" + screenText);
  if (transcript) parts.push("What the user said recently:\n" + transcript);
  parts.push("User question: " + question);
  return parts.join("\n\n");
}

// ─── API CALLERS ──────────────────────────────────────────────────────────────

async function callGroq(question, screenText, transcript, mode) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + GROQ_KEY
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: getSystemPrompt(mode) },
        { role: "user", content: buildUserMessage(question, screenText, transcript) }
      ],
      max_tokens: 600,
      temperature: 0.7
    })
  });
  if (!res.ok) throw new Error("Groq " + res.status);
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callGemini(question, screenText, transcript, mode) {
  const fullMsg = getSystemPrompt(mode) + "\n\n" + buildUserMessage(question, screenText, transcript);
  const res = await fetch(GEMINI_URL + "?key=" + GEMINI_KEY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: fullMsg }] }],
      generationConfig: { maxOutputTokens: 600, temperature: 0.7 }
    })
  });
  if (!res.ok) throw new Error("Gemini " + res.status);
  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

async function callMistral(question, screenText, transcript, mode) {
  const res = await fetch(MISTRAL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + MISTRAL_KEY
    },
    body: JSON.stringify({
      model: "mistral-small-latest",
      messages: [
        { role: "system", content: getSystemPrompt(mode) },
        { role: "user", content: buildUserMessage(question, screenText, transcript) }
      ],
      max_tokens: 600,
      temperature: 0.7
    })
  });
  if (!res.ok) throw new Error("Mistral " + res.status);
  const data = await res.json();
  return data.choices[0].message.content;
}

// ─── MAIN ROUTER ─────────────────────────────────────────────────────────────

export async function askLLM(question, screenText = "", transcript = "") {
  const mode = detectMode(question);
  console.log("LinearCue mode:", mode);

  if (mode === "coding") {
    // coding: Gemini → Groq → Mistral
    try { return await callGemini(question, screenText, transcript, mode); }
    catch (e) { console.warn("Gemini failed:", e.message); }
    try { return await callGroq(question, screenText, transcript, mode); }
    catch (e) { console.warn("Groq failed:", e.message); }
    return await callMistral(question, screenText, transcript, mode);
  }

  // sales, interview, general: Groq → Mistral → Gemini
  try { return await callGroq(question, screenText, transcript, mode); }
  catch (e) { console.warn("Groq failed:", e.message); }
  try { return await callMistral(question, screenText, transcript, mode); }
  catch (e) { console.warn("Mistral failed:", e.message); }
  return await callGemini(question, screenText, transcript, mode);
}
