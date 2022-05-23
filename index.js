const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vtyhe.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
	serverApi: ServerApiVersion.v1,
});

async function run() {
	try {
		await client.connect();
		const toolCollection = client
			.db("tools-manufacturer")
			.collection("tools");

		//get all tools
		app.get("/tools", async (req, res) => {
			const query = {};
			const result = await toolCollection.find(query).toArray();
			res.send(result);
		});

		//get single tools
		app.get("/tool/:id", async (req, res) => {
			const id = req.params.id;
			const query = { _id: ObjectId(id) };
			const result = await toolCollection.findOne(query);
			res.send(result);
		});
	} finally {
		// await client.close();
	}
}
run().catch(console.dir);

//root api
app.get("/", (req, res) => {
	res.send("Tools Menufacturer server is running!");
});

app.listen(port, () => {
	console.log(`This server running port is: ${port}`);
});
