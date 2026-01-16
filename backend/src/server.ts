import { env } from "./config/env"; // Validates env vars on import
import app from "./app";

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
