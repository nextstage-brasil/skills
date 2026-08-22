process.env.LANGCHAIN_TRACING_V2 = "false";
process.env.LLM_DISABLED = "true";
process.env.CHECKPOINTER = "memory";
delete process.env.LANGCHAIN_API_KEY;
delete process.env.DATABASE_URL;
