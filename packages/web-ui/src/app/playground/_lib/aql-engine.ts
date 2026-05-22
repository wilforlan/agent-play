import { tokenizeAql } from "./aql-lexer";
import { parseAql } from "./aql-parser";
import { validateAql } from "./aql-validator";
import { executeAqlProgram } from "./aql-executor";
import type { AqlDiagnostic, AqlExecutionState } from "./aql-types";
import { createRuntimeClient } from "./aql-runtime-client";

export type AqlEngineResult = {
  diagnostics: AqlDiagnostic[];
  response: unknown;
  headers: Record<string, string>;
  nextState: AqlExecutionState;
};

export async function runAql(input: {
  source: string;
  state: AqlExecutionState;
}): Promise<AqlEngineResult> {
  const tokens = tokenizeAql(input.source);
  const parsed = parseAql(tokens);
  if (parsed.diagnostics.length > 0) {
    return {
      diagnostics: parsed.diagnostics,
      response: null,
      headers: {},
      nextState: input.state,
    };
  }
  const semantic = validateAql(parsed.program);
  if (semantic.diagnostics.length > 0) {
    return {
      diagnostics: semantic.diagnostics,
      response: null,
      headers: {},
      nextState: input.state,
    };
  }
  const runtimeClient = createRuntimeClient(input.state.serverUrl);
  const executed = await executeAqlProgram({
    program: parsed.program,
    runtimeClient,
    initialState: input.state,
  });
  return {
    diagnostics: executed.diagnostics,
    response: executed.response,
    headers: executed.headers,
    nextState: executed.state,
  };
}
