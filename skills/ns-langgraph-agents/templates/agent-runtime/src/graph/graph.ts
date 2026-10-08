import { END, START, StateGraph } from "@langchain/langgraph";
import { AgentState } from "../state.js";
import { getCheckpointer } from "../memory/checkpointer.js";
import {
  analystNode,
  composerNode,
  contextManagerNode,
  executorNode,
  guardNode,
  mcpCatalogNode,
  memoryWriteNode,
  respondNode,
  routeAfterAnalyst,
  routeAfterExecutor,
  routeAfterGuard,
} from "./nodes/index.js";

/**
 * Suggested greenfield scaffold (`plan_execute`). Change compile to match locked graph-spec.
 * guard → context_manager → mcp_catalog → analyst → memory_write ⇄ (executor | composer) → composer → respond → END
 * memory_write applies analyst memoryOps (user-scoped store); routing stays routeAfterAnalyst.
 *
 * HITL `interrupt()` is optional inside executor/analyst when graph-spec locks it —
 * default compile has no interrupt node.
 */
async function compileGraph() {
  const graph = new StateGraph(AgentState)
    .addNode("guard", guardNode)
    .addNode("context_manager", contextManagerNode)
    .addNode("mcp_catalog", mcpCatalogNode)
    .addNode("analyst", analystNode)
    .addNode("memory_write", memoryWriteNode)
    .addNode("executor", executorNode)
    .addNode("composer", composerNode)
    .addNode("respond", respondNode)
    .addEdge(START, "guard")
    .addConditionalEdges("guard", routeAfterGuard, {
      context_manager: "context_manager",
      respond: "respond",
    })
    .addEdge("context_manager", "mcp_catalog")
    .addEdge("mcp_catalog", "analyst")
    .addEdge("analyst", "memory_write")
    .addConditionalEdges("memory_write", routeAfterAnalyst, {
      executor: "executor",
      composer: "composer",
    })
    .addConditionalEdges("executor", routeAfterExecutor, {
      analyst: "analyst",
      composer: "composer",
    })
    .addEdge("composer", "respond")
    .addEdge("respond", END);

  const checkpointer = await getCheckpointer();
  return graph.compile({ checkpointer });
}

let compiledGraph: Awaited<ReturnType<typeof compileGraph>> | null = null;

export async function getGraph() {
  if (!compiledGraph) {
    compiledGraph = await compileGraph();
  }
  return compiledGraph;
}

export function resetGraphForTests(): void {
  compiledGraph = null;
}

export { routeAfterAnalyst, routeAfterGuard };
