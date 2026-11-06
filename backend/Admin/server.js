const app = require("./src/app");


const PORT=process.env.PORT;

app.listen(PORT, () => {
    console.log(`Admin Server is running on port ${PORT}`);
});