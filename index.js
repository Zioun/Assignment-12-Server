const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
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
    const userCollection = client.db("Forum").collection("users");
    const postCollection = client.db("Forum").collection("posts");
    const commentCollection = client.db("Forum").collection("comments");
    const reportCollection = client.db("Forum").collection("reports");
    const announcementCollection = client
      .db("Forum")
      .collection("announcements");
    const tagCollection = client.db("Forum").collection("tags");
    const notificationCollection = client
      .db("Forum")
      .collection("notifications");
    const voteCollection = client.db("Forum").collection("votes");
    const paymentCollection = client.db("Forum").collection("payments");

    // !users
    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get("/users/:email", async (req, res) => {
      try {
        const email = req.params.email; // Use req.params instead of req.query
        const query = { email: email };
        const result = await userCollection.findOne(query);
        if (!result) {
          return res.status(404).send({ message: "User not found" });
        }
        res.status(200).send(result);
      } catch (error) {
        console.error("Error fetching user data:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    app.post("/users", async (req, res) => {
      const item = req.body;
      console.log(item);
      const result = await userCollection.insertOne(item);
      res.send(result);
    });

    app.patch("/users/:id/role", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch("/users/:email/subscription", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const updateDoc = {
        $set: {
          subscription: "true",
        },
      };
      try {
        const result = await userCollection.updateOne(query, updateDoc); // Assuming you have a usersCollection from your database connection
        if (result.modifiedCount === 1) {
          res.status(200).send({ message: "Subscription updated successfully" });
        } else {
          res.status(404).send({ message: "User not found" });
        }
      } catch (error) {
        res.status(500).send({ message: "Internal Server Error", error });
      }
    });


    app.patch("/users/:id/restriction", async (req, res) => {
      const id = req.params.id;
      const { restriction } = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          restriction: restriction,
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

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

    app.delete("/posts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      try {
        const result = await postCollection.deleteOne(query);
        if (result.deletedCount === 1) {
          res.send({
            message: "Successfully deleted one document.",
            deletedCount: result.deletedCount,
          });
        } else {
          res.send({
            message: "No documents matched the query. Deleted 0 documents.",
          });
        }
      } catch (error) {
        console.error("Error deleting document:", error);
        res
          .status(500)
          .send({ message: "An error occurred while deleting the document." });
      }
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
    app.get("/votes/:postId", async (req, res) => {
      const { postId } = req.params;
      try {
        const votes = await voteCollection.find({ postId }).toArray();
        const totalUpVotes = votes.reduce((acc, vote) => acc + vote.upVote, 0);
        const totalDownVotes = votes.reduce(
          (acc, vote) => acc + vote.downVote,
          0
        );
        res.send({ totalUpVotes, totalDownVotes });
      } catch (error) {
        console.error("Error fetching votes:", error);
        res.status(500).send("Internal server error");
      }
    });

    app.patch("/votes", async (req, res) => {
      const { postId, email, upVote, downVote } = req.body;

      try {
        // Find the existing vote for the user on the post
        const existingVote = await voteCollection.findOne({
          postId: postId,
          email: email,
        });

        // If there's an existing vote, update it
        if (existingVote) {
          // Update the existing vote
          await voteCollection.updateOne(
            { _id: existingVote._id },
            { $set: { upVote: upVote, downVote: downVote } }
          );

          // Update vote counts based on the change
          const upVoteIncrement = upVote ? 1 : -1;
          const downVoteIncrement = downVote ? 1 : -1;
          await postCollection.updateOne(
            { _id: postId },
            { $inc: { upVote: upVoteIncrement, downVote: downVoteIncrement } }
          );
        } else {
          // If there's no existing vote, create a new one
          await voteCollection.insertOne({
            postId: postId,
            email: email,
            upVote: upVote,
            downVote: downVote,
          });

          // Update vote counts based on the new vote
          const upVoteIncrement = upVote ? 1 : 0;
          const downVoteIncrement = downVote ? 1 : 0;
          await postCollection.updateOne(
            { _id: postId },
            { $inc: { upVote: upVoteIncrement, downVote: downVoteIncrement } }
          );
        }

        res.send({ success: true });
      } catch (error) {
        console.error("Error:", error);
        res.status(500).send({ message: "Server error", success: false });
      }
    });

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

    app.delete("/comments/byPost/:postId", async (req, res) => {
      const postId = req.params.postId;
      try {
        const result = await commentCollection.deleteMany({ postId: postId });
        res.json({ deletedCount: result.deletedCount });
      } catch (error) {
        console.error("Error deleting comments:", error);
        res.status(500).json({ message: "Error deleting comments" });
      }
    });

    // !notification
    app.get("/notifications", async (req, res) => {
      const result = await notificationCollection.find().toArray();
      res.send(result);
    });
    app.patch("/notifications", async (req, res) => {
      const { notifyId, email } = req.body;
      console.log(req.body);

      const existingNotification = await notificationCollection.findOne({
        notifyId,
        email,
      });

      if (existingNotification) {
        res.send({ message: "Notification already sent", success: false });
      } else {
        const result = await notificationCollection.insertOne(req.body);
        res.send({ result, success: true });
      }
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

    app.delete("/reports/:id", async (req, res) => {
      const id = req.params.id;
      try {
        const result = await reportCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.json({ deletedCount: result.deletedCount });
      } catch (error) {
        console.error("Error deleting report:", error);
        res.status(500).json({ message: "Error deleting report" });
      }
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

    //! payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, "payData");

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);
      res.send(paymentResult);
    });

    app.get("/payments", async (req, res) => {
      const result = await paymentCollection.find().toArray();
      res.send(result);
    });

    app.get("/payments/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const result = await paymentCollection.find(query).toArray();
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
