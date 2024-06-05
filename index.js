const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const { ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;

//middlewares
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nl88zl6.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();
    const postCollection = client.db("Forum").collection("posts");
    const commentCollection = client.db("Forum").collection("comments");
    const reportCollection = client.db("Forum").collection("reports");
    const announcementCollection = client.db("Forum").collection("announcements");
    const tagCollection = client.db("Forum").collection("tags");

    // ! Posts
    app.get("/posts", async (req, res) => {
      const result = await postCollection.find().toArray();
      res.send(result);
    });

    app.get("/posts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await postCollection.findOne(query);
      res.send(result);
    });

    app.get("/posts/:email", async (req, res) => {
      const email = req.params.email;
      const query = { "author.email": email };
      const result = await postCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/posts", async (req, res) => {
      const item = req.body;
      console.log(item);
      const result = await postCollection.insertOne(item);
      res.send(result);
    });

    // ! Get all posts data from db for pagination
    app.get("/posts", async (req, res) => {
      const size = parseInt(req.query.size) || 10;
      console.log(size);
      const page = parseInt(req.query.page) || 6;
      const search = req.query.search || "";
      const filter = req.query.filter || "";
      let query = {
        title: { $regex: search, $options: "i" },
      };
      if (filter) query.category = filter;
      let options = {};
      const result = await postCollection
        .find(query, options)
        .skip((page - 1) * size)
        .limit(size)
        .toArray();
      res.send(result);
    });

    // ! vote count
    

    // ! Comments
    app.get("/comments", async (req, res) => {
      const result = await commentCollection.find().toArray();
      res.send(result);
    });

    app.post("/comments", async (req, res) => {
      const item = req.body;
      console.log(item);
      const result = await commentCollection.insertOne(item);
      res.send(result);
    });

    // ! tags
    app.get("/tags", async (req, res) => {
      const result = await tagCollection.find().toArray();
      res.send(result);
    });
    app.post("/tags", async (req, res) => {
      const item = req.body;
      console.log(item);
      const result = await tagCollection.insertOne(item);
      res.send(result);
    });

    // ! reports
    app.get("/reports", async (req, res) => {
      const result = await reportCollection.find().toArray();
      res.send(result);
    });
    app.post("/reports", async (req, res) => {
      const item = req.body;
      console.log(item);
      const result = await reportCollection.insertOne(item);
      res.send(result);
    });

    // ! announcement
    app.get("/announcement", async (req, res) => {
      const result = await announcementCollection.find().toArray();
      res.send(result);
    });
    app.post("/announcement", async (req, res) => {
      const item = req.body;
      console.log(item);
      const result = await announcementCollection.insertOne(item);
      res.send(result);
    });

    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("forum is running");
});
app.listen(port, () => {
  console.log(`forum is running on port ${port}`);
});
