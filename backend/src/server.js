require("dotenv").config();
const app = require("./app");
require("./config/db");

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
