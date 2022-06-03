const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
var jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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
			.collection("products");

		const usersCollection = client
			.db("tools-manufacturer")
			.collection("users");

		const orderCollection = client
			.db("tools-manufacturer")
			.collection("orders");

		const reviewCollection = client
			.db("tools-manufacturer")
			.collection("reviews");

		const paymentCollection = client
			.db("tools-manufacturer")
			.collection("payments");

		// verify admin middleware
		const verifyAdmin = async (req, res, next) => {
			const requester = req.decoded.email;
			const requestAccount = await usersCollection.findOne({
				email: requester,
			});

			if (requestAccount.role === "admin") {
				next();
			} else {
				res.status(403).send({ message: "Forbidden access" });
			}
		};

		// payment api
		app.post("/create-payment-intent", verifyJWT, async (req, res) => {
			const { totalPrice } = req.body;
			const amount = totalPrice * 100;
			console.log(amount);
			const paymentIntent = await stripe.paymentIntents.create({
				amount: amount,
				currency: "usd",
				payment_method_types: ["card"],
			});
			res.send({
				clientSecret: paymentIntent.client_secret,
			});
		});

		//update payment
		app.patch("/pay-product/:id", verifyJWT, async (req, res) => {
			const id = req.params.id;
			const payment = req.body;
			const filter = { _id: ObjectId(id) };
			const updatedDoc = {
				$set: {
					paid: true,
					transactionId: payment.transactionId,
				},
			};

			const result = await paymentCollection.insertOne(payment);
			const updatedPayment = await orderCollection.updateOne(
				filter,
				updatedDoc
			);
			res.send(updatedPayment);
		});

		//update payment
		app.patch("/shipping-product/:id", verifyJWT, async (req, res) => {
			const id = req.params.id;
			const filter = { _id: ObjectId(id) };
			const updatedDoc = {
				$set: {
					shipping: true,
				},
			};

			const shippingComplited = await orderCollection.updateOne(
				filter,
				updatedDoc
			);
			res.send(shippingComplited);
		});

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
			const email = req.params.email;
			const user = req.body;
			const filter = { email: email };
			const options = { upsert: true };
			const updateDoc = {
				$set: {
					fullName: user.fullName,
					image: user.image,
					phoneNumber: user.phoneNumber,
					addressLine1: user.addressLine1,
					addressLine2: user.addressLine2,
					city: user.city,
					state: user.state,
					postalCode: user.postalCode,
				},
			};
			const result = await usersCollection.updateOne(
				filter,
				updateDoc,
				options
			);
			res.send(result);
		});

		// update product info
		app.put("/product/:id", verifyJWT, async (req, res) => {
			const id = req.params.id;
			const product = req.body;
			const filter = { _id: ObjectId(id) };
			const options = { upsert: true };
			const updateDoc = {
				$set: {
					name: product.productName,
					description: product.productDescription,
					available: product.productAvailable,
					price: product.productPrice,
				},
			};
			const result = await toolCollection.updateOne(
				filter,
				updateDoc,
				options
			);
			res.send(result);
		});

		//make user to admin api
		app.put(
			"/user/admin/:email",
			verifyJWT,
			verifyAdmin,
			async (req, res) => {
				const email = req.params.email;
				const filter = { email: email };
				const updateDoc = {
					$set: { role: "admin" },
				};
				const result = await usersCollection.updateOne(filter, updateDoc);
				res.send(result);
			}
		);

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
		app.get("/payment-product/:id", verifyJWT, async (req, res) => {
			const id = req.params.id;
			const query = { _id: ObjectId(id) };
			const result = await orderCollection.findOne(query);
			res.send(result);
		});

		//get all user
		app.get("/user", async (req, res) => {
			const result = await usersCollection.find({}).toArray();
			res.send(result);
		});

		// admin
		app.get("/admin/:email", async (req, res) => {
			const email = req.params.email;
			const user = await usersCollection.findOne({ email: email });
			const isAdmin = user.role === "admin";
			res.send({ admin: isAdmin });
		});

		// edit product get
		app.get("/edit-product/:id", verifyJWT, async (req, res) => {
			const id = req.params.id;
			const query = { _id: ObjectId(id) };
			const result = await toolCollection.findOne(query);
			res.send(result);
		});

		//get all orders
		app.get("/all-order", async (req, res) => {
			const result = await orderCollection.find({}).toArray();
			res.send(result);
		});

		// get all review
		app.get("/all-review", async (req, res) => {
			const result = await reviewCollection.find({}).toArray();
			res.send(result);
		});

		//post orderInfo to database
		app.post("/order", verifyJWT, async (req, res) => {
			const orderInfo = req.body;
			const result = await orderCollection.insertOne(orderInfo);
			res.send(result);
		});

		//customer subscribe
		app.post("/subscribe", (req, res) => {
			const email = req.body;
			console.log("user email", email);
		});

		//review post to database
		app.post("/review/:id", verifyJWT, async (req, res) => {
			const id = req.params.id;
			const review = req.body;
			const filter = { _id: ObjectId(id) };
			const options = { upsert: true };
			const updateDoc = {
				$set: {
					rating: review.rating,
				},
			};
			const updateReview = await orderCollection.updateOne(
				filter,
				updateDoc,
				options
			);

			if (updateReview.acknowledged) {
				const result = await reviewCollection.insertOne(review);
				return res.send(result);
			}
			return res.send({ message: "Review Not Added" });
		});

		// post a new product
		app.post("/new-product", verifyJWT, verifyAdmin, async (req, res) => {
			const newProduct = req.body;
			const result = await toolCollection.insertOne(newProduct);
			return res.send(result);
		});

		// user delete
		app.delete("/user/:id", verifyJWT, async (req, res) => {
			const id = req.params.id;
			const filter = { _id: ObjectId(id) };
			const result = await usersCollection.deleteOne(filter);
			res.send(result);
		});

		// user delete
		app.delete("/product/:id", verifyJWT, async (req, res) => {
			const id = req.params.id;
			const filter = { _id: ObjectId(id) };
			const result = await toolCollection.deleteOne(filter);
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
