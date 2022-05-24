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

const verifyJWT = (req, res, next) => {
	const authHeader = req.headers.authorization;
	if (!authHeader) {
		return res.status(401).send({ message: "Unauthorized Access" });
	}

	const token = authHeader.split(" ")[1];

	jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
		if (err) {
			return res.status(403).send({ message: "Forbidden Access" });
		}
		req.decoded = decoded;
		next();
	});
};

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

		const orderCollection = client
			.db("tools-manufacturer")
			.collection("orders");

		//user login with jwt
		app.put("/user/:email", async (req, res) => {
			const email = req.params.email;
			const user = req.body;
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

		//user update profile
		app.put("/profile/:email", verifyJWT, async (req, res) => {
			console.log("hello profile");
			const email = req.params.email;
			const user = req.body;
			console.log(user);
			const filter = { email: email };
			// const options = { upsert: true };
			const updateDoc = {
				fullName: user.fullName,
				image: user.image,
				phoneNumber: user.phoneNumber,
				addressLine1: user.addressLine1,
				addressLine2: user.addressLine2,
				city: user.city,
				state: user.state,
				postalCode: user.postalCode,
			};
			const result = await usersCollection.updateOne(
				filter,
				updateDoc,
				options
			);
			res.send(result);
		});

		//get all tools
		app.get("/products", async (req, res) => {
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

		//get user ordered data
		app.get("/ordered-product/:email", async (req, res) => {
			const email = req.params.email;
			const query = { email: email };
			const result = await orderCollection.find(query).toArray();
			res.send(result);
		});

		//get payment products
		app.get("/payment-product/:id", async (req, res) => {
			const id = req.params.id;
			const query = { _id: ObjectId(id) };
			const result = await orderCollection.findOne(query);
			res.send(result);
		});

		//post orderInfo to database
		app.post("/order", verifyJWT, async (req, res) => {
			const orderInfo = req.body;
			console.log(orderInfo);
			const result = await orderCollection.insertOne(orderInfo);
			res.send(result);
		});

		// ordered product delete
		app.delete("/order/:id", verifyJWT, async (req, res) => {
			const id = req.params.id;
			const filter = { _id: ObjectId(id) };
			const result = await orderCollection.deleteOne(filter);
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
