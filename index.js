const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
var jwt = require("jsonwebtoken");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://tools_manufacturer_admin:RZ61uB1zmtZgxNVJ@cluster0.vtyhe.mongodb.net/?retryWrites=true&w=majority`;
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
			.collection("products");

		const usersCollection = client
			.db("tools-manufacturer")
			.collection("users");

		//user login with jwt
		app.put("/user/:email", async (req, res) => {
			const email = req.params.email;
			const user = req.body;
			console.log(user);
			const filter = { email: email };
			const options = { upsert: true };
			const updateDoc = {
				$set: user,
			};
			const result = await usersCollection.updateOne(
				filter,
				updateDoc,
				options
			);
			const token = jwt.sign(
				{ email: email },
				process.env.ACCESS_TOKEN_SECRET,
				{ expiresIn: "6h" }
			);
			res.send({ result, token });
		});

		//get all tools
		app.get("/products", async (req, res) => {
			console.log("sob thik ache");
			const query = {};
			const result = await toolCollection.find(query).toArray();
			res.send(result);
		});

		//get single tools
		app.get("/product/:id", async (req, res) => {
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
