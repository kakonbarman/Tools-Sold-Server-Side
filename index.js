const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;

app.get("/", (req, res) => {
	res.send("Tools Menufacturer server is running!");
});

app.listen(port, () => {
	console.log(`This server running port is: ${port}`);
});
