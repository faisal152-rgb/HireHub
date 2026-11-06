const app = require("./src/app");


const PORT=process.env.PORT;

app.listen(PORT, () => {
    console.log(`Gateway Server is running on port ${PORT}`);
});