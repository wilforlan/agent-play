import { startServer } from "__SERVER_MODULE__";

void startServer().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
