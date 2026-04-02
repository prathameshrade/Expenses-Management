import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config";
import { initDb } from "./db";
import { errorHandler, notFound } from "./middleware/error";
import { authRouter } from "./routes/auth";
import { usersRouter } from "./routes/users";
import { expensesRouter } from "./routes/expenses";
import { approvalsRouter } from "./routes/approvals";
import { healthRouter } from "./routes/health";

initDb();

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.use("/api", healthRouter);
app.use("/api", authRouter);
app.use("/api", usersRouter);
app.use("/api", expensesRouter);
app.use("/api", approvalsRouter);

app.use(notFound);
app.use(errorHandler);

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Expense management API running on port ${config.port}`);
});
